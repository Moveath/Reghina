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

// Плавающий значок (как "ромб" над персонажами в Sims) и подпись с именем —
// показываются только в маленьком "угловом" виде (см. css/dog.css:
// #characterContainer:not(.is-intro-scene) .character-plumbob/.character-idle-name),
// поэтому в разметке они есть в ОБОИХ вариантах ниже — это самый надёжный
// способ: множество мест в js/dialogue/dialogue.js переключают класс
// is-intro-scene туда-обратно (resetDogToNeutral и т.п.), не пересобирая
// innerHTML заново, так что если добавить эти элементы только в одну из
// веток — при переключении класса им просто неоткуда взяться.
const idleExtrasHtml = `
    <div class="character-plumbob" aria-hidden="true">
        <img src="images/items/plumbob.png" alt="">
    </div>
    <div class="character-idle-name" id="characterIdleName"></div>
`;

if(introAlreadyCompleted){
    characterContainer.classList.remove("is-intro-scene");
    characterContainer.innerHTML = `
        <img
            id="dogCharacter"
            class="dog-character is-resting"
            src="images/dog/neutral.webp"
            alt="Собака-проводник"
        >
        ${idleExtrasHtml}
    `;
} else {
    characterContainer.classList.add("is-intro-scene");
    characterContainer.innerHTML = `
        <div class="character-nameplate">Кане-корсо</div>
        <img
            id="dogCharacter"
            class="dog-character is-intro is-sleeping dog-emotion-sleeping"
            src="images/dog/sleeping.webp"
            alt="Собака-проводник"
        >
        ${idleExtrasHtml}
    `;
}

// textContent, не innerHTML — имя приходит из localStorage, лишний повод не
// собирать его прямо в HTML-строку.
(() => {
    const idleNameEl = document.getElementById("characterIdleName");
    if(!idleNameEl) return;
    try {
        idleNameEl.textContent = localStorage.getItem("dog_name") || "";
    } catch(e) {}
})();

requestAnimationFrame(() => characterContainer.classList.add("is-visible"));
