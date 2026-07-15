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
    sad:      "images/dog/sad.png"
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
        if(normalizedEmotion === "sleeping"){
            img.style.animation = "";
            img.className = "dog-character is-intro is-sleeping";
        } else if(normalizedEmotion === "neutral"){
            img.style.animation = "";
            img.className = "dog-character is-resting";
        } else {
            img.style.animation = "";
            img.className = "dog-character is-intro";
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

function showSettingsPrompt(){
    const settingsButtonEl = document.getElementById("settingsButton");
    if(settingsButtonEl){
        settingsButtonEl.classList.add("is-highlighted");
    }

    const hint = ensureSettingsHint();
    hint.classList.add("is-visible");
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

    // Определяем подпись снизу (нажми / кнопки / ввод)
    let footerHtml = '<span>нажми в любом месте, чтобы продолжить</span>';

    if(line.waitForSettings){
        footerHtml = '<span>нажми на иконку настроек, чтобы продолжить</span>';
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

    if(line.waitForSettings){
        showSettingsPrompt();
    } else {
        hideSettingsPrompt();
    }

    if(dialogueIndex < 14){
        showIntroOverlay();
    } else {
        hideIntroOverlay();
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

function finishIntroDialogue(){
    hideSettingsPrompt();
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
    // Не обрабатываем клик, если нажали на кнопку, инпут или внутри выбора
    if(e.target.closest(".choice-btn") || e.target.closest(".name-input-wrap")) return;

    const line = getCurrentLine();
    // Для choice и name_input клик по фону не переключает
    if(line.type === "choice" || line.type === "name_input") return;

    if(line.waitForSettings){
        if(e.target.closest("#settingsButton")){
            if(dialogueIndex >= introDialogueLines.length - 1){
                finishIntroDialogue();
            } else {
                dialogueIndex += 1;
                renderIntroDialogue();
            }
        }
        return;
    }

    // Если диалог помечен isEnding — завершаем интро
    if(line.isEnding){
        finishIntroDialogue();
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
    renderIntroDialogue();

    // При старте сразу останавливаем анимации пазла (пока идёт диалог со спящей собакой)
    pausePuzzleAnimations();
}