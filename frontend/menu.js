/* ============================================================
   SHARED EFFECTS ENGINE — Particle Canvas + Scroll Reveal
   Loaded on every page via menu.js-adjacent script tag
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    // --------------------------------------------------------
    // 1. DROPDOWN TOGGLE (Desktop & Touch)
    // --------------------------------------------------------
    const dropdowns = document.querySelectorAll(".nav-dropdown");
    dropdowns.forEach(dropdown => {
        const toggleBtn = dropdown.querySelector(".dropdown-toggle");
        if (toggleBtn) {
            toggleBtn.addEventListener("click", (e) => {
                // If clicking Projects on desktop or touch, toggle dropdown menu
                e.preventDefault();
                e.stopPropagation();
                dropdown.classList.toggle("open");
            });
        }
    });

    document.addEventListener("click", (e) => {
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove("open");
            }
        });
    });

    // --------------------------------------------------------
    // 2. CONTACT MODAL (Dynamic Injection & Event Handling)
    // --------------------------------------------------------
    let contactModal = document.getElementById("contact-modal");
    if (!contactModal) {
        contactModal = document.createElement("div");
        contactModal.id = "contact-modal";
        contactModal.className = "modal-overlay";
        contactModal.innerHTML = `
            <div class="modal-card contact-modal-card">
                <button class="modal-close-btn" id="close-contact-modal-btn">&times;</button>
                <div class="modal-avatar-wrapper" style="background: rgba(14, 165, 233, 0.1); border-color: rgba(14, 165, 233, 0.3); color: #38bdf8;">
                    <i class="fa-solid fa-address-card"></i>
                </div>
                <h2 class="modal-title">Get in Touch</h2>
                <div class="modal-subtitle">Archit Somayajula · Senior Data Engineer</div>
                <p class="modal-desc">Feel free to reach out for career opportunities, technical consultations, or project collaborations.</p>
                
                <div class="contact-details-list">
                    <a href="mailto:sdsarchit2000@gmail.com" class="contact-detail-item">
                        <div class="contact-icon-box cyan"><i class="fa-regular fa-envelope"></i></div>
                        <div class="contact-info-text">
                            <span class="contact-label">Email Address</span>
                            <span class="contact-value">sdsarchit2000@gmail.com</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-right-from-square contact-ext-icon"></i>
                    </a>

                    <a href="tel:+919550346409" class="contact-detail-item">
                        <div class="contact-icon-box green"><i class="fa-solid fa-phone"></i></div>
                        <div class="contact-info-text">
                            <span class="contact-label">Phone / Mobile</span>
                            <span class="contact-value">+91 9550346409</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-right-from-square contact-ext-icon"></i>
                    </a>

                    <a href="https://www.linkedin.com/in/archit-somayajula" target="_blank" rel="noopener noreferrer" class="contact-detail-item">
                        <div class="contact-icon-box blue"><i class="fa-brands fa-linkedin"></i></div>
                        <div class="contact-info-text">
                            <span class="contact-label">LinkedIn Profile</span>
                            <span class="contact-value">linkedin.com/in/archit-somayajula</span>
                        </div>
                        <i class="fa-solid fa-arrow-up-right-from-square contact-ext-icon"></i>
                    </a>
                </div>
                
                <div class="contact-modal-footer">
                    <button class="btn-glow btn-glow-ghost" id="contact-modal-done-btn" style="width:100%; justify-content:center;">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(contactModal);
    }

    function openContactModal() {
        if (contactModal) {
            contactModal.classList.add("active");
        }
    }

    function closeContactModal() {
        if (contactModal) {
            contactModal.classList.remove("active");
        }
    }

    // Bind all contact trigger buttons (e.g. Header button, nav-btn, etc.)
    document.querySelectorAll(".nav-btn, .contact-trigger-btn, #open-contact-modal-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openContactModal();
        });
    });

    const closeBtn = document.getElementById("close-contact-modal-btn");
    if (closeBtn) closeBtn.addEventListener("click", closeContactModal);

    const doneBtn = document.getElementById("contact-modal-done-btn");
    if (doneBtn) doneBtn.addEventListener("click", closeContactModal);

    contactModal.addEventListener("click", (e) => {
        if (e.target === contactModal) {
            closeContactModal();
        }
    });

    // --------------------------------------------------------
    // 3. MOBILE DRAWER OVERLAY
    // --------------------------------------------------------
    const menuToggleBtn = document.getElementById("menu-toggle-btn");
    const navLinks = document.querySelector(".nav-links");
    if (menuToggleBtn && navLinks) {
        let mobileDrawer = document.getElementById("mobile-nav-drawer");
        if (!mobileDrawer) {
            mobileDrawer = document.createElement("div");
            mobileDrawer.id = "mobile-nav-drawer";

            const currentPath = window.location.pathname;

            mobileDrawer.innerHTML = `
                <a href="index.html#about" class="nav-link"><i class="fa-solid fa-user"></i> About</a>
                <a href="index.html#skills" class="nav-link"><i class="fa-solid fa-code"></i> Skills</a>
                <div class="drawer-category-label">PROJECTS & LABS</div>
                <a href="pipeline.html" class="nav-link sub-nav-link ${currentPath.includes('pipeline') ? 'active' : ''}"><i class="fa-solid fa-terminal text-cyan"></i> ETL Console</a>
                <a href="dashboard.html" class="nav-link sub-nav-link ${currentPath.includes('dashboard') ? 'active' : ''}"><i class="fa-solid fa-chart-line text-purple"></i> Live Dashboard</a>
                <a href="nids.html" class="nav-link sub-nav-link ${currentPath.includes('nids') ? 'active' : ''}"><i class="fa-solid fa-shield-halved text-green"></i> NIDS Security Lab</a>
                <a href="xai.html" class="nav-link sub-nav-link ${currentPath.includes('xai') ? 'active' : ''}"><i class="fa-solid fa-sun-plant-wilt text-yellow"></i> XAI Research Lab</a>
                <a href="index.html#projects" class="nav-link sub-nav-link"><i class="fa-solid fa-folder-open"></i> All Projects & Labs</a>
                <div class="drawer-category-label">CONTACT</div>
                <button class="nav-link contact-drawer-btn" id="drawer-contact-btn"><i class="fa-solid fa-address-card text-cyan"></i> Get Contact Details</button>
            `;

            document.body.appendChild(mobileDrawer);

            mobileDrawer.querySelectorAll("a").forEach(link => {
                link.addEventListener("click", closeDrawer);
            });

            const drawerContactBtn = mobileDrawer.querySelector("#drawer-contact-btn");
            if (drawerContactBtn) {
                drawerContactBtn.addEventListener("click", () => {
                    closeDrawer();
                    openContactModal();
                });
            }
        }

        function openDrawer() {
            mobileDrawer.classList.add("active");
            document.body.classList.add("nav-open");
            const icon = menuToggleBtn.querySelector("i");
            if (icon) icon.className = "fa-solid fa-xmark";
        }

        function closeDrawer() {
            mobileDrawer.classList.remove("active");
            document.body.classList.remove("nav-open");
            const icon = menuToggleBtn.querySelector("i");
            if (icon) icon.className = "fa-solid fa-bars";
        }

        menuToggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (mobileDrawer.classList.contains("active")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        document.addEventListener("click", (e) => {
            if (mobileDrawer.classList.contains("active") && !mobileDrawer.contains(e.target) && !menuToggleBtn.contains(e.target)) {
                closeDrawer();
            }
        });
    }

    // ========================================================
    // PARTICLE CANVAS BACKGROUND (global)
    // ========================================================
    const canvas = document.getElementById('particle-canvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        let particles = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        class Particle {
            constructor() { this.reset(); }
            reset() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 1.5 + 0.5;
                this.speedX = (Math.random() - 0.5) * 0.35;
                this.speedY = (Math.random() - 0.5) * 0.35;
                this.opacity = Math.random() * 0.35 + 0.08;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;
                if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
                if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
            }
            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(14, 165, 233, ${this.opacity})`;
                ctx.fill();
            }
        }

        const count = Math.min(Math.floor((window.innerWidth * window.innerHeight) / 14000), 100);
        for (let i = 0; i < count; i++) particles.push(new Particle());

        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
                particles[i].draw();
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 140) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(14, 165, 233, ${0.06 * (1 - dist / 140)})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }
        animate();
    }

    // ========================================================
    // SCROLL REVEAL ANIMATIONS (global)
    // ========================================================
    const revealEls = document.querySelectorAll('.reveal');
    if (revealEls.length > 0) {
        const revealObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    revealObs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });
        revealEls.forEach(el => revealObs.observe(el));
    }
});
