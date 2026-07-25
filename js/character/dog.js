const characterContainer = document.getElementById("characterContainer");

// Раньше здесь всегда сразу рисовалась "спящая" интро-собака, а настоящая
// поза выставлялась только когда доедет js/dialogue/dialogue.js (один из
// последних скриптов на странице) — из-за этого при каждой загрузке уже
// пройденного интро на секунду-две мелькала спящая собака в полный рост,
// даже если пазл давно наполовину собран. localStorage читается синхронно
// (без сети), поэтому можно сразу нарисовать правильную позу без
// промежуточного "неправильного" кадра — dialogue.js ниже всё равно
// выполнит resetDogToNeutral()/classList.remove("is-intro-scene") для уже
// пройденного интро, но теперь это просто не даст никакого видимого эффекта
// (состояние уже верное).
const introAlreadyCompleted = (() => {
    try { return localStorage.getItem("regina_intro_completed") === "true"; } catch(e) { return false; }
})();

if(introAlreadyCompleted){
    characterContainer.classList.remove("is-intro-scene");
    characterContainer.innerHTML = `
        <img
            id="dogCharacter"
            class="dog-character is-resting"
            src="images/dog/neutral.png"
            alt="Собака-проводник"
        >
    `;
} else {
    characterContainer.classList.add("is-intro-scene");
    characterContainer.innerHTML = `
        <div class="character-nameplate">Кане-корсо</div>
        <img
            id="dogCharacter"
            class="dog-character is-intro is-sleeping"
            src="images/dog/sleeping.png"
            alt="Собака-проводник"
        >
    `;
}

requestAnimationFrame(() => characterContainer.classList.add("is-visible"));
