// Кинематографическая система фоновой музыки.
//
// Один <audio> элемент на весь сайт (не пересоздаётся при открытии/закрытии
// виджетов — см. window.suggestMusicToEgor и renderMusicPanel в
// js/ui/settings.js, они только читают состояние отсюда). Все переходы
// между треками — ПОСЛЕДОВАТЕЛЬНЫЕ fade out → fade in (не одновременный
// crossfade): так и просили (см. п.10 требований), и заодно ровно
// повторяет сценарий "Stardew Valley гаснет → потом уже стартует Animal
// Crossing" без наложения одного трека на другой.
//
// Публичный API (window.music*) вызывается из dialogue.js (кинематографичные
// точки входа + ducking на "важных" диалогах) и js/ui/settings.js (виджет
// "Музыкальная шкатулка").

const MUSIC_TRACKS = [
    { id: "stardew", title: "Stardew Valley — Spring", file: "audio/stardew-valley.mp3" },
    { id: "acnh7pm", title: "Animal Crossing: New Horizons — 7 PM", file: "audio/7-pm.mp3" },
    { id: "coffee",  title: "A Day With Coffee", file: "audio/a-day-with-coffee.mp3" },
    { id: "moon",    title: "To the Moon", file: "audio/to-the-moon.mp3" },
    { id: "love",    title: "Meaningful Love", file: "audio/meaningful-love.mp3" }
];

const INTRO_TRACK_ID = "stardew";
const MAIN_DEFAULT_TRACK_ID = "acnh7pm";

const INTRO_VOLUME_FRACTION = 0.25;   // 20-30% во время самого интро
const DUCK_VOLUME_FRACTION = 0.15;    // на время "важных" диалогов после интро
const DEFAULT_MAIN_VOLUME_PERCENT = 45; // 40-50% по умолчанию, пока не выбрано своё

const SILENCE_BEFORE_START_MS = 1500; // п.1: 1-2 секунды тишины после загрузки
const FADE_OUT_MS = 2500;
const FADE_IN_MS = 1800;
const DUCK_FADE_MS = 900;
const VOLUME_SLIDER_FADE_MS = 250;

const volumeStorageKey = "reginaMusicVolume";
const selectedTrackStorageKey = "reginaSelectedMusicTrack";

function loadVolumePercent(){
    try {
        const stored = localStorage.getItem(volumeStorageKey);
        if(stored === null) return DEFAULT_MAIN_VOLUME_PERCENT;
        const raw = Number(stored);
        return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : DEFAULT_MAIN_VOLUME_PERCENT;
    } catch(e){ return DEFAULT_MAIN_VOLUME_PERCENT; }
}

function saveVolumePercent(percent){
    try { localStorage.setItem(volumeStorageKey, String(percent)); } catch(e) {}
}

function loadSelectedTrackId(){
    try {
        const stored = localStorage.getItem(selectedTrackStorageKey);
        return MUSIC_TRACKS.some(track => track.id === stored) ? stored : null;
    } catch(e){ return null; }
}

function saveSelectedTrackId(id){
    try { localStorage.setItem(selectedTrackStorageKey, id); } catch(e) {}
}

function trackById(id){
    return MUSIC_TRACKS.find(track => track.id === id) || null;
}

function userVolumeFraction(){
    return loadVolumePercent() / 100;
}

const bgAudio = new Audio();
bgAudio.loop = true;
bgAudio.preload = "auto";
bgAudio.volume = 0;

let currentTrackId = null;
// Уровень, к которому нужно вернуться после ducking — не всегда равен
// пользовательской громкости (во время интро это фиксированные 20-30%).
let restingVolumeFraction = userVolumeFraction();
let fadeToken = 0;
let duckActive = false;

// Разблокировка автовоспроизведения: браузеры не дают запустить звук без
// жеста пользователя. Первая попытка play() почти наверняка происходит ДО
// первого клика (интро рендерится на загрузке страницы), поэтому громкость
// всё равно плавно анимируется сразу — а сам play() просто повторяется при
// первом же клике/нажатии клавиши, если браузер его отклонил.
let unlockArmed = false;
function ensurePlaying(){
    try {
        const playPromise = bgAudio.play();
        if(playPromise && typeof playPromise.catch === "function"){
            playPromise.catch(() => armAutoplayUnlock());
        }
    } catch(e){
        armAutoplayUnlock();
    }
}

function armAutoplayUnlock(){
    if(unlockArmed) return;
    unlockArmed = true;

    function retry(){
        document.removeEventListener("pointerdown", retry, true);
        document.removeEventListener("keydown", retry, true);
        unlockArmed = false;
        bgAudio.play().catch(() => {});
    }

    document.addEventListener("pointerdown", retry, true);
    document.addEventListener("keydown", retry, true);
}

function fadeTo(targetVolume, ms){
    return new Promise(resolve => {
        const token = ++fadeToken;
        const startVolume = bgAudio.volume;
        const startTime = performance.now();

        function step(now){
            if(token !== fadeToken) return resolve(); // отменено более новым fade
            const progress = ms <= 0 ? 1 : Math.min(1, (now - startTime) / ms);
            const nextVolume = startVolume + (targetVolume - startVolume) * progress;
            // Audio.volume бросает исключение вне [0,1] — при progress≈1
            // накапливается погрешность плавающей точки (например
            // -0.00026), из-за которой присваивание падало бы с ошибкой
            // прямо внутри rAF-колбэка, и promise так никогда и не resolve'ился.
            bgAudio.volume = Math.max(0, Math.min(1, nextVolume));
            if(progress < 1) requestAnimationFrame(step);
            else resolve();
        }

        requestAnimationFrame(step);
    });
}

function notifyTrackChanged(id){
    if(typeof window.onMusicTrackChanged === "function") window.onMusicTrackChanged(id);
}

function notifyVolumeChanged(percent){
    if(typeof window.onMusicVolumeChanged === "function") window.onMusicVolumeChanged(percent);
}

// Последовательный переход: сначала гасим то, что играет сейчас (если
// играет), и только потом запускаем новый трек с нуля громкости.
async function switchTrack(trackId, targetVolumeFraction, options){
    const opts = options || {};
    const track = trackById(trackId);
    if(!track) return;

    // Клик по уже играющему треку ничего не делает — он и так играет.
    if(currentTrackId === trackId && !bgAudio.paused){
        return;
    }

    if(currentTrackId && !bgAudio.paused){
        await fadeTo(0, FADE_OUT_MS);
        bgAudio.pause();
    }

    bgAudio.src = track.file;
    bgAudio.currentTime = 0;
    bgAudio.volume = 0;
    currentTrackId = trackId;
    restingVolumeFraction = targetVolumeFraction;

    ensurePlaying();

    if(opts.persist !== false) saveSelectedTrackId(trackId);
    notifyTrackChanged(trackId);

    if(!duckActive){
        await fadeTo(targetVolumeFraction, FADE_IN_MS);
    }
}

// п.1-3: тишина 1-2с после загрузки, потом плавно стартует Stardew Valley
// на 20-30% — вызывается из dialogue.js ровно в момент рендера первой
// реплики интро (первый визит, интро ещё не пройдено).
function musicStartIntroCinematic(){
    setTimeout(() => {
        switchTrack(INTRO_TRACK_ID, INTRO_VOLUME_FRACTION, { persist: false });
    }, SILENCE_BEFORE_START_MS);
}

// п.4-7: конец интро — Stardew Valley гаснет, затем стартует Animal
// Crossing как основная фоновая музыка на пользовательской громкости
// (по умолчанию 40-50%). Вызывается из finishIntroDialogue().
function musicFinishIntroCinematic(){
    return switchTrack(MAIN_DEFAULT_TRACK_ID, userVolumeFraction(), { persist: true });
}

// Обычный (не первый) визит — интро уже пройдено, сразу играем то, что
// пользователь выбрал в прошлый раз (или Animal Crossing по умолчанию),
// тоже после короткой тишины при загрузке.
function musicStartReturningVisit(){
    setTimeout(() => {
        const savedTrackId = loadSelectedTrackId() || MAIN_DEFAULT_TRACK_ID;
        switchTrack(savedTrackId, userVolumeFraction(), { persist: true });
    }, SILENCE_BEFORE_START_MS);
}

// Ручной выбор трека из виджета "Список музыки".
function musicSelectTrack(trackId){
    return switchTrack(trackId, userVolumeFraction(), { persist: true });
}

// п.8-9: на время "важных" диалогов (сброс/восстановление/смена языка,
// ежемесячный ключ, отдельные реплики собаки) громкость временно падает до
// 15%, потом плавно возвращается к тому уровню, что был до этого.
async function musicDuck(){
    if(duckActive) return;
    duckActive = true;
    const target = Math.min(bgAudio.volume, DUCK_VOLUME_FRACTION);
    await fadeTo(target, DUCK_FADE_MS);
}

async function musicUnduck(){
    if(!duckActive) return;
    duckActive = false;
    await fadeTo(restingVolumeFraction, DUCK_FADE_MS);
}

// Ползунок громкости 0-100 в виджете. Во время ducking только запоминаем
// новую цель — реально громкость дозвучит после unduck(), чтобы не было
// слышно, как звук "подскакивает" прямо во время важного диалога.
function musicSetVolumePercent(percent){
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    saveVolumePercent(clamped);
    restingVolumeFraction = clamped / 100;
    notifyVolumeChanged(clamped);
    if(!duckActive){
        fadeTo(restingVolumeFraction, VOLUME_SLIDER_FADE_MS);
    }
}

window.musicGetTracks = () => MUSIC_TRACKS.slice();
window.musicGetCurrentTrackId = () => currentTrackId;
window.musicGetVolumePercent = loadVolumePercent;
window.musicSetVolumePercent = musicSetVolumePercent;
window.musicSelectTrack = musicSelectTrack;
window.musicDuck = musicDuck;
window.musicUnduck = musicUnduck;
window.musicStartIntroCinematic = musicStartIntroCinematic;
window.musicFinishIntroCinematic = musicFinishIntroCinematic;
window.musicStartReturningVisit = musicStartReturningVisit;
