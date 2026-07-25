// Движок переводов сайта. Данные (словари) — в data/translations.js,
// загружается раньше этого файла. Developer Panel (js/dev/devPanel.js)
// сюда не входит — она всегда на русском.

const selectedLanguageStorageKey = "reginaSelectedLanguage";
const defaultLanguage = "ru";
const supportedLanguages = ["ru", "en", "ro"];

function getSelectedLanguage(){
    try {
        const stored = localStorage.getItem(selectedLanguageStorageKey);
        return supportedLanguages.includes(stored) ? stored : defaultLanguage;
    } catch(e) { return defaultLanguage; }
}

function setSelectedLanguage(lang){
    if(!supportedLanguages.includes(lang)) return;
    try { localStorage.setItem(selectedLanguageStorageKey, lang); } catch(e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
    applyDocumentLang();
}

function applyDocumentLang(){
    document.documentElement.lang = getSelectedLanguage();
}

// t("ключ") — обычная интерфейсная строка. Всегда что-то возвращает: при
// отсутствии перевода для текущего языка откатывается на русский, при
// отсутствии и русского — возвращает сам ключ (чтобы никогда не показать
// пустоту и было видно в интерфейсе, что перевод забыт).
function t(key){
    const lang = getSelectedLanguage();
    const dict = window.uiText || {};
    return (dict[lang] && dict[lang][key]) || (dict.ru && dict.ru[key]) || key;
}

// td(index) — текст реплики интро по индексу в introDialogueLines.
function td(index){
    const lang = getSelectedLanguage();
    if(lang !== "ru"){
        const arr = window.dialogueTranslations && window.dialogueTranslations[lang];
        if(arr && arr[index]) return arr[index];
    }
    return introDialogueLines[index] ? introDialogueLines[index].text : "";
}

// tdHint(index) — hintText реплики интро по индексу (не у всех есть).
function tdHint(index, fallback){
    const lang = getSelectedLanguage();
    if(lang !== "ru"){
        const map = window.dialogueHintTranslations && window.dialogueHintTranslations[lang];
        if(map && map[index]) return map[index];
    }
    return fallback;
}

// tdChoices(index) — labels выбора реплики интро по индексу (сейчас есть
// только у одной записи, но на будущее — для любой с полем choices).
function tdChoices(index, fallbackChoices){
    const lang = getSelectedLanguage();
    if(lang !== "ru"){
        const map = window.dialogueChoiceTranslations && window.dialogueChoiceTranslations[lang];
        if(map && map[index]) return map[index];
    }
    return fallbackChoices.map(c => c.label);
}

// Проходит по всем [data-i18n] в статическом index.html и подставляет
// перевод — либо в textContent, либо в один/несколько атрибутов через
// [data-i18n-attr] (например "aria-label" или "aria-label,data-label" —
// через запятую, если один и тот же текст нужен в нескольких местах сразу).
// Вызывается один раз при загрузке и повторно при смене языка (после
// которой обычно всё равно идёт location.reload(), но функция безопасна
// для повторных вызовов).
function applyStaticTranslations(){
    document.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n");
        const attrList = el.getAttribute("data-i18n-attr");
        const value = t(key);
        if(attrList){
            attrList.split(",").forEach(attr => el.setAttribute(attr.trim(), value));
        } else {
            el.textContent = value;
        }
    });
}

window.getSelectedLanguage = getSelectedLanguage;
window.setSelectedLanguage = setSelectedLanguage;
window.t = t;
window.td = td;
window.tdHint = tdHint;
window.tdChoices = tdChoices;
window.applyStaticTranslations = applyStaticTranslations;

applyDocumentLang();
document.addEventListener("DOMContentLoaded", applyStaticTranslations);
if(document.readyState === "interactive" || document.readyState === "complete"){
    applyStaticTranslations();
}
