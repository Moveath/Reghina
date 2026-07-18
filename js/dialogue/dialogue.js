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
        const notifBtn = document.getElementById("notificationButton");
        if(notifBtn) notifBtn.classList.add("has-unread");
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

function finishIntroDialogue(){
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

// Старт интро
if (dialogueContainer) {
    dialogueContainer.classList.add("is-active");
    document.body.classList.add("intro-active");
    renderIntroDialogue();

    pausePuzzleAnimations();
}
document.addEventListener("click", (event) => {
    if(introFrozen) return;

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

    // isEnding проверяем явно — диалог-ответвление «Пока нет» дописан в
    // конец массива, так что last-index сам по себе больше не значит «конец».
    if(line.isEnding || dialogueIndex >= introDialogueLines.length - 1){
        finishIntroDialogue();
    } else {
        dialogueIndex += 1;
        renderIntroDialogue();
    }
}, true);