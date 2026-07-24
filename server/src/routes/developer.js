const express = require("express");
const supabase = require("../db/supabaseClient");
const config = require("../config");
const { logEvent } = require("../utils/logger");

const router = express.Router();
const PROFILES = "profiles";
const LETTERS = "letters";
const LOGS = "logs";
const DEV_LOGS = "developer_logs";
const SNAPSHOTS = "snapshots";
const MAX_PUZZLE_PIECES = 4;

// "Онлайн сейчас" — last_seen_at не старше 5 минут. Мобильные браузеры
// сворачивают/выгружают вкладку, поэтому короткий порог (например, 90 сек)
// почти сразу показывал бы "не в сети" при обычном сворачивании телефона.
const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

function requireSupabase(req, res, next){
    if(!supabase){
        return res.status(503).json({
            error: "Supabase ещё не настроен. Заполни SUPABASE_URL и SUPABASE_SECRET_KEY в server/.env."
        });
    }
    next();
}

// Настоящая защита панели — весь смысл в том, что 5-клик жест на фронтенде
// сам по себе НЕ даёт доступа: без совпадающего секрета ни один из этих
// маршрутов не отдаст и не примет данные. Если секрет не настроен на
// сервере — доступ запрещён вообще (а не "разрешён всем"), чтобы забытая
// настройка не превращалась в дыру.
function requireDeveloperSecret(req, res, next){
    if(!config.developer.secret){
        return res.status(503).json({ error: "DEVELOPER_SECRET не настроен на сервере." });
    }
    const provided = req.headers["x-developer-secret"];
    if(provided !== config.developer.secret){
        return res.status(403).json({ error: "Неверный секрет разработчика." });
    }
    next();
}

router.use(requireSupabase, requireDeveloperSecret);

// Запись в оба журнала: developer_logs — полный аудит (старое/новое
// значение), logs — короткая пометка, чтобы правки разработчика тоже были
// видны в общей Timeline профиля.
async function logAdminAction(ownerCode, action, oldValue, newValue){
    try {
        await supabase.from(DEV_LOGS).insert({ owner_code: ownerCode, action, old_value: oldValue ?? null, new_value: newValue ?? null });
    } catch(err){
        console.warn("[developer] Не удалось записать developer_logs:", err.message);
    }
    logEvent(supabase, ownerCode, `admin_${action}`, { old: oldValue, new: newValue });
}

async function fetchProfile(code){
    const { data, error } = await supabase.from(PROFILES).select("*").eq("owner_code", code).maybeSingle();
    if(error) throw new Error(error.message);
    return data;
}

// POST /developer/auth — если запрос вообще дошёл сюда, секрет уже совпал
// (проверен в middleware выше). Фронтенд использует это как "проверить
// пароль" при входе в панель.
router.post("/auth", (req, res) => res.json({ ok: true }));

// GET /developer/profile/:code — агрегированный снимок для Monitoring Mode:
// профиль + признак "онлайн" + письма + последние события. Один запрос —
// вся панель просмотра рисуется из одного ответа.
router.get("/profile/:code", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const profile = await fetchProfile(code);
        if(!profile) return res.status(404).json({ error: "Код не найден." });

        const online = Boolean(profile.last_seen_at) &&
            (Date.now() - new Date(profile.last_seen_at).getTime()) < ONLINE_THRESHOLD_MS;

        const { data: letters, error: lettersError } = await supabase
            .from(LETTERS)
            .select("*")
            .eq("owner_code", code)
            .order("created_at", { ascending: false });
        if(lettersError) throw new Error(lettersError.message);

        const inbox = (letters || []).filter(l => l.direction === "incoming");
        const outbox = (letters || []).filter(l => l.direction === "outgoing");

        const { data: timeline, error: logsError } = await supabase
            .from(LOGS)
            .select("*")
            .eq("owner_code", code)
            .order("created_at", { ascending: false })
            .limit(30);
        if(logsError) throw new Error(logsError.message);

        res.json({
            profile,
            online,
            letters: {
                inbox_count: inbox.length,
                inbox_unread: inbox.filter(l => l.status !== "read").length,
                outbox_count: outbox.length,
                recent: (letters || []).slice(0, 5)
            },
            timeline: timeline || []
        });
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// PATCH /developer/profile/:code/puzzle — {index, open} открыть/закрыть один
// кусочек, либо {count} выставить N открытых частей (первые N индексов).
router.patch("/profile/:code/puzzle", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const profile = await fetchProfile(code);
        if(!profile) return res.status(404).json({ error: "Код не найден." });

        const before = Array.isArray(profile.unlocked_pieces) ? profile.unlocked_pieces : [];
        let after;

        if(typeof req.body.count === "number"){
            const count = Math.max(0, Math.min(MAX_PUZZLE_PIECES, Math.floor(req.body.count)));
            after = Array.from({ length: count }, (_, i) => i);
        } else if(typeof req.body.index === "number"){
            const index = req.body.index;
            if(index < 0 || index >= MAX_PUZZLE_PIECES){
                return res.status(400).json({ error: `index должен быть от 0 до ${MAX_PUZZLE_PIECES - 1}.` });
            }
            const open = Boolean(req.body.open);
            after = open
                ? [...new Set([...before, index])].sort((a, b) => a - b)
                : before.filter(i => i !== index);
        } else {
            return res.status(400).json({ error: "Нужно поле index+open или count." });
        }

        const { data, error } = await supabase
            .from(PROFILES)
            .update({ unlocked_pieces: after, updated_at: new Date().toISOString() })
            .eq("owner_code", code)
            .select()
            .single();
        if(error) throw new Error(error.message);

        await logAdminAction(code, "puzzle_edit", { unlocked_pieces: before }, { unlocked_pieces: after });

        res.json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// PATCH /developer/profile/:code/keys — правка ежемесячных ключей
// (claimed_key_months), ключа-в-руке (key_count) и даты последней выдачи.
router.patch("/profile/:code/keys", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const profile = await fetchProfile(code);
        if(!profile) return res.status(404).json({ error: "Код не найден." });

        const updates = { updated_at: new Date().toISOString() };
        const before = {};
        const after = {};

        if(typeof req.body.monthly_add === "string"){
            const months = Array.isArray(profile.claimed_key_months) ? profile.claimed_key_months : [];
            if(!months.includes(req.body.monthly_add)){
                before.claimed_key_months = months;
                after.claimed_key_months = [...months, req.body.monthly_add].sort();
                updates.claimed_key_months = after.claimed_key_months;
            }
        }
        if(typeof req.body.monthly_remove === "string"){
            const months = updates.claimed_key_months || (Array.isArray(profile.claimed_key_months) ? profile.claimed_key_months : []);
            before.claimed_key_months = before.claimed_key_months || months;
            after.claimed_key_months = months.filter(m => m !== req.body.monthly_remove);
            updates.claimed_key_months = after.claimed_key_months;
        }
        if(typeof req.body.hand_key === "boolean"){
            before.key_count = profile.key_count || 0;
            after.key_count = req.body.hand_key ? 1 : 0;
            updates.key_count = after.key_count;
        }
        if(typeof req.body.last_key_granted_at === "string"){
            before.last_key_granted_at = profile.last_key_granted_at;
            after.last_key_granted_at = req.body.last_key_granted_at;
            updates.last_key_granted_at = req.body.last_key_granted_at;
        }

        if(Object.keys(updates).length === 1){
            return res.status(400).json({ error: "Нет полей для изменения." });
        }

        const { data, error } = await supabase
            .from(PROFILES)
            .update(updates)
            .eq("owner_code", code)
            .select()
            .single();
        if(error) throw new Error(error.message);

        await logAdminAction(code, "keys_edit", before, after);

        res.json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// PATCH /developer/profile/:code/story — {dialogue_index} и/или
// {intro_completed}. Диалог — плоский массив без именованных стадий (см.
// data/dialogues.js), поэтому "откат"/"сброс этапа" на практике — это
// установка конкретного индекса; фронтенд сам присылает нужное значение
// (например, dialogue_index - 1 для отката на шаг назад).
router.patch("/profile/:code/story", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const profile = await fetchProfile(code);
        if(!profile) return res.status(404).json({ error: "Код не найден." });

        const updates = { updated_at: new Date().toISOString() };
        const before = {};
        const after = {};

        if(typeof req.body.dialogue_index === "number"){
            before.dialogue_index = profile.dialogue_index;
            after.dialogue_index = Math.max(0, Math.floor(req.body.dialogue_index));
            updates.dialogue_index = after.dialogue_index;
        }
        if(typeof req.body.intro_completed === "boolean"){
            before.intro_completed = profile.intro_completed;
            after.intro_completed = req.body.intro_completed;
            updates.intro_completed = after.intro_completed;
        }

        if(Object.keys(updates).length === 1){
            return res.status(400).json({ error: "Нет полей для изменения." });
        }

        const { data, error } = await supabase
            .from(PROFILES)
            .update(updates)
            .eq("owner_code", code)
            .select()
            .single();
        if(error) throw new Error(error.message);

        await logAdminAction(code, "story_edit", before, after);

        res.json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// POST /developer/profile/:code/letters/test — создать тестовое письмо
// (is_test:true), чтобы потом его можно было безопасно отделить от реальной
// переписки при удалении.
router.post("/profile/:code/letters/test", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const direction = req.body.direction === "outgoing" ? "outgoing" : "incoming";
    const message = typeof req.body.message === "string" && req.body.message.trim()
        ? req.body.message.trim()
        : "Тестовое письмо (Developer Panel)";

    try {
        const { data, error } = await supabase
            .from(LETTERS)
            .insert({
                direction,
                message,
                status: "delivered",
                sender: direction === "incoming" ? "egor" : "regina",
                receiver: direction === "incoming" ? "regina" : "egor",
                owner_code: code,
                is_test: true
            })
            .select()
            .single();
        if(error) throw new Error(error.message);

        await logAdminAction(code, "letter_test_created", null, { direction, message });

        res.status(201).json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// DELETE /developer/profile/:code/letters/test — удаляет ТОЛЬКО письма с
// is_test:true для этого владельца. Настоящую переписку не трогает — это
// прямое требование: "настоящие письма пользователя не удалять случайно".
router.delete("/profile/:code/letters/test", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const { data, error } = await supabase
            .from(LETTERS)
            .delete()
            .eq("owner_code", code)
            .eq("is_test", true)
            .select();
        if(error) throw new Error(error.message);

        await logAdminAction(code, "letters_test_deleted", null, { deleted_count: (data || []).length });

        res.json({ deleted_count: (data || []).length });
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// GET /developer/profile/:code/snapshots — список снимков (без letters
// внутри data, чтобы список оставался лёгким).
router.get("/profile/:code/snapshots", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    const { data, error } = await supabase
        .from(SNAPSHOTS)
        .select("id, label, created_at")
        .eq("owner_code", code)
        .order("created_at", { ascending: false });

    if(error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST /developer/profile/:code/snapshots — сохраняет копию редактируемых
// полей профиля и всех писем этого владельца, чтобы можно было вернуться к
// этому состоянию после ошибки при тестировании.
router.post("/profile/:code/snapshots", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();
    const label = typeof req.body.label === "string" ? req.body.label.trim().slice(0, 80) : "";

    try {
        const profile = await fetchProfile(code);
        if(!profile) return res.status(404).json({ error: "Код не найден." });

        const { data: letters, error: lettersError } = await supabase
            .from(LETTERS)
            .select("*")
            .eq("owner_code", code);
        if(lettersError) throw new Error(lettersError.message);

        const snapshotData = {
            profile: {
                dog_name: profile.dog_name,
                dialogue_index: profile.dialogue_index,
                intro_completed: profile.intro_completed,
                selected_theme: profile.selected_theme,
                unlocked_pieces: profile.unlocked_pieces,
                key_count: profile.key_count,
                puzzle_container_state: profile.puzzle_container_state,
                claimed_key_months: profile.claimed_key_months,
                last_key_granted_at: profile.last_key_granted_at
            },
            letters: letters || []
        };

        const { data, error } = await supabase
            .from(SNAPSHOTS)
            .insert({ owner_code: code, label, data: snapshotData })
            .select("id, label, created_at")
            .single();
        if(error) throw new Error(error.message);

        await logAdminAction(code, "snapshot_created", null, { label, id: data.id });

        res.status(201).json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// POST /developer/profile/:code/snapshots/:id/restore — перезаписывает
// профиль и письма владельца данными из снимка (письма полностью заменяются,
// как и в resetLettersForOwner, только вставляются сохранённые, а не
// стартовые).
router.post("/profile/:code/snapshots/:id/restore", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    try {
        const { data: snapshot, error: snapshotError } = await supabase
            .from(SNAPSHOTS)
            .select("*")
            .eq("id", req.params.id)
            .eq("owner_code", code)
            .maybeSingle();
        if(snapshotError) throw new Error(snapshotError.message);
        if(!snapshot) return res.status(404).json({ error: "Снимок не найден." });

        const { profile: snapshotProfile, letters: snapshotLetters } = snapshot.data;

        const { data: updatedProfile, error: updateError } = await supabase
            .from(PROFILES)
            .update({ ...snapshotProfile, updated_at: new Date().toISOString() })
            .eq("owner_code", code)
            .select()
            .single();
        if(updateError) throw new Error(updateError.message);

        const { error: deleteError } = await supabase.from(LETTERS).delete().eq("owner_code", code);
        if(deleteError) throw new Error(deleteError.message);

        if(Array.isArray(snapshotLetters) && snapshotLetters.length){
            const rows = snapshotLetters.map(l => ({
                direction: l.direction,
                message: l.message,
                status: l.status,
                sender: l.sender,
                receiver: l.receiver,
                owner_code: code,
                telegram_message_id: l.telegram_message_id || null,
                is_test: Boolean(l.is_test),
                read_at: l.read_at || null
            }));
            const { error: insertError } = await supabase.from(LETTERS).insert(rows);
            if(insertError) throw new Error(insertError.message);
        }

        await logAdminAction(code, "snapshot_restored", null, { snapshot_id: req.params.id });

        res.json(updatedProfile);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
