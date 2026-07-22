/* ============================================================
   NIDS Security Lab — Premium Interactive Engine
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ========================================================
    // 1. ANIMATED PARTICLE CANVAS BACKGROUND
    // ========================================================
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animFrame;

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 1.5 + 0.5;
            this.speedX = (Math.random() - 0.5) * 0.4;
            this.speedY = (Math.random() - 0.5) * 0.4;
            this.opacity = Math.random() * 0.4 + 0.1;
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

    function initParticles() {
        const count = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 120);
        particles = [];
        for (let i = 0; i < count; i++) {
            particles.push(new Particle());
        }
    }
    initParticles();

    function drawLines() {
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(14, 165, 233, ${0.08 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animateParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        drawLines();
        animFrame = requestAnimationFrame(animateParticles);
    }
    animateParticles();


    // ========================================================
    // 2. SCROLL REVEAL ANIMATIONS
    // ========================================================
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');

                // Trigger pipeline node animations
                const pipeNodes = entry.target.querySelectorAll('.pipe-node');
                pipeNodes.forEach((node, i) => {
                    setTimeout(() => node.classList.add('visible'), i * 200);
                });

                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));


    // ========================================================
    // 3. HERO ACCURACY COUNTER ANIMATION
    // ========================================================
    function animateCounter(el, target, decimals, duration) {
        const start = performance.now();
        function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = eased * target;
            el.textContent = current.toFixed(decimals);
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // Start the hero counter when the hero becomes visible
    const heroObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const accEl = document.getElementById('hero-acc-counter');
                animateCounter(accEl, 99.89, 2, 2500);
                heroObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });
    heroObserver.observe(document.querySelector('.nids-hero'));


    // ========================================================
    // 4. CHART.JS — Accuracy Bar & Dataset Doughnut
    // ========================================================
    Chart.defaults.color = '#94a3b8';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    // Bar Chart
    new Chart(document.getElementById('accuracyChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['XGBoost', 'Random Forest', 'Extra Trees', 'Ensemble'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [99.91, 99.89, 99.81, 99.89],
                backgroundColor: [
                    'rgba(14, 165, 233, 0.7)',
                    'rgba(14, 165, 233, 0.7)',
                    'rgba(14, 165, 233, 0.7)',
                    'rgba(139, 92, 246, 0.8)'
                ],
                borderColor: ['#0ea5e9', '#0ea5e9', '#0ea5e9', '#8b5cf6'],
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 99.6, max: 100,
                    grid: { color: 'rgba(51, 65, 85, 0.3)' },
                    ticks: { callback: v => v.toFixed(1) + '%' }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.parsed.y.toFixed(2) + '% accuracy'
                    }
                }
            }
        }
    });

    // Doughnut Chart
    new Chart(document.getElementById('datasetChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Benign', 'DoS', 'PortScan', 'DDoS', 'Brute Force', 'Web Attack', 'Botnet', 'Infiltration'],
            datasets: [{
                data: [2273097, 252661, 158930, 128027, 13835, 2180, 1966, 36],
                backgroundColor: [
                    '#0ea5e9', '#eab308', '#f97316', '#ef4444',
                    '#8b5cf6', '#10b981', '#6366f1', '#94a3b8'
                ],
                borderWidth: 0,
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'right',
                    labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
                }
            }
        }
    });


    // ========================================================
    // 5. LIVE DETECTION SIMULATOR
    // ========================================================
    const combinedStream = [
        { srcIp: "192.168.0.9", srcPort: "51250", dstIp: "157.240.15.60", dstPort: "443", label: "BENIGN" },
        { srcIp: "192.168.0.9", srcPort: "51273", dstIp: "142.250.195.131", dstPort: "443", label: "BENIGN" },
        { srcIp: "185.190.140.2", srcPort: "49202", dstIp: "192.168.0.10", dstPort: "80", label: "DoS" },
        { srcIp: "185.190.140.2", srcPort: "49203", dstIp: "192.168.0.10", dstPort: "80", label: "DoS" },
        { srcIp: "192.168.0.9", srcPort: "51288", dstIp: "52.184.87.25", dstPort: "443", label: "BENIGN" },
        { srcIp: "172.16.0.1", srcPort: "53112", dstIp: "192.168.0.10", dstPort: "22", label: "SSH-Patator" },
        { srcIp: "172.16.0.1", srcPort: "53114", dstIp: "192.168.0.10", dstPort: "22", label: "SSH-Patator" },
        { srcIp: "192.168.0.9", srcPort: "5353", dstIp: "224.0.0.251", dstPort: "5353", label: "BENIGN" },
        { srcIp: "185.190.140.2", srcPort: "80", dstIp: "192.168.0.10", dstPort: "80", label: "Web Attack" },
        { srcIp: "185.190.140.2", srcPort: "34822", dstIp: "192.168.0.10", dstPort: "135", label: "PortScan" },
        { srcIp: "185.190.140.2", srcPort: "34823", dstIp: "192.168.0.10", dstPort: "137", label: "PortScan" },
        { srcIp: "185.190.140.2", srcPort: "34824", dstIp: "192.168.0.10", dstPort: "139", label: "PortScan" },
        { srcIp: "192.168.0.9", srcPort: "51294", dstIp: "52.98.56.210", dstPort: "443", label: "BENIGN" },
        { srcIp: "172.16.0.1", srcPort: "60112", dstIp: "192.168.0.10", dstPort: "8080", label: "Bot" },
        { srcIp: "172.16.0.1", srcPort: "60115", dstIp: "192.168.0.10", dstPort: "8080", label: "Bot" },
        { srcIp: "185.190.140.2", srcPort: "58221", dstIp: "192.168.0.10", dstPort: "80", label: "DDoS" },
        { srcIp: "185.190.140.2", srcPort: "58222", dstIp: "192.168.0.10", dstPort: "80", label: "DDoS" },
        { srcIp: "185.190.140.2", srcPort: "58223", dstIp: "192.168.0.10", dstPort: "80", label: "DDoS" },
        { srcIp: "192.168.0.9", srcPort: "51301", dstIp: "142.250.195.131", dstPort: "443", label: "BENIGN" },
        { srcIp: "192.168.0.9", srcPort: "51286", dstIp: "13.35.238.213", dstPort: "443", label: "BENIGN" }
    ];

    let streamInterval = null;
    let streamIdx = 0;
    let stats = { total: 0, benign: 0, threats: 0 };

    const feedEl = document.getElementById('terminal-feed');
    const threatLogEl = document.getElementById('threat-log');
    const elTotal = document.getElementById('stat-total');
    const elBenign = document.getElementById('stat-benign');
    const elThreats = document.getElementById('stat-threats');
    const elRate = document.getElementById('stat-rate');

    function updateStats() {
        elTotal.textContent = stats.total;
        elBenign.textContent = stats.benign;
        elThreats.textContent = stats.threats;
        elRate.textContent = stats.total > 0
            ? ((stats.threats / stats.total) * 100).toFixed(1) + '%'
            : '0.0%';
    }

    function pushPacket(pkt) {
        const isThreat = pkt.label !== 'BENIGN';
        stats.total++;
        if (isThreat) stats.threats++;
        else stats.benign++;
        updateStats();

        const row = document.createElement('div');
        row.className = `t-row${isThreat ? ' threat' : ''}`;
        row.innerHTML = `
            <span>${pkt.srcIp}:${pkt.srcPort}</span>
            <span class="t-arrow">→</span>
            <span>${pkt.dstIp}:${pkt.dstPort}</span>
            <span class="t-label">[${pkt.label}]</span>
        `;
        feedEl.appendChild(row);
        feedEl.scrollTop = feedEl.scrollHeight;

        if (isThreat) {
            const alert = document.createElement('div');
            alert.className = 'tf-line';
            alert.textContent = `⚠ ${pkt.srcIp} → :${pkt.dstPort} | ${pkt.label}`;
            threatLogEl.prepend(alert);
            if (threatLogEl.children.length > 20) {
                threatLogEl.removeChild(threatLogEl.lastChild);
            }
        }
    }

    function startStream() {
        if (streamInterval) return;
        const sysMsg = document.createElement('div');
        sysMsg.style.cssText = 'color:#475569; margin-bottom:4px;';
        sysMsg.textContent = '[SYSTEM] Stream connected — analyzing packets...';
        feedEl.appendChild(sysMsg);

        streamInterval = setInterval(() => {
            pushPacket(combinedStream[streamIdx]);
            streamIdx = (streamIdx + 1) % combinedStream.length;
        }, 280);
    }

    function stopStream() {
        if (streamInterval) {
            clearInterval(streamInterval);
            streamInterval = null;
            const sysMsg = document.createElement('div');
            sysMsg.style.cssText = 'color:#475569; margin-bottom:4px;';
            sysMsg.textContent = '[SYSTEM] Stream paused.';
            feedEl.appendChild(sysMsg);
            feedEl.scrollTop = feedEl.scrollHeight;
        }
    }

    // Auto-start after 2.5s
    setTimeout(startStream, 2500);

    document.getElementById('t-start').addEventListener('click', startStream);
    document.getElementById('t-stop').addEventListener('click', stopStream);


    // ========================================================
    // 6. REPORT MODAL
    // ========================================================
    const modal = document.getElementById('report-modal');
    let sessionChart = null;

    document.getElementById('t-report').addEventListener('click', () => {
        stopStream();
        modal.classList.add('active');

        const ctx2 = document.getElementById('sessionChart').getContext('2d');
        if (sessionChart) sessionChart.destroy();

        sessionChart = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: ['Benign Traffic', 'Threats Detected'],
                datasets: [{
                    data: [stats.benign, stats.threats],
                    backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(239, 68, 68, 0.8)'],
                    borderColor: ['#10b981', '#ef4444'],
                    borderWidth: 1,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 16, font: { size: 13 } } }
                }
            }
        });
    });

    document.getElementById('modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });


    // ========================================================
    // 7. FEATURE IMPORTANCE — Tabs + Click-to-Explain
    // ========================================================
    const featureImportances = {
        xgb: [
            { name: "Flow Packets/s", val: 0.92, desc: "Packet transmission rate — elevated rates signal DDoS flooding campaigns targeting bandwidth saturation." },
            { name: "SYN Flag Count", val: 0.85, desc: "TCP synchronization flag volume — excessive SYN flags indicate SYN Flood attacks attempting connection exhaustion." },
            { name: "Fwd Pkt Len Max", val: 0.74, desc: "Maximum forward packet length — oversized payloads suggest DoS resource exhaustion via buffer overflow attempts." },
            { name: "Destination Port", val: 0.65, desc: "Target service port — rapid port iteration reveals reconnaissance scans mapping the network's exposed services." },
            { name: "Flow Duration", val: 0.48, desc: "Total flow time — anomalously short bursts indicate automated bots, while prolonged sessions suggest active reverse shells." }
        ],
        rf: [
            { name: "SYN Flag Count", val: 0.88, desc: "TCP synchronization flag volume — Random Forest weights this highest for detecting SYN Flood patterns." },
            { name: "Flow Packets/s", val: 0.80, desc: "Packet transmission rate — RF correlates high throughput with volumetric DDoS attack signatures." },
            { name: "Destination Port", val: 0.76, desc: "Target service port — RF uses port distributions to distinguish legitimate traffic from scanning behavior." },
            { name: "Fwd Pkt Len Max", val: 0.68, desc: "Maximum forward packet length — RF identifies payload anomalies indicating exploitation attempts." },
            { name: "Flow Duration", val: 0.55, desc: "Total flow time — RF uses duration profiles to separate benign browsing from malicious command-and-control channels." }
        ],
        et: [
            { name: "Destination Port", val: 0.84, desc: "Target service port — Extra Trees ranks port-based features highest due to its randomized split strategy." },
            { name: "SYN Flag Count", val: 0.78, desc: "TCP synchronization flag volume — ET's ensemble of random splits catches SYN anomalies reliably." },
            { name: "Fwd Pkt Len Max", val: 0.70, desc: "Maximum forward packet length — ET excels at detecting unusual payload sizes across diverse attack vectors." },
            { name: "Flow Packets/s", val: 0.64, desc: "Packet transmission rate — ET correlates packet frequency with both DDoS and brute force attack campaigns." },
            { name: "Flow Duration", val: 0.60, desc: "Total flow time — ET's randomized thresholds are effective at profiling short-burst bot behavior." }
        ]
    };

    const featureBarsEl = document.getElementById('feature-bars');
    const tabBtns = document.querySelectorAll('.feat-tab');

    function renderFeatures(modelKey) {
        featureBarsEl.innerHTML = '';
        const features = featureImportances[modelKey];

        features.forEach((feat, i) => {
            const row = document.createElement('div');
            row.className = 'feat-row';
            row.innerHTML = `
                <div class="feat-row-header">
                    <span>${feat.name}</span>
                    <span>${feat.val.toFixed(2)}</span>
                </div>
                <div class="feat-bar-track">
                    <div class="feat-bar-fill" style="width: 0%;"></div>
                </div>
                <div class="feat-explain">${feat.desc}</div>
            `;
            row.addEventListener('click', () => row.classList.toggle('open'));
            featureBarsEl.appendChild(row);

            // Animate bar fill with staggered delay
            setTimeout(() => {
                row.querySelector('.feat-bar-fill').style.width = (feat.val * 100) + '%';
            }, 80 + i * 120);
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderFeatures(btn.getAttribute('data-model'));
        });
    });

    renderFeatures('xgb');


    // ========================================================
    // 8. ENSEMBLE METRICS — Checkbox Configuration
    // ========================================================
    const chkXgb = document.getElementById('check-xgb');
    const chkRf = document.getElementById('check-rf');
    const chkEt = document.getElementById('check-et');
    const mAcc = document.getElementById('ens-acc');
    const mPrec = document.getElementById('ens-prec');
    const mRec = document.getElementById('ens-rec');
    const mF1 = document.getElementById('ens-f1');

    function updateEnsembleMetrics() {
        const x = chkXgb.checked, r = chkRf.checked, e = chkEt.checked;
        let acc, prec, rec, f1;

        if (x && r && e)       { acc="99.89%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (x && r && !e) { acc="99.89%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (x && !r && e) { acc="99.83%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (!x && r && e) { acc="99.83%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (x && !r && !e){ acc="99.91%"; prec="1.00"; rec="1.00"; f1="1.00"; }
        else if (!x && r && !e){ acc="99.89%"; prec="1.00"; rec="1.00"; f1="1.00"; }
        else if (!x && !r && e){ acc="99.81%"; prec="0.99"; rec="0.98"; f1="0.99"; }
        else                   { acc="—";     prec="—";    rec="—";    f1="—";    }

        mAcc.textContent = acc;
        mPrec.textContent = prec;
        mRec.textContent = rec;
        mF1.textContent = f1;
    }

    [chkXgb, chkRf, chkEt].forEach(chk => {
        chk.addEventListener('change', updateEnsembleMetrics);
    });

});
