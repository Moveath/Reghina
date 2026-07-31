const express = require("express");
const supabase = require("../db/supabaseClient");
const { sendLetterToEgor } = require("../telegram/bot");
const { logEvent } = require("../utils/logger");

const router = express.Router();
const TABLE = "letters";
const ALLOWED_STATUSES = ["pending", "delivered", "read"];

// Самое первое письмо, которое видит Регина при заходе на сайт (и после
// сброса прогресса) — настоящее письмо от Егора, не заглушка.
const STARTER_LETTER_MESSAGE = `Привет, Регина.

Наверное, именно с этого письма и стоит начать.

Я довольно долго думал, каким должно быть это письмо. Хотелось подобрать правильные слова, и вышло как-то так.

Этот сайт появился не как проект для портфолио и не как способ занять свободный вечер. Он появился потому, что мне захотелось сделать что-то особенное для одного человека.

Не сообщение на пару минут. Не то, что со временем окажется где-нибудь на полке. А что-то, к чему можно будет вернуться спустя время.

Поэтому постепенно начали появляться страницы, музыка, письма, разные мелочи и идеи, которые со временем превратились в то, что ты видишь сейчас. Мне просто показалось важным однажды показать всё это именно тебе.

Дальше ты наверняка встретишь вещи, которые появились здесь не случайно я старался передать то, что, я знал, тебе может понравиться. Что-то будет понятно сразу, а что-то, возможно, только спустя время.

Поэтому можешь осматривать всё постепенно.

И если хотя бы небольшая часть этого сайта сможет просто оставить после себя тёплое впечатление, значит всё это создавалось не зря.

Егор`;

// Дата/время стартового письма зафиксированы намеренно — это письмо "уже
// написано" (см. текст выше), и должно всегда показывать момент, когда оно
// реально было дописано, а не когда конкретной Регине завёлся профиль в базе
// (это может произойти позже — при первом реальном визите, либо вообще
// заново при пересборе тестовых данных). Без этого дата в письме менялась бы
// каждый раз, когда профиль пересоздаётся (сброс прогресса, новый тестовый
// код и т.п.), и при обычном чтении письма позже выглядела бы как будто
// написана только что.
const STARTER_LETTER_SENT_AT = "2026-07-31T12:09:28.875Z";

// Supabase ещё не подключён на этом этапе (нет ключей в .env) — вместо
// падения сервера маршруты честно отвечают 503, пока конфигурация не готова.
function requireSupabase(req, res, next){
    if(!supabase){
        return res.status(503).json({
            error: "Supabase ещё не настроен. Заполни SUPABASE_URL и SUPABASE_SECRET_KEY в server/.env."
        });
    }
    next();
}

router.use(requireSupabase);

// Письма привязаны к owner_code (система постоянного кода пользователя,
// см. server/src/routes/profile.js) — без него не понятно, чья это
// переписка. Приходит либо query-параметром (GET), либо полем в теле
// (POST/DELETE-подобные маршруты).
function requireOwnerCode(getter){
    return (req, res, next) => {
        const code = getter(req);
        if(!code || typeof code !== "string" || !code.trim()){
            return res.status(400).json({ error: "Поле owner_code обязательно." });
        }
        req.ownerCode = code.trim().toUpperCase();
        next();
    };
}

// POST /letters — Регина пишет новое письмо Егору. Через этот маршрут
// всегда уходит исходящее: направление и отправитель/получатель здесь
// фиксированы, входящие письма от Егора появятся отдельным путём (бот).
router.post("/", requireOwnerCode(req => req.body.owner_code), async (req, res) => {
    const { message } = req.body;

    if(!message || typeof message !== "string" || !message.trim()){
        return res.status(400).json({ error: "Поле message обязательно и не может быть пустым." });
    }

    const { data, error } = await supabase
        .from(TABLE)
        .insert({
            direction: "outgoing",
            message: message.trim(),
            status: "pending",
            sender: "regina",
            receiver: "egor",
            owner_code: req.ownerCode
        })
        .select()
        .single();

    if(error) return res.status(500).json({ error: error.message });

    logEvent(supabase, req.ownerCode, "letter_sent");

    // Письмо уже сохранено — теперь собака относит его Егору в Telegram.
    // Если отправка не удалась (бот не настроен, Егор ещё не писал боту
    // и т.п.), письмо остаётся сохранённым со статусом "pending" — оно
    // не теряется, просто ещё не доставлено.
    const telegramMessageId = await sendLetterToEgor(data);

    if(telegramMessageId){
        const { data: delivered, error: updateError } = await supabase
            .from(TABLE)
            .update({ status: "delivered", telegram_message_id: telegramMessageId })
            .eq("id", data.id)
            .select()
            .single();

        if(!updateError) return res.status(201).json(delivered);
    }

    res.status(201).json(data);
});

// Общая логика полного сброса переписки одного владельца — используется и
// маршрутом ниже (POST /letters/reset), и сбросом профиля целиком (см.
// POST /profile/:code/reset в server/src/routes/profile.js), поэтому вынесена
// в отдельную функцию и экспортирована.
async function resetLettersForOwner(ownerCode){
    const { error: deleteError } = await supabase
        .from(TABLE)
        .delete()
        .eq("owner_code", ownerCode);

    if(deleteError) throw new Error(deleteError.message);

    const { data, error: insertError } = await supabase
        .from(TABLE)
        .insert({
            direction: "incoming",
            message: STARTER_LETTER_MESSAGE,
            status: "delivered",
            sender: "egor",
            receiver: "regina",
            owner_code: ownerCode,
            created_at: STARTER_LETTER_SENT_AT
        })
        .select()
        .single();

    if(insertError) throw new Error(insertError.message);
    return data;
}

// POST /letters/reset — полная очистка истории писем ОДНОГО владельца
// (используется кнопкой "Сбросить прогресс" на сайте, см.
// window.resetAllProgress в dialogue.js). Удаляет все его письма — и
// входящие, и исходящие — и создаёт заново ровно одно стартовое входящее,
// чтобы новый заход выглядел как первый. Код владельца при этом не трогается.
router.post("/reset", requireOwnerCode(req => req.body.owner_code), async (req, res) => {
    try {
        const data = await resetLettersForOwner(req.ownerCode);
        res.json(data);
    } catch(err){
        res.status(500).json({ error: err.message });
    }
});

// GET /letters/inbox — письма от Егора (входящие) для конкретного владельца.
router.get("/inbox", requireOwnerCode(req => req.query.owner_code), async (req, res) => {
    const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("direction", "incoming")
        .eq("owner_code", req.ownerCode)
        .order("created_at", { ascending: false });

    if(error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET /letters/outbox — письма, отправленные Региной (исходящие), для
// конкретного владельца.
router.get("/outbox", requireOwnerCode(req => req.query.owner_code), async (req, res) => {
    const { data, error } = await supabase
        .from(TABLE)
        .select("*")
        .eq("direction", "outgoing")
        .eq("owner_code", req.ownerCode)
        .order("created_at", { ascending: false });

    if(error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PATCH /letters/:id — смена статуса письма (например pending -> delivered,
// или отметить входящее письмо прочитанным). id уже уникален глобально,
// owner_code здесь не нужен.
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if(!status || !ALLOWED_STATUSES.includes(status)){
        return res.status(400).json({
            error: `Поле status обязательно и должно быть одним из: ${ALLOWED_STATUSES.join(", ")}`
        });
    }

    const updates = { status };
    if(status === "read") updates.read_at = new Date().toISOString();

    const { data, error } = await supabase
        .from(TABLE)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

    if(error) return res.status(500).json({ error: error.message });
    if(!data) return res.status(404).json({ error: "Письмо с таким id не найдено." });

    if(status === "read"){
        logEvent(supabase, data.owner_code, "letter_read");
    }

    res.json(data);
});

module.exports = router;
module.exports.resetLettersForOwner = resetLettersForOwner;
