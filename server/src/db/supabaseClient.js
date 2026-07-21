const { createClient } = require("@supabase/supabase-js");
const config = require("../config");

// Если .env не заполнен — клиент просто не создаётся, а маршруты в
// routes/letters.js вернут понятную ошибку вместо падения сервера.
let supabase = null;

if(config.supabase.url && config.supabase.secretKey){
    supabase = createClient(config.supabase.url, config.supabase.secretKey);
} else {
    console.warn(
        "[supabase] SUPABASE_URL / SUPABASE_SECRET_KEY не заданы в .env — " +
        "клиент не создан, маршруты /letters будут отвечать 503."
    );
}

module.exports = supabase;
