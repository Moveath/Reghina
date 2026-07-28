/*
 * Меню-проводник: клик по собаке / её имени (#dogNameButton) / иконке
 * (#characterInfoButton) открывает небольшое всплывающее меню рядом с
 * собакой — случайная приветственная фраза + кнопки разделов сайта.
 *
 * Клик по самой собаке ловится координатно в js/dialogue/dialogue.js (тот
 * же обработчик, что считает 5-клик-пасхалку) — у #characterContainer
 * постоянно pointer-events:none (см. css/dog.css), поэтому обычный
 * addEventListener на самой картинке никогда бы не сработал.
 */

const dogGuideMenuEl = document.getElementById("dogGuideMenu");
let dogGuideOpen = false;
let dogGuideAutoCloseTimer = null;
let dogGuideBounceTimer = null;
let dogGuideHideTimer = null;

const dogGuideNavSections = [
    { icon: "📨", labelKey: "dog_guide_nav_letters", action: "letters" },
    { icon: "🎵", labelKey: "dog_guide_nav_music", action: "music" },
    { icon: "📖", labelKey: "dog_guide_nav_history", action: "history" },
    { icon: "💡", labelKey: "dog_guide_nav_idea", action: "idea" },
    { icon: "📊", labelKey: "dog_guide_nav_about", action: "about" },
    { icon: "🐾", labelKey: "dog_guide_nav_doginfo", action: "doginfo" }
];

function dogGuideLang(){
    return typeof getSelectedLanguage === "function" ? getSelectedLanguage() : "ru";
}

function getDogGuideGreetingLines(){
    const lang = dogGuideLang();
    return (window.dogGuideGreetingLineTranslations && window.dogGuideGreetingLineTranslations[lang]) || dogGuideGreetingLinesRu;
}

function getDogGuideSectionLines(kind){
    const lang = dogGuideLang();
    const table = {
        music: [window.dogGuideMusicLineTranslations, dogGuideMusicLinesRu],
        history: [window.dogGuideHistoryLineTranslations, dogGuideHistoryLinesRu],
        idea: [window.dogGuideIdeaLineTranslations, dogGuideIdeaLinesRu],
        about: [window.dogGuideAboutLineTranslations, dogGuideAboutLinesRu],
        doginfo: [window.dogGuideDogInfoLineTranslations, dogGuideDogInfoLinesRu]
    };
    const entry = table[kind];
    if(!entry) return [];
    const [translations, fallback] = entry;
    return (translations && translations[lang]) || fallback;
}

// Письма — отдельная логика: строка зависит от того, есть ли непрочитанные.
function getDogGuideLettersLine(){
    const lang = dogGuideLang();
    const translated = window.dogGuideLettersTranslations && window.dogGuideLettersTranslations[lang];
    const unreadLine = translated ? translated.unread : dogGuideLettersUnreadLineRu;
    const noUnreadLine = translated ? translated.noUnread : dogGuideLettersNoUnreadLineRu;
    const pool = translated ? translated.pool : dogGuideLettersPoolLineRu;

    const lettersBtn = document.getElementById("lettersButton");
    const hasUnread = !!(lettersBtn && lettersBtn.classList.contains("has-unread"));
    const candidates = [hasUnread ? unreadLine : noUnreadLine, ...pool];
    return pickRandomLine(candidates);
}

// Собака сейчас занята чем-то другим (интро, другая реплика, подтверждение
// и т.д.) — меню-проводник в это время открывать нельзя, иначе всплывающие
// сцены наложатся друг на друга.
function canOpenDogGuide(){
    if(!dogGuideMenuEl || !characterContainer || !dogCharacter) return false;
    if(document.body.classList.contains("intro-active")) return false;
    if(introFrozen) return false;
    if(resetConfirmActive) return false;
    if(dogRemarkActive) return false;
    if(typeof monthlyKeySceneActive !== "undefined" && monthlyKeySceneActive) return false;
    if(typeof languageConfirmActive !== "undefined" && languageConfirmActive) return false;
    return true;
}
window.canOpenDogGuide = canOpenDogGuide;

function renderDogGuideMenu(text){
    dogGuideMenuEl.innerHTML = `
        <div class="dog-guide-menu__bubble">
            <p id="dogGuideMenuText">${text}</p>
        </div>
        <ul class="dog-guide-menu__list">
            ${dogGuideNavSections.map(section => `
                <li>
                    <button type="button" class="dog-guide-menu__btn" data-action="${section.action}">
                        <span class="dog-guide-menu__icon" aria-hidden="true">${section.icon}</span>
                        <span>${t(section.labelKey)}</span>
                    </button>
                </li>
            `).join("")}
        </ul>
    `;

    dogGuideMenuEl.querySelectorAll(".dog-guide-menu__btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            handleDogGuideSection(btn.dataset.action);
        });
    });
}

// Один "прыжок" — при открытии меню и при переключении на новый раздел.
// Классы вешаем на саму картинку (#dogCharacter), а не на #characterContainer:
// setDogEmotion() каждый раз ПОЛНОСТЬЮ перезаписывает img.className (см.
// dialogue.js), поэтому is-guide-active/is-guide-bounce нужно добавлять
// уже ПОСЛЕ того, как её 180мс-таймаут смены картинки отработает —
// см. setTimeout ниже в openDogGuideMenu(). resetDogToNeutral() в конце
// точно так же полностью заменяет className, поэтому отдельно убирать эти
// классы при закрытии не нужно — они сами исчезают вместе со сбросом эмоции.
function playDogGuideBounce(){
    dogCharacter.classList.remove("is-guide-bounce");
    void dogCharacter.offsetWidth; // форсируем reflow, чтобы анимация перезапустилась
    dogCharacter.classList.add("is-guide-bounce");
    if(dogGuideBounceTimer) clearTimeout(dogGuideBounceTimer);
    dogGuideBounceTimer = setTimeout(() => {
        dogCharacter.classList.remove("is-guide-bounce");
        dogGuideBounceTimer = null;
    }, 650);
}

function openDogGuideMenu(){
    if(!canOpenDogGuide()) return;
    if(dogGuideAutoCloseTimer){ clearTimeout(dogGuideAutoCloseTimer); dogGuideAutoCloseTimer = null; }
    if(dogGuideHideTimer){ clearTimeout(dogGuideHideTimer); dogGuideHideTimer = null; }

    dogGuideOpen = true;
    setDogEmotion("happy");
    // 200мс — чуть больше внутреннего 180мс-таймаута setDogEmotion, чтобы
    // не попасть под её перезапись className.
    setTimeout(() => {
        if(!dogGuideOpen) return;
        dogCharacter.classList.add("is-guide-active");
        playDogGuideBounce();
    }, 200);

    renderDogGuideMenu(pickRandomLine(getDogGuideGreetingLines()));
    void dogGuideMenuEl.offsetWidth; // форсируем reflow перед .is-open, чтобы transition точно сыграл
    dogGuideMenuEl.classList.add("is-open");
}

function closeDogGuideMenu(){
    if(!dogGuideOpen) return;
    dogGuideOpen = false;
    if(dogGuideAutoCloseTimer){ clearTimeout(dogGuideAutoCloseTimer); dogGuideAutoCloseTimer = null; }

    dogGuideMenuEl.classList.remove("is-open");
    resetDogToNeutral();

    if(dogGuideHideTimer) clearTimeout(dogGuideHideTimer);
    dogGuideHideTimer = setTimeout(() => {
        if(!dogGuideOpen) dogGuideMenuEl.innerHTML = "";
        dogGuideHideTimer = null;
    }, 350);
}
window.closeDogGuideMenu = closeDogGuideMenu;

function toggleDogGuideMenu(){
    if(dogGuideOpen) closeDogGuideMenu();
    else openDogGuideMenu();
}
window.toggleDogGuideMenu = toggleDogGuideMenu;

// Плавная смена текста в уже открытом пузыре (переход к разделу) — короткий
// fade вместо резкой замены.
function swapDogGuideText(text){
    const p = document.getElementById("dogGuideMenuText");
    if(!p){
        renderDogGuideMenu(text);
        return;
    }
    p.classList.add("is-swapping");
    setTimeout(() => {
        p.textContent = text;
        p.classList.remove("is-swapping");
    }, 180);
}

// Виджет "История создания" на сайте пока не существует (только строка-
// заглушка в панели "О проекте", см. js/ui/settings.js) — до тех пор, пока
// для неё не появится настоящее содержимое, открываем саму панель "О
// проекте", где эта строка уже перечислена, чтобы кнопка не была совсем
// нерабочей.
function openWidgetForSection(action){
    switch(action){
        case "letters": {
            const panel = document.getElementById("lettersPanel");
            if(panel && !panel.classList.contains("is-open") && typeof toggleLettersPanel === "function") toggleLettersPanel();
            break;
        }
        case "music": {
            const panel = document.getElementById("musicPanel");
            if(panel && !panel.classList.contains("is-open") && typeof toggleMusicPanel === "function") toggleMusicPanel();
            break;
        }
        case "history": {
            const panel = document.getElementById("aboutPanel");
            if(panel && !panel.classList.contains("is-open") && typeof toggleAboutPanel === "function") toggleAboutPanel();
            break;
        }
        case "idea":
            if(typeof openProjectIdeaModal === "function") openProjectIdeaModal();
            break;
        case "about":
            if(typeof openAboutSiteModal === "function") openAboutSiteModal();
            break;
        case "doginfo":
            if(typeof openDogInfoModal === "function") openDogInfoModal();
            break;
    }
}

function getSectionLine(action){
    if(action === "letters") return getDogGuideLettersLine();
    return pickRandomLine(getDogGuideSectionLines(action));
}

function handleDogGuideSection(action){
    if(typeof window.diaryTrackActivity === "function") window.diaryTrackActivity("section_explored", action);

    openWidgetForSection(action);
    swapDogGuideText(getSectionLine(action));
    playDogGuideBounce();

    if(dogGuideAutoCloseTimer) clearTimeout(dogGuideAutoCloseTimer);
    const stayMs = 3000 + Math.random() * 2000; // 3–5 секунд рядом, как просили
    dogGuideAutoCloseTimer = setTimeout(closeDogGuideMenu, stayMs);
}

// Кнопки-триггеры: имя персонажа и иконка — обычные <button>, вне
// #characterContainer, кликаются как обычно.
const dogGuideNameTrigger = document.getElementById("dogNameButton");
if(dogGuideNameTrigger){
    dogGuideNameTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDogGuideMenu();
    });
}

const dogGuideIconTrigger = document.getElementById("characterInfoButton");
if(dogGuideIconTrigger){
    dogGuideIconTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDogGuideMenu();
    });
}

// Клик мимо меню (и мимо самих кнопок-триггеров, у них своя логика выше)
// закрывает его раньше срока — как и остальные всплывающие меню на сайте
// (темы/язык).
document.addEventListener("click", (event) => {
    if(!dogGuideOpen) return;
    if(event.target.closest("#dogGuideMenu")) return;
    if(event.target.closest("#dogNameButton") || event.target.closest("#characterInfoButton")) return;
    closeDogGuideMenu();
});
