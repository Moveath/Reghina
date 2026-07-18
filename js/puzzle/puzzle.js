const pieces = [...document.querySelectorAll("[data-piece]")];
const resetPuzzleButton = document.getElementById("resetPuzzle");
const puzzleToast = document.getElementById("puzzleToast");
const initialPieceContent = pieces.map(piece => piece.innerHTML);

/* Сообщения для режима без ключа. */
const lockedMessages = [
    "Ещё рано ✨",
    "Не сейчас 🌙",
    "Скоро откроется",
    "Подожди немного",
    "У каждой вещи своё время",
    "Этот кусочек пока спит 💫",
    "Вернись позже ✨",
    "Терпение..."
];

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
    const randomIndex = Math.floor(Math.random() * lockedMessages.length);
    showPuzzleToast(`Сначала нужен ключ. ${lockedMessages[randomIndex]}`);
}

function shakeLockedPiece(piece){
    piece.classList.remove("shake");
    void piece.offsetWidth;
    piece.classList.add("shake");
}

function unlockPiece(piece){
    if(container.classList.contains("minimized")) return;
    if(piece.classList.contains("unlocked") || piece.classList.contains("unlocking")) return;

    piece.classList.add("unlocking");

    setTimeout(() => {
        piece.classList.remove("locked", "unlocking");
        piece.classList.add("open", "unlocked");
        piece.replaceChildren();
        updatePuzzleProgress();
        showPuzzleToast("Часть открыта");

        // Сообщаем интро (если оно как раз ждёт этого момента) — см. dialogue.js.
        if(typeof window.notifyPuzzlePieceUnlocked === "function"){
            window.notifyPuzzlePieceUnlocked();
        }

        if(pieces.every(item => item.classList.contains("unlocked"))){
            setTimeout(() => showPuzzleToast("Все части открыты!"), 1200);
        }
    }, 700);
}

function handlePieceClick(piece){
    if(container.classList.contains("minimized")) return;

    if(piece.classList.contains("unlocked")){
        showPuzzleToast("Эта часть уже открыта ✨");
        return;
    }

    if(piece.classList.contains("unlocking")) return;

    if(!puzzleKeySystem.hasKey()){
        shakeLockedPiece(piece);
        showLockedMessage();
        return;
    }

    if(!puzzleKeySystem.isKeyInHand()){
        showPuzzleToast("Сначала возьмите ключ из инвентаря.");
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
    showPuzzleToast("Пазл сброшен для нового теста");
});

updatePuzzleProgress();
