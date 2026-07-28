// Виджет «Письма» — не чат, а почтовая система: собака-почтальон носит
// письма между Региной и Егором. Панель/кнопка (#lettersPanel,
// #lettersButton), closePanels(), toggleLettersPanel() и isIntroCloseLocked()
// определены в js/ui/settings.js — здесь только логика самого виджета и
// обращения к backend (см. server/).

// API_BASE_URL и владение (owner_code) — в js/storage/storage.js, которая
// грузится раньше этого файла (см. index.html) и создаёт код при самом
// первом визите на устройстве.

// Реплики собаки после отправки письма Егору — сюжетный момент (полноэкранная
// сцена через showDogRemark), меняй фразы прямо здесь, ничего больше трогать
// не нужно.
function getDogRemarksAfterSend(){
    return [t("letters_remark_1"), t("letters_remark_2"), t("letters_remark_3")];
}

// Короткая реплика для лёгкого уведомления-тоста, когда новое письмо
// приходит прямо во время активной сессии (см. showLettersToast в
// loadInbox) — не сюжетный момент, окно диалога не открывается.
function getLettersToastNewLetterText(){
    return t("letters_new_toast");
}

function getLetterStatusInfo(){
    return {
        pending: { icon: "⏳", label: t("letters_status_pending") },
        delivered: { icon: "📨", label: t("letters_status_delivered") },
        read: { icon: "✓", label: t("letters_status_read") }
    };
}

// Собака "стоит рядом с почтой", а не сама себе шлёт письма — это просто
// постоянная подсказка вверху папок, не запись в таблице letters: не письмо,
// без даты/статуса, не считается в непрочитанных, показывается заново при
// каждом открытии папки. Имя берём то, что задали в самом начале интро
// (см. saveDogName/loadDogName в dialogue.js) — тут просто читаем то же
// значение из localStorage напрямую, как и settings.js.
function getDogName(){
    try { return localStorage.getItem("dog_name") || t("letters_dog_fallback_name"); } catch(e) { return t("letters_dog_fallback_name"); }
}

function getDogInboxNoteText(){
    return t("letters_inbox_note").replace("{name}", getDogName());
}

function getDogOutboxNoteText(){
    return t("letters_outbox_note");
}

// Множественное число слова "письмо/письма/писем" — только для русского,
// у английского и румынского простая форма единственное/множественное.
function pluralizeLettersRu(count){
    const mod10 = count % 10;
    const mod100 = count % 100;
    if(mod10 === 1 && mod100 !== 11) return "письмо";
    if([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "письма";
    return "писем";
}

function pluralizeLetters(count){
    const lang = typeof getSelectedLanguage === "function" ? getSelectedLanguage() : "ru";
    if(lang === "en") return count === 1 ? "letter" : "letters";
    if(lang === "ro") return count === 1 ? "scrisoare" : "scrisori";
    return pluralizeLettersRu(count);
}

// Сюжетная реплика при возвращении на сайт, если за время отсутствия
// накопились непрочитанные письма — количество всегда настоящее, из
// inboxCache, не захардкожено.
function buildWelcomeBackText(count){
    return t("letters_welcome_back").replace("{count}", count).replace("{word}", pluralizeLetters(count));
}

function pickRandom(list){
    return list[Math.floor(Math.random() * list.length)];
}

function escapeHtml(str){
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

const dateLocaleByLanguage = { ru: "ru-RU", en: "en-US", ro: "ro-RO" };

function formatDateTime(iso){
    const date = new Date(iso);
    if(Number.isNaN(date.getTime())) return "";
    const lang = typeof getSelectedLanguage === "function" ? getSelectedLanguage() : "ru";
    const locale = dateLocaleByLanguage[lang] || "ru-RU";
    const datePart = date.toLocaleDateString(locale);
    const timePart = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    return `${datePart}, ${timePart}`;
}

async function apiRequest(path, options){
    const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: { "Content-Type": "application/json" },
        ...options
    });
    if(!res.ok){
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
}

// Все запросы к письмам требуют owner_code — дожидаемся его (обычно он уже
// готов к этому моменту, ensureOwnerCode вызывается сразу при загрузке
// storage.js) перед каждым обращением к серверу.
const fetchInbox = async () => apiRequest(`/letters/inbox?owner_code=${await ensureOwnerCode()}`);
const fetchOutbox = async () => apiRequest(`/letters/outbox?owner_code=${await ensureOwnerCode()}`);
const sendLetterRequest = async (message) => apiRequest("/letters", {
    method: "POST",
    body: JSON.stringify({ message, owner_code: await ensureOwnerCode() })
});
const markLetterRead = (id) => apiRequest(`/letters/${id}`, { method: "PATCH", body: JSON.stringify({ status: "read" }) });

let lettersView = "folders"; // folders | outbox | inbox | compose
let outboxCache = [];
let inboxCache = [];
let knownInboxIds = null; // null = ещё ни разу не грузили (не путать с "писем нет")
let pollTimer = null;

// Решение "показывать ли реплику про непрочитанное письмо" принимается
// внутри самой первой loadInbox() (см. isInitialLoad ниже), но реально
// ПОКАЗЫВАЕТСЯ только по команде js/character/returningGreeting.js — это
// шаг №2 в общей очереди приветствия (ключ -> письма -> музыка -> обычная
// фраза), и должен ждать своей очереди, а не выскакивать наперегонки с
// ключом. resolveLetterGreetingReady разрешает letterGreetingReadyPromise
// один раз, как только решение принято.
let resolveLetterGreetingReady = null;
const letterGreetingReadyPromise = new Promise(resolve => { resolveLetterGreetingReady = resolve; });

// Вызывается из returningGreeting.js. onDone(true) — если реплика реально
// показалась (и уже закрылась), onDone(false) — если показывать было
// нечего или показ не удался (например, экран сейчас занят чем-то другим).
window.checkLetterGreeting = function checkLetterGreeting(onDone){
    const done = typeof onDone === "function" ? onDone : () => {};
    letterGreetingReadyPromise.then(({ shouldShow, text }) => {
        if(shouldShow && typeof showDogRemark === "function"){
            const started = showDogRemark(text, "happy", () => done(true));
            if(!started) done(false);
        } else {
            done(false);
        }
    });
};

// Красный счётчик на иконке — реальное число непрочитанных из inboxCache.
//
// Во время интро иконка "Письма" сначала просто показывается/пульсирует
// (реплика 31, highlightTarget), и только следующая реплика (32,
// showNotificationBadge) по сюжету "приносит" письмо — до этого момента
// значок непрочитанного держим скрытым, даже если в inboxCache уже реально
// лежит непрочитанное (например, Регина заходит не в первый раз, или письмо
// было отправлено заранее) — иначе значок вспыхивает на шаг раньше, чем
// нужно по сценарию. window.introLetterBadgeUnlocked выставляется в
// js/dialogue/dialogue.js ровно в момент реплики 32.
function introLetterBadgeGateOpen(){
    return !document.body.classList.contains("intro-active") || !!window.introLetterBadgeUnlocked;
}

function updateUnreadBadge(){
    if(!lettersButton) return;
    const unreadCount = inboxCache.filter(letter => letter.status !== "read").length;

    if(unreadCount > 0 && introLetterBadgeGateOpen()){
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
            <button class="letters-back-btn" type="button" aria-label="${t("letters_back_aria")}">←</button>
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
            <div class="letter-read-paper">
                <div class="letter-read-paper__cap letter-read-paper__cap--top"></div>
                <div class="letter-read-paper__body">
                    <p class="letter-read-card__meta"></p>
                    <p class="letter-read-card__text"></p>
                </div>
                <div class="letter-read-paper__cap letter-read-paper__cap--bottom">
                    <div class="letter-read-paper__seal"></div>
                </div>
            </div>
            <button class="letter-read-card__close" type="button" aria-label="${t("letters_close_aria")}">✕</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Кнопка закрытия — сосед бумаги, а не потомок: .letter-read-paper
    // может скроллиться при длинном письме, а крестик должен оставаться
    // на месте, у угла .letter-read-wrap.
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
        <h3 class="settings-panel__title">${t("letters_panel_title")}</h3>
        <div class="letters-folders">
            <button class="letter-folder" type="button" data-folder="outbox">
                <span class="letter-folder__icon">📤</span>
                <span class="letter-folder__label">${t("letters_outbox_label")}</span>
            </button>
            <button class="letter-folder" type="button" data-folder="inbox">
                <span class="letter-folder__icon">📥</span>
                <span class="letter-folder__label">${t("letters_inbox_label")}</span>
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

    const statusInfoDict = getLetterStatusInfo();
    const itemsHtml = outboxCache.length
        ? outboxCache.map(letter => {
            const statusInfo = statusInfoDict[letter.status] || statusInfoDict.pending;
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
        : `<p class="letters-empty">${t("letters_empty_outbox")}</p>`;

    lettersPanel.innerHTML = `
        ${renderBackHeader(t("letters_outbox_label"))}
        <div class="letters-dog-note">
            <span class="letters-dog-note__author">🐶 ${escapeHtml(getDogName())}:</span>
            <p class="letters-dog-note__text">${escapeHtml(getDogOutboxNoteText())}</p>
        </div>
        <div class="letters-divider"></div>
        <ul class="letters-list">${itemsHtml}</ul>
        <button class="letters-compose-btn" type="button">${t("letters_compose_btn")}</button>
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
                ${letter.status !== "read" ? `<span class="letter-item__new-badge">${t("letters_new_badge")}</span>` : ""}
                <p class="letter-item__text">${escapeHtml(letter.message)}</p>
                <div class="letter-item__meta">
                    <span class="letter-item__date">${formatDateTime(letter.created_at)}</span>
                </div>
            </li>
        `).join("")
        : `<p class="letters-empty">${t("letters_empty_inbox")}</p>`;

    lettersPanel.innerHTML = `
        ${renderBackHeader(t("letters_inbox_label"))}
        <div class="letters-dog-note">
            <span class="letters-dog-note__author">🐶 ${escapeHtml(getDogName())}:</span>
            <p class="letters-dog-note__text">${escapeHtml(getDogInboxNoteText())}</p>
        </div>
        <div class="letters-divider"></div>
        <h4 class="letters-section-label">${t("letters_section_label")}</h4>
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
                    if(typeof window.diaryTrackActivity === "function") window.diaryTrackActivity("letter_read");
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
        ${renderBackHeader(t("letters_compose_btn"))}
        <textarea class="letters-compose-input" placeholder="${t("letters_compose_placeholder")}" maxlength="1000"></textarea>
        <p class="letters-compose-error" hidden></p>
        <button class="letters-compose-send" type="button">${t("letters_send_btn")}</button>
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
                showDogRemark(pickRandom(getDogRemarksAfterSend()));
            }
        } catch(err){
            console.error("[letters] Не удалось отправить письмо:", err.message);
            errorEl.textContent = t("letters_send_error");
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
            if(list) list.innerHTML = `<p class="letters-empty">${t("letters_load_error")}</p>`;
        }
    }
}

async function loadInbox(){
    try {
        const fresh = await fetchInbox();
        const isInitialLoad = knownInboxIds === null;

        if(isInitialLoad){
            // Возвращение на сайт (или первое устройство/браузер видит уже
            // существующую переписку) — реплика с реальным числом
            // непрочитанных, но только для тех, о ком ещё не рассказывали,
            // и только ПОСЛЕ интро (во время самого интро есть свой
            // собственный шаг pauseForLetterRead — не дублируем его). Сам
            // ПОКАЗ реплики (и очередь письма -> музыка -> обычная фраза)
            // управляется из js/character/returningGreeting.js — здесь
            // только решаем, есть ли что показать, и передаём решение через
            // letterGreetingReadyPromise (см. window.checkLetterGreeting
            // выше), чтобы не показать её раньше ключа.
            const unread = fresh.filter(letter => letter.status !== "read");
            const notified = loadNotifiedUnreadIds();
            const hasUnannounced = unread.some(letter => !notified.has(letter.id));
            const introDone = typeof isIntroAlreadyCompleted === "function" ? isIntroAlreadyCompleted() : true;
            const shouldShow = introDone && unread.length > 0 && hasUnannounced;

            saveNotifiedUnreadIds(new Set(unread.map(letter => letter.id)));
            resolveLetterGreetingReady({ shouldShow, text: shouldShow ? buildWelcomeBackText(unread.length) : null });
        } else {
            // Уже в активной сессии: новое письмо получает лёгкий тост, а
            // не сюжетную сцену — не мешаем тому, чем сейчас занята Регина.
            const newOnes = fresh.filter(letter => !knownInboxIds.has(letter.id));
            if(newOnes.length > 0){
                showLettersToast(getLettersToastNewLetterText());
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
            if(list) list.innerHTML = `<p class="letters-empty">${t("letters_load_error")}</p>`;
        }
        // Первая загрузка упала до того, как решение "показывать ли письмо"
        // было принято — resolveLetterGreetingReady ещё ни разу не вызван, и
        // window.checkLetterGreeting() иначе ждала бы её вечно, блокируя всю
        // очередь приветствия (письма -> музыка -> обычная фраза) навсегда.
        if(knownInboxIds === null && resolveLetterGreetingReady){
            resolveLetterGreetingReady({ shouldShow: false, text: null });
            resolveLetterGreetingReady = null;
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
