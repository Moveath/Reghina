const dialogueContainer = document.getElementById("dialogueContainer");
const dogCharacter = document.getElementById("dogCharacter");
let dialogueIndex = 0;
let dogName = ""; // имя, которое придумает пользователь

function getCurrentLine(){
    return introDialogueLines[dialogueIndex];
}

const emotionMap = {
    sleeping: "images/dog/sleeping.png",
    sleepy:   "images/dog/sleepy.png",
    happy:    "images/dog/happy.png",
    thinking: "images/dog/thinking.png",
    confused: "images/dog/confused.png",
    neutral:  "images/dog/neutral.png",
    sad:      "images/dog/sad.png",
    excited:  "images/dog/excited.png",
    withKey:  "images/dog/withkey.png"
};

const emotionClasses = {
    sleeping: "is-sleeping",
    sleepy:   "is-sleepy",
    happy:    "is-happy",
    thinking: "is-thinking",
    confused: "is-confused",
    neutral:  "is-neutral",
    sad:      "is-sad"
};

let emotionTimeout = null;
let introOverlayElement = null;
let settingsHintElement = null;
let introFrozen = false;
let awaitingPuzzleUnlock = false;
let awaitingLetterRead = false;
let resetConfirmActive = false;
let dogRemarkActive = false;

function ensureIntroOverlay(){
    if(introOverlayElement) return introOverlayElement;

    introOverlayElement = document.createElement("div");
    introOverlayElement.id = "introOverlay";
    introOverlayElement.className = "intro-scene-overlay";
    document.body.appendChild(introOverlayElement);
    return introOverlayElement;
}

function showIntroOverlay(){
    const overlay = ensureIntroOverlay();
    overlay.style.pointerEvents = "none";
    overlay.style.visibility = "visible";
    overlay.classList.add("is-visible");
}

function hideIntroOverlay(){
    if(!introOverlayElement) return;

    introOverlayElement.classList.remove("is-visible");
    introOverlayElement.style.pointerEvents = "none";
    introOverlayElement.style.opacity = "0";
    introOverlayElement.style.visibility = "hidden";
    introOverlayElement.remove();
    introOverlayElement = null;
}

function setDogEmotion(emotion){
    const img = dogCharacter;
    if(!img) return;

    // Отменяем предыдущий таймаут, если эмоции меняются быстро
    if(emotionTimeout){
        clearTimeout(emotionTimeout);
        emotionTimeout = null;
    }

    const normalizedEmotion = emotion && emotionMap[emotion] ? emotion : "neutral";
    const src = emotionMap[normalizedEmotion] || emotionMap.neutral;

    // 1. Исчезание (fade-out)
    img.style.opacity = "0";

    // 2. Через 180ms меняем картинку + классы (когда почти невидимо)
    emotionTimeout = setTimeout(() => {
        img.src = src;

        // Управляем классами анимации
        img.classList.remove("is-sleeping", "is-intro", "is-resting");
        if(normalizedEmotion === "sleeping"){
            img.classList.add("is-sleeping");
        } else if(normalizedEmotion === "neutral"){
            img.classList.add("is-resting");
        } else {
            img.classList.add("is-intro");
        }

        // Сбрасываем анимацию, чтобы она перезапустилась с новой картинкой
        img.style.animation = "none";
        img.offsetHeight; // форсируем reflow

        // img.className затирает весь список классов — сохраняем "is-highlighted",
        // если собака в этот момент как раз подсвечена (например, ждём клика по ней).
        const keepHighlighted = lastHighlightTarget === "dogCharacter" ? " is-highlighted" : "";
        if(normalizedEmotion === "sleeping"){
            img.style.animation = "";
            img.className = "dog-character is-intro is-sleeping" + keepHighlighted;
        } else if(normalizedEmotion === "neutral"){
            img.style.animation = "";
            img.className = "dog-character is-resting" + keepHighlighted;
        } else {
            img.style.animation = "";
            img.className = "dog-character is-intro" + keepHighlighted;
        }

        // 3. Появление (fade-in) — сразу после смены
        requestAnimationFrame(() => {
            img.style.opacity = "1";
        });

        emotionTimeout = null;
    }, 180);
}

function resetDogToNeutral(){
    if(emotionTimeout){
        clearTimeout(emotionTimeout);
        emotionTimeout = null;
    }

    const img = dogCharacter;
    if(!img) return;

    img.src = emotionMap.neutral;
    img.className = "dog-character is-resting";
    img.style.animation = "";
    img.style.opacity = "1";
}

function wakeUpDog(){
    // Пробуждение: сразу убираем сон, fade-in возьмёт на себя setDogEmotion
    setDogEmotion("happy");
}

function pausePuzzleAnimations(){
    // Останавливаем анимацию центрального пазла
    const container = document.querySelector(".container");
    if(container){
        container.dataset.animState = container.style.animationPlayState || "running";
        container.style.animationPlayState = "paused";
    }
}

function resumePuzzleAnimations(){
    // Возобновляем анимацию центрального пазла
    const container = document.querySelector(".container");
    if(container){
        container.style.animationPlayState = "running";
    }
}

function ensureSettingsHint(){
    if(settingsHintElement) return settingsHintElement;

    settingsHintElement = document.createElement("div");
    settingsHintElement.id = "settingsHint";
    settingsHintElement.className = "intro-settings-hint";
    settingsHintElement.innerHTML = "<span>Нажми на иконку настроек</span>";
    document.body.appendChild(settingsHintElement);
    return settingsHintElement;
}

let lastHighlightTarget = null;

// Пока диалог только указывает на "Письма" (highlightTarget, без waitForClick —
// реплика 31, "Здесь у нас с тобой почта..."), виджет уже виден и пульсирует,
// но открывать его рано: непрочитанное письмо ещё не "пришло", и последующая
// реплика 32 (pauseForLetterRead) ждёт РЕАЛЬНОГО клика/чтения именно на этом
// шаге, а не раньше. Открытие в обход сценария оставляло reply-логику решившей,
// что письмо уже прочитано, и диалог переставал понимать, что делать дальше.
// Разблокируется, как только диалог сам просит кликнуть по lettersButton
// (waitForClick), и остаётся разблокированным до конца интро.
let lettersButtonIntroLocked = false;

function isLettersButtonIntroLocked(){
    return lettersButtonIntroLocked;
}

function setHighlight(elementId){
    if(lastHighlightTarget === elementId) return;
    if(lastHighlightTarget){
        const prev = document.getElementById(lastHighlightTarget);
        // "is-highlighted" (пульсация) снимаем — она только у текущего виджета.
        // "was-revealed" НЕ снимаем: однажды показанный виджет остаётся
        // видимым навсегда, даже когда разговор перешёл к другому.
        if(prev) prev.classList.remove("is-highlighted");
    }
    lastHighlightTarget = elementId || null;
    if(elementId){
        const el = document.getElementById(elementId);
        if(el){
            el.classList.add("is-highlighted");
            el.classList.add("was-revealed");
        }
    }
}

function showClickHint(hintText, targetId){
    const hint = ensureSettingsHint();
    hint.innerHTML = `<span>${hintText || "Нажми, чтобы продолжить"}</span>`;
    hint.classList.add("is-visible");

    // В сцене с развёрнутым пазлом кладём подсказку понизу по центру —
    // сверху справа слишком много других кнопок (настройки, шкатулка и т.д.),
    // подсказка там теряется. Считать её "от собаки" тоже нельзя: собака
    // широкая, и подсказка попадала бы прямо на пазл.
    if(dialogueContainer.classList.contains("is-puzzle-reveal")){
        const hintWidth = hint.offsetWidth || 260;
        hint.style.left = `${Math.max(12, (window.innerWidth - hintWidth) / 2)}px`;
        hint.style.right = "auto";
        hint.style.top = "auto";
        hint.style.bottom = "72px";
        return;
    }

    const targetEl = targetId ? document.getElementById(targetId) : null;
    if(targetEl){
        // Ставим подсказку рядом с самим виджетом, а не всегда в углу экрана —
        // иначе для виджетов слева (чат/уведомления) она оказывается слишком далеко.
        const rect = targetEl.getBoundingClientRect();
        const hintWidth = hint.offsetWidth || 220;
        const hintHeight = hint.offsetHeight || 36;

        let left = rect.right + 14;
        if(left + hintWidth > window.innerWidth - 12){
            left = rect.left - hintWidth - 14;
        }
        if(left < 12) left = 12;

        let top = rect.top + rect.height / 2 - hintHeight / 2;
        top = Math.max(12, Math.min(top, window.innerHeight - hintHeight - 12));

        hint.style.left = `${left}px`;
        hint.style.right = "auto";
        hint.style.top = `${top}px`;
    } else {
        hint.style.left = "";
        hint.style.right = "";
        hint.style.top = "";
    }
}

function hideClickHint(){
    if(settingsHintElement){
        settingsHintElement.classList.remove("is-visible");
    }
}

function clearAllPrompts(){
    setHighlight(null);
    hideClickHint();
}

function hideSettingsPrompt(){
    const settingsButtonEl = document.getElementById("settingsButton");
    if(settingsButtonEl){
        settingsButtonEl.classList.remove("is-highlighted");
    }

    if(settingsHintElement){
        settingsHintElement.classList.remove("is-visible");
    }
}

function renderIntroDialogue(){
    const line = getCurrentLine();

    // Сохраняем текущий шаг — если она освежит страницу посреди интро
    // (даже Ctrl+F5), продолжим ровно с этого места, а не с начала.
    saveDialogueIndex(dialogueIndex);

    // Заменяем плейсхолдер «имя» на реальное имя (и в тексте, и в подсказке)
    let displayHintText = line.hintText;
    if(dogName && displayHintText && displayHintText.includes("«имя»")){
        displayHintText = displayHintText.replace("«имя»", dogName);
    }

    // Определяем подпись снизу (нажми / кнопки / ввод)
    let footerHtml = '<span>нажми в любом месте, чтобы продолжить</span>';

    if(line.waitForClick){
        footerHtml = `<span>${displayHintText || "нажми, чтобы продолжить"}</span>`;
    }

    if(line.type === "choice"){
        // Кнопки выбора — никакого "нажми"
        footerHtml = `
            <div class="choice-buttons">
                ${line.choices.map((c, i) =>
                    `<button class="choice-btn choice-btn--${i}" data-next="${c.next}">${c.label}</button>`
                ).join("")}
            </div>
        `;
    } else if(line.type === "name_input"){
        // Поле ввода имени
        footerHtml = `
            <div class="name-input-wrap">
                <input type="text" id="dogNameInput" class="dog-name-input" placeholder="Введи имя..." maxlength="20" autofocus>
                <button id="dogNameConfirm" class="choice-btn choice-btn--0">Готово</button>
            </div>
        `;
    }

    // Заменяем плейсхолдер «имя» на реальное имя
    let displayText = line.text;
    if(dogName && displayText.includes("«имя»")){
        displayText = displayText.replace("«имя»", dogName);
    }

    // Меняем эмоцию/картинку собаки
    if(line.emotion){
        setDogEmotion(line.emotion);
    }

    const highlightId = line.highlightTarget || line.waitForClick || null;
    setHighlight(highlightId);

    // Смотри комментарий у объявления lettersButtonIntroLocked: "просто
    // указываем" (highlightTarget) на письма ещё не значит "уже можно
    // открывать" — открывать можно только когда диалог явно ждёт клика
    // (waitForClick) по этой же кнопке.
    lettersButtonIntroLocked = highlightId === "lettersButton" && !line.waitForClick;

    // Пока пазл развёрнут по центру — уводим пузырь реплики (и подсказку)
    // к правому краю, чтобы не перекрывать сам пазл (см. .is-puzzle-reveal
    // в dialogue.css). Важно выставить ДО showClickHint — она читает этот класс.
    dialogueContainer.classList.toggle("is-puzzle-reveal", Boolean(line.bubbleAtTop));

    if(line.waitForClick){
        showClickHint(displayHintText, line.waitForClick);
    } else {
        hideClickHint();
    }

    if(line.closeSettingsPanel){
        if(typeof closePanels === "function") closePanels();
        if(typeof closeThemeMenu === "function") closeThemeMenu();
    }

    if(line.showNotificationBadge){
        const lettersBtn = document.getElementById("lettersButton");
        if(lettersBtn){
            lettersBtn.classList.add("has-unread");
            lettersBtn.dataset.count = "1";
        }
    }

    // Центральный пазл переезжает из угла в центр экрана — используем уже
    // готовый механизм разворачивания из js/ui/window.js.
    if(line.expandPuzzle){
        if(typeof applyContainerState === "function") applyContainerState({ minimized: false });
        if(typeof saveContainerState === "function") saveContainerState({ minimized: false });
    }

    // Собака выдаёт ключ — тот самый интеграционный пункт, который был
    // предусмотрен в js/puzzle/keys.js.
    if(line.grantKey){
        if(typeof puzzleKeySystem !== "undefined" && puzzleKeySystem.grantKey) puzzleKeySystem.grantKey();
    }

   if(dialogueIndex < 15 || line.keepOverlay){
    showIntroOverlay();
    dialogueContainer.classList.remove("is-clear");
} else {
    hideIntroOverlay();
    dialogueContainer.classList.add("is-clear");
}
    // Рендерим в зависимости от типа
    if(line.type === "thought"){
        dialogueContainer.innerHTML = `
            <div class="intro-dialogue" role="dialog" aria-live="polite">
                <div class="intro-dialogue__thought">
                    <div class="thought-dot thought-dot--1"></div>
                    <div class="thought-dot thought-dot--2"></div>
                    <div class="thought-cloud">
                        <p>${displayText}</p>
                        ${footerHtml}
                    </div>
                </div>
            </div>
        `;
    } else if(line.type === "choice" || line.type === "name_input"){
        // Для choice/name_input используем обычный пузырь, но с кастомным футером
        dialogueContainer.innerHTML = `
            <div class="intro-dialogue" role="dialog" aria-live="polite">
                <div class="intro-dialogue__bubble intro-dialogue__bubble--interactive">
                    <p>${displayText}</p>
                    ${footerHtml}
                </div>
            </div>
        `;
    } else {
        // Обычная речь
        dialogueContainer.innerHTML = `
            <div class="intro-dialogue" role="dialog" aria-live="polite">
                <div class="intro-dialogue__bubble">
                    <p>${displayText}</p>
                    ${footerHtml}
                </div>
            </div>
        `;
    }

    // Привязываем обработчики для выбора
    if(line.type === "choice"){
        document.querySelectorAll(".choice-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const next = parseInt(e.currentTarget.dataset.next, 10);
                if(Number.isNaN(next)) return;
                goToDialogue(next);
            });
        });
    }

    // Привязываем обработчик для подтверждения имени
    if(line.type === "name_input"){
        const input = document.getElementById("dogNameInput");
        const confirmBtn = document.getElementById("dogNameConfirm");

        function confirmName(){
            const name = input.value.trim();
            if(name.length < 1) return;
            dogName = name;
            saveDogName(name);
            updateNameplate(name);
            goToDialogue(13); // диалог 14 (индекс 13) — "имя? Мне нравится"
        }

        confirmBtn.addEventListener("click", confirmName);
        input.addEventListener("keydown", (e) => {
            if(e.key === "Enter") confirmName();
        });
    }
}

function goToDialogue(newIndex){
    dialogueIndex = newIndex;
    renderIntroDialogue();
}

// Вызывается из settings.js после реального выбора темы в новом меню.
function handleThemeSelected(){
    const line = getCurrentLine();
    if(line && line.opensThemeMenu){
        goToDialogue(dialogueIndex + 1);
    }
}

// Ветка «Пока нет»: после прощального диалога всё полностью замирает —
// собака остаётся в текущем положении (не уходит в угол), фон остаётся затемнён.
function freezeIntroWaiting(){
    if(introFrozen) return;
    introFrozen = true;

    clearAllPrompts();
    // Специально НЕ убираем "is-active" — dialogueContainer должен и дальше
    // перехватывать все клики на весь экран (сам обработчик клика теперь
    // ничего не делает из-за introFrozen), иначе после снятия is-active
    // клики начнут проходить сквозь него к пазлу/виджетам под ним.
    dialogueContainer.classList.add("is-fading");

    resetDogToNeutral();

    setTimeout(() => {
        dialogueContainer.innerHTML = "";
        dialogueContainer.classList.remove("is-fading");
    }, 850);
}

// Собака отдала ключ — реплика остаётся на экране как есть (тот же текст,
// уже с поменявшейся эмоцией), просто перестаёт перехватывать клики, чтобы
// можно было взаимодействовать с пазлом под ней. Интро формально не
// заканчиваем: ждём, пока она сама откроет кусочок (см.
// window.notifyPuzzlePieceUnlocked, вызывается из puzzle.js).
function pauseIntroForPuzzleUnlock(){
    awaitingPuzzleUnlock = true;
    clearAllPrompts();
    dialogueContainer.classList.remove("is-active");
}

function resumeIntroAfterPuzzleUnlock(){
    if(!awaitingPuzzleUnlock) return;
    awaitingPuzzleUnlock = false;
    dialogueContainer.classList.add("is-active");
    dialogueIndex += 1;
    renderIntroDialogue();
}

// Точка входа для puzzle.js — вызывается при любом успешном открытии
// кусочка, но реально что-то делает только пока мы ждём именно этого.
window.notifyPuzzlePieceUnlocked = resumeIntroAfterPuzzleUnlock;

// Та же идея, что и с ключом/пазлом выше, но для писем: клик по иконке
// «Письма» открывает настоящий виджет (см. js/ui/letters.js), а сама
// реплика "Смотри!.. Давай прочитаем" остаётся на экране и НЕ отпускает
// сценарий дальше, пока Регина реально не откроет папку "Входящие" и не
// прочитает письмо (см. window.notifyLetterRead, вызывается из letters.js).
function pauseIntroForLetterRead(){
    awaitingLetterRead = true;
    clearAllPrompts();
    dialogueContainer.classList.remove("is-active");
}

function resumeIntroAfterLetterRead(){
    if(!awaitingLetterRead) return;
    awaitingLetterRead = false;
    dialogueContainer.classList.add("is-active");
    dialogueIndex += 1;
    renderIntroDialogue();
}

window.notifyLetterRead = resumeIntroAfterLetterRead;

function finishIntroDialogue(){
    markIntroCompleted();
    document.body.classList.remove("intro-active");
    if(typeof closePanels === "function") closePanels();
    if(typeof closeThemeMenu === "function") closeThemeMenu();
    clearAllPrompts();
    hideIntroOverlay();
    // Запускаем плавное рассеивание тумана
    dialogueContainer.classList.add("is-fading");
    dialogueContainer.classList.remove("is-active");

    // Собака переходит в нейтральное состояние (всегда neutral после диалога)
    characterContainer.classList.remove("is-intro-scene");
    resetDogToNeutral();

    // Убираем подпись персонажа после интро
    const nameplate = document.querySelector(".character-nameplate");
    if(nameplate){
        nameplate.remove();
    }

    // Возобновляем анимации пазла
    resumePuzzleAnimations();

    // Пазл, который разворачивали в центр для сцены с ключом, возвращается
    // обратно в угол — интро закончилось, дальше обычный режим сайта.
    if(typeof applyContainerState === "function") applyContainerState({ minimized: true });
    if(typeof saveContainerState === "function") saveContainerState({ minimized: true });

    // Убираем содержимое после завершения анимации рассеивания (.8s)
    setTimeout(() => {
        dialogueContainer.innerHTML = "";
        dialogueContainer.classList.remove("is-fading");
    }, 850);
}

// Обработчик клика для "нажми чтобы продолжить" (обычные диалоги)
dialogueContainer.addEventListener("click", (e) => {
    // Гасим клик здесь же. Иначе renderIntroDialogue() ниже заменит innerHTML
    // и «оторвёт» e.target от DOM ещё до того, как событие дойдёт до
    // глобального обработчика в settings.js — там closest("#dialogueContainer")
    // на оторванном узле вернёт null, и он ошибочно закроет открытую панель
    // (settingsPanel/musicPanel), хотя клик был внутри диалога.
    e.stopPropagation();

    if(introFrozen) return;
    if(resetConfirmActive) return;
    if(dogRemarkActive) return;

    // Не обрабатываем клик, если нажали на кнопку, инпут или внутри выбора
    if(e.target.closest(".choice-btn") || e.target.closest(".name-input-wrap")) return;

    const line = getCurrentLine();
    // Для choice и name_input клик по фону не переключает
    if(line.type === "choice" || line.type === "name_input") return;

    if(line.waitForClick) return;

    // Прощальный диалог ветки «Пока нет» — полностью замираем
    if(line.freezeAfter){
        freezeIntroWaiting();
        return;
    }

    // Если диалог помечен isEnding — завершаем интро
    if(line.isEnding){
        finishIntroDialogue();
        return;
    }

    // Явный переход к другому диалогу (например, ветка «Пока нет»)
    if(typeof line.next === "number"){
        goToDialogue(line.next);
        return;
    }

    // Если это последний диалог — завершаем
    if(dialogueIndex >= introDialogueLines.length - 1){
        finishIntroDialogue();
        return;
    }

    // Если это сон (isDream) — при первом клике собака просыпается
    if(line.isDream){
        wakeUpDog();
    }

    dialogueIndex += 1;
    renderIntroDialogue();
});

// Сохранение имени в localStorage
function saveDogName(name){
    try {
        localStorage.setItem("dog_name", name);
    } catch(e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
}

// Загрузка имени из localStorage
function loadDogName(){
    try {
        return localStorage.getItem("dog_name") || "";
    } catch(e) { return ""; }
}

// Обновление nameplate (надпись над собакой)
function updateNameplate(name){
    const nameplate = document.querySelector(".character-nameplate");
    if(nameplate){
        nameplate.textContent = name.toUpperCase();
    }
}

// Прошла ли уже интро целиком — чтобы не показывать его заново при
// каждом визите (в том числе после жёсткой перезагрузки страницы).
const introCompletedStorageKey = "regina_intro_completed";
// На каком шаге она остановилась — чтобы обновление страницы ПОСРЕДИ
// интро не отбрасывало в начало, а продолжало с того же места.
const dialogueIndexStorageKey = "regina_dialogue_index";

function markIntroCompleted(){
    try {
        localStorage.setItem(introCompletedStorageKey, "true");
        localStorage.removeItem(dialogueIndexStorageKey);
    } catch(e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
}

function isIntroAlreadyCompleted(){
    try { return localStorage.getItem(introCompletedStorageKey) === "true"; } catch(e) { return false; }
}

function saveDialogueIndex(index){
    try { localStorage.setItem(dialogueIndexStorageKey, String(index)); } catch(e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
}

function loadDialogueIndex(){
    try {
        const stored = Number(localStorage.getItem(dialogueIndexStorageKey));
        return Number.isInteger(stored) && stored >= 0 && stored < introDialogueLines.length ? stored : 0;
    } catch(e) { return 0; }
}

// Полный сброс прогресса: имя, тема, открытые кусочки, состояние пазла,
// ключи, сам факт прохождения интро и вся история писем — используется и
// dev-меню, и кнопкой "Сбросить прогресс" в виджете прогресса (см.
// settings.js). Код владельца (owner_code) НЕ меняется — сброс на сервере
// идёт через POST /profile/:code/reset (см. resetProfileOnServer в
// js/storage/storage.js), который заодно чистит и пересевает письма этого
// же владельца. Ждём ответа сервера перед перезагрузкой страницы, иначе
// после сброса ещё будет видна старая переписка/прогресс.
async function resetAllProgress(){
    try {
        localStorage.removeItem("dog_name");
        localStorage.removeItem(introCompletedStorageKey);
        localStorage.removeItem(dialogueIndexStorageKey);
        localStorage.removeItem("reginaSelectedTheme");
        localStorage.removeItem("reginaPuzzleUnlockedPieces");
        localStorage.removeItem("reginaPuzzleContainerState");
        localStorage.removeItem("reginaKeyCount");
    } catch(e) {}

    if(typeof window.resetProfileOnServer === "function"){
        await window.resetProfileOnServer();
    }

    location.reload();
}
window.resetAllProgress = resetAllProgress;

// Подтверждение сброса прогресса "от лица" собаки — вызывается из
// виджета "Прогресс" (см. settings.js). Собака встаёт в интро-позу и
// спрашивает через тот же пузырь с кнопками Да/Нет, что и в самом интро,
// вместо отдельного модального окна.
// Пока настоящий вступительный тур ещё идёт (например, собака как раз
// рассказывает про виджет прогресса, где лежит эта самая кнопка) —
// сброс вообще не предлагаем: тур сначала должен закончиться сам собой,
// без вмешательства этого выбора.
function showResetConfirmDialogue(){
    if(resetConfirmActive || monthlyKeySceneActive) return;
    if(document.body.classList.contains("intro-active")) return;
    resetConfirmActive = true;

    if(typeof closePanels === "function") closePanels();
    if(typeof closeThemeMenu === "function") closeThemeMenu();

    characterContainer.classList.add("is-intro-scene");
    setDogEmotion("confused");

    dialogueContainer.classList.remove("is-puzzle-reveal", "is-clear", "is-fading");
    dialogueContainer.classList.add("is-active");
    showIntroOverlay();

    dialogueContainer.innerHTML = `
        <div class="intro-dialogue" role="dialog" aria-live="polite">
            <div class="intro-dialogue__bubble intro-dialogue__bubble--interactive">
                <p>Точно хочешь сбросить прогресс? Имя, тема и открытые части пазла пропадут — вернуть их будет нельзя.</p>
                <div class="choice-buttons">
                    <button id="resetConfirmYes" class="choice-btn choice-btn--0" type="button">Да</button>
                    <button id="resetConfirmNo" class="choice-btn choice-btn--1" type="button">Нет</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("resetConfirmYes").addEventListener("click", (e) => {
        e.stopPropagation();
        if(typeof window.resetAllProgress === "function") window.resetAllProgress();
    });
    document.getElementById("resetConfirmNo").addEventListener("click", (e) => {
        e.stopPropagation();
        hideResetConfirmDialogue();
    });
}

function hideResetConfirmDialogue(){
    if(!resetConfirmActive) return;
    resetConfirmActive = false;

    hideIntroOverlay();
    dialogueContainer.classList.add("is-fading");
    dialogueContainer.classList.remove("is-active");

    // Собака возвращается в обычный маленький вид в углу — сброс отменён.
    characterContainer.classList.remove("is-intro-scene");
    resetDogToNeutral();

    setTimeout(() => {
        dialogueContainer.innerHTML = "";
        dialogueContainer.classList.remove("is-fading");
    }, 850);
}

window.showResetConfirmDialogue = showResetConfirmDialogue;

// Подтверждение восстановления прогресса по коду "от лица" собаки —
// вызывается из виджета "Прогресс" (вкладка "Ввести код", см. settings.js)
// после того, как введён код. Тот же визуальный приём, что и подтверждение
// сброса выше. При "Да" текущий локальный прогресс полностью заменяется
// тем, что лежит на сервере под этим кодом (см. restoreProgressFromCode в
// js/storage/storage.js) — код устройства тоже подменяется на введённый.
// При "Нет" — ничего не происходит, введённый код просто отбрасывается.
function showRestoreConfirmDialogue(code){
    if(resetConfirmActive || monthlyKeySceneActive) return;
    if(document.body.classList.contains("intro-active")) return;
    resetConfirmActive = true;

    if(typeof closePanels === "function") closePanels();
    if(typeof closeThemeMenu === "function") closeThemeMenu();

    characterContainer.classList.add("is-intro-scene");
    setDogEmotion("thinking");

    dialogueContainer.classList.remove("is-puzzle-reveal", "is-clear", "is-fading");
    dialogueContainer.classList.add("is-active");
    showIntroOverlay();

    dialogueContainer.innerHTML = `
        <div class="intro-dialogue" role="dialog" aria-live="polite">
            <div class="intro-dialogue__bubble intro-dialogue__bubble--interactive">
                <p>Ты хочешь восстановить прогресс по этому коду? Всё, что сейчас есть на этом устройстве, будет заменено.</p>
                <div class="choice-buttons">
                    <button id="restoreConfirmYes" class="choice-btn choice-btn--0" type="button">Да</button>
                    <button id="restoreConfirmNo" class="choice-btn choice-btn--1" type="button">Нет</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("restoreConfirmYes").addEventListener("click", async (e) => {
        e.stopPropagation();
        const yesBtn = document.getElementById("restoreConfirmYes");
        const noBtn = document.getElementById("restoreConfirmNo");
        if(yesBtn) yesBtn.disabled = true;
        if(noBtn) noBtn.disabled = true;

        const result = typeof window.restoreProgressFromCode === "function"
            ? await window.restoreProgressFromCode(code)
            : { ok: false };

        if(result.ok){
            location.reload();
        } else {
            showRestoreFailedMessage();
        }
    });
    document.getElementById("restoreConfirmNo").addEventListener("click", (e) => {
        e.stopPropagation();
        hideResetConfirmDialogue();
    });
}

// Код не найден на сервере — заменяем содержимое уже открытого пузыря
// вместо того, чтобы открывать ещё один диалог поверх.
function showRestoreFailedMessage(){
    const bubble = dialogueContainer.querySelector(".intro-dialogue__bubble");
    if(!bubble) return;
    setDogEmotion("confused");
    bubble.innerHTML = `
        <p>Такой код не найден. Проверь, что ввела его без ошибок.</p>
        <div class="choice-buttons">
            <button id="restoreFailedOk" class="choice-btn choice-btn--0" type="button">Понятно</button>
        </div>
    `;
    document.getElementById("restoreFailedOk").addEventListener("click", (e) => {
        e.stopPropagation();
        hideResetConfirmDialogue();
    });
}

window.showRestoreConfirmDialogue = showRestoreConfirmDialogue;

// ============================================================
// Ежемесячные ключи — вызывается из checkMonthlyKey (js/storage/storage.js)
// при каждом запуске сайта, когда сервер решил, что положен новый ключ
// (см. POST /profile/:code/monthly-key). Сцена в два этапа в одном и том
// же пузыре: сначала собака "нашла" что-то (эмоция + случайная реплика),
// после подтверждения — сообщает, что часть пазла открылась. Сам кусочек
// реально открывается только ПОСЛЕ закрытия сцены (unlockPieceByIndex из
// js/puzzle/puzzle.js) — чтобы открытие было видно, а не произошло тихо
// где-то за диалогом.
// ============================================================
const monthlyKeyFoundLines = [
    "Кажется, сегодня я нашёл кое-что важное для тебя!",
    "У меня для тебя кое-какая находка... интересно, что это?",
    "Я всю ночь искал этот ключ и наконец-то нашёл его!",
    "Похоже, кто-то оставил для тебя новый секретный ключ."
];

const monthlyKeyOpenedLines = [
    "Ура! Одна часть тайны стала открыта!",
    "Смотри, ещё один кусочек собрался!",
    "Кажется, мы стали ещё ближе к разгадке!",
    "Новый ключ подошёл! Пазл открывает следующую часть!"
];

function pickRandomLine(list){
    return list[Math.floor(Math.random() * list.length)];
}

let monthlyKeySceneActive = false;

function showMonthlyKeyDialogue(pieceIndex){
    // Настоящее интро — приоритетнее, а вот ключ уже точно выдан на
    // сервере (checkMonthlyKey успел получить granted:true до этого
    // вызова), так что просто ждать следующей загрузки сайта нельзя —
    // тогда ключ показался бы только после ПЕРЕЗАГРУЗКИ, то есть будто
    // потерялся на этот раз. Если сейчас идёт другая сюжетная сцена
    // (например, "пока тебя не было, пришло письмо" от js/ui/letters.js) —
    // не перебиваем её, а тихо ждём и пробуем ещё раз, пока экран не
    // освободится.
    if(document.body.classList.contains("intro-active")) return;
    if(resetConfirmActive || dogRemarkActive || monthlyKeySceneActive){
        setTimeout(() => showMonthlyKeyDialogue(pieceIndex), 1500);
        return;
    }
    monthlyKeySceneActive = true;

    if(typeof closePanels === "function") closePanels();
    if(typeof closeThemeMenu === "function") closeThemeMenu();

    characterContainer.classList.add("is-intro-scene", "is-key-found");
    setDogEmotion("happy");

    dialogueContainer.classList.remove("is-puzzle-reveal", "is-clear", "is-fading");
    dialogueContainer.classList.add("is-active");
    showIntroOverlay();

    dialogueContainer.innerHTML = `
        <div class="intro-dialogue" role="dialog" aria-live="polite">
            <div class="intro-dialogue__bubble intro-dialogue__bubble--interactive monthly-key-bubble">
                <span class="monthly-key-sparkle" aria-hidden="true">🔑✨</span>
                <p>${pickRandomLine(monthlyKeyFoundLines)}</p>
                <div class="choice-buttons">
                    <button id="monthlyKeyFoundOk" class="choice-btn choice-btn--0" type="button">Ого, покажи!</button>
                </div>
            </div>
        </div>
    `;

    document.getElementById("monthlyKeyFoundOk").addEventListener("click", (e) => {
        e.stopPropagation();
        showMonthlyKeyOpenedStage(pieceIndex);
    });
}

function showMonthlyKeyOpenedStage(pieceIndex){
    const bubble = dialogueContainer.querySelector(".intro-dialogue__bubble");
    if(!bubble) return;

    bubble.innerHTML = `
        <p>${pickRandomLine(monthlyKeyOpenedLines)}</p>
        <div class="choice-buttons">
            <button id="monthlyKeyOpenedOk" class="choice-btn choice-btn--0" type="button">Ура!</button>
        </div>
    `;

    document.getElementById("monthlyKeyOpenedOk").addEventListener("click", (e) => {
        e.stopPropagation();
        finishMonthlyKeyDialogue(pieceIndex);
    });
}

function finishMonthlyKeyDialogue(pieceIndex){
    monthlyKeySceneActive = false;

    hideIntroOverlay();
    dialogueContainer.classList.add("is-fading");
    dialogueContainer.classList.remove("is-active");

    characterContainer.classList.remove("is-intro-scene", "is-key-found");
    resetDogToNeutral();

    setTimeout(() => {
        dialogueContainer.innerHTML = "";
        dialogueContainer.classList.remove("is-fading");
    }, 850);

    if(typeof window.unlockPieceByIndex === "function"){
        window.unlockPieceByIndex(pieceIndex);
    }
}

window.showMonthlyKeyDialogue = showMonthlyKeyDialogue;

// Разовая реплика собаки вне сценария интро — используется письмами
// (js/ui/letters.js): подтверждение "отнесла письмо" и оповещение о новом
// письме от Егора. Тот же визуальный приём, что и в интро (собака
// увеличивается, говорит из пузыря), но без веток выбора — просто
// закрывается сама через паузу или по клику. Пока идёт настоящее интро —
// вообще не показывается, чтобы не мешать сценарию.
function showDogRemark(text){
    if(document.body.classList.contains("intro-active")) return;
    if(resetConfirmActive || dogRemarkActive || monthlyKeySceneActive) return;
    dogRemarkActive = true;

    // Реплика — полноэкранная сцена, под ней не должно оставаться открытых
    // панелей (например, виджета "Письма" после отправки) — иначе они
    // просвечивают/перекрываются с пузырём реплики.
    if(typeof closePanels === "function") closePanels();

    characterContainer.classList.add("is-intro-scene");
    setDogEmotion("happy");

    dialogueContainer.classList.remove("is-puzzle-reveal", "is-clear", "is-fading");
    dialogueContainer.classList.add("is-active");
    showIntroOverlay();

    dialogueContainer.innerHTML = `
        <div class="intro-dialogue" role="dialog" aria-live="polite">
            <div class="intro-dialogue__bubble">
                <p>${text}</p>
                <span>нажми, чтобы закрыть</span>
            </div>
        </div>
    `;

    let autoCloseTimer = null;

    function closeRemark(ev){
        if(ev) ev.stopPropagation();
        if(!dogRemarkActive) return;
        dogRemarkActive = false;

        dialogueContainer.removeEventListener("click", closeRemark);
        clearTimeout(autoCloseTimer);

        hideIntroOverlay();
        dialogueContainer.classList.add("is-fading");
        dialogueContainer.classList.remove("is-active");
        characterContainer.classList.remove("is-intro-scene");
        resetDogToNeutral();

        setTimeout(() => {
            dialogueContainer.innerHTML = "";
            dialogueContainer.classList.remove("is-fading");
        }, 850);
    }

    dialogueContainer.addEventListener("click", closeRemark);
    autoCloseTimer = setTimeout(closeRemark, 4500);
}
window.showDogRemark = showDogRemark;

// Старт интро
if(isIntroAlreadyCompleted()){
    // Уже проходила интро раньше — сразу обычный вид сайта, без сцены.
    dogName = loadDogName();
    characterContainer.classList.remove("is-intro-scene");
    resetDogToNeutral();
    const nameplate = document.querySelector(".character-nameplate");
    if(nameplate) nameplate.remove();
} else if (dialogueContainer) {
    // Интро ещё не пройдено целиком — продолжаем с сохранённого шага,
    // если он есть (например, после обновления страницы посреди диалога).
    dogName = loadDogName();
    dialogueIndex = loadDialogueIndex();

    dialogueContainer.classList.add("is-active");
    document.body.classList.add("intro-active");
    renderIntroDialogue();

    pausePuzzleAnimations();
}

// ===== Временный режим разработчика: 5 кликов по собаке подряд открывают
// меню с кнопкой полного сброса прогресса. Убрать, когда тестирование
// закончится. =====
let devClickCount = 0;
let devClickResetTimer = null;
let devMenuElement = null;

function ensureDevMenu(){
    if(devMenuElement) return devMenuElement;

    const menu = document.createElement("div");
    menu.id = "devMenu";
    menu.className = "dev-menu";
    menu.innerHTML = `
        <h3 class="dev-menu__title">Режим разработчика</h3>
        <button id="devResetProgress" class="dev-menu__btn dev-menu__btn--danger" type="button">Сбросить прогресс</button>
        <div class="dev-menu__section">
            <label class="dev-menu__label" for="devTestDate">Тестовая дата (ключи месяца)</label>
            <input id="devTestDate" class="dev-menu__input" type="date" placeholder="ГГГГ-ММ-ДД">
            <button id="devCheckMonthlyKey" class="dev-menu__btn" type="button">Проверить ключ</button>
            <p id="devMonthlyKeyResult" class="dev-menu__hint"></p>
        </div>
        <button id="devMenuClose" class="dev-menu__btn" type="button">Закрыть</button>
    `;
    document.body.appendChild(menu);

    menu.addEventListener("click", (event) => event.stopPropagation());

    menu.querySelector("#devResetProgress").addEventListener("click", resetAllProgress);

    menu.querySelector("#devCheckMonthlyKey").addEventListener("click", async () => {
        const dateInput = menu.querySelector("#devTestDate");
        const resultEl = menu.querySelector("#devMonthlyKeyResult");
        const testDate = dateInput.value; // "YYYY-MM-DD" или пусто (реальная дата)

        if(typeof window.checkMonthlyKey !== "function"){
            resultEl.textContent = "checkMonthlyKey недоступен.";
            return;
        }

        resultEl.textContent = "Проверяю...";
        const result = await window.checkMonthlyKey(testDate || undefined);
        if(!result){
            resultEl.textContent = "Ошибка запроса.";
        } else if(result.granted){
            resultEl.textContent = `Выдан ключ за ${result.month}, часть #${result.piece_index + 1}.`;
        } else {
            resultEl.textContent = `Ключ не выдан (${result.reason || "нечего выдавать"}).`;
        }
    });

    menu.querySelector("#devMenuClose").addEventListener("click", closeDevMenu);

    devMenuElement = menu;
    return menu;
}

function openDevMenu(){
    ensureDevMenu().classList.add("is-open");
}

function closeDevMenu(){
    if(devMenuElement) devMenuElement.classList.remove("is-open");
}

// Считаем клики по ОБЛАСТИ собаки через координаты, а не через слушатель
// на самой картинке: у неё намеренно pointer-events:none большую часть
// времени (см. dog.css), иначе она перехватывала бы клики по иконкам
// чата/уведомлений, которые визуально оказываются под ней во время интро.
// Слушаем именно в capture-фазе: иначе клик по этой же области "проваливается"
// на #dialogueContainer, а тот гасит propagation ещё до bubble-фазы на document.
document.addEventListener("click", (event) => {
    if(!dogCharacter) return;

    const rect = dogCharacter.getBoundingClientRect();
    const withinDog = event.clientX >= rect.left && event.clientX <= rect.right &&
                       event.clientY >= rect.top && event.clientY <= rect.bottom;
    if(!withinDog) return;

    devClickCount += 1;
    if(devClickResetTimer) clearTimeout(devClickResetTimer);
    devClickResetTimer = setTimeout(() => { devClickCount = 0; }, 1500);

    if(devClickCount >= 5){
        devClickCount = 0;
        // Без этого тот же самый клик долетает и до слушателя "клик мимо
        // меню — закрыть" ниже (он висит на document в bubble-фазе) и
        // закрывает меню в тот же миг, что и открыл — она никогда не
        // становится видна.
        event.stopPropagation();
        openDevMenu();
    }
}, true);

document.addEventListener("click", (event) => {
    if(!devMenuElement || !devMenuElement.classList.contains("is-open")) return;
    if(event.target.closest("#devMenu")) return;
    closeDevMenu();
});
document.addEventListener("click", (event) => {
    if(introFrozen) return;
    if(resetConfirmActive) return;
    if(dogRemarkActive) return;

    const line = getCurrentLine();
    if(!line || !line.waitForClick) return;

    const target = event.target.closest(`#${line.waitForClick}`);
    if(!target) return;

    // Клик по виджету тем открывает отдельную менюшку выбора темы,
    // но диалог продолжается только после реального выбора темы
    // (см. handleThemeSelected, вызывается из settings.js).
    if(line.opensThemeMenu){
        showClickHint("Выбери одну из тем", line.waitForClick);
        return;
    }

    // Клик по собаке — именно сейчас (не раньше) ключ реально появляется
    // в инвентаре, и собака на месте меняет эмоцию на счастливую (текст
    // диалога не трогаем, просто перерисовываем картинку).
    if(line.grantKeyOnClick){
        if(typeof puzzleKeySystem !== "undefined" && puzzleKeySystem.grantKey) puzzleKeySystem.grantKey();
        setDogEmotion("happy");
    }

    // Берём ключ в руку и приостанавливаем сценарий, пока пользователь сама
    // не откроет кусочек пазла (см. puzzle.js).
    if(line.selectsKey){
        if(typeof puzzleKeySystem !== "undefined" && puzzleKeySystem.selectKey) puzzleKeySystem.selectKey(event);
    }
    if(line.pauseForPuzzleUnlock){
        pauseIntroForPuzzleUnlock();
        return;
    }
    if(line.pauseForLetterRead){
        pauseIntroForLetterRead();
        return;
    }

    // isEnding проверяем явно — диалог-ответвление «Пока нет» дописан в
    // конец массива, так что last-index сам по себе больше не значит «конец».
    if(line.isEnding || dialogueIndex >= introDialogueLines.length - 1){
        finishIntroDialogue();
    } else {
        dialogueIndex += 1;
        renderIntroDialogue();
    }
}, true);