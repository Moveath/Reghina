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
const chatButton = document.getElementById("chatButton");
const notificationButton = document.getElementById("notificationButton");
const notificationPanel = document.getElementById("notificationPanel");

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
            <li><button class="theme-option-btn" type="button" data-theme="1">Фон 1</button></li>
            <li><button class="theme-option-btn" type="button" data-theme="2">Фон 2</button></li>
            <li><button class="theme-option-btn" type="button" data-theme="3">Фон 3</button></li>
        </ul>
    `;
    document.body.appendChild(menu);

    menu.addEventListener("click", (event) => event.stopPropagation());

    menu.querySelectorAll(".theme-option-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();

            // Пока только имитация выбора — фон не меняем.
            menu.querySelectorAll(".theme-option-btn").forEach(b => b.classList.remove("is-selected"));
            btn.classList.add("is-selected");

            closeThemeMenu();

            if(typeof handleThemeSelected === "function") handleThemeSelected();
        });
    });

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

function renderNotificationPanel(){
    if(!notificationPanel) return;

    notificationPanel.innerHTML = `
        <h3 class="settings-panel__title">Письмо от Егора</h3>
        <p class="notification-letter-placeholder">Здесь скоро появится письмо от Егора...</p>
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
}

function closePanels(){
    if(settingsPanel) settingsPanel.classList.remove("is-open");
    if(progressPanel) progressPanel.classList.remove("is-open");
    if(musicPanel) musicPanel.classList.remove("is-open");
    if(aboutPanel) aboutPanel.classList.remove("is-open");
    if(notificationPanel) notificationPanel.classList.remove("is-open");
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

function toggleSettingsPanel(){
    if(!settingsPanel) return;
    const isOpen = settingsPanel.classList.contains("is-open");
        closePanels();
    if(!isOpen) settingsPanel.classList.add("is-open");
}

function toggleProgressPanel(){
    if(!progressPanel) return;
    const isOpen = progressPanel.classList.contains("is-open");
    closePanels();
    if(!isOpen) progressPanel.classList.add("is-open");
}

function toggleMusicPanel(){
    if(!musicPanel) return;
    const isOpen = musicPanel.classList.contains("is-open");
    closePanels();
    if(!isOpen) musicPanel.classList.add("is-open");
}

function toggleAboutPanel(){
    if(!aboutPanel) return;
    const isOpen = aboutPanel.classList.contains("is-open");
    closePanels();
    if(!isOpen) aboutPanel.classList.add("is-open");
}

function toggleNotificationPanel(){
    if(!notificationPanel) return;
    const isOpen = notificationPanel.classList.contains("is-open");
    closePanels();
    if(!isOpen) notificationPanel.classList.add("is-open");
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

let notificationAutoCloseTimer = null;

if(notificationButton && notificationPanel){
    renderNotificationPanel();
    notificationButton.addEventListener("click", (event) => {
        event.stopPropagation();
        // Открыли письмо — «непрочитанное» больше не актуально.
        notificationButton.classList.remove("has-unread");
        toggleNotificationPanel();

        // Письмо живёт только внутри самого виджета: открылось на мгновение
        // и само закрывается — не зависит от того, куда пошёл диалог дальше.
        if(notificationAutoCloseTimer){
            clearTimeout(notificationAutoCloseTimer);
            notificationAutoCloseTimer = null;
        }
        if(notificationPanel.classList.contains("is-open")){
            notificationAutoCloseTimer = setTimeout(() => {
                notificationPanel.classList.remove("is-open");
                notificationAutoCloseTimer = null;
            }, 2200);
        }
    });
}

document.addEventListener("click", (event) => {
    if(event.target.closest("#dialogueContainer")) return;
    closePanels();
});
window.addEventListener("storage", updateCharacterButtonLabel);
updateCharacterButtonLabel();

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

if(notificationPanel){
    notificationPanel.addEventListener("click", (event) => {
        event.stopPropagation();
    });
}

