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
    { icon: "🎨", label: t("settings_theme_label"), id: "themesOption" },
    { icon: "🔊", label: t("settings_sounds_label"), id: "soundsOption" },
    { icon: "🌐", label: t("settings_language_label"), id: "languageOption" }
];
const progressActions = [
    { icon: "🔍", label: t("progress_show_code"), id: "showCodeOption" },
    { icon: "⌨️", label: t("progress_enter_code"), id: "enterCodeOption" },
    { icon: "♻️", label: t("progress_reset"), id: "resetProgressOption" }
];

const aboutSections = [
    { icon: "ℹ️", label: t("about_site_info"), id: "aboutSiteInfoOption" },
    { icon: "📜", label: t("about_creation_story") },
    { icon: "💡", label: t("about_project_idea"), id: "aboutProjectIdeaOption" }
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
    { id: "pink",   label: t("theme_pink"),   image: "images/backgrounds/theme-pink.webp" },
    { id: "purple", label: t("theme_purple"), image: "images/backgrounds/theme-purple.webp" },
    { id: "blue",   label: t("theme_blue"),   image: "images/backgrounds/theme-blue.webp" },
    { id: "white",  label: t("theme_white"),  color: "#ffffff" }
];
const defaultThemeId = "pink";

// Названия языков переведены на ТЕКУЩИЙ выбранный язык интерфейса (не
// самоназвание): если сейчас русский, второй пункт читается "Английский",
// а не "English"; если сейчас английский — "Russian", а не "Русский".
// Превью — не emoji-флаг (эмодзи флага не рендерится как флаг на Windows,
// показывает уродливые буквы "RU"/"GB"/"RO" в квадратике), а нарисованный
// через CSS флаг (см. .language-option-preview--* в css/settings.css),
// выглядит одинаково на любой системе.
let languageSelectionMenuElement = null;
const languageOptions = [
    { id: "ru", label: t("lang_name_ru") },
    { id: "en", label: t("lang_name_en") },
    { id: "ro", label: t("lang_name_ro") }
];

function saveSelectedTheme(themeId){
    try { localStorage.setItem(selectedThemeStorageKey, themeId); } catch(e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
}

function loadSelectedTheme(){
    try { return localStorage.getItem(selectedThemeStorageKey) || ""; } catch(e) { return ""; }
}

// Реально меняет фон сайта на картинку (или сплошной цвет) выбранной темы.
// Ставим через setProperty(..., "important"), а не просто через .style.* —
// иначе это никогда не победит инлайн-стиль body{...!important}, который
// index.html вставляет ДО загрузки этого файла (чтобы не мигать дефолтной
// темой при старте, см. комментарий в <head>). !important в стиле-теге
// побеждает обычный инлайн-style независимо от порядка, поэтому и здесь
// нужен !important — иначе смена темы кликом переставала бы что-либо менять
// визуально после первого рендера.
function applyTheme(themeId){
    const theme = themeOptions.find(t => t.id === themeId) || themeOptions.find(t => t.id === defaultThemeId);
    if(!theme) return;
    if(theme.image){
        document.body.style.setProperty("background-image", `url("${theme.image}")`, "important");
        document.body.style.setProperty("background-size", "cover", "important");
        document.body.style.setProperty("background-position", "center", "important");
        document.body.style.setProperty("background-repeat", "no-repeat", "important");
        document.body.style.removeProperty("background-color");
    } else {
        document.body.style.setProperty("background-image", "none", "important");
        document.body.style.setProperty("background-color", theme.color || "#ffffff", "important");
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
        <h3 class="theme-selection-menu__title">${t("theme_choose_title")}</h3>
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
    // Оба меню — независимые position:fixed элементы поверх страницы,
    // одновременное открытие обоих даёт наложение друг на друга.
    if(!isOpen) closeLanguageMenu();
    menu.classList.toggle("is-open");
}

// Менюшка выбора языка — 1:1 копия архитектуры меню тем выше. Отличие: клик
// по НЕ выбранному языку не применяет его сразу, а зовёт собаку спросить
// подтверждение (showLanguageConfirmDialogue в dialogue.js) — смена языка
// куда заметнее смены фона, поэтому её сначала подтверждают.
function ensureLanguageSelectionMenu(){
    if(languageSelectionMenuElement) return languageSelectionMenuElement;

    const menu = document.createElement("div");
    menu.id = "languageSelectionMenu";
    menu.className = "language-selection-menu";
    menu.innerHTML = `
        <h3 class="language-selection-menu__title">${t("language_choose_title")}</h3>
        <ul class="language-selection-menu__list">
            ${languageOptions.map(lang => `
                <li>
                    <button class="language-option-btn" type="button" data-language="${lang.id}">
                        <span class="language-option-preview language-option-preview--${lang.id}" aria-hidden="true"></span>
                        <span class="language-option-label">${lang.label}</span>
                        <span class="language-option-check" aria-hidden="true"><span>&#10003;</span></span>
                    </button>
                </li>
            `).join("")}
        </ul>
    `;
    document.body.appendChild(menu);

    menu.addEventListener("click", (event) => event.stopPropagation());

    menu.querySelectorAll(".language-option-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();

            // На уже выбранный язык клик ничего не делает.
            if(btn.classList.contains("is-selected")) return;

            closeLanguageMenu();
            if(typeof window.showLanguageConfirmDialogue === "function"){
                window.showLanguageConfirmDialogue(btn.dataset.language);
            }
        });
    });

    const activeLang = typeof getSelectedLanguage === "function" ? getSelectedLanguage() : "ru";
    const activeBtn = menu.querySelector(`.language-option-btn[data-language="${activeLang}"]`);
    if(activeBtn) activeBtn.classList.add("is-selected");

    languageSelectionMenuElement = menu;
    return menu;
}

function openLanguageMenu(){
    ensureLanguageSelectionMenu().classList.add("is-open");
}

function closeLanguageMenu(){
    if(languageSelectionMenuElement){
        languageSelectionMenuElement.classList.remove("is-open");
    }
}

function toggleLanguageMenu(){
    const menu = ensureLanguageSelectionMenu();
    const isOpen = menu.classList.contains("is-open");
    if(isOpen && typeof isIntroCloseLocked === "function" && isIntroCloseLocked()) return;
    if(!isOpen) closeThemeMenu();
    menu.classList.toggle("is-open");
}
window.closeLanguageMenu = closeLanguageMenu;

function renderSettingsPanel(){
    if(!settingsPanel) return;

    settingsPanel.innerHTML = `
        <h3 class="settings-panel__title">${t("settings_panel_title")}</h3>
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

    const languageOption = document.getElementById("languageOption");
    if(languageOption){
        languageOption.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleLanguageMenu();
        });
    }
}

// Иконка на самой кнопке-шкатулке (top-actions) и иконка внутри виджета
// громкости — обе отражают состояние "звук выключен" (громкость 0),
// см. window.onMusicVolumeChanged ниже.
function musicVolumeIconFor(percent){
    return percent === 0 ? "🔇" : "🎵";
}

function renderMusicPanel(){
    if(!musicPanel) return;

    const tracks = typeof window.musicGetTracks === "function" ? window.musicGetTracks() : [];
    const currentTrackId = typeof window.musicGetCurrentTrackId === "function" ? window.musicGetCurrentTrackId() : null;
    const volumePercent = typeof window.musicGetVolumePercent === "function" ? window.musicGetVolumePercent() : 45;

    musicPanel.innerHTML = `
        <h3 class="settings-panel__title">${t("music_panel_title")}</h3>
        <ul class="settings-section-list">
            <li class="settings-section-item is-clickable" id="musicWidgetOption">
                <span class="settings-section-icon" aria-hidden="true">🎶</span>
                <span>${t("music_music_label")}</span>
            </li>
            <li class="music-volume-section" id="musicVolumeSection">
                <div class="music-volume-row">
                    <span class="music-volume-icon" id="musicVolumeIcon" aria-hidden="true">${musicVolumeIconFor(volumePercent)}</span>
                    <input type="range" min="0" max="100" step="1" id="musicVolumeSlider" class="music-volume-slider" value="${volumePercent}">
                    <span class="music-volume-value" id="musicVolumeValue">${volumePercent}%</span>
                </div>
            </li>
            <li class="settings-section-item is-clickable" id="addSongOption">
                <span class="settings-section-icon" aria-hidden="true">➕</span>
                <span>${t("music_add_song")}</span>
            </li>
            <li class="music-add-song-section" id="musicAddSongSection">
                <div class="music-add-song-row">
                    <input type="text" id="musicSuggestInput" class="music-suggest-input" placeholder="${t("music_add_song_placeholder")}" maxlength="120" autocomplete="off">
                    <button type="button" id="musicSuggestSubmit" class="music-suggest-submit">${t("music_add_song_submit")}</button>
                </div>
            </li>
            <li class="settings-section-item is-clickable" id="musicListOption">
                <span class="settings-section-icon" aria-hidden="true">📋</span>
                <span>${t("music_list")}</span>
            </li>
            <li class="music-track-list-section" id="musicTrackListSection">
                <ul class="music-track-list">
                    ${tracks.map(track => `
                        <li>
                            <button type="button" class="music-track-btn ${track.id === currentTrackId ? "is-selected" : ""}" data-track="${track.id}">
                                <span class="music-track-check" aria-hidden="true">${track.id === currentTrackId ? "&#10003;" : ""}</span>
                                <span class="music-track-title">${track.title}</span>
                            </button>
                        </li>
                    `).join("")}
                </ul>
            </li>
        </ul>
    `;

    const musicWidgetOption = document.getElementById("musicWidgetOption");
    const musicVolumeSection = document.getElementById("musicVolumeSection");
    if(musicWidgetOption && musicVolumeSection){
        musicWidgetOption.addEventListener("click", (event) => {
            event.stopPropagation();
            musicVolumeSection.classList.toggle("is-open");
        });
    }

    const musicVolumeSlider = document.getElementById("musicVolumeSlider");
    if(musicVolumeSlider){
        musicVolumeSlider.addEventListener("click", (event) => event.stopPropagation());
        musicVolumeSlider.addEventListener("input", () => {
            if(typeof window.musicSetVolumePercent === "function"){
                window.musicSetVolumePercent(Number(musicVolumeSlider.value));
            }
        });
    }

    const addSongOption = document.getElementById("addSongOption");
    const musicAddSongSection = document.getElementById("musicAddSongSection");
    if(addSongOption && musicAddSongSection){
        addSongOption.addEventListener("click", (event) => {
            event.stopPropagation();
            const willOpen = !musicAddSongSection.classList.contains("is-open");
            musicAddSongSection.classList.toggle("is-open", willOpen);
            if(willOpen){
                const input = document.getElementById("musicSuggestInput");
                if(input) input.focus();
            }
        });
    }

    const musicSuggestInput = document.getElementById("musicSuggestInput");
    const musicSuggestSubmit = document.getElementById("musicSuggestSubmit");
    async function submitMusicSuggestion(){
        if(!musicSuggestInput) return;
        const name = musicSuggestInput.value.trim();
        if(!name) return;
        musicSuggestInput.value = "";
        if(musicAddSongSection) musicAddSongSection.classList.remove("is-open");
        if(musicPanel) musicPanel.classList.remove("is-open");

        if(typeof window.suggestMusicToEgor === "function") await window.suggestMusicToEgor(name);
        if(typeof window.showDogRemark === "function") window.showDogRemark(t("music_suggest_thanks"));
    }
    if(musicSuggestInput){
        musicSuggestInput.addEventListener("click", (event) => event.stopPropagation());
        musicSuggestInput.addEventListener("keydown", (event) => {
            if(event.key === "Enter") submitMusicSuggestion();
        });
    }
    if(musicSuggestSubmit){
        musicSuggestSubmit.addEventListener("click", (event) => {
            event.stopPropagation();
            submitMusicSuggestion();
        });
    }

    const musicListOption = document.getElementById("musicListOption");
    const musicTrackListSection = document.getElementById("musicTrackListSection");
    if(musicListOption && musicTrackListSection){
        musicListOption.addEventListener("click", (event) => {
            event.stopPropagation();
            musicTrackListSection.classList.toggle("is-open");
        });
    }

    musicPanel.querySelectorAll(".music-track-btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            // Клик по уже играющему треку ничего не делает — он и так играет.
            if(btn.classList.contains("is-selected")) return;
            if(typeof window.musicSelectTrack === "function") window.musicSelectTrack(btn.dataset.track);
        });
    });
}

// Обновление отметки выбранного трека — единая точка правды и для клика по
// списку, и для автоматических переходов движка (Stardew → Animal Crossing
// в конце интро, восстановление сохранённого трека при заходе). Панель
// рендерится один раз при загрузке (см. низ файла), поэтому элементы
// стабильны — обновляем их напрямую, а не пересобираем панель целиком
// (иначе открытые виджеты "мигали" бы/закрывались при каждой смене трека).
window.onMusicTrackChanged = function(trackId){
    if(!musicPanel) return;
    musicPanel.querySelectorAll(".music-track-btn").forEach(btn => {
        const isActive = btn.dataset.track === trackId;
        btn.classList.toggle("is-selected", isActive);
        const check = btn.querySelector(".music-track-check");
        if(check) check.innerHTML = isActive ? "&#10003;" : "";
    });
};

window.onMusicVolumeChanged = function(percent){
    const icon = musicVolumeIconFor(percent);
    const iconEl = document.getElementById("musicVolumeIcon");
    const sliderEl = document.getElementById("musicVolumeSlider");
    const valueEl = document.getElementById("musicVolumeValue");
    if(iconEl) iconEl.textContent = icon;
    if(sliderEl && Number(sliderEl.value) !== percent) sliderEl.value = percent;
    if(valueEl) valueEl.textContent = `${percent}%`;
    if(musicBoxButton) musicBoxButton.textContent = icon;
};
function renderAboutPanel(){
    if(!aboutPanel) return;

    aboutPanel.innerHTML = `
        <h3 class="settings-panel__title">${t("about_panel_title")}</h3>
        <ul class="settings-section-list">
            ${aboutSections.map(section => `
                <li class="settings-section-item ${section.id ? "is-clickable" : ""}" ${section.id ? `id="${section.id}"` : ""}>
                    <span class="settings-section-icon" aria-hidden="true">${section.icon}</span>
                    <span>${section.label}</span>
                </li>
            `).join("")}
        </ul>
    `;

    const aboutSiteInfoOption = document.getElementById("aboutSiteInfoOption");
    if(aboutSiteInfoOption){
        aboutSiteInfoOption.addEventListener("click", (event) => {
            event.stopPropagation();
            openAboutSiteModal();
        });
    }

    const aboutProjectIdeaOption = document.getElementById("aboutProjectIdeaOption");
    if(aboutProjectIdeaOption){
        aboutProjectIdeaOption.addEventListener("click", (event) => {
            event.stopPropagation();
            openProjectIdeaModal();
        });
    }
}

// Отдельное окно "Информация о сайте" — намеренно НЕ settings-panel
// (выпадашка) и НЕ "бумажный" стиль писем, а самостоятельное модальное
// окно поверх всего (см. openAboutSiteModal ниже), как и просили.
const projectRepoUrl = "https://github.com/Moveath/Reghina";
let aboutSiteModalElement = null;

function ensureAboutSiteModal(){
    if(aboutSiteModalElement) return aboutSiteModalElement;

    let dogNameForModal = "";
    try { dogNameForModal = (localStorage.getItem("dog_name") || "").trim(); } catch(e) {}
    const helperText = t("about_modal_helper").replace("«имя»", dogNameForModal || t("character_fallback_label"));

    const modal = document.createElement("div");
    modal.id = "aboutSiteModal";
    modal.className = "about-site-modal";
    modal.innerHTML = `
        <div class="about-site-modal__card" role="dialog" aria-modal="true" aria-labelledby="aboutSiteModalTitle">
            <button type="button" class="about-site-modal__close" id="aboutSiteModalClose" aria-label="${t("about_modal_close_aria")}">&times;</button>
            <div class="about-site-modal__scroll">
                <h2 id="aboutSiteModalTitle" class="about-site-modal__greeting">${t("about_modal_greeting")}</h2>
                <p>${t("about_modal_p1")}</p>
                <p>${t("about_modal_p2")}</p>
                <p>${t("about_modal_p3")}</p>
                <p>${helperText}</p>

                <div class="about-site-modal__divider"></div>

                <h3 class="about-site-modal__heading">${t("about_modal_video_heading")}</h3>
                <p>${t("about_modal_video_intro")}</p>
                <div class="about-site-modal__video-frame">
                    <span class="about-site-modal__video-play" aria-hidden="true">▶</span>
                    <span class="about-site-modal__video-label">${t("about_modal_video_placeholder")}</span>
                </div>

                <div class="about-site-modal__divider"></div>

                <h3 class="about-site-modal__heading">${t("about_modal_code_heading")}</h3>
                <p>${t("about_modal_code_intro")}</p>
                <a class="about-site-modal__code-link" href="${projectRepoUrl}" target="_blank" rel="noopener noreferrer">
                    <span aria-hidden="true">💻</span> ${t("about_modal_code_link_label")}
                </a>

                <div class="about-site-modal__divider"></div>

                <h3 class="about-site-modal__heading">${t("about_modal_stats_heading")}</h3>
                <div class="about-site-modal__stats">
                    <div class="about-site-modal__stats-row">
                        <span>${t("stats_loc_label")}</span>
                        <span class="about-site-modal__stats-value">xxxx</span>
                    </div>
                    <div class="about-site-modal__stats-row">
                        <span>${t("stats_days_label")}</span>
                        <span class="about-site-modal__stats-value">xx</span>
                    </div>
                    <div class="about-site-modal__stats-row">
                        <span>${t("stats_versions_label")}</span>
                        <span class="about-site-modal__stats-value">xx</span>
                    </div>
                </div>

                <div class="about-site-modal__divider"></div>

                <p>${t("about_modal_thanks_p1")}</p>
                <p>${t("about_modal_thanks_p2")}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
        // Клик по самому фону (не по карточке) закрывает окно.
        if(event.target === modal) closeAboutSiteModal();
    });
    modal.querySelector(".about-site-modal__card").addEventListener("click", (event) => event.stopPropagation());
    document.getElementById("aboutSiteModalClose").addEventListener("click", (event) => {
        event.stopPropagation();
        closeAboutSiteModal();
    });

    aboutSiteModalElement = modal;
    return modal;
}

function openAboutSiteModal(){
    if(typeof closePanels === "function") closePanels();
    ensureAboutSiteModal().classList.add("is-open");
    document.addEventListener("keydown", handleAboutSiteModalEscape);
}

function closeAboutSiteModal(){
    if(!aboutSiteModalElement) return;
    aboutSiteModalElement.classList.remove("is-open");
    document.removeEventListener("keydown", handleAboutSiteModalEscape);
}

function handleAboutSiteModalEscape(event){
    if(event.key === "Escape") closeAboutSiteModal();
}

// Отдельное окно "Идея проекта" — тот же визуальный стиль, что и
// "О сайте" (переиспользуем класс about-site-modal), но свой контент и
// свой элемент, чтобы оба окна были независимы друг от друга.
let projectIdeaModalElement = null;

function ensureProjectIdeaModal(){
    if(projectIdeaModalElement) return projectIdeaModalElement;

    const modal = document.createElement("div");
    modal.id = "projectIdeaModal";
    modal.className = "about-site-modal";
    modal.innerHTML = `
        <div class="about-site-modal__card" role="dialog" aria-modal="true" aria-labelledby="projectIdeaModalTitle">
            <button type="button" class="about-site-modal__close" id="projectIdeaModalClose" aria-label="${t("about_modal_close_aria")}">&times;</button>
            <div class="about-site-modal__scroll">
                <h2 id="projectIdeaModalTitle" class="about-site-modal__greeting">${t("about_project_idea")}</h2>
                <p>${t("idea_modal_p1")}</p>
                <p>${t("idea_modal_p2")}</p>
                <p>${t("idea_modal_p3")}</p>
                <p>${t("idea_modal_p4")}</p>
                <p>${t("idea_modal_p5")}</p>
                <p>${t("idea_modal_p6")}</p>
                <p>${t("idea_modal_p7")}</p>
                <p>${t("idea_modal_p8")}</p>
                <p>${t("idea_modal_p9")}</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
        if(event.target === modal) closeProjectIdeaModal();
    });
    modal.querySelector(".about-site-modal__card").addEventListener("click", (event) => event.stopPropagation());
    document.getElementById("projectIdeaModalClose").addEventListener("click", (event) => {
        event.stopPropagation();
        closeProjectIdeaModal();
    });

    projectIdeaModalElement = modal;
    return modal;
}

function openProjectIdeaModal(){
    if(typeof closePanels === "function") closePanels();
    ensureProjectIdeaModal().classList.add("is-open");
    document.addEventListener("keydown", handleProjectIdeaModalEscape);
}

function closeProjectIdeaModal(){
    if(!projectIdeaModalElement) return;
    projectIdeaModalElement.classList.remove("is-open");
    document.removeEventListener("keydown", handleProjectIdeaModalEscape);
}

function handleProjectIdeaModalEscape(event){
    if(event.key === "Escape") closeProjectIdeaModal();
}

// Отдельное окно "О собаке" — тот же визуальный стиль about-site-modal,
// плюс своя галерея эмоций и форма смены имени. В отличие от "О сайте" и
// "Идеи проекта" (почти полностью статичных), контент здесь пересобирается
// заново при КАЖДОМ открытии (renderDogInfoModalContent), а не один раз —
// имя собаки и число писем могут поменяться между открытиями в рамках
// одной сессии.
const dogInfoEmotions = [
    { file: "sleeping", emoji: "😴", nameKey: "dog_info_emo_sleeping_name", descKey: "dog_info_emo_sleeping_desc" },
    { file: "sleepy",   emoji: "😪", nameKey: "dog_info_emo_sleepy_name",   descKey: "dog_info_emo_sleepy_desc" },
    { file: "confused", emoji: "🤔", nameKey: "dog_info_emo_confused_name", descKey: "dog_info_emo_confused_desc" },
    { file: "happy",    emoji: "😊", nameKey: "dog_info_emo_happy_name",    descKey: "dog_info_emo_happy_desc" },
    { file: "sad",      emoji: "😢", nameKey: "dog_info_emo_sad_name",      descKey: "dog_info_emo_sad_desc" },
    { file: "excited",  emoji: "🎉", nameKey: "dog_info_emo_excited_name",  descKey: "dog_info_emo_excited_desc" },
    { file: "withkey",  emoji: "🔑", nameKey: "dog_info_emo_withkey_name",  descKey: "dog_info_emo_withkey_desc" },
    { file: "neutral",  emoji: "😌", nameKey: "dog_info_emo_neutral_name",  descKey: "dog_info_emo_neutral_desc" }
];

let dogInfoModalElement = null;

function ensureDogInfoModal(){
    if(dogInfoModalElement) return dogInfoModalElement;

    const modal = document.createElement("div");
    modal.id = "dogInfoModal";
    modal.className = "about-site-modal";
    modal.innerHTML = `
        <div class="about-site-modal__card dog-info-modal__card" role="dialog" aria-modal="true" aria-labelledby="dogInfoModalTitle">
            <button type="button" class="about-site-modal__close" id="dogInfoModalClose" aria-label="${t("about_modal_close_aria")}">&times;</button>
            <div class="about-site-modal__scroll" id="dogInfoModalScroll"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener("click", (event) => {
        if(event.target === modal) closeDogInfoModal();
    });
    modal.querySelector(".about-site-modal__card").addEventListener("click", (event) => event.stopPropagation());
    document.getElementById("dogInfoModalClose").addEventListener("click", (event) => {
        event.stopPropagation();
        closeDogInfoModal();
    });

    dogInfoModalElement = modal;
    return modal;
}

function renderDogInfoModalContent(){
    const scroll = document.getElementById("dogInfoModalScroll");
    if(!scroll) return;

    let name = "";
    try { name = (localStorage.getItem("dog_name") || "").trim(); } catch(e) {}
    const displayName = name || t("character_fallback_label");
    const whoP1 = t("dog_info_who_p1").replace("«имя»", displayName);

    scroll.innerHTML = `
        <div class="dog-info-modal__portrait">
            <img src="images/dog/happy.webp" alt="${displayName}">
        </div>
        <h2 id="dogInfoModalTitle" class="about-site-modal__greeting">${t("dog_info_title")}</h2>
        <div class="dog-info-modal__facts">
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_name_label")}</span><span id="dogInfoNameValue" class="dog-info-modal__fact-value">${displayName}</span></div>
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_breed_label")}</span><span class="dog-info-modal__fact-value">${t("dog_info_breed_value")}</span></div>
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_role_label")}</span><span class="dog-info-modal__fact-value">${t("dog_info_role_value")}</span></div>
        </div>

        <div class="about-site-modal__divider"></div>

        <h3 class="about-site-modal__heading">${t("dog_info_who_heading")}</h3>
        <p>${whoP1}</p>
        <p>${t("dog_info_who_p2")}</p>

        <div class="about-site-modal__divider"></div>

        <h3 class="about-site-modal__heading">${t("dog_info_emotions_heading")}</h3>
        <div class="dog-info-modal__emotions">
            ${dogInfoEmotions.map(e => `
                <div class="dog-info-modal__emotion-card">
                    <img class="dog-info-modal__emotion-img" src="images/dog/${e.file}.webp" alt="">
                    <div class="dog-info-modal__emotion-name">${e.emoji} ${t(e.nameKey)}</div>
                    <p class="dog-info-modal__emotion-desc">${t(e.descKey)}</p>
                </div>
            `).join("")}
        </div>

        <div class="about-site-modal__divider"></div>

        <h3 class="about-site-modal__heading">${t("dog_info_facts_heading")}</h3>
        <div class="dog-info-modal__facts">
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_fact_music_label")}</span><span class="dog-info-modal__fact-value">${t("dog_info_fact_music_value")}</span></div>
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_fact_activity_label")}</span><span class="dog-info-modal__fact-value">${t("dog_info_fact_activity_value")}</span></div>
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_fact_button_label")}</span><span class="dog-info-modal__fact-value">${t("dog_info_fact_button_value")}</span></div>
            <div class="dog-info-modal__fact-row"><span>${t("dog_info_fact_letters_label")}</span><span id="dogInfoLettersCount" class="dog-info-modal__fact-value">…</span></div>
        </div>

        <div class="about-site-modal__divider"></div>

        <h3 class="about-site-modal__heading">${t("dog_info_rename_heading")}</h3>
        <p>${t("dog_info_rename_text")}</p>
        <div class="dog-info-modal__rename-row">
            <input type="text" id="dogInfoRenameInput" class="dog-info-modal__rename-input" placeholder="${t("dog_info_rename_placeholder")}" maxlength="20" autocomplete="off">
            <button type="button" id="dogInfoRenameSave" class="dog-info-modal__rename-save">${t("dog_info_rename_save")}</button>
        </div>
        <p id="dogInfoRenameStatus" class="dog-info-modal__rename-status"></p>
    `;

    const renameInput = document.getElementById("dogInfoRenameInput");
    const renameStatus = document.getElementById("dogInfoRenameStatus");
    const submitRename = () => {
        const value = renameInput.value.trim();
        if(!value){
            renameStatus.textContent = t("dog_info_rename_empty");
            return;
        }
        if(typeof window.renameDog === "function") window.renameDog(value);
        const nameValueEl = document.getElementById("dogInfoNameValue");
        if(nameValueEl) nameValueEl.textContent = value;
        renameInput.value = "";
        renameStatus.textContent = t("dog_info_rename_success");
    };
    document.getElementById("dogInfoRenameSave").addEventListener("click", submitRename);
    renameInput.addEventListener("keydown", (event) => { if(event.key === "Enter") submitRename(); });

    loadDogInfoLetterCount();
}

// Считаем письма напрямую через fetchInbox/fetchOutbox (js/ui/letters.js) —
// не полагаемся на внутренний кэш виджета писем, чтобы число было верным,
// даже если письма ни разу не открывали в этой сессии.
async function loadDogInfoLetterCount(){
    try {
        const [inbox, outbox] = await Promise.all([
            typeof fetchInbox === "function" ? fetchInbox() : Promise.resolve([]),
            typeof fetchOutbox === "function" ? fetchOutbox() : Promise.resolve([])
        ]);
        const total = (Array.isArray(inbox) ? inbox.length : 0) + (Array.isArray(outbox) ? outbox.length : 0);
        const el = document.getElementById("dogInfoLettersCount");
        if(el) el.textContent = String(total);
    } catch(e){
        const el = document.getElementById("dogInfoLettersCount");
        if(el) el.textContent = "—";
    }
}

function openDogInfoModal(){
    if(typeof closePanels === "function") closePanels();
    ensureDogInfoModal().classList.add("is-open");
    renderDogInfoModalContent();
    document.addEventListener("keydown", handleDogInfoModalEscape);
}

function closeDogInfoModal(){
    if(!dogInfoModalElement) return;
    dogInfoModalElement.classList.remove("is-open");
    document.removeEventListener("keydown", handleDogInfoModalEscape);
}

function handleDogInfoModalEscape(event){
    if(event.key === "Escape") closeDogInfoModal();
}

function renderProgressPanel(){
    if(!progressPanel) return;

    progressPanel.innerHTML = `
        <h3 class="settings-panel__title">${t("progress_panel_title")}</h3>
        <ul class="progress-actions-list">
            ${progressActions.map(action => `
                <li class="progress-action-item" ${action.id ? `id="${action.id}"` : ""}>
                    <span class="progress-action-icon" aria-hidden="true">${action.icon}</span>
                    <span>${action.label}</span>
                </li>
            `).join("")}
        </ul>
        <div class="progress-code-reveal" id="progressCodeReveal">
            <span class="progress-code-reveal__value" id="progressCodeValue">••••••••</span>
            <button type="button" class="progress-code-reveal__copy" id="progressCodeCopy" aria-label="${t("progress_copy_code_aria")}">📋</button>
        </div>
        <div class="progress-code-enter" id="progressCodeEnter">
            <input type="text" id="progressCodeInput" class="progress-code-enter__input" placeholder="${t("progress_enter_placeholder")}" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false">
            <button type="button" class="progress-code-enter__submit" id="progressCodeSubmit">${t("progress_restore_btn")}</button>
        </div>
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

    const codeReveal = document.getElementById("progressCodeReveal");
    const codeValue = document.getElementById("progressCodeValue");
    const codeCopyBtn = document.getElementById("progressCodeCopy");
    const codeEnter = document.getElementById("progressCodeEnter");
    const codeInput = document.getElementById("progressCodeInput");
    const codeSubmit = document.getElementById("progressCodeSubmit");

    const showCodeOption = document.getElementById("showCodeOption");
    if(showCodeOption){
        showCodeOption.classList.add("is-clickable");
        showCodeOption.addEventListener("click", async (event) => {
            event.stopPropagation();
            if(codeEnter) codeEnter.classList.remove("is-open");
            const isOpen = codeReveal.classList.toggle("is-open");
            if(isOpen){
                const code = typeof window.ensureOwnerCode === "function" ? await window.ensureOwnerCode() : null;
                codeValue.textContent = code || t("progress_code_fetch_failed");
            }
        });
    }

    if(codeCopyBtn){
        codeCopyBtn.addEventListener("click", async (event) => {
            event.stopPropagation();
            const code = typeof window.getOwnerCode === "function" ? window.getOwnerCode() : null;
            if(!code) return;
            try {
                await navigator.clipboard.writeText(code);
                codeCopyBtn.textContent = "✅";
                setTimeout(() => { codeCopyBtn.textContent = "📋"; }, 1400);
            } catch(e) {}
        });
    }

    const enterCodeOption = document.getElementById("enterCodeOption");
    if(enterCodeOption){
        enterCodeOption.classList.add("is-clickable");
        enterCodeOption.addEventListener("click", (event) => {
            event.stopPropagation();
            if(codeReveal) codeReveal.classList.remove("is-open");
            codeEnter.classList.toggle("is-open");
            if(codeEnter.classList.contains("is-open") && codeInput) codeInput.focus();
        });
    }

    if(codeInput) codeInput.addEventListener("click", (event) => event.stopPropagation());

    if(codeSubmit && codeInput){
        const submitCode = () => {
            const value = codeInput.value.trim();
            if(!value) return;
            if(typeof window.showRestoreConfirmDialogue === "function") window.showRestoreConfirmDialogue(value);
        };
        codeSubmit.addEventListener("click", (event) => {
            event.stopPropagation();
            submitCode();
        });
        codeInput.addEventListener("keydown", (event) => {
            if(event.key === "Enter") submitCode();
        });
    }
}

function closePanels(){
    if(settingsPanel) settingsPanel.classList.remove("is-open");
    if(progressPanel) progressPanel.classList.remove("is-open");
    if(musicPanel) musicPanel.classList.remove("is-open");
    if(aboutPanel) aboutPanel.classList.remove("is-open");
    if(lettersPanel) lettersPanel.classList.remove("is-open");
    // Иначе меню темы/языка остаётся открытым и торчит поверх/под тем, что
    // открывается следующим — это отдельные position:fixed элементы вне
    // settingsPanel, закрытие самой панели их не задевает без явного вызова.
    closeThemeMenu();
    closeLanguageMenu();
}

function updateCharacterButtonLabel(){
    let name = "";
    try {
        name = localStorage.getItem("dog_name") || "";
    } catch (e) {}

    const nextLabel = name && name.trim() ? `${t("character_about_prefix")}${name.trim()}` : t("character_about_fallback");

    if(characterInfoButton){
        characterInfoButton.setAttribute("data-label", nextLabel);
        characterInfoButton.setAttribute("aria-label", nextLabel);
    }

    if(dogNameButton){
        const dogNameLabel = name && name.trim() ? name.trim() : t("character_fallback_label");
        dogNameButton.setAttribute("data-label", dogNameLabel);
        dogNameButton.setAttribute("aria-label", `${t("character_name_aria_prefix")}${dogNameLabel}`);
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
    if(!isOpen){
        musicPanel.classList.add("is-open");
        if(typeof window.clearMusicNotificationBadge === "function") window.clearMusicNotificationBadge();
    }
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

if(characterInfoButton){
    characterInfoButton.addEventListener("click", (event) => {
        event.stopPropagation();
        openDogInfoModal();
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

