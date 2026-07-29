const pieces = [...document.querySelectorAll("[data-piece]")];
const resetPuzzleButton = document.getElementById("resetPuzzle");
const puzzleToast = document.getElementById("puzzleToast");
const initialPieceContent = pieces.map(piece => piece.innerHTML);

pieces.forEach((piece, index) => {
    piece.setAttribute("aria-label", t("static_piece_aria").replace("{n}", index + 1));
});

/* Сообщения для режима без ключа. */
const lockedMessageKeys = [
    "puzzle_locked_1",
    "puzzle_locked_2",
    "puzzle_locked_3",
    "puzzle_locked_4",
    "puzzle_locked_5",
    "puzzle_locked_6",
    "puzzle_locked_7",
    "puzzle_locked_8"
];

const unlockedPiecesStorageKey = "reginaPuzzleUnlockedPieces";

function saveUnlockedPieces(){
    try {
        const unlockedIndexes = pieces
            .map((piece, index) => piece.classList.contains("unlocked") ? index : null)
            .filter(index => index !== null);
        localStorage.setItem(unlockedPiecesStorageKey, JSON.stringify(unlockedIndexes));
    } catch(e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
}

function restoreUnlockedPieces(){
    try {
        const stored = localStorage.getItem(unlockedPiecesStorageKey);
        if(!stored) return;

        const unlockedIndexes = JSON.parse(stored);
        if(!Array.isArray(unlockedIndexes)) return;

        unlockedIndexes.forEach(index => {
            const piece = pieces[index];
            if(!piece) return;
            piece.classList.remove("locked", "unlocking");
            piece.classList.add("open", "unlocked");
            piece.replaceChildren();
        });
    } catch(e) {}
}

let toastTimeout;

function showPuzzleToast(message){
    puzzleToast.textContent = message;
    puzzleToast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        puzzleToast.classList.remove("show");
    }, 3400);
}

function updatePuzzleProgress(){
    const openedPieces = pieces.filter(piece => piece.classList.contains("unlocked")).length;
    progressIndicator.textContent = `${openedPieces}/${pieces.length}`;
    resetPuzzleButton.hidden = openedPieces !== pieces.length;
}

function showLockedMessage(){
    const randomIndex = Math.floor(Math.random() * lockedMessageKeys.length);
    showPuzzleToast(`${t("puzzle_need_key_prefix")}${t(lockedMessageKeys[randomIndex])}`);
}

function shakeLockedPiece(piece){
    piece.classList.remove("shake");
    void piece.offsetWidth;
    piece.classList.add("shake");
}

// Открытие кусочка — теперь ждёт настоящий звук открывающегося замка (см.
// sfxPlayLockOpen в js/audio/sfx.js), а не фиксированные 700мс: сама
// анимация замка растягивается под длительность звука (с учётом
// замедления), картинка кусочка появляется ровно в момент, когда звук
// закончился, и сразу следом — отдельный звук открытия части.
function unlockPiece(piece){
    if(container.classList.contains("minimized")) return;
    if(piece.classList.contains("unlocked") || piece.classList.contains("unlocking")) return;

    piece.classList.add("unlocking");
    const lockWrap = piece.querySelector(".lock-wrap");
    if(lockWrap && typeof window.sfxLockOpenDurationS === "number"){
        lockWrap.style.animationDuration = `${window.sfxLockOpenDurationS}s`;
    }

    const reveal = () => {
        piece.classList.remove("locked", "unlocking");
        piece.classList.add("open", "unlocked");
        piece.replaceChildren();
        updatePuzzleProgress();
        saveUnlockedPieces();
        showPuzzleToast(t("puzzle_opened"));
        if(typeof window.playSfx === "function") window.playSfx("pieceOpen");

        // Сообщаем интро (если оно как раз ждёт этого момента) — см. dialogue.js.
        if(typeof window.notifyPuzzlePieceUnlocked === "function"){
            window.notifyPuzzlePieceUnlocked();
        }

        if(pieces.every(item => item.classList.contains("unlocked"))){
            setTimeout(() => showPuzzleToast(t("puzzle_all_opened")), 1200);
        }
    };

    if(typeof window.sfxPlayLockOpen === "function"){
        window.sfxPlayLockOpen(reveal);
    } else {
        setTimeout(reveal, 700);
    }
}

// Открытие конкретного кусочка по индексу, в обход ключа-в-руке —
// используется системой ежемесячных ключей (см. window.checkMonthlyKey в
// js/storage/storage.js и showMonthlyKeyDialogue в js/dialogue/dialogue.js):
// там ключ выдаётся автоматически по дате, а не через puzzleKeySystem.
// Разворачиваем окно пазла, если оно было свёрнуто — иначе открытие
// части никто не увидит.
function unlockPieceByIndex(index){
    const piece = pieces[index];
    if(!piece) return false;
    if(piece.classList.contains("unlocked") || piece.classList.contains("unlocking")) return false;

    if(typeof applyContainerState === "function") applyContainerState({ minimized: false });
    if(typeof saveContainerState === "function") saveContainerState({ minimized: false });

    piece.classList.add("unlocking");
    const lockWrap = piece.querySelector(".lock-wrap");
    if(lockWrap && typeof window.sfxLockOpenDurationS === "number"){
        lockWrap.style.animationDuration = `${window.sfxLockOpenDurationS}s`;
    }

    const reveal = () => {
        piece.classList.remove("locked", "unlocking");
        piece.classList.add("open", "unlocked");
        piece.replaceChildren();
        updatePuzzleProgress();
        saveUnlockedPieces();
        showPuzzleToast(t("puzzle_opened"));
        if(typeof window.playSfx === "function") window.playSfx("pieceOpen");

        if(pieces.every(item => item.classList.contains("unlocked"))){
            setTimeout(() => showPuzzleToast(t("puzzle_all_opened")), 1200);
        }
    };

    if(typeof window.sfxPlayLockOpen === "function"){
        window.sfxPlayLockOpen(reveal);
    } else {
        setTimeout(reveal, 700);
    }

    return true;
}
window.unlockPieceByIndex = unlockPieceByIndex;

// Звук на клик по кусочку зависит от его текущего состояния — ровно один
// звук на клик, никогда не накладывается на другой: уже открытый кусочек
// получает обычный звук виджета, а всё ещё закрытый (по любой причине —
// нет ключа вообще или ключ есть, но не в руке) — звук закрытого замка.
// Само открытие (клик по "Открыть" в подтверждении) — отдельная пара звуков
// открытия замка/части, см. unlockPiece ниже.
function handlePieceClick(piece){
    if(container.classList.contains("minimized")) return;

    if(piece.classList.contains("unlocked")){
        showPuzzleToast(t("puzzle_already_open"));
        if(typeof window.playSfx === "function") window.playSfx("click");
        return;
    }

    if(piece.classList.contains("unlocking")) return;

    if(!puzzleKeySystem.hasKey()){
        shakeLockedPiece(piece);
        showLockedMessage();
        if(typeof window.playSfx === "function") window.playSfx("lockClosed");
        return;
    }

    if(!puzzleKeySystem.isKeyInHand()){
        showPuzzleToast(t("puzzle_take_key_first"));
        if(typeof window.playSfx === "function") window.playSfx("lockClosed");
        return;
    }

    puzzleKeySystem.requestKeyUse(() => unlockPiece(piece));
}

/*
 * Старая тестовая система открытия.
 * Оставлена для возможного использования позже.
pieces.forEach(piece => {
    piece.addEventListener("click", () => unlockPiece(piece));
});
*/

pieces.forEach(piece => {
    piece.addEventListener("click", () => handlePieceClick(piece));
});

resetPuzzleButton.addEventListener("click", () => {
    pieces.forEach((piece, index) => {
        piece.className = "piece locked";
        piece.innerHTML = initialPieceContent[index];
    });

    puzzleKeySystem.reset();
    updatePuzzleProgress();
    try { localStorage.removeItem(unlockedPiecesStorageKey); } catch(e) {}
    showPuzzleToast(t("puzzle_reset_test"));
});

restoreUnlockedPieces();
updatePuzzleProgress();
