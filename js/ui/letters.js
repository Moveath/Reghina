// Виджет «Письма» — не чат, а почтовая система: собака-почтальон носит
// письма между Региной и Егором. Панель/кнопка (#lettersPanel,
// #lettersButton), closePanels(), toggleLettersPanel() и isIntroCloseLocked()
// определены в js/ui/settings.js — здесь только логика самого виджета и
// обращения к backend (см. server/).

// Единственное место, которое нужно поменять при переносе backend'а
// куда-то ещё, кроме локального компьютера. Порт 3001, а не 3000 — см.
// комментарий в server/.env.example (3000 часто занят сторонним софтом).
const API_BASE_URL = "http://127.0.0.1:3001";

// Реплики собаки после отправки письма Егору — сюжетный момент (полноэкранная
// сцена через showDogRemark), меняй фразы прямо здесь, ничего больше трогать
// не нужно.
const dogRemarksAfterSend = [
    "Не переживай, я обязательно передам это Егору.",
    "Хорошо, я отнесу это письмо.",
    "Думаю, Егору будет интересно это прочитать."
];

// Короткая реплика для лёгкого уведомления-тоста, когда новое письмо
// приходит прямо во время активной сессии (см. showLettersToast в
// loadInbox) — не сюжетный момент, окно диалога не открывается.
const lettersToastNewLetterText = "Для тебя пришло новое письмо.";

const letterStatusInfo = {
    pending: { icon: "⏳", label: "Ожидает передачи" },
    delivered: { icon: "📨", label: "Передано Егору" },
    read: { icon: "✓", label: "Прочитано" }
};

// Собака "стоит рядом с почтой", а не сама себе шлёт письма — это просто
// постоянная подсказка вверху папок, не запись в таблице letters: не письмо,
// без даты/статуса, не считается в непрочитанных, показывается заново при
// каждом открытии папки. Имя берём то, что задали в самом начале интро
// (см. saveDogName/loadDogName в dialogue.js) — тут просто читаем то же
// значение из localStorage напрямую, как и settings.js.
function getDogName(){
    try { return localStorage.getItem("dog_name") || "Кане-корсо"; } catch(e) { return "Кане-корсо"; }
}

function getDogInboxNoteText(){
    return `Привет! Меня зовут ${getDogName()}, и с этого момента я — твой почтовый пёс. Все письма от Егора будут появляться прямо здесь 🐾`;
}

function getDogOutboxNoteText(){
    return "Здесь можешь написать что-нибудь Егору — я обязательно всё передам.";
}

function pluralizeLetters(count){
    const mod10 = count % 10;
    const mod100 = count % 100;
    if(mod10 === 1 && mod100 !== 11) return "письмо";
    if([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "письма";
    return "писем";
}

// Сюжетная реплика при возвращении на сайт, если за время отсутствия
// накопились непрочитанные письма — количество всегда настоящее, из
// inboxCache, не захардкожено.
function buildWelcomeBackText(count){
    return `Пока тебя не было, Егор оставил ${count} ${pluralizeLetters(count)}. Он попросил меня передать их тебе. Загляни во входящие 🐾`;
}

function pickRandom(list){
    return list[Math.floor(Math.random() * list.length)];
}

function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatDateTime(iso){
    const date = new Date(iso);
    if(Number.isNaN(date.getTime())) return "";
    const datePart = date.toLocaleDateString("ru-RU");
    const timePart = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    return `${datePart}, ${timePart}`;
}

async function apiRequest(path, options){
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options
    });
    if(!res.ok){
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Ошибка запроса: ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
}

const fetchInbox = () => apiRequest("/letters/inbox");
const fetchOutbox = () => apiRequest("/letters/outbox");
const sendLetterRequest = (message) => apiRequest("/letters", { method: "POST", body: JSON.stringify({ message }) });
const markLetterRead = (id) => apiRequest(`/letters/${id}`, { method: "PATCH", body: JSON.stringify({ status: "read" }) });

// Письма живут в Supabase, а не в localStorage — поэтому "Сбросить прогресс"
// (см. resetAllProgress в dialogue.js) отдельно просит сервер стереть всю
// историю писем и вернуть стартовое состояние, прежде чем перезагрузить
// страницу.
async function resetLettersOnServer(){
    try {
        await apiRequest("/letters/reset", { method: "POST" });
    } catch(err){
        console.error("[letters] Не удалось сбросить письма на сервере:", err.message);
    }
}
window.resetLettersOnServer = resetLettersOnServer;

let lettersView = "folders"; // folders | outbox | inbox | compose
let outboxCache = [];
let inboxCache = [];
let knownInboxIds = null; // null = ещё ни разу не грузили (не путать с "писем нет")
let pollTimer = null;

// Красный счётчик на иконке — реальное число непрочитанных из inboxCache.
function updateUnreadBadge(){
    if(!lettersButton) return;
    const unreadCount = inboxCache.filter(letter => letter.status !== "read").length;

    if(unreadCount > 0){
        lettersButton.classList.add("has-unread");
        lettersButton.dataset.count = String(unreadCount);
    } else {
        lettersButton.classList.remove("has-unread");
        delete lettersButton.dataset.count;
    }
}

function renderBackHeader(title){
    return `
        <div class="letters-list-header">
            <button class="letters-back-btn" type="button" aria-label="Назад">←</button>
            <h3 class="settings-panel__title">${title}</h3>
        </div>
    `;
}

function bindBackButton(){
    const backBtn = lettersPanel.querySelector(".letters-back-btn");
    if(backBtn){
        backBtn.addEventListener("click", (event) => {
            event.stopPropagation();
            renderFoldersView();
        });
    }
}

// Полноэкранное "чтение" письма — большая карточка-бумага по центру,
// размер подстраивается под длину текста, фон затемнён. Закрывается
// кликом по фону или крестиком.
let letterReadModalElement = null;

function ensureLetterReadModal(){
    if(letterReadModalElement) return letterReadModalElement;

    const modal = document.createElement("div");
    modal.id = "letterReadModal";
    modal.className = "letter-read-modal";
    modal.innerHTML = `
        <div class="letter-read-wrap">
            <div class="letter-read-card">
                <p class="letter-read-card__meta"></p>
                <p class="letter-read-card__text"></p>
            </div>
            <button class="letter-read-card__close" type="button" aria-label="Закрыть">✕</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Кнопка закрытия — сосед карточки, а не потомок: у карточки рваные
    // края через clip-path, который обрезал бы и кнопку, окажись она внутри.
    modal.addEventListener("click", () => closeLetterReadModal());
    modal.querySelector(".letter-read-wrap").addEventListener("click", (event) => event.stopPropagation());
    modal.querySelector(".letter-read-card__close").addEventListener("click", (event) => {
        event.stopPropagation();
        closeLetterReadModal();
    });

    letterReadModalElement = modal;
    return modal;
}

function openLetterReadModal(letter){
    // Виджет "Письма" (папки/список) прячется целиком — на экране должно
    // остаться только само письмо, ничего от панели не должно просвечивать
    // ни под карточкой, ни по её краям.
    if(lettersPanel) lettersPanel.classList.remove("is-open");

    const modal = ensureLetterReadModal();
    modal.querySelector(".letter-read-card__meta").textContent = formatDateTime(letter.created_at);
    modal.querySelector(".letter-read-card__text").textContent = letter.message;
    modal.classList.add("is-open");
}

function closeLetterReadModal(){
    if(letterReadModalElement) letterReadModalElement.classList.remove("is-open");

    // Сюжет продолжается только после ПОЛНОГО закрытия письма, не после
    // открытия — иначе следующая реплика интро успевает выехать поверх ещё
    // не закрытой карточки (см. pauseForLetterRead в dialogue.js). Вызов
    // безопасен и в любой другой момент — resumeIntroAfterLetterRead сам
    // ничего не делает, если интро сейчас не ждёт именно этого.
    if(typeof window.notifyLetterRead === "function") window.notifyLetterRead();
}

// Лёгкое ненавязчивое уведомление (не сюжетный диалог, не блокирует
// интерфейс) — для новых писем, пришедших прямо во время активной сессии.
let lettersToastElement = null;
let lettersToastTimer = null;

function ensureLettersToast(){
    if(lettersToastElement) return lettersToastElement;

    const toast = document.createElement("div");
    toast.id = "lettersToast";
    toast.className = "letters-toast";
    document.body.appendChild(toast);

    lettersToastElement = toast;
    return toast;
}

function showLettersToast(text){
    const toast = ensureLettersToast();
    toast.textContent = text;
    toast.classList.add("is-visible");

    clearTimeout(lettersToastTimer);
    lettersToastTimer = setTimeout(() => {
        toast.classList.remove("is-visible");
    }, 3400);
}

// Список id непрочитанных писем, о которых Регина уже так или иначе
// узнала (тостом во время сессии или сюжетной репликой при возвращении) —
// чтобы одно и то же письмо не анонсировалось повторно на каждой
// перезагрузке страницы.
const notifiedUnreadIdsStorageKey = "reginaLettersNotifiedUnreadIds";

function loadNotifiedUnreadIds(){
    try {
        const raw = localStorage.getItem(notifiedUnreadIdsStorageKey);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch(e) { return new Set(); }
}

function saveNotifiedUnreadIds(ids){
    try { localStorage.setItem(notifiedUnreadIdsStorageKey, JSON.stringify([...ids])); } catch(e) {}
}

function renderFoldersView(){
    lettersView = "folders";
    const unreadCount = inboxCache.filter(letter => letter.status !== "read").length;

    lettersPanel.innerHTML = `
        <h3 class="settings-panel__title">Письма</h3>
        <div class="letters-folders">
            <button class="letter-folder" type="button" data-folder="outbox">
                <span class="letter-folder__icon">📤</span>
                <span class="letter-folder__label">Исходящие</span>
            </button>
            <button class="letter-folder" type="button" data-folder="inbox">
                <span class="letter-folder__icon">📥</span>
                <span class="letter-folder__label">Входящие</span>
                ${unreadCount > 0 ? `<span class="letter-folder__badge">${unreadCount}</span>` : ""}
            </button>
        </div>
    `;

    lettersPanel.querySelector('[data-folder="outbox"]').addEventListener("click", (event) => {
        event.stopPropagation();
        renderOutboxView();
        loadOutbox().then(() => { if(lettersView === "outbox") renderOutboxView(); });
    });
    lettersPanel.querySelector('[data-folder="inbox"]').addEventListener("click", (event) => {
        event.stopPropagation();
        renderInboxView();
        loadInbox();
    });
}

function renderOutboxView(){
    lettersView = "outbox";

    const itemsHtml = outboxCache.length
        ? outboxCache.map(letter => {
            const statusInfo = letterStatusInfo[letter.status] || letterStatusInfo.pending;
            return `
                <li class="letter-item">
                    <p class="letter-item__text">${escapeHtml(letter.message)}</p>
                    <div class="letter-item__meta">
                        <span class="letter-item__date">${formatDateTime(letter.created_at)}</span>
                        <span class="letter-item__status letter-item__status--${letter.status}">${statusInfo.icon} ${statusInfo.label}</span>
                    </div>
                </li>
            `;
        }).join("")
        : `<p class="letters-empty">Пока ничего не отправлено.</p>`;

    lettersPanel.innerHTML = `
        ${renderBackHeader("Исходящие")}
        <div class="letters-dog-note">
            <span class="letters-dog-note__author">🐶 ${escapeHtml(getDogName())}:</span>
            <p class="letters-dog-note__text">${escapeHtml(getDogOutboxNoteText())}</p>
        </div>
        <div class="letters-divider"></div>
        <ul class="letters-list">${itemsHtml}</ul>
        <button class="letters-compose-btn" type="button">Написать Егору</button>
    `;

    bindBackButton();
    lettersPanel.querySelector(".letters-compose-btn").addEventListener("click", (event) => {
        event.stopPropagation();
        renderComposeView();
    });
}

function renderInboxView(){
    lettersView = "inbox";

    const itemsHtml = inboxCache.length
        ? inboxCache.map(letter => `
            <li class="letter-item ${letter.status !== "read" ? "letter-item--unread" : ""}" data-id="${letter.id}">
                ${letter.status !== "read" ? `<span class="letter-item__new-badge">● Новое</span>` : ""}
                <p class="letter-item__text">${escapeHtml(letter.message)}</p>
                <div class="letter-item__meta">
                    <span class="letter-item__date">${formatDateTime(letter.created_at)}</span>
                </div>
            </li>
        `).join("")
        : `<p class="letters-empty">Егор пока ничего не присылал.</p>`;

    lettersPanel.innerHTML = `
        ${renderBackHeader("Входящие")}
        <div class="letters-dog-note">
            <span class="letters-dog-note__author">🐶 ${escapeHtml(getDogName())}:</span>
            <p class="letters-dog-note__text">${escapeHtml(getDogInboxNoteText())}</p>
        </div>
        <div class="letters-divider"></div>
        <h4 class="letters-section-label">✉️ Письма</h4>
        <ul class="letters-list">${itemsHtml}</ul>
    `;

    bindBackButton();

    // Клик по любому письму открывает его целиком (см. openLetterReadModal)
    // — как настоящее письмо на бумаге, а не просто меняет цвет строки.
    // Непрочитанные при этом отмечаются прочитанными.
    lettersPanel.querySelectorAll(".letter-item").forEach(item => {
        item.addEventListener("click", async (event) => {
            event.stopPropagation();
            const id = item.dataset.id;
            const letter = inboxCache.find(l => l.id === id);
            if(!letter) return;

            openLetterReadModal(letter);

            if(letter.status !== "read"){
                item.classList.remove("letter-item--unread");
                const badge = item.querySelector(".letter-item__new-badge");
                if(badge) badge.remove();

                try {
                    await markLetterRead(id);
                    // Ищем письмо заново в АКТУАЛЬНОМ inboxCache, а не мутируем
                    // объект, пойманный до await: пока PATCH летел, параллельный
                    // loadInbox() (например, от открытия самой папки) мог
                    // переприсвоить inboxCache новым массивом — старая ссылка
                    // тогда уже ни на что живое не указывает, и статус "read"
                    // просто терялся бы.
                    const current = inboxCache.find(l => l.id === id);
                    if(current) current.status = "read";
                    updateUnreadBadge();
                } catch(err){
                    console.error("[letters] Не удалось отметить письмо прочитанным:", err.message);
                }
                // Сценарий интро продолжается не отсюда — только когда
                // карточка письма реально закроется, см. closeLetterReadModal.
            }
        });
    });
}

function renderComposeView(){
    lettersView = "compose";

    lettersPanel.innerHTML = `
        ${renderBackHeader("Написать Егору")}
        <textarea class="letters-compose-input" placeholder="Что бы ты хотела передать?" maxlength="1000"></textarea>
        <p class="letters-compose-error" hidden></p>
        <button class="letters-compose-send" type="button">Отправить</button>
    `;

    bindBackButton();

    const input = lettersPanel.querySelector(".letters-compose-input");
    const sendBtn = lettersPanel.querySelector(".letters-compose-send");
    const errorEl = lettersPanel.querySelector(".letters-compose-error");
    input.focus();

    sendBtn.addEventListener("click", async (event) => {
        event.stopPropagation();
        const message = input.value.trim();
        if(!message) return;

        errorEl.hidden = true;
        sendBtn.disabled = true;
        try {
            const created = await sendLetterRequest(message);
            outboxCache.unshift(created);
            renderOutboxView();
            if(typeof showDogRemark === "function"){
                showDogRemark(pickRandom(dogRemarksAfterSend));
            }
        } catch(err){
            console.error("[letters] Не удалось отправить письмо:", err.message);
            errorEl.textContent = "Не получилось отправить — похоже, собака сейчас не на связи. Попробуй ещё раз.";
            errorEl.hidden = false;
            sendBtn.disabled = false;
        }
    });
}

async function loadOutbox(){
    try {
        outboxCache = await fetchOutbox();
    } catch(err){
        console.error("[letters] Не удалось загрузить исходящие:", err.message);
        if(lettersView === "outbox"){
            const list = lettersPanel.querySelector(".letters-list");
            if(list) list.innerHTML = `<p class="letters-empty">Не получилось загрузить письма — попробуй позже.</p>`;
        }
    }
}

async function loadInbox(){
    try {
        const fresh = await fetchInbox();
        const isInitialLoad = knownInboxIds === null;

        if(isInitialLoad){
            // Возвращение на сайт (или первое устройство/браузер видит уже
            // существующую переписку) — сюжетная реплика с реальным числом
            // непрочитанных, но только для тех, о ком ещё не рассказывали,
            // и только ПОСЛЕ интро (во время самого интро есть свой
            // собственный шаг pauseForLetterRead — не дублируем его).
            const unread = fresh.filter(letter => letter.status !== "read");
            const notified = loadNotifiedUnreadIds();
            const hasUnannounced = unread.some(letter => !notified.has(letter.id));
            const introDone = typeof isIntroAlreadyCompleted === "function" ? isIntroAlreadyCompleted() : true;

            if(introDone && unread.length > 0 && hasUnannounced && typeof showDogRemark === "function"){
                showDogRemark(buildWelcomeBackText(unread.length));
            }
            saveNotifiedUnreadIds(new Set(unread.map(letter => letter.id)));
        } else {
            // Уже в активной сессии: новое письмо получает лёгкий тост, а
            // не сюжетную сцену — не мешаем тому, чем сейчас занята Регина.
            const newOnes = fresh.filter(letter => !knownInboxIds.has(letter.id));
            if(newOnes.length > 0){
                showLettersToast(lettersToastNewLetterText);
                const notified = loadNotifiedUnreadIds();
                newOnes.forEach(letter => notified.add(letter.id));
                saveNotifiedUnreadIds(notified);
            }
        }

        // Перерисовываем список, только если данные реально изменились —
        // иначе повторный вызов loadInbox() (например, сразу вслед за уже
        // синхронным renderInboxView() при открытии папки) на ровном месте
        // подменяет DOM и может "убить" клик, который человек уже начал
        // делать по старому письму, будто ничего не произошло.
        const signature = (list) => list.map(letter => `${letter.id}:${letter.status}`).sort().join("|");
        const dataChanged = signature(fresh) !== signature(inboxCache);

        inboxCache = fresh;
        knownInboxIds = new Set(fresh.map(letter => letter.id));
        updateUnreadBadge();

        if(dataChanged && lettersView === "inbox" && lettersPanel.classList.contains("is-open")){
            renderInboxView();
        }
    } catch(err){
        console.error("[letters] Не удалось загрузить входящие:", err.message);
        if(lettersView === "inbox"){
            const list = lettersPanel.querySelector(".letters-list");
            if(list) list.innerHTML = `<p class="letters-empty">Не получилось загрузить письма — попробуй позже.</p>`;
        }
    }
}

function startInboxPolling(){
    if(pollTimer) return;
    pollTimer = setInterval(loadInbox, 20000);
}

function initLettersWidget(){
    if(!lettersButton || !lettersPanel) return;

    lettersButton.addEventListener("click", (event) => {
        event.stopPropagation();
        const wasOpen = lettersPanel.classList.contains("is-open");
        if(!wasOpen) renderFoldersView();
        toggleLettersPanel();
    });

    loadOutbox();
    loadInbox();
    startInboxPolling();
}

initLettersWidget();
