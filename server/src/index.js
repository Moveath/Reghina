const path = require("path");
const express = require("express");
const cors = require("cors");
const config = require("./config");
const lettersRouter = require("./routes/letters");
const profileRouter = require("./routes/profile");
const developerRouter = require("./routes/developer");
const musicRouter = require("./routes/music");

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

// QR-картинка пазла раньше лежала прямо в репозитории (images/items/qr.png) —
// репозиторий публичный и ссылка на него есть прямо на сайте ("О сайте" →
// код проекта), так что любой, кто туда заглянет, мог найти файл раньше,
// чем Регина сама доберётся до QR через пазл. Отдаём его отсюда как
// статику — тот же путь /qr.png, но уже не в открытом репозитории.
app.use(express.static(path.join(__dirname, "..", "public")));

app.use("/letters", lettersRouter);
app.use("/profile", profileRouter);
app.use("/developer", developerRouter);
app.use("/music", musicRouter);

app.listen(config.port, () => {
    console.log(`[server] Letters API запущен на порту ${config.port}`);
});
