let minimized = false;

toggleBtn.addEventListener("click",(e)=>{

    e.stopPropagation();

    minimized = !minimized;

    if(minimized){

        container.classList.add("minimized");

        showProgress();

        toggleBtn.textContent = "□";

    }else{

        container.classList.remove("minimized");

        hideProgress();

        toggleBtn.textContent = "✕";
    }
});

container.addEventListener("click", () => {

    if (!minimized) return;

    minimized = false;

    hideProgress();

    toggleBtn.textContent = "✕";

    container.classList.remove("minimized");

});