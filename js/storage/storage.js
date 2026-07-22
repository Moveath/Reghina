// Система постоянного кода пользователя (owner_code) — единственное место,
// которое нужно поменять при переносе backend'а (см. js/ui/letters.js,
// который использует ту же константу). Код генерируется один раз на
// устройстве, никогда не меняется сам, и позволяет подтянуть весь прогресс
// (диалог, тема, пазл, ключи, письма) на любом другом устройстве.
const API_BASE_URL = "https://reghina-production.up.railway.app";

const ownerCodeStorageKey = "reginaOwnerCode";

function getOwnerCode(){
    try { return localStorage.getItem(ownerCodeStorageKey) || null; } catch(e) { return null; }
}

function setOwnerCode(code){
    try { localStorage.setItem(ownerCodeStorageKey, code); } catch(e) {}
}

// Кэшируем промис, чтобы параллельные вызовы (например, letters.js и
// виджет прогресса почти одновременно на старте страницы) не создали два
// разных кода — второй просто дождётся результата первого.
let ownerCodeReadyPromise = null;

// Если код уже есть локально — просто возвращает его. Если нет (первый
// визит на этом устройстве) — просит backend сгенерировать новый и
// сохраняет его насовсем. Дальше этот код никогда автоматически не
// меняется — заменить его может только осознанное восстановление по
// чужому коду (см. restoreProgressFromCode).
async function ensureOwnerCode(){
    const existing = getOwnerCode();
    if(existing) return existing;

    if(ownerCodeReadyPromise) return ownerCodeReadyPromise;

    ownerCodeReadyPromise = (async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/profile`, { method: "POST" });
            if(!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setOwnerCode(data.owner_code);
            return data.owner_code;
        } catch(err){
            console.warn("[storage] Не удалось создать код пользователя:", err);
            return null;
        } finally {
            ownerCodeReadyPromise = null;
        }
    })();

    return ownerCodeReadyPromise;
}

// Снимок всего, что должно пережить переход на другое устройство. Ключи
// localStorage — те же, что использует остальной код (dialogue.js,
// puzzle.js, keys.js, settings.js) — здесь только чтение, не источник истины.
function collectLocalProfileState(){
    let unlockedPieces = [];
    try { unlockedPieces = JSON.parse(localStorage.getItem("reginaPuzzleUnlockedPieces") || "[]"); } catch(e) {}

    let containerState = null;
    try {
        const raw = localStorage.getItem("reginaPuzzleContainerState");
        containerState = raw ? JSON.parse(raw) : null;
    } catch(e) {}

    let dialogueIndex = 0;
    try { dialogueIndex = Number(localStorage.getItem("regina_dialogue_index")) || 0; } catch(e) {}

    let keyCount = 0;
    try { keyCount = Number(localStorage.getItem("reginaKeyCount")) || 0; } catch(e) {}

    return {
        dog_name: (() => { try { return localStorage.getItem("dog_name") || ""; } catch(e) { return ""; } })(),
        dialogue_index: dialogueIndex,
        intro_completed: (() => { try { return localStorage.getItem("regina_intro_completed") === "true"; } catch(e) { return false; } })(),
        selected_theme: (() => { try { return localStorage.getItem("reginaSelectedTheme") || ""; } catch(e) { return ""; } })(),
        unlocked_pieces: unlockedPieces,
        key_count: keyCount,
        puzzle_container_state: containerState
    };
}

let profileSyncTimer = null;

// Вызывается после каждого значимого изменения прогресса (имя, тема,
// шаг диалога, открытый кусочек пазла, ключи) — с небольшой задержкой,
// чтобы несколько изменений подряд не улетали отдельными запросами.
function scheduleProfileSync(){
    clearTimeout(profileSyncTimer);
    profileSyncTimer = setTimeout(pushProfileSync, 700);
}

async function pushProfileSync(){
    const code = getOwnerCode();
    if(!code) return;

    try {
        await fetch(`${API_BASE_URL}/profile/${code}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(collectLocalProfileState())
        });
    } catch(err){
        console.warn("[storage] Не удалось синхронизировать прогресс:", err);
    }
}

// Сброс на сервере — код остаётся тем же, обнуляются только данные (и
// заодно письма этого владельца, см. server/src/routes/profile.js).
async function resetProfileOnServer(){
    const code = getOwnerCode();
    if(!code) return;

    try {
        await fetch(`${API_BASE_URL}/profile/${code}/reset`, { method: "POST" });
    } catch(err){
        console.warn("[storage] Не удалось сбросить профиль на сервере:", err);
    }
}

// Применяет профиль, полученный с сервера, поверх локального состояния —
// используется только восстановлением по коду, поэтому полностью
// перезаписывает локальные значения (а не сливает с ними).
function applyProfileToLocalStorage(profile){
    try {
        setOwnerCode(profile.owner_code);

        if(profile.dog_name) localStorage.setItem("dog_name", profile.dog_name);
        else localStorage.removeItem("dog_name");

        localStorage.setItem("regina_dialogue_index", String(profile.dialogue_index || 0));

        if(profile.intro_completed) localStorage.setItem("regina_intro_completed", "true");
        else localStorage.removeItem("regina_intro_completed");

        if(profile.selected_theme) localStorage.setItem("reginaSelectedTheme", profile.selected_theme);
        else localStorage.removeItem("reginaSelectedTheme");

        localStorage.setItem("reginaPuzzleUnlockedPieces", JSON.stringify(profile.unlocked_pieces || []));
        localStorage.setItem("reginaKeyCount", String(profile.key_count || 0));

        if(profile.puzzle_container_state) localStorage.setItem("reginaPuzzleContainerState", JSON.stringify(profile.puzzle_container_state));
        else localStorage.removeItem("reginaPuzzleContainerState");
    } catch(e) {}
}

// Восстановление прогресса по чужому (или своему, введённому заново) коду.
// Возвращает { ok: true } при успехе или { ok: false } если код не найден
// либо запрос не удался — вызывающий код (dialogue.js) сам решает, что
// показать пользователю в каждом случае.
async function restoreProgressFromCode(code){
    const trimmed = (code || "").trim().toUpperCase();
    if(!trimmed) return { ok: false };

    try {
        const res = await fetch(`${API_BASE_URL}/profile/${trimmed}`);
        if(res.status === 404) return { ok: false, reason: "not_found" };
        if(!res.ok) return { ok: false, reason: "error" };

        const profile = await res.json();
        applyProfileToLocalStorage(profile);
        return { ok: true };
    } catch(err){
        console.warn("[storage] Не удалось восстановить прогресс по коду:", err);
        return { ok: false, reason: "error" };
    }
}

window.getOwnerCode = getOwnerCode;
window.ensureOwnerCode = ensureOwnerCode;
window.scheduleProfileSync = scheduleProfileSync;
window.resetProfileOnServer = resetProfileOnServer;
window.restoreProgressFromCode = restoreProgressFromCode;

// Код нужен сразу — письма (js/ui/letters.js) и прочие системы завязаны на
// его наличие с самого начала визита, поэтому создаём/подтягиваем его,
// не дожидаясь никакого конкретного действия пользователя.
ensureOwnerCode();
