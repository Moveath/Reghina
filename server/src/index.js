const express = require("express");
const cors = require("cors");
const config = require("./config");
const lettersRouter = require("./routes/letters");
const profileRouter = require("./routes/profile");

// Побочный эффект импорта: если TELEGRAM_BOT_TOKEN задан, запускает
// long polling и подписывается на ответы Егора (см. telegram/bot.js).
require("./telegram/bot");

const app = express();

// CLIENT_ORIGIN может содержать несколько адресов через запятую (например,
// локальная разработка через Live Server + опубликованный сайт) — cors
// принимает массив и сверяет Origin запроса с каждым из них.
const allowedOrigins = config.clientOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : "*" }));
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/letters", lettersRouter);
app.use("/profile", profileRouter);

app.listen(config.port, () => {
    console.log(`[server] Letters API запущен на порту ${config.port}`);
});
