const { TelegramBot } = require("node-telegram-bot-api");
const config = require("../config");
const supabase = require("../db/supabaseClient");

const TABLE = "letters";

let bot = null;

if(config.telegram.botToken){
    bot = new TelegramBot(config.telegram.botToken, { polling: true });
    console.log("[telegram] Бот запущен (long polling).");
} else {
    console.warn(
        "[telegram] TELEGRAM_BOT_TOKEN не задан в .env — бот не запущен, " +
        "письма Егору отправляться не будут, а его ответы не будут приниматься."
    );
}

// Собака-почтальон относит письмо Регины Егору в Telegram. Возвращает
// telegram message_id при успехе, иначе null (например, бот не настроен,
// или Егор ещё ни разу не писал боту — Telegram не даёт написать первым).
async function sendLetterToEgor(letter){
    if(!bot || !config.telegram.egorChatId) return null;

    const text = `🐶 Новое письмо от Регины\n\nТекст:\n${letter.message}`;

    try {
        const sent = await bot.sendMessage(config.telegram.egorChatId, text);
        return sent.message_id;
    } catch(err){
        console.error("[telegram] Не удалось отправить письмо Егору:", err.message);
        return null;
    }
}

// Егор отвечает боту напрямую в Telegram — каждое такое сообщение сразу
// становится новым входящим письмом для Регины.
if(bot && supabase){
    bot.on("message", async (msg) => {
        // Бот личный — реагируем только на сообщения от самого Егора.
        if(!config.telegram.egorChatId || String(msg.from.id) !== String(config.telegram.egorChatId)) return;
        if(!msg.text) return; // пока только текстовые письма, без фото/голоса
        if(msg.text.startsWith("/")) return; // служебные команды (/start и т.п.) письмами не считаем

        const { error } = await supabase
            .from(TABLE)
            .insert({
                direction: "incoming",
                message: msg.text,
                status: "delivered",
                sender: "egor",
                receiver: "regina",
                telegram_message_id: msg.message_id
            });

        if(error){
            console.error("[telegram] Не удалось сохранить письмо от Егора:", error.message);
        } else {
            console.log("[telegram] Новое письмо от Егора сохранено во «Входящих».");
        }
    });
} else if(bot && !supabase){
    console.warn("[telegram] Supabase не настроен — ответы Егора приниматься не будут.");
}

module.exports = { sendLetterToEgor };
