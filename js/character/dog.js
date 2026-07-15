const characterContainer = document.getElementById("characterContainer");

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

requestAnimationFrame(() => characterContainer.classList.add("is-visible"));
