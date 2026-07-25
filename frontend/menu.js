/* ============================================================
   SHARED EFFECTS ENGINE — Particle Canvas + Scroll Reveal
   Loaded on every page via menu.js-adjacent script tag
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
    const toggleBtn = document.getElementById("menu-toggle-btn");
    const navLinks = document.querySelector(".nav-links");
    if (toggleBtn && navLinks) {
        // Create a body-level mobile drawer overlay (outside .main-header stacking context)
        let mobileDrawer = document.getElementById("mobile-nav-drawer");
        if (!mobileDrawer) {
            mobileDrawer = document.createElement("div");
            mobileDrawer.id = "mobile-nav-drawer";
            // Clone all nav links into the drawer
            navLinks.querySelectorAll("a").forEach(link => {
                const clone = link.cloneNode(true);
                clone.addEventListener("click", closeDrawer);
                mobileDrawer.appendChild(clone);
            });
            document.body.appendChild(mobileDrawer);
        }

        function openDrawer() {
            mobileDrawer.classList.add("active");
            document.body.classList.add("nav-open");
            const icon = toggleBtn.querySelector("i");
            if (icon) icon.className = "fa-solid fa-xmark";
        }

        function closeDrawer() {
            mobileDrawer.classList.remove("active");
            document.body.classList.remove("nav-open");
            const icon = toggleBtn.querySelector("i");
            if (icon) icon.className = "fa-solid fa-bars";
        }

        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            if (mobileDrawer.classList.contains("active")) {
                closeDrawer();
            } else {
                openDrawer();
            }
        });

        // Close menu when clicking outside
        document.addEventListener("click", (e) => {
            if (mobileDrawer.classList.contains("active") && !mobileDrawer.contains(e.target) && !toggleBtn.contains(e.target)) {
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
