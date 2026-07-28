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

// Виджет, который открыла реакция на выбор раздела (см. handleDogGuideSection),
// отслеживается отдельно: если Регина закроет его САМА раньше, чем сработает
// таймаут в 3-5 секунд (крестиком, кликом мимо, повторным нажатием на его же
// иконку), реплика с собакой не должна зависать поверх уже пустого фона —
// она обязана исчезнуть В ТОТ ЖЕ МОМЕНТ, что и сам виджет.
let dogGuideWatchedWidgetObserver = null;

const dogGuideWidgetSelectors = {
    letters: "#lettersPanel",
    music: "#musicPanel",
    history: "#aboutPanel",
    idea: "#projectIdeaModal",
    about: "#aboutSiteModal",
    doginfo: "#dogInfoModal"
};

function stopWatchingDogGuideWidget(){
    if(dogGuideWatchedWidgetObserver){
        dogGuideWatchedWidgetObserver.disconnect();
        dogGuideWatchedWidgetObserver = null;
    }
}

function watchDogGuideWidgetForClose(action){
    stopWatchingDogGuideWidget();
    const selector = dogGuideWidgetSelectors[action];
    const el = selector && document.querySelector(selector);
    if(!el) return;
    dogGuideWatchedWidgetObserver = new MutationObserver(() => {
        if(!el.classList.contains("is-open")){
            stopWatchingDogGuideWidget();
            endDogGuidePulse();
        }
    });
    dogGuideWatchedWidgetObserver.observe(el, { attributes: true, attributeFilter: ["class"] });
}

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

// Любой другой открытый виджет/панель/модалка (письма, музыка, настройки,
// прогресс, дневник, "О проекте", "Идея проекта", "О сайте", "О собаке")
// — помощь проводника в это время вызывать нельзя, только когда фон
// "чистый". Иначе меню/реплика рисуются поверх уже открытого виджета и
// перекрывают его содержимое (см. .settings-panel/.about-site-modal —
// у всех панелей и модалок общий класс + is-open, см. index.html/settings.js).
function isAnyWidgetOpen(){
    return !!(document.querySelector(".settings-panel.is-open") || document.querySelector(".about-site-modal.is-open"));
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
    if(isAnyWidgetOpen()) return false;
    return true;
}
window.canOpenDogGuide = canOpenDogGuide;

// ===== Собака + диалоговый пузырь =====
//
// И "приветствие" (сразу после открытия меню, см. triggerDogGuide), и
// "реакция на выбор" (см. handleDogGuideSection) выглядят одинаково —
// собака БОЛЬШАЯ по центру-слева (is-intro-scene), реплика справа
// (is-guide-scene в dialogue.css). Раньше для реакции собака специально
// оставалась маленькой в углу, чтобы не перекрыть только что открывшийся
// виджет раздела — но по просьбе оставили тот же крупный вид, что и на
// приветствии, а не перекрытие решают уже другим способом: is-guide-dog
// поднимает собаку с репликой над виджетом по z-index (см. css/dog.css/
// dialogue.css), плюс само наблюдение за виджетом (см.
// watchDogGuideWidgetForClose ниже) гарантирует, что сцена не будет висеть
// дольше, чем сам виджет.
//
// Приветствие ждёт молча без ограничения по времени; реакция уходит сама
// через 3-5 секунд (scheduleDogGuidePulseTimeout) — а если Регина закроет
// открывшийся виджет раньше сама, реакция исчезает вместе с ним, не дожидаясь
// таймаута (см. watchDogGuideWidgetForClose).

function startDogGuidePulse(text, big, variant){
    if(dogGuidePulseTimer){ clearTimeout(dogGuidePulseTimer); dogGuidePulseTimer = null; }
    if(dogGuidePulseCleanupTimer){ clearTimeout(dogGuidePulseCleanupTimer); dogGuidePulseCleanupTimer = null; }

    dogGuidePulseActive = true;
    dogGuideSceneActive = true;

    // Явно выставляем оба варианта — иначе при переходе "приветствие" (big)
    // → "реакция на выбор" (тоже big, но variant="reaction") собака
    // оставалась бы с классами предыдущего вызова, потому что add() без
    // соответствующего remove() ничего не убирает сам по себе.
    // is-guide-dog — z-index-приоритет НАД любым открытым виджетом.
    // is-guide-reaction-dog — реакция на выбор ТОЖЕ большая (см. комментарий
    // выше), но рядом почти всегда открыт настоящий виджет раздела, поэтому
    // ширину собаки в этом варианте ограничиваем (см. css/dog.css) — иначе
    // на широких модалках (about-site/project-idea/dog-info, до 720px) она
    // перекрывает собой их текст с левого края. На приветствии виджета ещё
    // нет — там собака остаётся в полный интро-размер.
    characterContainer.classList.toggle("is-intro-scene", !!big);
    characterContainer.classList.add("is-guide-dog");
    characterContainer.classList.toggle("is-guide-reaction-dog", variant === "reaction");
    setDogEmotion("happy");

    // is-clear — без тумана (см. .intro-dialogue::before в dialogue.css):
    // меню и открытые виджеты рядом должны оставаться хорошо видны, а не
    // притемняться, как во время настоящих сюжетных сцен.
    //
    // Позиция ПУЗЫРЯ завязана на variant, а не на big: на приветствии
    // (is-guide-scene) рядом только меню, туда и уезжает реплика. В реакции
    // же почти всегда открыт настоящий виджет раздела — даже с уменьшенной
    // собакой (is-guide-reaction-dog) центральная позиция пузыря из
    // is-guide-scene попадала бы прямо в текст широких виджетов (например,
    // "Идея проекта"). is-guide-reaction уводит пузырь на правый край экрана
    // независимо от размера собаки — эта позиция уже проверена без
    // пересечений на всех 6 разделах.
    dialogueContainer.classList.remove("is-puzzle-reveal", "is-fading", "is-guide-scene", "is-guide-reaction");
    dialogueContainer.classList.add("is-active", "is-clear", variant === "greeting" ? "is-guide-scene" : "is-guide-reaction");
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
    stopWatchingDogGuideWidget();
    if(!dogGuidePulseActive) return;
    dogGuidePulseActive = false;
    dogGuideSceneActive = false;
    if(dogGuidePulseTimer){ clearTimeout(dogGuidePulseTimer); dogGuidePulseTimer = null; }

    dialogueContainer.classList.add("is-fading");
    dialogueContainer.classList.remove("is-active");
    characterContainer.classList.remove("is-intro-scene", "is-guide-dog", "is-guide-reaction-dog");
    resetDogToNeutral();

    if(dogGuidePulseCleanupTimer) clearTimeout(dogGuidePulseCleanupTimer);
    dogGuidePulseCleanupTimer = setTimeout(() => {
        if(!dogGuidePulseActive){
            dialogueContainer.innerHTML = "";
            dialogueContainer.classList.remove("is-fading", "is-clear", "is-guide-scene", "is-guide-reaction");
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

// Просто прячет карточку меню (без "переход в собаку с диалогом" —
// используется, когда открывается виджет раздела: см. handleDogGuideSection).
function hideDogGuideMenuPanel(){
    if(!dogGuideMenuOpen) return;
    dogGuideMenuOpen = false;
    dogGuideMenuEl.classList.remove("is-open");
    if(dogGuideMenuCleanupTimer) clearTimeout(dogGuideMenuCleanupTimer);
    dogGuideMenuCleanupTimer = setTimeout(() => {
        if(!dogGuideMenuOpen) dogGuideMenuEl.innerHTML = "";
        dogGuideMenuCleanupTimer = null;
    }, 300);
}

// Закрывает и меню, и (если ещё показана) собаку с диалогом — единая
// точка выхода из всей сцены-проводника (крестик/клик мимо).
function closeDogGuideMenu(){
    hideDogGuideMenuPanel();
    endDogGuidePulse();
}
window.closeDogGuideMenu = closeDogGuideMenu;

// Клик по собаке/имени — точка входа. Открывает меню разделов заново
// (даже если до этого пряталось после выбора раздела) с новым случайным
// приветствием.
function triggerDogGuide(){
    if(!canOpenDogGuide()) return;
    openDogGuideMenuPanel();
    startDogGuidePulse(pickRandomLine(getDogGuideGreetingLines()), true, "greeting");
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
    // Прячем меню — сейчас откроется реальный виджет (иногда во весь
    // экран), а меню по центру только перекрывало бы его содержимое.
    // Чтобы выбрать другой раздел, нужно снова нажать на собаку/имя.
    hideDogGuideMenuPanel();
    // big=true — тот же крупный вид, что и на приветствии (см. комментарий
    // выше startDogGuidePulse); перекрытие с виджетом решается z-index'ом
    // (is-guide-dog), а не уменьшением собаки.
    startDogGuidePulse(getSectionLine(action), true, "reaction");
    // Только теперь, после реального выбора, собака уходит сама через
    // 3-5 секунд — на самом приветствии (см. triggerDogGuide) она ждёт
    // без ограничения по времени. Если Регина закроет сам виджет раньше —
    // реакция исчезнет вместе с ним (см. watchDogGuideWidgetForClose).
    scheduleDogGuidePulseTimeout();
    watchDogGuideWidgetForClose(action);
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
