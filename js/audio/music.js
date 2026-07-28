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

// Позиция воспроизведения (п. "при обновлении страницы песня должна... не
// с самого начала") — сохраняем {id, time} трека, который сейчас играет,
// чтобы после обновления страницы продолжить с того же места, а не с нуля.
const positionStorageKey = "reginaMusicPosition";

function savePosition(){
    if(!currentTrackId) return;
    try {
        localStorage.setItem(positionStorageKey, JSON.stringify({ id: currentTrackId, time: bgAudio.currentTime || 0 }));
    } catch(e) {}
}

function loadPosition(trackId){
    try {
        const raw = localStorage.getItem(positionStorageKey);
        if(!raw) return 0;
        const parsed = JSON.parse(raw);
        if(parsed && parsed.id === trackId && Number.isFinite(parsed.time) && parsed.time > 0) return parsed.time;
    } catch(e) {}
    return 0;
}

function trackById(id){
    return MUSIC_TRACKS.find(track => track.id === id) || null;
}

function userVolumeFraction(){
    return loadVolumePercent() / 100;
}

const bgAudio = new Audio();
// loop:true даёт нативный повтор, но у большинства mp3 в конце файла есть
// небольшая тишина/padding от энкодера — на стыке слышен характерный
// "провал"/пауза, будто трек завис. Вместо этого сами гасим громкость
// перед самым концом и рестартуем трек без паузы (см. слушатель timeupdate
// ниже) — тот же эффект "затухает и сразу играет заново", без нативного
// стыка.
bgAudio.loop = false;
bgAudio.preload = "auto";
bgAudio.volume = 0;

let currentTrackId = null;
// Уровень, к которому нужно вернуться после ducking — не всегда равен
// пользовательской громкости (во время интро это фиксированные 20-30%).
let restingVolumeFraction = userVolumeFraction();
let fadeToken = 0;
let duckActive = false;

// Музыка — фоновая и не должна уметь ставиться на паузу извне (медиа-клавиши
// клавиатуры, системный оверлей громкости/медиа в Windows и т.п. — браузер
// умеет останавливать любой играющий <audio> в ответ на них сам, без
// какого-либо участия нашего кода). Единственный способ "заглушить" её —
// ползунок громкости (вплоть до 0%), сама она при этом продолжает
// технически играть. intentionalPauseExpected — единственная легитимная
// причина для pause(): собственный fade out перед сменой трека в switchTrack.
let intentionalPauseExpected = false;
bgAudio.addEventListener("pause", () => {
    if(intentionalPauseExpected){
        intentionalPauseExpected = false;
        return;
    }
    ensurePlayingLater();
});

// Разово через микротаск/rAF — сразу внутри обработчика "pause" браузер
// иногда игнорирует немедленный повторный play() (тот же тик события).
function ensurePlayingLater(){
    requestAnimationFrame(() => ensurePlaying());
}

// Media Session — то самое системное всплывающее окно/медиа-клавиши.
// Без явного переопределения play/pause/stop браузер трактует их как
// обычные команды и сам вызывает bgAudio.pause()/play(); переопределяем,
// чтобы pause/stop не делали ничего (или сразу же продолжали играть).
if("mediaSession" in navigator){
    try {
        navigator.mediaSession.setActionHandler("play", () => ensurePlaying());
        navigator.mediaSession.setActionHandler("pause", () => ensurePlaying());
        navigator.mediaSession.setActionHandler("stop", () => ensurePlaying());
    } catch(e) {}
}

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

// Бесшовный ручной повтор (замена нативному loop, см. комментарий у
// bgAudio.loop выше): за LOOP_TAIL_S до конца трека гасим громкость,
// сразу прыгаем в начало (без явного pause — плеер продолжает играть) и
// тут же поднимаем громкость обратно — так что провала/паузы не слышно
// вообще, только лёгкое короткое притухание на стыке.
const LOOP_TAIL_S = 0.8;
const LOOP_FADE_MS = 650;
let loopRestartScheduled = false;

bgAudio.addEventListener("timeupdate", () => {
    if(loopRestartScheduled) return;
    const duration = bgAudio.duration;
    if(!duration || !Number.isFinite(duration)) return;
    if(duration - bgAudio.currentTime > LOOP_TAIL_S) return;

    loopRestartScheduled = true;
    (async () => {
        await fadeTo(0, LOOP_FADE_MS);
        bgAudio.currentTime = 0;
        if(!duckActive) await fadeTo(restingVolumeFraction, LOOP_FADE_MS);
        loopRestartScheduled = false;
    })();
});

// Подстраховка: если timeupdate не успел сработать вовремя (throttling
// браузера) и трек всё-таки честно доиграл до конца — не оставляем тишину
// висеть, а сразу перезапускаем без дополнительного fade.
bgAudio.addEventListener("ended", () => {
    loopRestartScheduled = false;
    bgAudio.currentTime = 0;
    ensurePlaying();
});

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
        intentionalPauseExpected = true;
        bgAudio.pause();
    }

    bgAudio.src = track.file;
    bgAudio.currentTime = Number.isFinite(opts.resumeAt) && opts.resumeAt > 0 ? opts.resumeAt : 0;
    bgAudio.volume = 0;
    currentTrackId = trackId;
    restingVolumeFraction = targetVolumeFraction;
    loopRestartScheduled = false;

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
        switchTrack(INTRO_TRACK_ID, INTRO_VOLUME_FRACTION, { persist: false, resumeAt: loadPosition(INTRO_TRACK_ID) });
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
        switchTrack(savedTrackId, userVolumeFraction(), { persist: true, resumeAt: loadPosition(savedTrackId) });
    }, SILENCE_BEFORE_START_MS);
}

// Ручной выбор трека из виджета "Список музыки".
function musicSelectTrack(trackId){
    if(typeof window.diaryTrackActivity === "function") window.diaryTrackActivity("music_played");
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

// Приветствие "Егор добавил ту музыку, которую ты хотела" — сюжетная
// реплика (не тост), показывается один раз на первом визите ПОСЛЕ того,
// как в MUSIC_TRACKS выше реально появился новый трек (Егор добавляет его
// вручную и деплоит). Список треков статический (часть кода сайта), поэтому
// если Регина уже открыла сайт, новый трек физически не может появиться у
// неё прямо в текущей вкладке без перезагрузки — специально отслеживать
// "она сейчас на сайте" не нужно, это и так исключено самой природой
// деплоя. Сравниваем с id, сохранёнными при прошлом визите; если сохранённых
// id ещё нет вообще (самый первый визит или до этой фичи) — просто
// запоминаем текущий список молча, ничего не анонсируем.
const knownMusicTrackIdsStorageKey = "reginaKnownMusicTrackIds";

function loadKnownMusicTrackIds(){
    try {
        const raw = localStorage.getItem(knownMusicTrackIdsStorageKey);
        return raw ? new Set(JSON.parse(raw)) : null;
    } catch(e){ return null; }
}

function saveKnownMusicTrackIds(ids){
    try { localStorage.setItem(knownMusicTrackIdsStorageKey, JSON.stringify([...ids])); } catch(e) {}
}

// Красная точка на иконке шкатулки — держится, пока Регина реально не
// откроет виджет музыки (см. clearMusicNotificationBadge, вызывается из
// toggleMusicPanel в js/ui/settings.js).
function setMusicNotificationBadge(hasNew){
    if(typeof musicBoxButton === "undefined" || !musicBoxButton) return;
    musicBoxButton.classList.toggle("has-new-track", hasNew);
}

window.clearMusicNotificationBadge = () => setMusicNotificationBadge(false);

// Вызывается один раз при загрузке страницы (см. js/ui/letters.js —
// выстроено ПОСЛЕ проверки писем, чтобы при одновременном "новое письмо +
// новая музыка" сначала полностью показалась и закрылась реплика про
// письмо, а уже потом — про музыку, а не обе разом/наперегонки за
// dogRemarkActive).
window.checkMusicAddedGreeting = function checkMusicAddedGreeting(){
    const introDone = typeof isIntroAlreadyCompleted === "function" ? isIntroAlreadyCompleted() : true;
    if(!introDone) return;

    const currentIds = new Set(MUSIC_TRACKS.map(track => track.id));
    const known = loadKnownMusicTrackIds();

    if(known === null){
        saveKnownMusicTrackIds(currentIds);
        setMusicNotificationBadge(false);
        return;
    }

    const newTrackIds = [...currentIds].filter(id => !known.has(id));
    saveKnownMusicTrackIds(currentIds);

    if(newTrackIds.length === 0){
        return;
    }

    setMusicNotificationBadge(true);
    if(typeof showDogRemark === "function") showDogRemark(t("music_new_track_greeting"), "happy");
};

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

// Периодически запоминаем позицию (на случай вкладки, закрытой без
// корректного pagehide — например, обесточенное устройство) + сразу же при
// уходе со страницы/сворачивании (эти события успевают отработать надёжнее,
// чем интервал, прямо перед самим закрытием/обновлением).
setInterval(savePosition, 5000);
window.addEventListener("pagehide", savePosition);
document.addEventListener("visibilitychange", () => {
    if(document.visibilityState === "hidden") savePosition();
});
