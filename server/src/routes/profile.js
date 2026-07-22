const express = require("express");
const supabase = require("../db/supabaseClient");
const { generateUniqueOwnerCode } = require("../utils/ownerCode");
const { resetLettersForOwner } = require("./letters");

const router = express.Router();
const TABLE = "profiles";

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
    res.json(data);
});

// PATCH /profile/:code — сохранить прогресс. Присылается любое подмножество
// полей из EDITABLE_FIELDS — вызывается часто (после каждого значимого
// изменения), поэтому лишние поля просто игнорируются, а не считаются ошибкой.
router.patch("/:code", async (req, res) => {
    const code = req.params.code.trim().toUpperCase();

    const updates = {};
    for(const field of EDITABLE_FIELDS){
        if(Object.prototype.hasOwnProperty.call(req.body, field)){
            updates[field] = req.body[field];
        }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq("owner_code", code)
        .select()
        .single();

    if(error) return res.status(500).json({ error: error.message });
    if(!data) return res.status(404).json({ error: "Код не найден." });
    res.json(data);
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

    res.json(data);
});

module.exports = router;
