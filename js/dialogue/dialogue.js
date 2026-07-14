const dialogueContainer = document.getElementById("dialogueContainer");
const dogCharacter = document.getElementById("dogCharacter");
let dialogueIndex = 0;

function renderIntroDialogue(){
    dialogueContainer.innerHTML = `
        <div class="intro-dialogue" role="dialog" aria-live="polite">
            <div class="intro-dialogue__bubble">
                <p>${introDialogueLines[dialogueIndex]}</p>
                <span>Нажмите в любом месте, чтобы продолжить</span>
            </div>
        </div>
    `;
}

function finishIntroDialogue(){
    dialogueContainer.classList.remove("is-active");
    dialogueContainer.innerHTML = "";
    characterContainer.classList.remove("is-intro-scene");
    dogCharacter.classList.remove("is-intro");
    dogCharacter.classList.add("is-resting");
}

dialogueContainer.addEventListener("click", () => {
    dialogueIndex += 1;

    if(dialogueIndex >= introDialogueLines.length){
        finishIntroDialogue();
        return;
    }

    renderIntroDialogue();
});

dialogueContainer.classList.add("is-active");
renderIntroDialogue();
