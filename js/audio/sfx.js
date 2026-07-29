// Звуковые эффекты (не фоновая музыка — см. js/audio/music.js, это два
// полностью независимых механизма с раздельной громкостью: 0% на музыке не
// трогает звуки и наоборот, тишина только если оба на 0).

const SFX_FILES = {
    click: "audio/sfx-click.mp3",
    keyPickup: "audio/sfx-key-pickup.mp3",
    lockOpen: "audio/sfx-lock-open.mp3",
    pieceOpen: "audio/sfx-piece-open.mp3",
    letter: "audio/sfx-letter.mp3",
    dogSnore: "audio/sfx-dog-snore.mp3"
};

const sfxVolumeStorageKey = "reginaSfxVolume";
const DEFAULT_SFX_VOLUME_PERCENT = 55;

function loadSfxVolumePercent(){
    try {
        const stored = localStorage.getItem(sfxVolumeStorageKey);
        if(stored === null) return DEFAULT_SFX_VOLUME_PERCENT;
        const raw = Number(stored);
        return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : DEFAULT_SFX_VOLUME_PERCENT;
    } catch(e){ return DEFAULT_SFX_VOLUME_PERCENT; }
}

function saveSfxVolumePercent(percent){
    try { localStorage.setItem(sfxVolumeStorageKey, String(percent)); } catch(e) {}
}

function sfxVolumeFraction(){
    return loadSfxVolumePercent() / 100;
}

// Короткие одноразовые звуки — каждый раз новый Audio(), чтобы быстрые
// повторные клики не обрывали друг друга (в отличие от храпа/музыки, тут
// перекрытие звучит естественно, как и должно быть у UI-кликов).
function playSfx(name){
    const file = SFX_FILES[name];
    if(!file) return null;
    const fraction = sfxVolumeFraction();
    if(fraction <= 0) return null;
    const audio = new Audio(file);
    audio.volume = fraction;
    audio.play().catch(() => {});
    return audio;
}

// Звук открытия замка — с лёгким эффектом замедления (как будто механизм
// реально проворачивается), и колбэк ровно в момент, когда звук закончился
// (не раньше, не позже) — визуальное открытие кусочка пазла ждёт именно
// этого момента, см. js/puzzle/puzzle.js.
const LOCK_OPEN_PLAYBACK_RATE = 0.82;

function sfxPlayLockOpen(onEnded){
    const done = typeof onEnded === "function" ? onEnded : () => {};
    const fraction = sfxVolumeFraction();

    if(fraction <= 0){
        // Звук выключен — не ждём несуществующее воспроизведение, открываем
        // кусочек сразу же.
        done();
        return { duration: 0 };
    }

    const audio = new Audio(SFX_FILES.lockOpen);
    audio.playbackRate = LOCK_OPEN_PLAYBACK_RATE;
    audio.volume = fraction;

    let finished = false;
    const finish = () => {
        if(finished) return;
        finished = true;
        done();
    };

    audio.addEventListener("ended", finish, { once: true });
    audio.addEventListener("error", finish, { once: true });
    audio.play().catch(finish);

    return audio;
}

// Реальная длительность (с учётом замедления) — puzzle.js растягивает под
// неё CSS-анимацию открытия, чтобы механика замка и картинка совпадали по
// времени, а не просто звучали поверх друг друга.
const SFX_LOCK_OPEN_DURATION_S = 1.392 / LOCK_OPEN_PLAYBACK_RATE;

// Храп спящей собаки — единственный зацикленный звук среди эффектов,
// крутится, пока идёт самая первая (сонная) реплика интро, и обрывается
// сразу, как только она просыпается (см. isDream-ветку в dialogue.js).
let dogSnoreAudio = null;

function ensureDogSnoreAudio(){
    if(!dogSnoreAudio){
        dogSnoreAudio = new Audio(SFX_FILES.dogSnore);
        dogSnoreAudio.loop = true;
    }
    return dogSnoreAudio;
}

function startDogSnoreLoop(){
    const fraction = sfxVolumeFraction();
    if(fraction <= 0) return;
    const audio = ensureDogSnoreAudio();
    audio.volume = fraction;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

function stopDogSnoreLoop(){
    if(!dogSnoreAudio) return;
    dogSnoreAudio.pause();
    dogSnoreAudio.currentTime = 0;
}

// Громкость звуков — независимый ползунок в настройках (js/ui/settings.js),
// отдельный от громкости музыки. Меняет только то, что играет прямо сейчас
// (храп, если он идёт) — короткие одноразовые звуки и так каждый раз читают
// актуальную громкость заново.
function sfxSetVolumePercent(percent){
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    saveSfxVolumePercent(clamped);
    if(dogSnoreAudio && !dogSnoreAudio.paused){
        if(clamped <= 0){
            stopDogSnoreLoop();
        } else {
            dogSnoreAudio.volume = clamped / 100;
        }
    }
    if(typeof window.onSfxVolumeChanged === "function") window.onSfxVolumeChanged(clamped);
}

window.playSfx = playSfx;
window.sfxPlayLockOpen = sfxPlayLockOpen;
window.sfxLockOpenDurationS = SFX_LOCK_OPEN_DURATION_S;
window.startDogSnoreLoop = startDogSnoreLoop;
window.stopDogSnoreLoop = stopDogSnoreLoop;
window.sfxSetVolumePercent = sfxSetVolumePercent;
window.sfxGetVolumePercent = loadSfxVolumePercent;

// ===== Звук клика: собака или любой виджет — но не пустой фон сайта =====
// Список того, что считается "виджетом" — почти все кликабельные элементы
// сайта оформлены как <button>, поэтому один общий селектор кроет
// подавляющее большинство случаев; отдельно добавлены неполные исключения
// (li-пункты настроек/прогресса, письма в списке). Кусочки пазла и
// выдача/подбор ключа исключены явно — у них уже есть свои собственные звуки
// (открытие замка/части, подбор ключа), дублировать клик поверх них не нужно.
const SFX_CLICK_SELECTOR = [
    "button",
    "a[href]",
    "[role='button']",
    ".settings-section-item.is-clickable",
    ".progress-action-item.is-clickable",
    ".letter-item"
].join(", ");
const SFX_CLICK_EXCLUDE_SELECTOR = "[data-piece], .key-counter, .inventory-key";

document.addEventListener("click", (event) => {
    const target = event.target;
    if(!(target instanceof Element)) return;
    if(target.closest(SFX_CLICK_EXCLUDE_SELECTOR)) return;

    if(target.closest(SFX_CLICK_SELECTOR)){
        playSfx("click");
        return;
    }

    // Собака почти всё время pointer-events:none (см. dog.css) — клик по её
    // области "проваливается" на то, что визуально ниже, поэтому ловим его
    // по координатам, как и пасхалка "5 кликов по собаке" в dialogue.js.
    const dog = document.getElementById("dogCharacter");
    if(dog){
        const rect = dog.getBoundingClientRect();
        if(event.clientX >= rect.left && event.clientX <= rect.right &&
           event.clientY >= rect.top && event.clientY <= rect.bottom){
            playSfx("click");
        }
    }
}, true);
