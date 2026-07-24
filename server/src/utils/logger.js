// Журнал событий пользователя (таблица logs) — питает ленту Timeline в
// Developer Panel (Monitoring Mode). Логирование никогда не должно ломать
// основной запрос, поэтому ошибки только предупреждают в консоль.
async function logEvent(supabase, ownerCode, eventType, data = {}) {
    if (!supabase || !ownerCode) return;
    try {
        await supabase.from("logs").insert({ owner_code: ownerCode, event_type: eventType, data });
    } catch (err) {
        console.warn("[logger] Не удалось записать событие:", err.message);
    }
}

module.exports = { logEvent };
