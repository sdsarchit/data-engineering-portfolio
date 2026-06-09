document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("menu-toggle-btn");
    const navLinks = document.querySelector(".nav-links");
    if (toggleBtn && navLinks) {
        toggleBtn.addEventListener("click", () => {
            navLinks.classList.toggle("active");
            const icon = toggleBtn.querySelector("i");
            if (icon) {
                if (icon.classList.contains("fa-bars")) {
                    icon.className = "fa-solid fa-xmark";
                } else {
                    icon.className = "fa-solid fa-bars";
                }
            }
        });
    }
});
