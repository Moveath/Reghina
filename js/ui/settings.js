const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const aboutButton = document.getElementById("aboutButton");
const progressButton = document.getElementById("progressButton");
const progressPanel = document.getElementById("progressPanel");
const characterInfoButton = document.getElementById("characterInfoButton");
const dogNameButton = document.getElementById("dogNameButton");
const musicBoxButton = document.getElementById("musicBoxButton");
const musicPanel = document.getElementById("musicPanel");
const aboutPanel = document.getElementById("aboutPanel");
const lettersButton = document.getElementById("lettersButton");
const lettersPanel = document.getElementById("lettersPanel");

const settingsSections = [
    { icon: "🎨", label: "Темы", id: "themesOption" },
    { icon: "🔊", label: "Звуки", id: "soundsOption" },
    { icon: "🌐", label: "Язык", id: "languageOption" }
];
const progressActions = [
    { icon: "🔍", label: "Показать код", id: "showCodeOption" },
    { icon: "⌨️", label: "Ввести код", id: "enterCodeOption" },
    { icon: "♻️", label: "Сбросить прогресс", id: "resetProgressOption" }
];

const musicSections = [
    { icon: "🎶", label: "Музыка", id: "musicWidgetOption" },
    { icon: "➕", label: "Добавить песню", id: "addSongOption" },
    { icon: "📋", label: "Список музыки", id: "musicListOption" }
];

const aboutSections = [
    { icon: "ℹ️", label: "Информация о сайте" },
    { icon: "📜", label: "История создания" },
    { icon: "💡", label: "Идея проекта" },
    { icon: "🕓", label: "История обновлений" }
];

let themeSelectionMenuElement = null;
const selectedThemeStorageKey = "reginaSelectedTheme";

// 4 готовых фона из папки images/backgrounds — превьюшка + подпись для
// каждого в менюшке выбора темы. "pink" — тот самый фон, что стоит по
// умолчанию (совпадает с исходным градиентом в css/style.css), поэтому
// именно он отмечен галочкой, пока пользователь ничего не выбирал сам.
// "white" — без картинки, просто сплошной белый цвет (референс в
// images/backgrounds/theme-white.jpg был не нужен, попросили чистый белый).
const themeOptions = [
    { id: "pink",   label: "Розовый",    image: "images/backgrounds/theme-pink.png" },
    { id: "purple", label: "Фиолетовый", image: "images/backgrounds/theme-purple.png" },
    { id: "blue",   label: "Голубой",    image: "images/backgrounds/theme-blue.png" },
    { id: "white",  label: "Белый",      color: "#ffffff" }
];
const defaultThemeId = "pink";

function saveSelectedTheme(themeId){
    try { localStorage.setItem(selectedThemeStorageKey, themeId); } catch(e) {}
}

function loadSelectedTheme(){
    try { return localStorage.getItem(selectedThemeStorageKey) || ""; } catch(e) { return ""; }
}

// Реально меняет фон сайта на картинку (или сплошной цвет) выбранной темы.
function applyTheme(themeId){
    const theme = themeOptions.find(t => t.id === themeId) || themeOptions.find(t => t.id === defaultThemeId);
    if(!theme) return;
    if(theme.image){
        document.body.style.backgroundImage = `url("${theme.image}")`;
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundPosition = "center";
        document.body.style.backgroundRepeat = "no-repeat";
    } else {
        document.body.style.backgroundImage = "none";
        document.body.style.backgroundColor = theme.color || "#ffffff";
    }
}

// Отдельная менюшка выбора темы (не горизонтальный список внутри настроек),
// чтобы в будущем не выходить за границы при добавлении новых виджетов.
function ensureThemeSelectionMenu(){
    if(themeSelectionMenuElement) return themeSelectionMenuElement;

    const menu = document.createElement("div");
    menu.id = "themeSelectionMenu";
    menu.className = "theme-selection-menu";
    menu.innerHTML = `
        <h3 class="theme-selection-menu__title">Выбери тему</h3>
        <ul class="theme-selection-menu__list">
            ${themeOptions.map(theme => `
                <li>
                    <button class="theme-option-btn" type="button" data-theme="${theme.id}">
                        <span class="theme-option-preview" style="${theme.image ? `background-image:url('${theme.image}')` : `background-color:${theme.color}`}"></span>
                        <span class="theme-option-label">${theme.label}</span>
                        <span class="theme-option-check" aria-hidden="true"><span>&#10003;</span></span>
                    </button>
                </li>
            `).join("")}
        </ul>
    `;
    document.body.appendChild(menu);

    menu.addEventListener("click", (event) => event.stopPropagation());

    menu.querySelectorAll(".theme-option-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();

            // На уже выбранную (текущую) тему клик ничего не делает —
            // сменить фон можно только выбрав другую.
            if(btn.classList.contains("is-selected")) return;

            menu.querySelectorAll(".theme-option-btn").forEach(b => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");
            saveSelectedTheme(btn.dataset.theme);
            applyTheme(btn.dataset.theme);

            closeThemeMenu();

            if(typeof handleThemeSelected === "function") handleThemeSelected();
        });
    });

    // Отмечаем галочкой либо ранее сохранённую тему, либо розовую по
    // умолчанию (она и так стоит фоном, пока ничего не выбрано).
    const activeTheme = loadSelectedTheme() || defaultThemeId;
    const activeBtn = menu.querySelector(`.theme-option-btn[data-theme="${activeTheme}"]`);
    if(activeBtn) activeBtn.classList.add("is-selected");

    themeSelectionMenuElement = menu;
    return menu;
}

function openThemeMenu(){
    ensureThemeSelectionMenu().classList.add("is-open");
}

function closeThemeMenu(){
    if(themeSelectionMenuElement){
        themeSelectionMenuElement.classList.remove("is-open");
    }
}

function toggleThemeMenu(){
    const menu = ensureThemeSelectionMenu();
    const isOpen = menu.classList.contains("is-open");
    if(isOpen && typeof isIntroCloseLocked === "function" && isIntroCloseLocked()) return;
    menu.classList.toggle("is-open");
}

function renderSettingsPanel(){
    if(!settingsPanel) return;

    settingsPanel.innerHTML = `
        <h3 class="settings-panel__title">Настройки</h3>
        <ul class="settings-section-list">
            ${settingsSections.map(section => `
                <li class="settings-section-item" ${section.id ? `id="${section.id}"` : ""}>
                    <span class="settings-section-icon" aria-hidden="true">${section.icon}</span>
                    <span>${section.label}</span>
                </li>
            `).join("")}
        </ul>
    `;

    const themesOption = document.getElementById("themesOption");
    if(themesOption){
        themesOption.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleThemeMenu();
        });
    }
}

function renderMusicPanel(){
    if(!musicPanel) return;

    musicPanel.innerHTML = `
        <h3 class="settings-panel__title">Музыкальная шкатулка</h3>
        <ul class="settings-section-list">
            ${musicSections.map(section => `
                <li class="settings-section-item" ${section.id ? `id="${section.id}"` : ""}>
                    <span class="settings-section-icon" aria-hidden="true">${section.icon}</span>
                    <span>${section.label}</span>
                </li>
            `).join("")}
        </ul>
    `;
}
function renderAboutPanel(){
    if(!aboutPanel) return;

    aboutPanel.innerHTML = `
        <h3 class="settings-panel__title">О проекте</h3>
        <ul class="settings-section-list">
            ${aboutSections.map(section => `
                <li class="settings-section-item">
                    <span class="settings-section-icon" aria-hidden="true">${section.icon}</span>
                    <span>${section.label}</span>
                </li>
            `).join("")}
        </ul>
    `;
}

function renderProgressPanel(){
    if(!progressPanel) return;

    progressPanel.innerHTML = `
        <h3 class="settings-panel__title">Управление прогрессом</h3>
        <ul class="progress-actions-list">
            ${progressActions.map(action => `
                <li class="progress-action-item" ${action.id ? `id="${action.id}"` : ""}>
                    <span class="progress-action-icon" aria-hidden="true">${action.icon}</span>
                    <span>${action.label}</span>
                </li>
            `).join("")}
        </ul>
    `;

    const resetOption = document.getElementById("resetProgressOption");
    if(resetOption){
        resetOption.classList.add("is-clickable");
        resetOption.addEventListener("click", (event) => {
            event.stopPropagation();
            // Подтверждение теперь "от лица" собаки — тот же диалог, что и
            // в интро (пузырь с Да/Нет), см. showResetConfirmDialogue в
            // dialogue.js.
            if(typeof window.showResetConfirmDialogue === "function") window.showResetConfirmDialogue();
        });
    }
}

function closePanels(){
    if(settingsPanel) settingsPanel.classList.remove("is-open");
    if(progressPanel) progressPanel.classList.remove("is-open");
    if(musicPanel) musicPanel.classList.remove("is-open");
    if(aboutPanel) aboutPanel.classList.remove("is-open");
    if(lettersPanel) lettersPanel.classList.remove("is-open");
}

function updateCharacterButtonLabel(){
    let name = "";
    try {
        name = localStorage.getItem("dog_name") || "";
    } catch (e) {}

    const nextLabel = name && name.trim() ? `О ${name.trim()}` : "О персонаже";

    if(characterInfoButton){
        characterInfoButton.setAttribute("data-label", nextLabel);
        characterInfoButton.setAttribute("aria-label", nextLabel);
    }

    if(dogNameButton){
        const dogNameLabel = name && name.trim() ? name.trim() : "персонаж";
        dogNameButton.setAttribute("data-label", dogNameLabel);
        dogNameButton.setAttribute("aria-label", `Имя: ${dogNameLabel}`);
    }
}

// Во время интро панель, которую сейчас объясняет собака, нельзя закрыть
// вручную повторным кликом — она закроется только сама, когда сценарий
// перейдёт к следующей теме (через closeSettingsPanel в dialogue.js) или
// когда интро закончится целиком. Открыть в первый раз это не мешает.
function isIntroCloseLocked(){
    return document.body.classList.contains("intro-active");
}

function toggleSettingsPanel(){
    if(!settingsPanel) return;
    const isOpen = settingsPanel.classList.contains("is-open");
    if(isOpen && isIntroCloseLocked()) return;
    closePanels();
    if(!isOpen) settingsPanel.classList.add("is-open");
}

function toggleProgressPanel(){
    if(!progressPanel) return;
    const isOpen = progressPanel.classList.contains("is-open");
    if(isOpen && isIntroCloseLocked()) return;
    closePanels();
    if(!isOpen) progressPanel.classList.add("is-open");
}

function toggleMusicPanel(){
    if(!musicPanel) return;
    const isOpen = musicPanel.classList.contains("is-open");
    if(isOpen && isIntroCloseLocked()) return;
    closePanels();
    if(!isOpen) musicPanel.classList.add("is-open");
}

function toggleAboutPanel(){
    if(!aboutPanel) return;
    const isOpen = aboutPanel.classList.contains("is-open");
    if(isOpen && isIntroCloseLocked()) return;
    closePanels();
    if(!isOpen) aboutPanel.classList.add("is-open");
}

// Открытие/закрытие самой панели — рендер содержимого (папки/списки/форма)
// и вся логика писем живут в js/ui/letters.js, здесь только встраивание
// в общие правила панелей (одна открыта единовременно, блокировка закрытия
// во время интро).
function toggleLettersPanel(){
    if(!lettersPanel) return;
    if(typeof isLettersButtonIntroLocked === "function" && isLettersButtonIntroLocked()) return;
    const isOpen = lettersPanel.classList.contains("is-open");
    if(isOpen && isIntroCloseLocked()) return;
    closePanels();
    if(!isOpen) lettersPanel.classList.add("is-open");
}

if(settingsButton && settingsPanel){
    renderSettingsPanel();
    settingsButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSettingsPanel();
    });
}

if(aboutButton && aboutPanel){
    renderAboutPanel();
    aboutButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleAboutPanel();
    });
}

if(progressButton && progressPanel){
    renderProgressPanel();
    progressButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleProgressPanel();
    });
}

if(musicBoxButton && musicPanel){
    renderMusicPanel();
    musicBoxButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleMusicPanel();
    });
}

// Открытие иконки/рендер содержимого «Писем» — в js/ui/letters.js
// (initLettersWidget), он вызывает toggleLettersPanel() отсюда.

document.addEventListener("click", (event) => {
    if(event.target.closest("#dialogueContainer")) return;
    if(isIntroCloseLocked()) return;
    closePanels();
});
window.addEventListener("storage", updateCharacterButtonLabel);
updateCharacterButtonLabel();
applyTheme(loadSelectedTheme() || defaultThemeId);

if(settingsPanel){
    settingsPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

if(progressPanel){
    progressPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

if(musicPanel){
    musicPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

if(aboutPanel){
    aboutPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

if(lettersPanel){
    lettersPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

