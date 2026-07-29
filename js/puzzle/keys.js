/* Временная система ключей. Позже персонаж сможет вызывать puzzleKeySystem.grantKey(). */
const puzzleKeySystem = (() => {
    const MAX_KEYS = 1;
    const keyCounter = document.getElementById("keyCounter");
    const getTestKeyButton = document.getElementById("getTestKey");
    const keyInventory = document.getElementById("keyInventory");
    const inventoryKeyButton = document.getElementById("inventoryKeyButton");
    const inventoryKeyImage = document.getElementById("inventoryKeyImage");
    const confirmModal = document.getElementById("keyConfirmModal");
    const confirmButton = document.getElementById("confirmKeyUse");
    const cancelButton = document.getElementById("cancelKeyUse");
    const heldKeyCursor = document.getElementById("heldKeyCursor");

    const keyCountStorageKey = "reginaKeyCount";
    let keyCount = (() => {
        try { return Number(localStorage.getItem(keyCountStorageKey)) || 0; } catch(e) { return 0; }
    })();
    let isKeySelected = false;
    let pendingUseCallback = null;
    let cursorFrame;
    let pendingCursorPosition;

    function updateKeyInterface(){
        const hasKey = keyCount > 0;

        try { localStorage.setItem(keyCountStorageKey, String(keyCount)); } catch(e) {}
        if(typeof scheduleProfileSync === "function") scheduleProfileSync();

        keyCounter.textContent = `🔑 ${keyCount}/${MAX_KEYS}`;
        keyInventory.classList.toggle("has-key", hasKey);
        keyInventory.classList.toggle("key-selected", hasKey && isKeySelected);
        document.body.classList.toggle("key-cursor-active", hasKey && isKeySelected);
        inventoryKeyButton.disabled = !hasKey;
        inventoryKeyButton.setAttribute("aria-pressed", String(hasKey && isKeySelected));
    }

    function moveHeldKey(event){
        if(!isKeySelected) return;

        pendingCursorPosition = {
            x: event.clientX,
            y: event.clientY
        };

        if(cursorFrame) return;

        cursorFrame = requestAnimationFrame(() => {
            const { x, y } = pendingCursorPosition;
            heldKeyCursor.style.transform =
                `translate3d(${x - 8}px, ${y - 8}px, 0) rotate(-18deg)`;
            cursorFrame = null;
        });
    }

    function areAllPiecesOpened(){
        const puzzlePieces = [...document.querySelectorAll("[data-piece]")];
        return puzzlePieces.length > 0 && puzzlePieces.every(piece => piece.classList.contains("unlocked"));
    }

    function showMessage(message){
        showPuzzleToast(message);
    }

    function putKeyBack(){
        if(!isKeySelected) return;

        isKeySelected = false;
        updateKeyInterface();
        showMessage(t("keys_returned"));
    }

    function grantKey(){
        if(areAllPiecesOpened()){
            showMessage(t("keys_all_open_already"));
            return false;
        }

        if(keyCount >= MAX_KEYS){
            showMessage(t("keys_already_have"));
            return false;
        }

        keyCount = 1;
        isKeySelected = false;
        updateKeyInterface();
        showMessage(t("keys_obtained"));
        if(typeof window.diaryTrackActivity === "function") window.diaryTrackActivity("key_found");
        return true;
    }

    function useKey(){
        if(keyCount === 0) return false;

        keyCount = 0;
        isKeySelected = false;
        updateKeyInterface();
        return true;
    }

    // Звук на клик по виджету ключа тоже зависит от результата — ровно один
    // звук за клик: реальный подбор ключа в руку получает свой отдельный
    // звук, а остальные исходы (ключа ещё нет / кладём обратно) — обычный
    // звук виджета, чтобы они не звучали одновременно с подбором.
    function selectKey(event){
        if(keyCount === 0){
            showMessage(t("keys_get_first"));
            if(typeof window.playSfx === "function") window.playSfx("click");
            return;
        }

        if(isKeySelected){
            putKeyBack();
            if(typeof window.playSfx === "function") window.playSfx("click");
            return;
        }

        isKeySelected = true;
        updateKeyInterface();
        if(event) moveHeldKey(event);
        showMessage(t("keys_in_hand"));
        if(typeof window.playSfx === "function") window.playSfx("keyPickup");
    }

    function openConfirmation(onConfirm){
        pendingUseCallback = onConfirm;
        confirmModal.hidden = false;
        requestAnimationFrame(() => confirmModal.classList.add("is-visible"));
    }

    function closeConfirmation(){
        confirmModal.classList.remove("is-visible");
        setTimeout(() => {
            confirmModal.hidden = true;
        }, 250);
        pendingUseCallback = null;
    }

    function requestKeyUse(onConfirm){
        if(keyCount === 0) return;
        openConfirmation(onConfirm);
    }

    function reset(){
        keyCount = 0;
        isKeySelected = false;
        pendingUseCallback = null;
        confirmModal.hidden = true;
        confirmModal.classList.remove("is-visible");
        updateKeyInterface();
    }

    function handleTestKeyClick(){
        if(isKeySelected){
            putKeyBack();
            return;
        }

        grantKey();
    }

    getTestKeyButton.addEventListener("click", handleTestKeyClick);
    keyCounter.addEventListener("click", selectKey);
    inventoryKeyButton.addEventListener("click", selectKey);
    inventoryKeyImage.addEventListener("error", () => {
        inventoryKeyImage.hidden = true;
    });

    heldKeyCursor.querySelector("img").addEventListener("error", event => {
        event.currentTarget.hidden = true;
    });

    confirmButton.addEventListener("click", () => {
        const callback = pendingUseCallback;
        closeConfirmation();

        if(useKey() && callback){
            callback();
        }
    });

    cancelButton.addEventListener("click", closeConfirmation);

    // Раньше клик мимо разрешённых элементов возвращал ключ обратно —
    // это было завязано на видимый слот инвентаря, которого больше нет.
    // Теперь единственный способ получить ключ — нажать на собаку, и он
    // остаётся в руке, пока не будет использован на кусочке пазла.

    document.addEventListener("pointermove", moveHeldKey);

    updateKeyInterface();

    return {
        grantKey,
        hasKey: () => keyCount > 0,
        isKeyInHand: () => keyCount > 0 && isKeySelected,
        requestKeyUse,
        reset,
        selectKey,
        areAllPiecesOpened
    };
})();

/* Будущая интеграция: в js/character/dog.js персонаж сможет вызвать puzzleKeySystem.grantKey(). */
