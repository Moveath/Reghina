const express = require("express");
const cors = require("cors");
const config = require("./config");
const lettersRouter = require("./routes/letters");

// Побочный эффект импорта: если TELEGRAM_BOT_TOKEN задан, запускает
// long polling и подписывается на ответы Егора (см. telegram/bot.js).
require("./telegram/bot");

const app = express();

app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/letters", lettersRouter);

app.listen(config.port, () => {
    console.log(`[server] Letters API запущен на порту ${config.port}`);
});
