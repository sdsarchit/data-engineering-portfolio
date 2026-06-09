document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("intro-modal");
    const closeBtn = document.getElementById("close-modal-btn");
    const exploreBtn = document.getElementById("explore-btn");

    if (modal && closeBtn && exploreBtn) {
        // Check if user already saw the intro during this browser session
        if (!sessionStorage.getItem("portfolio_intro_shown")) {
            setTimeout(() => {
                modal.classList.add("active");
            }, 400);
        }

        function dismissModal() {
            modal.classList.remove("active");
            sessionStorage.setItem("portfolio_intro_shown", "true");
        }

        closeBtn.addEventListener("click", dismissModal);
        exploreBtn.addEventListener("click", dismissModal);
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                dismissModal();
            }
        });
    }
});
