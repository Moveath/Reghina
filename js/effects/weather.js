// Погода — выбор атмосферного эффекта в настройках (см. "Погода" в
// js/ui/settings.js: меню Ясная/Снег/Ночная/Дождь/Отключить). Сам выбор
// хранится локально (localStorage, без синхронизации между устройствами —
// как и решение показывать сцену "Пока нет", см. introDeclinedStorageKey в
// js/dialogue/dialogue.js), но пока ни у одного варианта нет реального
// визуального/звукового эффекта — раньше здесь был рабочий дождь (canvas +
// зацикленный звук), но его временно убрали целиком по просьбе (эффект пока
// не устроил, будет пересмотрен позже). Меню в настройках при этом остаётся
// рабочим и переключаемым — applyWeather просто ничего не делает, чтобы
// подключить будущий эффект, достаточно наполнить именно эту функцию.

const WEATHER_STORAGE_KEY = "reginaSelectedWeather";
const WEATHER_NONE = "none";

function loadSelectedWeather(){
    try { return localStorage.getItem(WEATHER_STORAGE_KEY) || WEATHER_NONE; } catch(e) { return WEATHER_NONE; }
}

function saveSelectedWeather(weatherId){
    try { localStorage.setItem(WEATHER_STORAGE_KEY, weatherId); } catch(e) {}
}

// Намеренно пустая — заготовка на будущее. weatherId сейчас ни на что не
// влияет ни для одного из вариантов меню (в том числе "rain").
function applyWeather(weatherId){}
window.applyWeather = applyWeather;

function setSelectedWeather(weatherId){
    saveSelectedWeather(weatherId);
    applyWeather(weatherId);
}
window.setSelectedWeather = setSelectedWeather;
window.getSelectedWeather = loadSelectedWeather;
