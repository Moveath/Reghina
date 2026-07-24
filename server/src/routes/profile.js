const express = require("express");
const supabase = require("../db/supabaseClient");
const { generateUniqueOwnerCode } = require("../utils/ownerCode");
const { logEvent } = require("../utils/logger");
const { resetLettersForOwner } = require("./letters");

const router = express.Router();
const TABLE = "profiles";

// Система ежемесячных ключей начинает работать с сентября 2026 — до этого
// автовыдача полностью выключена (см. POST /:code/monthly-key ниже).
// Часть 1 пазла открывается отдельно, через сценарий интро (тестовый
// ключ от собаки) — этой системой выдаются части 2-4, максимум одна за
// календарный месяц.
const KEY_SYSTEM_START_YEAR = 2026;
const KEY_SYSTEM_START_MONTH = 9; // сентябрь
const MAX_PUZZLE_PIECES = 4;

function monthKey(year, month){
    return `${year}-${String(month).padStart(2, "0")}`;
}

// Все месяцы от начала системы до указанного (включительно), в
// хронологическом порядке — "пропущенные" ключи не теряются именно
// благодаря этому списку: при заходе после долгого перерыва в нём сразу
// окажутся все месяцы, за которые ключ ещё не забирали.
function listEligibleMonths(nowYear, nowMonth){
    const months = [];
    let year = KEY_SYSTEM_START_YEAR;
    let month = KEY_SYSTEM_START_MONTH;

    while(year < nowYear || (year === nowYear && month <= nowMonth)){
        months.push(monthKey(year, month));
        month += 1;
        if(month > 12){ month = 1; year += 1; }
    }

    return months;
}

// Поля, которые реально можно менять через PATCH — всё остальное (owner_code,
// created_at) неизменяемо.
const EDITABLE_FIELDS = [
    "dog_name",
    "dialogue_index",
    "intro_completed",
    "selected_theme",
    "unlocked_pieces",
    "key_count",
    "puzzle_container_state"
];

function requireSupabase(req, res, next){
    if(!supabase){
        return res.status(503).json({
            error: "Supabase ещё не настроен. Заполни SUPABASE_URL и SUPABASE_SECRET_KEY в server/.env."
        });
    }
    next();
}

router.use(requireSupabase);

// POST /profile — создать новый профиль с уникальным кодом. Вызывается
// один раз на устройстве, где сайт открыли первым делом (js/storage/storage.js
// сохраняет полученный код в localStorage и больше никогда не создаёт новый).
router.post("/", async (req, res) => {
    try {
        const owner_code = await generateUniqueOwnerCode();
        const { data, error } = await supabase
            .from(TABLE)
            .insert({ owner_code })
            .select()
            .single();

        if(error) return res.status(500).json({ error: error.message });

        // Новый код — новый почтовый ящик, ему тоже нужно стартовое письмо
        // (как раньше было при первом визите на весь сайт). Раньше это
        // делалось один раз для всех сидом в schema.sql — теперь письма
        // привязаны к owner_code, значит и сеять их нужно на каждый новый код.
        try {
            await resetLettersForOwner(owner_code);
        } catch(err){
            console.error("[profile] Не удалось создать стартовое письмо для нового кода:", err.message);
        }

        logEvent(supabase, owner_code, "profile_created");

        res.status(201).json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// GET /profile/:code — получить прогресс по коду (восстановление на новом
// устройстве). 404, если такого кода не существует.
router.get("/:code", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("owner_code", code)
        .maybeSingle();

    if(error) return res.status(500).json({ error: error.message });
    if(!data) return res.status(404).json({ error: "Код не найден." });

    // Отличаем осознанное восстановление по коду (пользователь вручную ввёл
    // код на новом устройстве, js/storage/storage.js добавляет ?source=restore)
    // от фонового 20-секундного опроса reconcileWithServer — иначе журнал
    // залился бы шумом из каждого опроса.
    if(req.query.source === "restore"){
        logEvent(supabase, code, "restored_by_code");
    }

    res.json(data);
});

// PATCH /profile/:code — сохранить прогресс. Присылается любое подмножество
// полей из EDITABLE_FIELDS — вызывается часто (после каждого значимого
// изменения), поэтому лишние поля просто игнорируются, а не считаются ошибкой.
// Точечное логирование изменений, которые реально интересны в Timeline —
// сравнивает состояние профиля до и после PATCH. Не блокирует ответ клиенту
// (вызывается уже после res.json), ошибки логирования только предупреждают.
function logProfileDiff(code, before, after){
    if(!before || !after) return;

    if(before.dialogue_index !== after.dialogue_index){
        logEvent(supabase, code, "dialogue_progressed", { dialogue_index: after.dialogue_index });
    }
    if(!before.intro_completed && after.intro_completed){
        logEvent(supabase, code, "story_completed");
    }
    if(before.selected_theme !== after.selected_theme && after.selected_theme){
        logEvent(supabase, code, "theme_changed", { theme: after.selected_theme });
    }

    const beforePieces = Array.isArray(before.unlocked_pieces) ? before.unlocked_pieces : [];
    const afterPieces = Array.isArray(after.unlocked_pieces) ? after.unlocked_pieces : [];
    afterPieces.filter(i => !beforePieces.includes(i)).forEach(i => {
        logEvent(supabase, code, "puzzle_piece_opened", { piece: i });
    });
    beforePieces.filter(i => !afterPieces.includes(i)).forEach(i => {
        logEvent(supabase, code, "puzzle_piece_closed", { piece: i });
    });

    const beforeKeyCount = before.key_count || 0;
    const afterKeyCount = after.key_count || 0;
    if(afterKeyCount > beforeKeyCount) logEvent(supabase, code, "key_obtained");
    else if(afterKeyCount < beforeKeyCount) logEvent(supabase, code, "key_used");
}

router.patch("/:code", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    const updates = {};
    for(const field of EDITABLE_FIELDS){
        if(Object.prototype.hasOwnProperty.call(req.body, field)){
            updates[field] = req.body[field];
        }
    }
    updates.updated_at = new Date().toISOString();

    const { data: before } = await supabase
        .from(TABLE)
        .select("dialogue_index, intro_completed, selected_theme, unlocked_pieces, key_count")
        .eq("owner_code", code)
        .maybeSingle();

    const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq("owner_code", code)
        .select()
        .single();

    if(error) return res.status(500).json({ error: error.message });
    if(!data) return res.status(404).json({ error: "Код не найден." });

    res.json(data);
    logProfileDiff(code, before, data);
});

// POST /profile/:code/reset — сброс прогресса ("Сбросить прогресс" на
// сайте) — код остаётся тем же, обнуляются только данные. Заодно чистит и
// пересевает письма этого владельца (resetLettersForOwner из routes/letters.js),
// чтобы после сброса переписка тоже выглядела как в первый раз.
router.post("/:code/reset", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    const { data, error } = await supabase
        .from(TABLE)
        .update({
            dog_name: "",
            dialogue_index: 0,
            intro_completed: false,
            selected_theme: "",
            unlocked_pieces: [],
            key_count: 0,
            puzzle_container_state: null,
            claimed_key_months: [],
            last_key_granted_at: null,
            updated_at: new Date().toISOString()
        })
        .eq("owner_code", code)
        .select()
        .single();

    if(error) return res.status(500).json({ error: error.message });
    if(!data) return res.status(404).json({ error: "Код не найден." });

    try {
        await resetLettersForOwner(code);
    } catch(err){
        console.error("[profile] Не удалось сбросить письма при сбросе профиля:", err.message);
    }

    // Сброс трогает только profiles и letters — таблицу logs этот роут не
    // очищает и не должен: история событий должна пережить сброс прогресса.
    logEvent(supabase, code, "progress_reset");

    res.json(data);
});

// POST /profile/:code/heartbeat — лёгкая телеметрия визита, не требует
// секрета разработчика (обычная фоновая отметка "я всё ещё здесь"). Вызывается
// с фронтенда (js/storage/storage.js): один раз с new_session:true сразу
// после ensureOwnerCode() на старте страницы, дальше раз в минуту с false.
// Питает "онлайн сейчас" и карточку "Даты" в Developer Panel.
router.post("/:code/heartbeat", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const device = typeof req.body.device === "string" ? req.body.device.slice(0, 120) : "";
    const isNewSession = Boolean(req.body.new_session);

    const { data: before } = await supabase
        .from(TABLE)
        .select("last_device, visit_count")
        .eq("owner_code", code)
        .maybeSingle();

    if(!before) return res.status(404).json({ error: "Код не найден." });

    const updates = { last_seen_at: new Date().toISOString(), last_device: device };
    if(isNewSession) updates.visit_count = (before.visit_count || 0) + 1;

    const { error } = await supabase.from(TABLE).update(updates).eq("owner_code", code);
    if(error) return res.status(500).json({ error: error.message });

    if(before.last_device && device && before.last_device !== device){
        logEvent(supabase, code, "device_changed", { from: before.last_device, to: device });
    }
    if(isNewSession){
        logEvent(supabase, code, "visit", { device });
    }

    res.json({ ok: true });
});

// POST /profile/:code/monthly-key — проверить и, если положено, выдать
// ежемесячный ключ. Вызывается фронтендом при каждом запуске сайта (см.
// checkMonthlyKey в js/storage/storage.js), только если интро уже пройдено.
// test_date — ТОЛЬКО для ручного тестирования из dev-меню (см. dialogue.js);
// в обычной работе поле не передаётся, и используется настоящее время сервера.
router.post("/:code/monthly-key", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    const { data: profile, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("owner_code", code)
        .maybeSingle();

    if(error) return res.status(500).json({ error: error.message });
    if(!profile) return res.status(404).json({ error: "Код не найден." });

    const now = req.body && req.body.test_date ? new Date(req.body.test_date) : new Date();
    if(Number.isNaN(now.getTime())){
        return res.status(400).json({ error: "test_date не распознан." });
    }

    const unlockedPieces = Array.isArray(profile.unlocked_pieces) ? profile.unlocked_pieces : [];
    if(unlockedPieces.length >= MAX_PUZZLE_PIECES){
        return res.json({ granted: false, reason: "max_reached" });
    }

    const claimedMonths = Array.isArray(profile.claimed_key_months) ? profile.claimed_key_months : [];
    const eligibleMonths = listEligibleMonths(now.getUTCFullYear(), now.getUTCMonth() + 1);
    const unclaimedMonths = eligibleMonths.filter(m => !claimedMonths.includes(m));

    if(unclaimedMonths.length === 0){
        return res.json({ granted: false, reason: "nothing_due" });
    }

    // Самый старый неполученный месяц — если пропустили несколько месяцев
    // подряд, каждый следующий заберётся отдельным заходом на сайт (или
    // отдельной перезагрузкой), а не все разом за один диалог.
    const monthToGrant = unclaimedMonths[0];

    let pieceIndex = -1;
    for(let i = 0; i < MAX_PUZZLE_PIECES; i++){
        if(!unlockedPieces.includes(i)){ pieceIndex = i; break; }
    }
    if(pieceIndex === -1){
        return res.json({ granted: false, reason: "max_reached" });
    }

    const newUnlockedPieces = [...unlockedPieces, pieceIndex].sort((a, b) => a - b);
    const newClaimedMonths = [...claimedMonths, monthToGrant];

    const { data: updated, error: updateError } = await supabase
        .from(TABLE)
        .update({
            unlocked_pieces: newUnlockedPieces,
            claimed_key_months: newClaimedMonths,
            last_key_granted_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq("owner_code", code)
        .select()
        .single();

    if(updateError) return res.status(500).json({ error: updateError.message });

    logEvent(supabase, code, "monthly_key_granted", { month: monthToGrant, piece_index: pieceIndex });

    res.json({ granted: true, month: monthToGrant, piece_index: pieceIndex, profile: updated });
});

module.exports = router;
