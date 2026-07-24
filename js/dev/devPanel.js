// Скрытая Developer Panel. Открывается 5 кликами по собаке (см. жест в
// js/dialogue/dialogue.js, вызывает window.openDeveloperPanel). Сама панель
// не показывает и не меняет ничего без верного DEVELOPER_SECRET — открытие
// жестом само по себе безопасно. Использует API_BASE_URL/getOwnerCode/
// checkMonthlyKey/reconcileWithServer/resetAllProgress из уже загруженных
// storage.js и dialogue.js (классические скрипты делят одну область видимости).

let devPanelElement = null;
let devPanelCurrentCode = "";
let devPanelBundle = null;

let devAccelTimer = null;
let devAccelTestDate = null;
let devAccelIntervalMs = null;
let devAccelCode = null;

// Каждое admin-действие (в т.ч. сама проверка ключа) перестраивает всю
// Admin-вкладку заново — без этого при повторной проверке соседних месяцев
// подряд введённая дата стиралась бы после первого же клика.
let devLastTestDateValue = "";

const devSecretStorageKey = "reginaDevSecret";

function getDevSecret(){
    try { return sessionStorage.getItem(devSecretStorageKey) || ""; } catch(e) { return ""; }
}
function setDevSecret(value){
    try { sessionStorage.setItem(devSecretStorageKey, value); } catch(e) {}
}
function clearDevSecret(){
    try { sessionStorage.removeItem(devSecretStorageKey); } catch(e) {}
}

async function devFetch(path, options){
    options = options || {};
    const headers = Object.assign({ "X-Developer-Secret": getDevSecret() }, options.headers || {});
    if(options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const res = await fetch(`${API_BASE_URL}${path}`, Object.assign({}, options, { headers }));

    if(res.status === 403){
        clearDevSecret();
        throw new Error("secret_invalid");
    }

    let data = null;
    try { data = await res.json(); } catch(e) {}

    if(!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
}

// ===== Мелкие форматтеры =====

function escapeHtml(str){
    return String(str == null ? "" : str).replace(/[&<>"']/g, ch => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
}

function fmtDate(iso){
    if(!iso) return "—";
    try { return new Date(iso).toLocaleString("ru-RU"); } catch(e) { return "—"; }
}

function toLocalInputValue(iso){
    if(!iso) return "";
    const d = new Date(iso);
    if(Number.isNaN(d.getTime())) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const devEventLabels = {
    profile_created: "🆕 Профиль создан",
    restored_by_code: "🔑 Восстановлен по коду",
    progress_reset: "♻️ Прогресс сброшен",
    dialogue_progressed: "💬 Шаг диалога",
    story_completed: "🎉 Сюжет завершён",
    theme_changed: "🎨 Смена темы",
    puzzle_piece_opened: "🧩 Часть пазла открыта",
    puzzle_piece_closed: "🧩 Часть пазла закрыта",
    key_obtained: "🔑 Ключ получен",
    key_used: "🔑 Ключ использован",
    monthly_key_granted: "🗓️ Ежемесячный ключ выдан",
    letter_sent: "✉️ Письмо отправлено",
    letter_read: "📖 Письмо прочитано",
    letter_received: "📬 Письмо получено",
    visit: "👋 Визит на сайт",
    device_changed: "📱 Сменилось устройство"
};

function getEventLabel(type){
    if(devEventLabels[type]) return devEventLabels[type];
    if(typeof type === "string" && type.startsWith("admin_")) return `🛠️ Правка разработчика: ${type.slice(6)}`;
    return type;
}

// Диапазон месяцев для чек-листа в Admin Mode — от начала системы
// ежемесячных ключей (см. KEY_SYSTEM_START_YEAR/MONTH в
// server/src/routes/profile.js — если дата старта там изменится, поправить
// и здесь) до реальной текущей даты + 6 месяцев вперёд про запас для теста.
function buildEligibleMonths(){
    const months = [];
    let year = 2026;
    let month = 9;
    const end = new Date();
    end.setMonth(end.getMonth() + 6);
    const endYear = end.getFullYear();
    const endMonth = end.getMonth() + 1;

    while(year < endYear || (year === endYear && month <= endMonth)){
        months.push(`${year}-${String(month).padStart(2, "0")}`);
        month += 1;
        if(month > 12){ month = 1; year += 1; }
    }
    return months;
}

// Результат последней проверки хранится отдельно от DOM: "Проверить ключ"
// вызывает afterAdminAction, который тут же перестраивает всю Admin-вкладку
// заново с нуля — без этого сообщение появлялось бы и тут же стиралось
// свежей пустой вёрсткой прежде, чем его успевали прочитать.
let devLastMonthlyKeyResultText = "";

function renderMonthlyKeyResult(resultEl, result){
    if(!result) devLastMonthlyKeyResultText = "Ошибка запроса.";
    else if(result.granted) devLastMonthlyKeyResultText = `Выдан ключ за ${result.month}, часть #${result.piece_index + 1}.`;
    else devLastMonthlyKeyResultText = `Ключ не выдан (${result.reason || "нечего выдавать"}).`;
    resultEl.textContent = devLastMonthlyKeyResultText;
}

// ===== Каркас панели =====

function ensureDevPanelElement(){
    if(devPanelElement) return devPanelElement;

    const el = document.createElement("div");
    el.id = "devPanel";
    el.className = "dev-menu";
    document.body.appendChild(el);

    el.addEventListener("click", event => event.stopPropagation());

    devPanelElement = el;
    return el;
}

function setDevStatus(text){
    const statusEl = devPanelElement && devPanelElement.querySelector("#devPanelStatus");
    if(statusEl) statusEl.textContent = text || "";
}

function handleDevError(err){
    if(err && err.message === "secret_invalid"){
        renderSecretGate("Секрет больше не действует, введите заново.");
        return;
    }
    setDevStatus(`Ошибка: ${err ? err.message : "неизвестная"}`);
}

function openDeveloperPanel(){
    ensureDevPanelElement().classList.add("is-open");
    if(getDevSecret()) verifyAndRenderPanel();
    else renderSecretGate();
}
window.openDeveloperPanel = openDeveloperPanel;

function closeDeveloperPanel(){
    if(devPanelElement) devPanelElement.classList.remove("is-open");
    stopAccelMode();
}

document.addEventListener("click", event => {
    if(!devPanelElement || !devPanelElement.classList.contains("is-open")) return;
    if(event.target.closest("#devPanel")) return;
    closeDeveloperPanel();
});

// ===== Экран секрета =====

function renderSecretGate(errorText){
    const el = ensureDevPanelElement();
    el.classList.remove("dev-menu--panel");
    el.innerHTML = `
        <h3 class="dev-menu__title">Developer Panel</h3>
        <p class="dev-menu__text">Введите секрет разработчика</p>
        <div class="dev-menu__section">
            <input id="devSecretInput" class="dev-menu__input" type="password" placeholder="Секрет" autocomplete="off">
        </div>
        <button id="devSecretSubmit" class="dev-menu__btn" type="button">Войти</button>
        ${errorText ? `<p class="dev-menu__hint dev-menu__hint--error">${escapeHtml(errorText)}</p>` : ""}
        <button id="devPanelCloseGate" class="dev-menu__btn" type="button">Закрыть</button>
    `;

    const input = el.querySelector("#devSecretInput");
    const submit = () => trySecret(input.value);

    el.querySelector("#devSecretSubmit").addEventListener("click", submit);
    input.addEventListener("keydown", event => { if(event.key === "Enter") submit(); });
    el.querySelector("#devPanelCloseGate").addEventListener("click", closeDeveloperPanel);

    input.focus();
}

async function trySecret(candidate){
    if(!candidate) return;
    try {
        const res = await fetch(`${API_BASE_URL}/developer/auth`, {
            method: "POST",
            headers: { "X-Developer-Secret": candidate }
        });
        if(!res.ok){
            renderSecretGate("Неверный секрет.");
            return;
        }
        setDevSecret(candidate);
        renderPanelShell();
    } catch(err){
        renderSecretGate("Ошибка сети, попробуйте ещё раз.");
    }
}

async function verifyAndRenderPanel(){
    try {
        const res = await fetch(`${API_BASE_URL}/developer/auth`, {
            method: "POST",
            headers: { "X-Developer-Secret": getDevSecret() }
        });
        if(!res.ok){
            clearDevSecret();
            renderSecretGate();
            return;
        }
        renderPanelShell();
    } catch(err){
        renderSecretGate("Ошибка сети, попробуйте ещё раз.");
    }
}

// ===== Каркас с вкладками =====

function renderPanelShell(){
    const el = ensureDevPanelElement();
    el.classList.add("dev-menu--panel");

    const defaultCode = devPanelCurrentCode ||
        (typeof window.getOwnerCode === "function" ? (window.getOwnerCode() || "") : "");

    el.innerHTML = `
        <div class="dev-panel__header">
            <h3 class="dev-menu__title">Developer Panel</h3>
            <button id="devPanelCloseX" class="dev-panel__close" type="button" aria-label="Закрыть">✕</button>
        </div>
        <div class="dev-panel__code-row">
            <input id="devPanelCode" class="dev-menu__input" type="text" placeholder="OWNER CODE" value="${escapeHtml(defaultCode)}">
            <button id="devPanelLoad" class="dev-menu__btn" type="button">Загрузить</button>
        </div>
        <div class="dev-panel__tabs">
            <button class="dev-panel__tab is-active" data-tab="monitoring" type="button">Наблюдение</button>
            <button class="dev-panel__tab" data-tab="admin" type="button">Управление</button>
        </div>
        <p id="devPanelStatus" class="dev-menu__hint"></p>
        <div id="devPanelMonitoring" class="dev-panel__body"></div>
        <div id="devPanelAdmin" class="dev-panel__body" hidden></div>
    `;

    el.querySelector("#devPanelCloseX").addEventListener("click", closeDeveloperPanel);
    el.querySelectorAll(".dev-panel__tab").forEach(btn => {
        btn.addEventListener("click", () => switchDevTab(btn.dataset.tab));
    });
    el.querySelector("#devPanelLoad").addEventListener("click", () => {
        const code = el.querySelector("#devPanelCode").value.trim().toUpperCase();
        if(code) loadDevCode(code);
    });

    if(defaultCode) loadDevCode(defaultCode);
}

function switchDevTab(tab){
    const el = devPanelElement;
    if(!el) return;
    el.querySelectorAll(".dev-panel__tab").forEach(btn => btn.classList.toggle("is-active", btn.dataset.tab === tab));
    el.querySelector("#devPanelMonitoring").hidden = tab !== "monitoring";
    el.querySelector("#devPanelAdmin").hidden = tab !== "admin";
}

async function loadDevCode(code){
    if(devAccelCode && devAccelCode !== code) stopAccelMode();

    devPanelCurrentCode = code;
    setDevStatus("Загружаю...");

    try {
        const bundle = await devFetch(`/developer/profile/${code}`);
        devPanelBundle = bundle;
        setDevStatus("");
        renderMonitoringTab(bundle);
        renderAdminTab(bundle);
    } catch(err){
        handleDevError(err);
    }
}

function afterAdminAction(code){
    loadDevCode(code);
    if(typeof window.getOwnerCode === "function" && window.getOwnerCode() === code &&
       typeof window.reconcileWithServer === "function"){
        window.reconcileWithServer();
    }
}

// ===== Monitoring Mode =====

function renderMonitoringTab(bundle){
    const p = bundle.profile;
    const total = (typeof introDialogueLines !== "undefined" && introDialogueLines.length) ? introDialogueLines.length : null;
    const percent = total ? Math.min(100, Math.round((p.dialogue_index / total) * 100)) : null;
    const daysSince = p.created_at ? Math.floor((Date.now() - new Date(p.created_at).getTime()) / 86400000) : null;

    const piecesHtml = [0, 1, 2, 3].map(i => {
        const open = Array.isArray(p.unlocked_pieces) && p.unlocked_pieces.includes(i);
        return `<span class="dev-panel__pill ${open ? "is-open" : ""}">Часть ${i + 1}: ${open ? "открыта" : "закрыта"}</span>`;
    }).join("");

    const monthsHtml = (Array.isArray(p.claimed_key_months) && p.claimed_key_months.length)
        ? p.claimed_key_months.slice().sort().map(m => `<span class="dev-panel__pill is-open">${escapeHtml(m)}</span>`).join("")
        : `<span class="dev-menu__hint">Пока нет</span>`;

    const lettersHtml = (bundle.letters.recent || []).map(l => `
        <div class="dev-panel__letter">
            <span>${l.direction === "incoming" ? "⬇️" : "⬆️"} ${escapeHtml((l.message || "").slice(0, 60))}${(l.message || "").length > 60 ? "…" : ""}</span>
            <span class="dev-menu__hint">${fmtDate(l.created_at)} · ${escapeHtml(l.status)}${l.is_test ? " · тест" : ""}</span>
        </div>
    `).join("") || `<p class="dev-menu__hint">Писем ещё нет</p>`;

    const timelineHtml = (bundle.timeline || []).map(ev => `
        <div class="dev-panel__timeline-item">
            <span>${escapeHtml(getEventLabel(ev.event_type))}</span>
            <span class="dev-menu__hint">${fmtDate(ev.created_at)}</span>
        </div>
    `).join("") || `<p class="dev-menu__hint">Событий ещё нет</p>`;

    const el = devPanelElement.querySelector("#devPanelMonitoring");
    el.innerHTML = `
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Профиль</h4>
            <p>Код: <strong>${escapeHtml(p.owner_code)}</strong></p>
            <p>Собака: ${escapeHtml(p.dog_name || "—")}</p>
            <p>Этап сюжета: ${p.intro_completed ? "интро завершено" : `шаг ${p.dialogue_index}${total ? " / " + total : ""}`}</p>
            <p><span class="dev-panel__dot ${bundle.online ? "is-online" : ""}"></span> ${bundle.online ? "Онлайн сейчас" : "Не в сети"}</p>
            <p>Устройство: ${escapeHtml(p.last_device || "—")}</p>
            <p>Визитов: ${p.visit_count || 0}</p>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Даты</h4>
            <p>Первое открытие сайта: ${fmtDate(p.created_at)}</p>
            <p>Последнее открытие: ${fmtDate(p.last_seen_at)}</p>
            <p>Прошло дней с первого открытия: ${daysSince === null ? "—" : daysSince}</p>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Прогресс</h4>
            <p>${percent === null ? "—" : percent + "%"} (шаг ${p.dialogue_index}${total ? " из " + total : ""})</p>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Пазл</h4>
            <div class="dev-panel__pills">${piecesHtml}</div>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Ключи</h4>
            <div class="dev-panel__pills">${monthsHtml}</div>
            <p class="dev-menu__hint">Ключ в руке: ${p.key_count > 0 ? "да" : "нет"} · последняя выдача: ${fmtDate(p.last_key_granted_at)}</p>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Письма</h4>
            <p>Входящих: ${bundle.letters.inbox_count} (непрочитано: ${bundle.letters.inbox_unread}) · Исходящих: ${bundle.letters.outbox_count}</p>
            ${lettersHtml}
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Timeline</h4>
            <div class="dev-panel__timeline">${timelineHtml}</div>
        </div>
    `;
}

// ===== Admin/Test Mode =====

function renderAdminTab(bundle){
    const p = bundle.profile;
    const el = devPanelElement.querySelector("#devPanelAdmin");

    const piecesButtonsHtml = [0, 1, 2, 3].map(i => {
        const open = Array.isArray(p.unlocked_pieces) && p.unlocked_pieces.includes(i);
        return `<button class="dev-menu__btn dev-panel__piece-btn" data-piece-index="${i}" data-piece-open="${open ? "0" : "1"}" type="button">${i + 1}: ${open ? "Закрыть" : "Открыть"}</button>`;
    }).join("");

    const monthsChecklist = buildEligibleMonths().map(m => {
        const claimed = Array.isArray(p.claimed_key_months) && p.claimed_key_months.includes(m);
        return `<label class="dev-panel__month"><input type="checkbox" data-month="${m}" ${claimed ? "checked" : ""}> ${m}</label>`;
    }).join("");

    el.innerHTML = `
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Пазл</h4>
            <div class="dev-panel__pills">${piecesButtonsHtml}</div>
            <div class="dev-menu__section">
                <label class="dev-menu__label" for="devPuzzleCount">Установить количество открытых</label>
                <input id="devPuzzleCount" class="dev-menu__input" type="number" min="0" max="4" value="${Array.isArray(p.unlocked_pieces) ? p.unlocked_pieces.length : 0}">
                <button id="devPuzzleCountApply" class="dev-menu__btn" type="button">Применить</button>
            </div>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Ключи</h4>
            <div class="dev-panel__months">${monthsChecklist}</div>
            <button id="devHandKeyToggle" class="dev-menu__btn" type="button">${p.key_count > 0 ? "Забрать ключ-в-руке" : "Выдать ключ-в-руке"}</button>
            <div class="dev-menu__section">
                <label class="dev-menu__label" for="devLastKeyDate">Дата последней выдачи</label>
                <input id="devLastKeyDate" class="dev-menu__input" type="datetime-local" value="${toLocalInputValue(p.last_key_granted_at)}">
                <button id="devLastKeyDateApply" class="dev-menu__btn" type="button">Сохранить дату</button>
            </div>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Сюжет</h4>
            <label class="dev-menu__label" for="devDialogueIndex">Индекс диалога</label>
            <input id="devDialogueIndex" class="dev-menu__input" type="number" min="0" value="${p.dialogue_index || 0}">
            <button id="devDialogueIndexApply" class="dev-menu__btn" type="button">Сохранить</button>
            <button id="devDialogueBack" class="dev-menu__btn" type="button">Откатить на шаг назад</button>
            <label class="dev-panel__checkbox"><input type="checkbox" id="devIntroCompleted" ${p.intro_completed ? "checked" : ""}> Сюжет (интро) завершён</label>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Письма</h4>
            <select id="devTestLetterDirection" class="dev-menu__input">
                <option value="incoming">Входящее (от Егора)</option>
                <option value="outgoing">Исходящее (от Регины)</option>
            </select>
            <input id="devTestLetterText" class="dev-menu__input" type="text" placeholder="Текст письма">
            <button id="devTestLetterCreate" class="dev-menu__btn" type="button">Создать тестовое письмо</button>
            <button id="devTestLettersDelete" class="dev-menu__btn dev-menu__btn--danger" type="button">Удалить тестовые письма</button>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Снимки</h4>
            <div id="devSnapshotsList" class="dev-panel__snapshots"><p class="dev-menu__hint">Загружаю...</p></div>
            <input id="devSnapshotLabel" class="dev-menu__input" type="text" placeholder="Название снимка">
            <button id="devSnapshotCreate" class="dev-menu__btn" type="button">Создать снимок</button>
        </div>
        <div class="dev-panel__section">
            <h4 class="dev-panel__section-title">Тестовое время (ежемесячные ключи)</h4>
            <label class="dev-menu__label" for="devTestDate">Тестовая дата</label>
            <input id="devTestDate" class="dev-menu__input" type="date" value="${escapeHtml(devLastTestDateValue)}">
            <button id="devCheckMonthlyKey" class="dev-menu__btn" type="button">Проверить ключ</button>
            <p id="devMonthlyKeyResult" class="dev-menu__hint">${escapeHtml(devLastMonthlyKeyResultText)}</p>
            <label class="dev-menu__label" for="devAccelSelect">Ускоренный режим</label>
            <select id="devAccelSelect" class="dev-menu__input">
                <option value="off" ${!devAccelIntervalMs ? "selected" : ""}>Выкл</option>
                <option value="600000" ${devAccelIntervalMs === 600000 ? "selected" : ""}>Следующий месяц каждые 10 минут</option>
                <option value="3600000" ${devAccelIntervalMs === 3600000 ? "selected" : ""}>Следующий месяц каждый час</option>
            </select>
            <p class="dev-menu__hint">Шлёт настоящие запросы на выдачу ключей выбранному коду — используйте только на тестовых кодах.</p>
        </div>
        <div class="dev-panel__section">
            <button id="devResetProgress" class="dev-menu__btn dev-menu__btn--danger" type="button">Сбросить прогресс этого кода</button>
        </div>
    `;

    wireAdminHandlers(p.owner_code);
    loadSnapshots(p.owner_code);
}

function wireAdminHandlers(code){
    const el = devPanelElement;

    el.querySelectorAll(".dev-panel__piece-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
            const index = Number(btn.dataset.pieceIndex);
            const open = btn.dataset.pieceOpen === "1";
            try {
                await devFetch(`/developer/profile/${code}/puzzle`, { method: "PATCH", body: JSON.stringify({ index, open }) });
                afterAdminAction(code);
            } catch(err){ handleDevError(err); }
        });
    });

    el.querySelector("#devPuzzleCountApply").addEventListener("click", async () => {
        const count = Number(el.querySelector("#devPuzzleCount").value);
        try {
            await devFetch(`/developer/profile/${code}/puzzle`, { method: "PATCH", body: JSON.stringify({ count }) });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelectorAll("[data-month]").forEach(checkbox => {
        checkbox.addEventListener("change", async () => {
            const month = checkbox.dataset.month;
            const body = checkbox.checked ? { monthly_add: month } : { monthly_remove: month };
            try {
                await devFetch(`/developer/profile/${code}/keys`, { method: "PATCH", body: JSON.stringify(body) });
                afterAdminAction(code);
            } catch(err){ handleDevError(err); }
        });
    });

    el.querySelector("#devHandKeyToggle").addEventListener("click", async () => {
        const wantsKey = /Выдать/.test(el.querySelector("#devHandKeyToggle").textContent);
        try {
            await devFetch(`/developer/profile/${code}/keys`, { method: "PATCH", body: JSON.stringify({ hand_key: wantsKey }) });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devLastKeyDateApply").addEventListener("click", async () => {
        const value = el.querySelector("#devLastKeyDate").value;
        if(!value) return;
        try {
            await devFetch(`/developer/profile/${code}/keys`, {
                method: "PATCH",
                body: JSON.stringify({ last_key_granted_at: new Date(value).toISOString() })
            });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devDialogueIndexApply").addEventListener("click", async () => {
        const value = Number(el.querySelector("#devDialogueIndex").value);
        try {
            await devFetch(`/developer/profile/${code}/story`, { method: "PATCH", body: JSON.stringify({ dialogue_index: value }) });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devDialogueBack").addEventListener("click", async () => {
        const current = Number(el.querySelector("#devDialogueIndex").value) || 0;
        try {
            await devFetch(`/developer/profile/${code}/story`, {
                method: "PATCH",
                body: JSON.stringify({ dialogue_index: Math.max(0, current - 1) })
            });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devIntroCompleted").addEventListener("change", async event => {
        try {
            await devFetch(`/developer/profile/${code}/story`, {
                method: "PATCH",
                body: JSON.stringify({ intro_completed: event.target.checked })
            });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devTestLetterCreate").addEventListener("click", async () => {
        const direction = el.querySelector("#devTestLetterDirection").value;
        const message = el.querySelector("#devTestLetterText").value.trim();
        try {
            await devFetch(`/developer/profile/${code}/letters/test`, { method: "POST", body: JSON.stringify({ direction, message }) });
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devTestLettersDelete").addEventListener("click", async () => {
        try {
            const result = await devFetch(`/developer/profile/${code}/letters/test`, { method: "DELETE" });
            setDevStatus(`Удалено тестовых писем: ${result.deleted_count}`);
            afterAdminAction(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devSnapshotCreate").addEventListener("click", async () => {
        const label = el.querySelector("#devSnapshotLabel").value.trim();
        try {
            await devFetch(`/developer/profile/${code}/snapshots`, { method: "POST", body: JSON.stringify({ label }) });
            loadSnapshots(code);
        } catch(err){ handleDevError(err); }
    });

    el.querySelector("#devTestDate").addEventListener("input", event => {
        devLastTestDateValue = event.target.value;
    });

    el.querySelector("#devCheckMonthlyKey").addEventListener("click", async () => {
        const dateInput = el.querySelector("#devTestDate");
        const resultEl = el.querySelector("#devMonthlyKeyResult");
        const testDate = dateInput.value;

        if(typeof window.checkMonthlyKey !== "function"){
            resultEl.textContent = "checkMonthlyKey недоступен.";
            return;
        }

        resultEl.textContent = "Проверяю...";
        const result = await window.checkMonthlyKey(testDate || undefined);
        renderMonthlyKeyResult(resultEl, result);
        afterAdminAction(code);
    });

    el.querySelector("#devAccelSelect").addEventListener("change", event => {
        stopAccelMode();
        const ms = Number(event.target.value);
        if(ms) startAccelMode(code, ms);
    });

    el.querySelector("#devResetProgress").addEventListener("click", () => {
        if(typeof window.getOwnerCode === "function" && window.getOwnerCode() === code){
            if(typeof window.resetAllProgress === "function") window.resetAllProgress();
        } else {
            devResetForeignProfile(code);
        }
    });
}

async function devResetForeignProfile(code){
    try {
        await fetch(`${API_BASE_URL}/profile/${code}/reset`, { method: "POST" });
        setDevStatus("Прогресс кода сброшен.");
        loadDevCode(code);
    } catch(err){
        setDevStatus(`Не удалось сбросить: ${err.message}`);
    }
}

async function loadSnapshots(code){
    const container = devPanelElement && devPanelElement.querySelector("#devSnapshotsList");
    if(!container) return;

    try {
        const snapshots = await devFetch(`/developer/profile/${code}/snapshots`);
        container.innerHTML = snapshots.length ? snapshots.map(s => `
            <div class="dev-panel__snapshot">
                <span>${escapeHtml(s.label || "(без названия)")} — ${fmtDate(s.created_at)}</span>
                <button class="dev-menu__btn dev-panel__snapshot-restore" data-snapshot-id="${s.id}" type="button">Восстановить</button>
            </div>
        `).join("") : `<p class="dev-menu__hint">Снимков ещё нет</p>`;

        container.querySelectorAll(".dev-panel__snapshot-restore").forEach(btn => {
            btn.addEventListener("click", async () => {
                try {
                    await devFetch(`/developer/profile/${code}/snapshots/${btn.dataset.snapshotId}/restore`, { method: "POST" });
                    afterAdminAction(code);
                } catch(err){ handleDevError(err); }
            });
        });
    } catch(err){
        container.innerHTML = `<p class="dev-menu__hint">Ошибка загрузки снимков</p>`;
    }
}

// ===== Ускоренный тестовый режим ежемесячных ключей =====
// Не трогает боевую логику выдачи (server/src/routes/profile.js) — просто
// чаще, чем раз в месяц, дёргает уже существующий и уже проверенный
// POST /profile/:code/monthly-key с test_date. Реальная (без test_date)
// логика по-прежнему всегда использует настоящую дату сервера.

function startAccelMode(code, intervalMs){
    devAccelCode = code;
    devAccelIntervalMs = intervalMs;
    devAccelTestDate = new Date();

    devAccelTimer = setInterval(async () => {
        devAccelTestDate.setMonth(devAccelTestDate.getMonth() + 1);
        const iso = devAccelTestDate.toISOString().slice(0, 10);

        const dateInput = devPanelElement && devPanelElement.querySelector("#devTestDate");
        if(dateInput) dateInput.value = iso;

        if(typeof window.checkMonthlyKey === "function"){
            const result = await window.checkMonthlyKey(iso);
            const resultEl = devPanelElement && devPanelElement.querySelector("#devMonthlyKeyResult");
            if(resultEl) renderMonthlyKeyResult(resultEl, result);
        }
        afterAdminAction(code);
    }, intervalMs);
}

function stopAccelMode(){
    if(devAccelTimer){ clearInterval(devAccelTimer); devAccelTimer = null; }
    devAccelTestDate = null;
    devAccelIntervalMs = null;
    devAccelCode = null;
}
