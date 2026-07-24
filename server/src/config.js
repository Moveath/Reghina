require("dotenv").config();

const config = {
    port: process.env.PORT || 3000,
    clientOrigin: process.env.CLIENT_ORIGIN || "*",
    supabase: {
        url: process.env.SUPABASE_URL || "",
        secretKey: process.env.SUPABASE_SECRET_KEY || ""
    },
    telegram: {
        botToken: process.env.TELEGRAM_BOT_TOKEN || "",
        egorChatId: process.env.EGOR_TELEGRAM_ID || ""
    },
    developer: {
        secret: process.env.DEVELOPER_SECRET || ""
    }
};

module.exports = config;
