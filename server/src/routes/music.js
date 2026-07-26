const express = require("express");
const supabase = require("../db/supabaseClient");
const { sendMusicSuggestionToEgor } = require("../telegram/bot");
const { logEvent } = require("../utils/logger");

const router = express.Router();

// POST /music/suggest — Регина предлагает песню через виджет "Музыкальная
// шкатулка" (см. js/ui/settings.js). Ничего не хранит в БД — только
// уведомляет Егора в Telegram; сам он потом добавляет трек в audio/ и в
// список MUSIC_TRACKS (js/audio/music.js) вручную. logEvent — лишь для
// Timeline в Developer Panel, отсутствие supabase/owner_code не мешает
// уведомлению уйти (logEvent сам это учитывает).
router.post("/suggest", async (req, res) => {
    const { name, owner_code } = req.body;

    if(!name || typeof name !== "string" || !name.trim()){
        return res.status(400).json({ error: "Поле name обязательно." });
    }

    const trimmedName = name.trim().slice(0, 200);
    const code = typeof owner_code === "string" ? owner_code.trim().toUpperCase() : "";

    await sendMusicSuggestionToEgor(trimmedName);
    logEvent(supabase, code, "music_suggested", { name: trimmedName });

    res.status(201).json({ ok: true });
});

module.exports = router;
