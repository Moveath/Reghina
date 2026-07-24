let minimized = false;
const containerStateStorageKey = "reginaPuzzleContainerState";

function readContainerState(){
    try {
        const stored = localStorage.getItem(containerStateStorageKey);
        if(!stored) return null;

        const parsed = JSON.parse(stored);
        return parsed && typeof parsed === "object" && typeof parsed.minimized === "boolean"
            ? parsed
            : null;
    } catch (e) {
        return null;
    }
}

function saveContainerState(state){
    try {
        localStorage.setItem(containerStateStorageKey, JSON.stringify(state));
    } catch (e) {}
    if(typeof scheduleProfileSync === "function") scheduleProfileSync();
}

function applyContainerState(state){
    minimized = Boolean(state && state.minimized);

    if(minimized){
        container.classList.add("minimized");
        showProgress();
        toggleBtn.textContent = "□";
    } else {
        container.classList.remove("minimized");
        hideProgress();
        toggleBtn.textContent = "✕";
    }
}

// Раньше эта функция игнорировала readContainerState() и на каждой
// загрузке страницы безусловно выставляла {minimized:true}, да ещё и
// пушила это на сервер (saveContainerState → scheduleProfileSync). Если
// реальное сохранённое состояние было {minimized:false} (окно оставили
// развёрнутым), это создавало несовпадение с сервером при каждой
// перезагрузке — а автосинхронизация (reconcileWithServer) как раз и
// перезагружает страницу при таком несовпадении. Получался бесконечный
// цикл: загрузка → форс minimized:true → рассинхрон с сервером →
// reconcile перезагружает страницу → форс minimized:true снова → ...
function restoreContainerState(){
    const initialState = readContainerState() || { minimized: true };
    applyContainerState(initialState);
}

toggleBtn.addEventListener("click",(e)=>{
    e.stopPropagation();

    minimized = !minimized;
    applyContainerState({ minimized });
    saveContainerState({ minimized });
});

container.addEventListener("click", () => {
    if (!minimized) return;

    minimized = false;
    applyContainerState({ minimized: false });
    saveContainerState({ minimized: false });
});

restoreContainerState();