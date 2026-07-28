/*
 * Дневник проводника: собака ведёт его от своего лица, но не как
 * технический журнал каждого клика. Новая запись появляется случайно раз
 * в 2-5 дней, и выбирается по тому, что реально происходило на сайте за
 * этот период (см. data/dialogues/diary.js для самих текстов).
 *
 * Хранится только локально (localStorage) — как и остальной локальный
 * прогресс на этом устройстве, без синхронизации между устройствами.
 */

const DIARY_MIN_INTERVAL_DAYS = 2;
const DIARY_MAX_INTERVAL_DAYS = 5;
const DIARY_DAY_MS = 24 * 60 * 60 * 1000;
const DIARY_LONG_ABSENCE_DAYS = 3;

// Порядок важен: чем выше в списке, тем приоритетнее категория, если за
// период случилось сразу несколько разных вещей (п.5 — "если происходили
// действия, использовать записи, связанные с ними", берём самое заметное).
const diaryCategoryPriority = ["keys", "letters", "music", "exploration"];

function diaryNow(){
    return Date.now();
}

function diaryLang(){
    return typeof getSelectedLanguage === "function" ? getSelectedLanguage() : "ru";
}

function getDiaryCategoryLines(category){
    const lang = diaryLang();
    const translated = window.diaryEntryLineTranslations && window.diaryEntryLineTranslations[lang];
    return (translated && translated[category]) || diaryEntryLinesRu[category] || diaryEntryLinesRu.silence;
}

function loadDiaryEntries(){
    try { return JSON.parse(localStorage.getItem("regina_diary_entries") || "[]"); }
    catch(e) { return []; }
}
function saveDiaryEntries(entries){
    try { localStorage.setItem("regina_diary_entries", JSON.stringify(entries)); } catch(e) {}
}

function loadDiaryActivityLog(){
    try { return JSON.parse(localStorage.getItem("regina_diary_activity_log") || "[]"); }
    catch(e) { return []; }
}
function saveDiaryActivityLog(log){
    try { localStorage.setItem("regina_diary_activity_log", JSON.stringify(log)); } catch(e) {}
}

// Точка входа для остальных модулей (letters.js, music.js, keys.js,
// settings.js) — просто копит "что случилось" между записями дневника, без
// какой-либо немедленной реакции.
function diaryTrackActivity(type){
    const log = loadDiaryActivityLog();
    log.push({ type, at: diaryNow() });
    // Больше 10 дней/300 записей никогда не понадобится — интервал между
    // записями дневника максимум 5 дней, запас взят с большим избытком.
    const cutoff = diaryNow() - 10 * DIARY_DAY_MS;
    saveDiaryActivityLog(log.filter(e => e.at >= cutoff).slice(-300));
}
window.diaryTrackActivity = diaryTrackActivity;

function loadDiaryNextDueAt(){
    try { return localStorage.getItem("regina_diary_next_due_at"); } catch(e) { return null; }
}
function saveDiaryNextDueAt(iso){
    try { localStorage.setItem("regina_diary_next_due_at", iso); } catch(e) {}
}

function randomDiaryIntervalMs(){
    const days = DIARY_MIN_INTERVAL_DAYS + Math.random() * (DIARY_MAX_INTERVAL_DAYS - DIARY_MIN_INTERVAL_DAYS);
    return days * DIARY_DAY_MS;
}

function loadDiaryLastVisitAt(){
    try { return localStorage.getItem("regina_diary_last_visit_at"); } catch(e) { return null; }
}
function saveDiaryLastVisitAt(iso){
    try { localStorage.setItem("regina_diary_last_visit_at", iso); } catch(e) {}
}

function markDiaryUnseen(value){
    try { localStorage.setItem("regina_diary_unseen", value ? "true" : "false"); } catch(e) {}
    updateDiaryBadge();
}
function isDiaryUnseen(){
    try { return localStorage.getItem("regina_diary_unseen") === "true"; } catch(e) { return false; }
}
function updateDiaryBadge(){
    if(!diaryButton) return;
    diaryButton.classList.toggle("has-unread", isDiaryUnseen());
}

// Что происходило за период с прошлой проверки — считаем по накопленному
// логу активности + отдельно замечаем долгое отсутствие визитов.
function computeDiarySignals(){
    const log = loadDiaryActivityLog();
    const counts = { keys: 0, letters: 0, music: 0, exploration: 0 };
    log.forEach(entry => {
        if(entry.type === "key_found") counts.keys += 1;
        else if(entry.type === "letter_read") counts.letters += 1;
        else if(entry.type === "music_played") counts.music += 1;
        else if(entry.type === "section_explored") counts.exploration += 1;
    });

    const lastVisitAtRaw = loadDiaryLastVisitAt();
    let longAbsenceDays = 0;
    if(lastVisitAtRaw){
        const lastVisitAt = new Date(lastVisitAtRaw).getTime();
        if(!Number.isNaN(lastVisitAt)){
            longAbsenceDays = Math.floor((diaryNow() - lastVisitAt) / DIARY_DAY_MS);
        }
    }

    return { counts, longAbsenceDays };
}

// п.4/5: если что-то происходило — запись про это (самое заметное из
// случившегося); если несколько дней подряд была тишина — спокойная
// запись; если просто ничего не произошло (но и долгого отсутствия не
// было) — тоже спокойная запись, как ближайший по духу вариант.
function pickDiaryCategory(signals){
    const found = diaryCategoryPriority.find(category => signals.counts[category] > 0);
    if(found) return found;
    if(signals.longAbsenceDays >= DIARY_LONG_ABSENCE_DAYS) return "absence";
    return "silence";
}

function pickDiaryTemplateIndex(category, lastEntry){
    const lines = diaryEntryLinesRu[category] || diaryEntryLinesRu.silence;
    let index = Math.floor(Math.random() * lines.length);
    // п.6: не повторяем ту же самую запись, что была прошлый раз, подряд.
    if(lastEntry && lastEntry.category === category && lines.length > 1){
        let attempts = 0;
        while(index === lastEntry.templateIndex && attempts < 8){
            index = Math.floor(Math.random() * lines.length);
            attempts += 1;
        }
    }
    return index;
}

// п.8: максимум одна новая запись за период, даже если действий было много —
// это обеспечивается самой схемой (одна проверка на visit, дальше сразу
// планируется следующий срок и лог активности обнуляется).
function maybeGenerateDiaryEntry(){
    const now = diaryNow();
    const nextDueAtRaw = loadDiaryNextDueAt();

    if(!nextDueAtRaw){
        // Самый первый визит — пока нечего анализировать, просто
        // назначаем срок первой записи через 2-5 дней.
        saveDiaryNextDueAt(new Date(now + randomDiaryIntervalMs()).toISOString());
        return;
    }

    const nextDueAt = new Date(nextDueAtRaw).getTime();
    if(Number.isNaN(nextDueAt) || now < nextDueAt) return;

    const entries = loadDiaryEntries();
    const lastEntry = entries.length ? entries[entries.length - 1] : null;

    const signals = computeDiarySignals();
    const category = pickDiaryCategory(signals);
    const templateIndex = pickDiaryTemplateIndex(category, lastEntry);

    entries.push({
        number: entries.length + 1,
        dateIso: new Date(now).toISOString(),
        category,
        templateIndex
    });
    saveDiaryEntries(entries);
    saveDiaryActivityLog([]);
    saveDiaryNextDueAt(new Date(now + randomDiaryIntervalMs()).toISOString());
    markDiaryUnseen(true);
}

function diaryEntryText(entry){
    const lines = getDiaryCategoryLines(entry.category);
    return lines[entry.templateIndex % lines.length];
}

const diaryDateLocaleByLanguage = { ru: "ru-RU", en: "en-US", ro: "ro-RO" };
function formatDiaryDate(iso){
    const date = new Date(iso);
    if(Number.isNaN(date.getTime())) return "";
    const locale = diaryDateLocaleByLanguage[diaryLang()] || "ru-RU";
    return date.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

const diaryPanel = document.getElementById("diaryPanel");
const diaryButton = document.getElementById("diaryButton");

function renderDiaryPanel(){
    if(!diaryPanel) return;
    const entries = loadDiaryEntries();

    const listHtml = entries.length
        ? entries.slice().reverse().map(entry => `
            <li class="diary-entry">
                <div class="diary-entry__header">🐾 ${t("diary_entry_number_prefix")}${entry.number}</div>
                <div class="diary-entry__date">${formatDiaryDate(entry.dateIso)}</div>
                <p class="diary-entry__text">${diaryEntryText(entry)}</p>
            </li>
        `).join("")
        : `<p class="diary-empty">${t("diary_empty")}</p>`;

    diaryPanel.innerHTML = `
        <h3 class="settings-panel__title">${diaryTitleLabel()}</h3>
        <ul class="diary-entry-list">${listHtml}</ul>
    `;
}

// "Дневник {имя собаки}" — как и у кнопки "О <имя>" (character_about_prefix
// в settings.js), просто префикс + сырое имя без склонения (имя свободное,
// пользовательское, грамматически согласовать некуда). Пока имя ещё не
// задано — используем общий фолбэк static_diary_aria ("Дневник проводника").
function diaryTitleLabel(){
    let name = "";
    try { name = localStorage.getItem("dog_name") || ""; } catch(e) {}
    return name && name.trim() ? `${t("diary_title_prefix")}${name.trim()}` : t("static_diary_aria");
}

// Обновляет подписи иконки/панели дневника новым именем собаки — вызывается
// один раз при загрузке (см. низ файла) и из renameDog (js/dialogue/
// dialogue.js) сразу после смены имени, чтобы не ждать перезагрузки.
function updateDiaryLabel(){
    const label = diaryTitleLabel();
    if(diaryButton){
        diaryButton.setAttribute("data-label", label);
        diaryButton.setAttribute("aria-label", label);
    }
    if(diaryPanel){
        diaryPanel.setAttribute("aria-label", label);
        if(diaryPanel.classList.contains("is-open")) renderDiaryPanel();
    }
}
window.updateDiaryLabel = updateDiaryLabel;

function toggleDiaryPanel(){
    if(!diaryPanel) return;
    const isOpen = diaryPanel.classList.contains("is-open");
    if(isOpen && typeof isIntroCloseLocked === "function" && isIntroCloseLocked()) return;
    if(typeof closePanels === "function") closePanels();
    if(!isOpen){
        renderDiaryPanel();
        diaryPanel.classList.add("is-open");
        markDiaryUnseen(false);
    }
}

if(diaryButton){
    diaryButton.addEventListener("click", (event) => {
        event.stopPropagation();
        toggleDiaryPanel();
    });
}

maybeGenerateDiaryEntry();
saveDiaryLastVisitAt(new Date(diaryNow()).toISOString());
updateDiaryBadge();
updateDiaryLabel();
