const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const historyButton = document.getElementById("historyButton");
const aboutButton = document.getElementById("aboutButton");
const progressButton = document.getElementById("progressButton");
const progressPanel = document.getElementById("progressPanel");
const characterInfoButton = document.getElementById("characterInfoButton");
const dogNameButton = document.getElementById("dogNameButton");

const settingsSections = [
    { icon: "🎨", label: "Темы" },
    { icon: "🎵", label: "Музыка" },
    { icon: "🔊", label: "Звуки" },
    { icon: "🌐", label: "Язык" },
    { icon: "🐶", label: "Анимация" },
    { icon: "️✨", label: "Визуальные эффекты" }
];

const progressActions = [
    { icon: "🔍", label: "Показать код" },
    { icon: "⌨️", label: "Ввести код" },
    { icon: "♻️", label: "Сбросить прогресс" }
];

function renderSettingsPanel(){
    if(!settingsPanel) return;

    settingsPanel.innerHTML = `
        <h3 class="settings-panel__title">Настройки</h3>
        <ul class="settings-section-list">
            ${settingsSections.map(section => `
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
                <li class="progress-action-item">
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

if(settingsButton && settingsPanel){
    renderSettingsPanel();
    settingsButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleSettingsPanel();
    });
}

if(historyButton){
    historyButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closePanels();
        window.alert("История обновлений будет добавлена позже");
    });
}

if(aboutButton){
    aboutButton.addEventListener("click", (event) => {
        event.stopPropagation();
        closePanels();
        window.alert("О проекте будет добавлено позже");
    });
}

if(progressButton && progressPanel){
    renderProgressPanel();
    progressButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleProgressPanel();
    });
}

document.addEventListener("click", closePanels);
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
