// Особое событие ко дню рождения (1 октября). Все проверки даты — по
// времени Кишинёва (Europe/Chisinau), независимо от часового пояса
// посетителя, поэтому дата не берётся напрямую из new Date() локали
// браузера, а вычисляется явно через Intl с фиксированным timeZone.
//
// Сама сцена (диалог, подарок, ключ, открытие части) — в
// showBirthdayEventDialogue (js/dialogue/dialogue.js), реплики — в
// data/dialogues/birthday.js. Здесь только: определить дату/сценарий,
// решить "показывать ли вообще", переключить праздничный образ собаки и
// дёрнуть существующий window.checkMonthlyKey — новый ключ ко дню рождения
// это ТОТ ЖЕ ежемесячный ключ (см. server/src/routes/profile.js:
// listEligibleMonths не завязан на конкретное число месяца, только на сам
// месяц), просто показанный по-другому — отдельной серверной механики для
// него нет и не нужно.

const CHISINAU_TIMEZONE = "Europe/Chisinau";
const BIRTHDAY_MONTH = 10; // октябрь
const BIRTHDAY_DAY = 1;

function getChisinauDateParts(date){
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: CHISINAU_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const parts = {};
    formatter.formatToParts(date || new Date()).forEach(part => {
        if(part.type !== "literal") parts[part.type] = Number(part.value);
    });
    return { year: parts.year, month: parts.month, day: parts.day };
}

function birthdaySeenStorageKey(year){
    return `birthday_event_seen_${year}`;
}

function hasSeenBirthdayEvent(year){
    try { return localStorage.getItem(birthdaySeenStorageKey(year)) === "true"; } catch(e){ return false; }
}

function markBirthdayEventSeen(year){
    try { localStorage.setItem(birthdaySeenStorageKey(year), "true"); } catch(e) {}
}

// Праздничный образ собаки — активен ВЕСЬ день 1 октября по времени
// Кишинёва (00:00-24:00), независимо от того, увидела ли Регина уже сцену
// или нет. Пока только переключение класса — саму картинку/образ добавлю
// позже (см. запрос пользователя), поэтому здесь намеренно нет обращения к
// несуществующему файлу картинки (сломанная картинка схлопывает собаку
// невидимой, это уже случалось раньше в проекте).
function isBirthdayVisualWindow(date){
    const parts = getChisinauDateParts(date);
    return parts.month === BIRTHDAY_MONTH && parts.day === BIRTHDAY_DAY;
}

function updateBirthdayVisualMode(){
    if(typeof characterContainer === "undefined" || !characterContainer) return;
    characterContainer.classList.toggle("is-birthday-mode", isBirthdayVisualWindow());
}

updateBirthdayVisualMode();
// На случай, если вкладка остаётся открытой через полночь по Кишинёву —
// перепроверяем не реже, чем раз в несколько минут, а не только при загрузке.
setInterval(updateBirthdayVisualMode, 5 * 60 * 1000);

// Вызывается из js/character/returningGreeting.js — самый первый шаг в
// очереди приветствия, раньше ежемесячного ключа/писем/музыки/обычной
// фразы. onDone(true) — сцена дня рождения показалась и уже полностью
// закрылась (включая открытие части); onDone(false) — сегодня не тот день,
// событие в этом году уже видели, или ключа на этот раз не оказалось.
window.checkBirthdayEvent = function checkBirthdayEvent(onDone){
    const done = typeof onDone === "function" ? onDone : () => {};

    const introDone = typeof isIntroAlreadyCompleted === "function" ? isIntroAlreadyCompleted() : true;
    if(!introDone){ done(false); return; }

    const parts = getChisinauDateParts();
    if(parts.month < BIRTHDAY_MONTH || hasSeenBirthdayEvent(parts.year)){ done(false); return; }

    if(typeof window.checkMonthlyKey !== "function"){ done(false); return; }

    const isExactDay = parts.month === BIRTHDAY_MONTH && parts.day === BIRTHDAY_DAY;
    let shown = false;

    window.checkMonthlyKey(undefined, (pieceIndex) => {
        shown = true;
        markBirthdayEventSeen(parts.year);
        if(typeof window.showBirthdayEventDialogue === "function"){
            window.showBirthdayEventDialogue(isExactDay, pieceIndex, () => done(true));
        } else {
            done(true);
        }
    }).then((result) => {
        // Колбэк выше не вызвался — сервер сказал, что ключа сейчас нет
        // (например, месяц уже забирали раньше обычным способом, или пазл
        // уже полностью собран). Флаг НЕ ставим — если это временная
        // причина, попробуем снова при следующем визите.
        if(!shown && (!result || !result.granted)) done(false);
    }).catch(() => {
        if(!shown) done(false);
    });
};
