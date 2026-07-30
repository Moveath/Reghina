// Погода — атмосферный эффект поверх фона сайта, под всем интерфейсом
// (виджеты/панели/собака/пазл). Выбор делается в настройках (см. "Погода" в
// js/ui/settings.js) и хранится только локально (localStorage, без
// синхронизации между устройствами — как и решение показывать сцену "Пока
// нет", см. introDeclinedStorageKey в js/dialogue/dialogue.js) — это
// предпочтение атмосферы, а не игровой прогресс.
//
// Сейчас у эффекта есть реальная реализация только для "дождь" (enableRain/
// disableRain, по требованиям пользователя). "ясная"/"снег"/"ночная" уже
// выбираются в меню, но пока не меняют картинку — applyWeather ниже уже
// готова принять их, просто добавить отдельные enable*/disable* по образцу
// дождя, когда для них появится своё ТЗ.

const WEATHER_STORAGE_KEY = "reginaSelectedWeather";
const WEATHER_NONE = "none";

function loadSelectedWeather(){
    try { return localStorage.getItem(WEATHER_STORAGE_KEY) || WEATHER_NONE; } catch(e) { return WEATHER_NONE; }
}

function saveSelectedWeather(weatherId){
    try { localStorage.setItem(WEATHER_STORAGE_KEY, weatherId); } catch(e) {}
}

// ============================================================
// ДОЖДЬ — canvas поверх фона, ниже интерфейса (см. .weather-rain-canvas в
// css/weather.css). Canvas вместо DOM-узлов на каждую каплю — сотня
// анимированных элементов через CSS дёргала бы layout/paint на слабых
// телефонах, один <canvas> с requestAnimationFrame рисует то же самое почти
// бесплатно по CPU.
// ============================================================

// Хватает для плотного, но не тяжёлого дождя даже на телефонах (см.
// требование к производительности) — проверено визуально, тяжелее не нужно
// для "уютного вечернего дождя", не ливня.
const RAIN_DROP_COUNT = 110;
// Небольшой наклон — дождь не строго вертикальный, но и не "ветер с ног
// сбивает", как и просили ("под небольшим углом").
const RAIN_ANGLE_RAD = (10 * Math.PI) / 180;

let rainCanvas = null;
let rainCtx = null;
let rainAnimationId = null;
let rainDrops = [];
let rainAudio = null;
let rainLifecycleListenersBound = false;

function rainRandom(min, max){
    return min + Math.random() * (max - min);
}

// depth 0..1 — "далеко"/"близко": дальние капли тоньше, медленнее, прозрачнее
// и слегка размыты (лёгкий эффект глубины, см. требования), ближние —
// крупнее, быстрее и чётче. Каждая капля получает depth случайно при
// создании, поэтому дождь выглядит многослойным, а не однородным ковром.
function createRainDrop(width, height, spawnAtTop){
    const depth = Math.random();
    const speed = rainRandom(260, 520) * (0.55 + depth * 0.8);
    const length = rainRandom(9, 20) * (0.55 + depth * 0.85);
    return {
        x: rainRandom(-width * 0.1, width * 1.1),
        // spawnAtTop — капля, которая "долетела" до низа/края и переродилась
        // сверху; при первом заполнении экрана капли раскиданы по всей
        // высоте, чтобы дождь не начинался пустой полосой сверху.
        y: spawnAtTop ? rainRandom(-height * 0.25, -4) : rainRandom(-height, height),
        length,
        speed,
        opacity: rainRandom(0.16, 0.42) * (0.55 + depth * 0.6),
        lineWidth: 0.8 + depth * 1.1,
        blurred: depth < 0.4
    };
}

function ensureRainCanvas(){
    if(rainCanvas) return rainCanvas;

    rainCanvas = document.createElement("canvas");
    rainCanvas.id = "weatherRainCanvas";
    rainCanvas.className = "weather-rain-canvas";
    rainCanvas.setAttribute("aria-hidden", "true");
    // В самый низ DOM-стека body — вместе с низким z-index в CSS гарантирует,
    // что дождь останется под пазлом/собакой/виджетами при любых будущих
    // правках вёрстки, а не только "пока z-index совпадают как надо".
    document.body.insertBefore(rainCanvas, document.body.firstChild);
    rainCtx = rainCanvas.getContext("2d");
    resizeRainCanvas();

    return rainCanvas;
}

function resizeRainCanvas(){
    if(!rainCanvas) return;
    rainCanvas.width = window.innerWidth;
    rainCanvas.height = window.innerHeight;
}

function stepRain(){
    if(!rainCtx || !rainCanvas){ rainAnimationId = null; return; }

    const width = rainCanvas.width;
    const height = rainCanvas.height;
    rainCtx.clearRect(0, 0, width, height);

    const dx = Math.sin(RAIN_ANGLE_RAD);
    const dy = Math.cos(RAIN_ANGLE_RAD);

    for(let i = 0; i < rainDrops.length; i++){
        const drop = rainDrops[i];
        drop.y += drop.speed * dy / 60;
        drop.x += drop.speed * dx / 60;

        rainCtx.save();
        rainCtx.globalAlpha = drop.opacity;
        // Полупрозрачный бело-голубой — ровно то, что просили, без молний и
        // без ярких вспышек: одна и та же спокойная короткая линия.
        rainCtx.strokeStyle = "#d9ecff";
        rainCtx.lineWidth = drop.lineWidth;
        rainCtx.lineCap = "round";
        if(drop.blurred) rainCtx.filter = "blur(0.8px)";
        rainCtx.beginPath();
        rainCtx.moveTo(drop.x, drop.y);
        rainCtx.lineTo(drop.x - drop.length * dx, drop.y - drop.length * dy);
        rainCtx.stroke();
        rainCtx.restore();

        if(drop.y - drop.length > height || drop.x - drop.length > width){
            rainDrops[i] = createRainDrop(width, height, true);
        }
    }

    // Небольшая случайность появления новых капель — иногда на кадр-другой
    // чуть гуще/реже, чтобы дождь не выглядел идеально ровным метрономом.
    if(Math.random() < 0.015 && rainDrops.length < RAIN_DROP_COUNT + 15){
        rainDrops.push(createRainDrop(width, height, true));
    } else if(Math.random() < 0.008 && rainDrops.length > RAIN_DROP_COUNT - 15){
        rainDrops.pop();
    }

    rainAnimationId = requestAnimationFrame(stepRain);
}

function startRainAnimation(){
    if(rainAnimationId) return;
    stepRain();
}

function stopRainAnimation(){
    if(rainAnimationId){
        cancelAnimationFrame(rainAnimationId);
        rainAnimationId = null;
    }
}

function bindRainLifecycleListeners(){
    if(rainLifecycleListenersBound) return;
    rainLifecycleListenersBound = true;

    window.addEventListener("resize", () => {
        if(!rainCanvas) return;
        resizeRainCanvas();
    });

    // Пока вкладка свёрнута/скрыта — не тратим CPU и батарею телефона на
    // невидимую анимацию. Капли просто "замирают" на месте и продолжают с
    // того же кадра, как только вкладка снова видна — не сбрасываем сцену.
    document.addEventListener("visibilitychange", () => {
        if(!rainCanvas || !rainCanvas.classList.contains("is-visible")) return;
        if(document.hidden) stopRainAnimation();
        else startRainAnimation();
    });
}

function ensureRainAudio(){
    if(!rainAudio){
        rainAudio = new Audio("audio/rain.mp3");
        rainAudio.loop = true;
    }
    return rainAudio;
}

function startRainSound(){
    const fraction = typeof sfxVolumeFraction === "function" ? sfxVolumeFraction() : 0.55;
    if(fraction <= 0) return;
    const audio = ensureRainAudio();
    audio.volume = fraction;
    audio.play().catch(() => {});
}

function stopRainSound(){
    if(!rainAudio) return;
    rainAudio.pause();
    rainAudio.currentTime = 0;
}

// Живое обновление громкости дождя при перетаскивании ползунка звуков в
// настройках (см. sfxVolumeSlider в js/ui/settings.js) — отдельная функция,
// а не через window.onSfxVolumeChanged: тот колбэк уже занят обновлением
// иконки/значения самого ползунка, вызывается прямо там же, где меняется
// сам слайдер, а не переопределяет существующий колбэк.
window.weatherSyncVolume = function weatherSyncVolume(percent){
    if(!rainAudio || rainAudio.paused) return;
    const fraction = Math.max(0, Math.min(100, percent)) / 100;
    if(fraction <= 0) stopRainSound();
    else rainAudio.volume = fraction;
};

function enableRain(){
    ensureRainCanvas();
    bindRainLifecycleListeners();
    resizeRainCanvas();
    rainCanvas.classList.add("is-visible");

    if(rainDrops.length === 0){
        rainDrops = Array.from({ length: RAIN_DROP_COUNT }, () => createRainDrop(rainCanvas.width, rainCanvas.height, false));
    }

    startRainAnimation();
    startRainSound();
}

function disableRain(){
    if(rainCanvas) rainCanvas.classList.remove("is-visible");
    stopRainAnimation();
    if(rainCtx && rainCanvas) rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    rainDrops = [];
    stopRainSound();
}

window.enableRain = enableRain;
window.disableRain = disableRain;

// ============================================================
// Единая точка входа — выбор погоды из настроек (см. js/ui/settings.js).
// ============================================================

function applyWeather(weatherId){
    // Всегда сначала гасим предыдущий эффект — на будущее, когда появятся
    // снег/ночная, это не даст двум эффектам крутиться одновременно.
    disableRain();
    if(weatherId === "rain") enableRain();
}
window.applyWeather = applyWeather;

function setSelectedWeather(weatherId){
    saveSelectedWeather(weatherId);
    applyWeather(weatherId);
}
window.setSelectedWeather = setSelectedWeather;
window.getSelectedWeather = loadSelectedWeather;

// Применяем сохранённый выбор сразу при загрузке скрипта — погода не
// привязана к прохождению интро, просто фоновая атмосфера с самого начала.
applyWeather(loadSelectedWeather());
