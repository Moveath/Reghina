/*
 * Меню-проводник: клик по собаке / её имени (#dogNameButton) / иконке
 * (#characterInfoButton) запускает сцену — собака увеличивается по центру
 * (как в интро) и говорит случайную фразу через обычный пузырь диалога
 * (#dialogueContainer, тот же .intro-dialogue/.intro-dialogue__bubble, что
 * и во всех остальных диалогах на сайте). Рядом ОТДЕЛЬНО открывается
 * персистентное меню (#dogGuideMenu) со списком разделов.
 *
 * Два независимых состояния:
 * - dogGuideMenuOpen — само меню (список разделов). Остаётся открытым,
 *   пока Регина не закроет его сама (крестик или клик мимо) — не зависит
 *   от собаки/диалога.
 * - dogGuidePulseActive — собака + диалоговый пузырь. Показывается на
 *   несколько секунд при каждом открытии меню и при каждом выборе
 *   раздела, потом сама уходит (клик в любом месте или через 3-5 секунд).
 *
 * Клик по самой собаке ловится координатно в js/dialogue/dialogue.js (тот
 * же обработчик, что считает 5-клик-пасхалку) — у #characterContainer
 * постоянно pointer-events:none (см. css/dog.css), поэтому обычный
 * addEventListener на самой картинке никогда бы не сработал.
 */

const dogGuideMenuEl = document.getElementById("dogGuideMenu");
let dogGuideMenuOpen = false;
let dogGuidePulseActive = false;
// Читает js/dialogue/dialogue.js (guard в обработчике клика по
// dialogueContainer и в showDogRemark/showMonthlyKeyDialogue) — файл
// грузится раньше этого, но обращается к переменной только внутри функций,
// вызываемых уже после того, как все скрипты выполнились.
let dogGuideSceneActive = false;
let dogGuidePulseTimer = null;
let dogGuidePulseCleanupTimer = null;
let dogGuideMenuCleanupTimer = null;

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

function getSectionLine(action){
    if(action === "letters") return getDogGuideLettersLine();
    return pickRandomLine(getDogGuideSectionLines(action));
}

// Собака сейчас занята чем-то другим (интро, другая реплика, подтверждение
// и т.д.) — меню-проводник в это время открывать нельзя, иначе всплывающие
// сцены наложатся друг на друга (все они делят #dialogueContainer/
// #characterContainer).
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

// ===== Собака + диалоговый пузырь =====
//
// На приветствии (сразу после открытия меню) собака остаётся молча стоять
// со своей репликой — сама никуда не уходит. Уходит она только тогда,
// когда: (а) закрывается само меню (крестик/клик мимо — см. closeDogGuideMenu),
// или (б) Регина выбрала какой-то раздел — тогда через 3-5 секунд после
// этого собака уходит сама (см. scheduleDogGuidePulseTimeout, вызывается
// только из handleDogGuideSection, НЕ из triggerDogGuide).

function startDogGuidePulse(text){
    if(dogGuidePulseTimer){ clearTimeout(dogGuidePulseTimer); dogGuidePulseTimer = null; }
    if(dogGuidePulseCleanupTimer){ clearTimeout(dogGuidePulseCleanupTimer); dogGuidePulseCleanupTimer = null; }

    dogGuidePulseActive = true;
    dogGuideSceneActive = true;

    characterContainer.classList.add("is-intro-scene", "is-guide-dog");
    setDogEmotion("happy");

    // is-clear — без тумана (см. .intro-dialogue::before в dialogue.css):
    // меню и открытые виджеты рядом должны оставаться хорошо видны, а не
    // притемняться, как во время настоящих сюжетных сцен.
    dialogueContainer.classList.remove("is-puzzle-reveal", "is-fading");
    dialogueContainer.classList.add("is-active", "is-clear", "is-guide-scene");
    dialogueContainer.innerHTML = `
        <div class="intro-dialogue" role="dialog" aria-live="polite">
            <div class="intro-dialogue__bubble">
                <p>${text}</p>
            </div>
        </div>
    `;
}

// Вызывается только после выбора раздела — до этого (на приветствии)
// собака ждёт без ограничения по времени.
function scheduleDogGuidePulseTimeout(){
    if(dogGuidePulseTimer) clearTimeout(dogGuidePulseTimer);
    dogGuidePulseTimer = setTimeout(endDogGuidePulse, 3000 + Math.random() * 2000); // 3–5 секунд
}

function endDogGuidePulse(){
    if(!dogGuidePulseActive) return;
    dogGuidePulseActive = false;
    dogGuideSceneActive = false;
    if(dogGuidePulseTimer){ clearTimeout(dogGuidePulseTimer); dogGuidePulseTimer = null; }

    dialogueContainer.classList.add("is-fading");
    dialogueContainer.classList.remove("is-active");
    characterContainer.classList.remove("is-intro-scene", "is-guide-dog");
    resetDogToNeutral();

    if(dogGuidePulseCleanupTimer) clearTimeout(dogGuidePulseCleanupTimer);
    dogGuidePulseCleanupTimer = setTimeout(() => {
        if(!dogGuidePulseActive){
            dialogueContainer.innerHTML = "";
            dialogueContainer.classList.remove("is-fading", "is-clear", "is-guide-scene");
        }
        dogGuidePulseCleanupTimer = null;
    }, 850);
}

// ===== Персистентное меню разделов =====

function renderDogGuideMenuCard(){
    dogGuideMenuEl.innerHTML = `
        <button type="button" class="dog-guide-menu__close" aria-label="${t("about_modal_close_aria")}">&times;</button>
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

    dogGuideMenuEl.querySelector(".dog-guide-menu__close").addEventListener("click", (event) => {
        event.stopPropagation();
        closeDogGuideMenu();
    });

    dogGuideMenuEl.querySelectorAll(".dog-guide-menu__btn").forEach(btn => {
        btn.addEventListener("click", (event) => {
            event.stopPropagation();
            handleDogGuideSection(btn.dataset.action);
        });
    });
}

function openDogGuideMenuPanel(){
    if(dogGuideMenuOpen) return;
    if(dogGuideMenuCleanupTimer){ clearTimeout(dogGuideMenuCleanupTimer); dogGuideMenuCleanupTimer = null; }
    dogGuideMenuOpen = true;
    renderDogGuideMenuCard();
    void dogGuideMenuEl.offsetWidth; // форсируем reflow перед .is-open, чтобы transition точно сыграл
    dogGuideMenuEl.classList.add("is-open");
}

// Закрывает и меню, и (если ещё показана) собаку с диалогом — единая
// точка выхода из всей сцены-проводника.
function closeDogGuideMenu(){
    if(dogGuideMenuOpen){
        dogGuideMenuOpen = false;
        dogGuideMenuEl.classList.remove("is-open");
        if(dogGuideMenuCleanupTimer) clearTimeout(dogGuideMenuCleanupTimer);
        dogGuideMenuCleanupTimer = setTimeout(() => {
            if(!dogGuideMenuOpen) dogGuideMenuEl.innerHTML = "";
            dogGuideMenuCleanupTimer = null;
        }, 300);
    }
    endDogGuidePulse();
}
window.closeDogGuideMenu = closeDogGuideMenu;

// Клик по собаке/имени/иконке — точка входа. Меню открывается один раз и
// дальше остаётся на месте; повторный вызов просто освежает реплику
// собаки случайным приветствием.
function triggerDogGuide(){
    if(!canOpenDogGuide()) return;
    openDogGuideMenuPanel();
    startDogGuidePulse(pickRandomLine(getDogGuideGreetingLines()));
}
window.toggleDogGuideMenu = triggerDogGuide;

// Клик мимо меню (и мимо самой кнопки-имени, у неё своя логика выше)
// закрывает его — как и остальные всплывающие меню на сайте (темы/язык).
// #characterInfoButton сюда специально не входит — это отдельная кнопка
// с собственным действием (открывает "О собаке" напрямую), клик по ней
// должен закрывать меню-проводник как любой другой клик "в сторону".
document.addEventListener("click", (event) => {
    if(!dogGuideMenuOpen) return;
    if(event.target.closest("#dogGuideMenu")) return;
    if(event.target.closest("#dogNameButton")) return;
    closeDogGuideMenu();
});

// Виджет "История создания" на сайте пока не существует (только строка-
// заглушка в панели "О проекте", см. js/ui/settings.js) — до тех пор, пока
// для неё не появится настоящее содержимое, открываем саму панель "О
// проекте", где эта строка уже перечислена, чтобы кнопка не была совсем
// нерабочей.
function openWidgetForSection(action){
    switch(action){
        case "letters": {
            // Открытие содержимого письма-виджета (папки "Входящие"/"Исходящие")
            // рендерится ФУНКЦИЕЙ renderFoldersView() из js/ui/letters.js —
            // toggleLettersPanel() сам по себе только переключает CSS-класс
            // is-open и ничего не рисует. У самой иконки #lettersButton есть
            // свой обработчик, который делает оба шага вместе (initLettersWidget
            // в letters.js) — здесь повторяю ровно ту же пару вызовов, а не
            // просто toggleLettersPanel(), иначе панель открывалась бы пустой.
            const panel = document.getElementById("lettersPanel");
            if(panel && !panel.classList.contains("is-open")){
                if(typeof renderFoldersView === "function") renderFoldersView();
                if(typeof toggleLettersPanel === "function") toggleLettersPanel();
            }
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

function handleDogGuideSection(action){
    // Дневник (см. js/character/diary.js) сам слушает открытие разделов в
    // первоисточнике (toggleAboutPanel/openProjectIdeaModal/...), а не
    // здесь — иначе один и тот же клик засчитывался бы дважды (и отсюда,
    // и из самой функции открытия).
    openWidgetForSection(action);
    startDogGuidePulse(getSectionLine(action));
    // Только теперь, после реального выбора, собака уходит сама через
    // 3-5 секунд — на самом приветствии (см. triggerDogGuide) она ждёт
    // без ограничения по времени.
    scheduleDogGuidePulseTimeout();
}

// Кнопка-имя (#dogNameButton) — открывает МЕНЮ-ПРОВОДНИК (список разделов).
// Иконка (#characterInfoButton) — отдельный виджет, открывает "О собаке"
// напрямую (см. openDogInfoModal в js/ui/settings.js) — это два разных
// виджета с разными задачами, не одно и то же меню.
const dogGuideNameTrigger = document.getElementById("dogNameButton");
if(dogGuideNameTrigger){
    dogGuideNameTrigger.addEventListener("click", (event) => {
        event.stopPropagation();
        triggerDogGuide();
    });
}
