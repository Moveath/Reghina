const characterContainer = document.getElementById("characterContainer");

characterContainer.classList.add("is-intro-scene");

characterContainer.innerHTML = `
    <img
        id="dogCharacter"
        class="dog-character is-intro"
        src="images/dog/ChatGPT Image 14 июл. 2026 г., 19_48_24.png"
        alt="Собака-проводник"
    >
`;

requestAnimationFrame(() => characterContainer.classList.add("is-visible"));
