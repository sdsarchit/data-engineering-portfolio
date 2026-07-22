document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Intersection Observer for Scroll Animations ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Also trigger child animations if it's the pipeline section
                const pipelineSteps = entry.target.querySelectorAll('.pipeline-step');
                if (pipelineSteps.length > 0) {
                    pipelineSteps.forEach(step => step.classList.add('visible'));
                }
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fade-in-section').forEach(section => {
        observer.observe(section);
    });

    // --- 2. Chart.js Configurations ---
    Chart.defaults.color = '#cbd5e1';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";

    // Accuracy Bar Chart
    const ctxAcc = document.getElementById('accuracyChart').getContext('2d');
    new Chart(ctxAcc, {
        type: 'bar',
        data: {
            labels: ['XGBoost', 'Random Forest', 'Extra Trees', 'Ensemble Voting'],
            datasets: [{
                label: 'Accuracy (%)',
                data: [99.91, 99.89, 99.81, 99.89],
                backgroundColor: [
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(249, 115, 22, 0.9)' // Highlight ensemble
                ],
                borderColor: [
                    '#0ea5e9', '#0ea5e9', '#0ea5e9', '#f97316'
                ],
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: 99.5,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                x: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Dataset Doughnut Chart
    const ctxData = document.getElementById('datasetChart').getContext('2d');
    new Chart(ctxData, {
        type: 'doughnut',
        data: {
            labels: ['BENIGN', 'DoS', 'PortScan', 'DDoS', 'Brute Force', 'Web Attack', 'Botnet', 'Infiltration'],
            datasets: [{
                data: [2273097, 252661, 158930, 128027, 13835, 2180, 1966, 36],
                backgroundColor: [
                    '#0ea5e9', // BENIGN
                    '#eab308', // DoS
                    '#f97316', // PortScan
                    '#ef4444', // DDoS
                    '#8b5cf6', // Brute Force
                    '#10b981', // Web Attack
                    '#6366f1', // Botnet
                    '#94a3b8'  // Infiltration
                ],
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12 } }
            },
            cutout: '70%'
        }
    });

    // --- 3. Live Detection Simulator ---
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

    let streamInterval;
    let streamIndex = 0;
    
    // Stats tracking
    let stats = { total: 0, benign: 0, threats: 0 };
    
    const terminalOutput = document.getElementById('terminal-output');
    const threatLog = document.getElementById('threat-log');
    
    const elTotal = document.getElementById('stat-total');
    const elBenign = document.getElementById('stat-benign');
    const elThreats = document.getElementById('stat-threats');
    const elRate = document.getElementById('stat-rate');

    function updateStatsDisplay() {
        elTotal.textContent = stats.total;
        elBenign.textContent = stats.benign;
        elThreats.textContent = stats.threats;
        let rate = stats.total > 0 ? ((stats.threats / stats.total) * 100).toFixed(1) : "0.0";
        elRate.textContent = rate + "%";
    }

    function pushTerminalLine(packet) {
        const isThreat = packet.label !== "BENIGN";
        
        // Update counts
        stats.total++;
        if (isThreat) stats.threats++;
        else stats.benign++;
        updateStatsDisplay();

        // Terminal Line
        const line = document.createElement('div');
        line.className = `terminal-line ${isThreat ? 'attack' : ''}`;
        line.innerHTML = `
            <span>${packet.srcIp}:${packet.srcPort}</span>
            <span style="flex:0 0 20px; text-align:center;">→</span>
            <span>${packet.dstIp}:${packet.dstPort}</span>
            <span class="label">[${packet.label}]</span>
        `;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;

        // Threat Alert Log
        if (isThreat) {
            const alert = document.createElement('div');
            alert.className = 'alert-item';
            alert.textContent = `[ALERT] Src: ${packet.srcIp} → Port: ${packet.dstPort} | Signature: '${packet.label}'`;
            threatLog.prepend(alert);
            
            // keep log limited
            if (threatLog.children.length > 15) {
                threatLog.removeChild(threatLog.lastChild);
            }
        }
    }

    function startStream() {
        if (streamInterval) clearInterval(streamInterval);
        terminalOutput.innerHTML += '<div style="color:var(--text-muted);">[SYSTEM] Stream connected. Analyzing packets...</div>';
        
        streamInterval = setInterval(() => {
            pushTerminalLine(combinedStream[streamIndex]);
            streamIndex = (streamIndex + 1) % combinedStream.length;
        }, 250);
    }

    function stopStream() {
        if (streamInterval) clearInterval(streamInterval);
        streamInterval = null;
        terminalOutput.innerHTML += '<div style="color:var(--text-muted);">[SYSTEM] Stream paused.</div>';
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    // Auto-start after 2s delay
    setTimeout(() => {
        startStream();
    }, 2000);

    document.getElementById('t-menu-start').addEventListener('click', startStream);
    document.getElementById('t-menu-stop').addEventListener('click', stopStream);

    // --- 4. Report Modal ---
    const modalOverlay = document.getElementById('report-modal-overlay');
    let sessionChart = null;

    document.getElementById('t-menu-report').addEventListener('click', () => {
        stopStream();
        modalOverlay.classList.add('active');
        
        // Render pie chart for current session
        const ctxPie = document.getElementById('sessionReportChart').getContext('2d');
        
        if (sessionChart) sessionChart.destroy();
        
        sessionChart = new Chart(ctxPie, {
            type: 'pie',
            data: {
                labels: ['Benign Traffic', 'Identified Threats'],
                datasets: [{
                    data: [stats.benign, stats.threats],
                    backgroundColor: ['#10b981', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    });

    document.getElementById('close-modal-btn').addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    // Close on background click
    modalOverlay.addEventListener('click', (e) => {
        if(e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });

    // --- 5. Feature Importance Tabs ---
    const featureImportances = {
        xgb: [
            { name: "Flow Packets/s", val: 0.92, desc: "Packet transmission rate — elevated rates signal DDoS flooding campaigns." },
            { name: "SYN Flag Count", val: 0.85, desc: "TCP synchronization flag count — excessive SYN flags indicate SYN Flood attacks." },
            { name: "Fwd Pkt Len Max", val: 0.74, desc: "Maximum forward packet length — oversized payloads suggest DoS resource exhaustion." },
            { name: "Destination Port", val: 0.65, desc: "Target service port — rapid port iteration reveals reconnaissance scans." },
            { name: "Flow Duration", val: 0.48, desc: "Total flow time — short bursts indicate bots, long sessions suggest active shells." }
        ],
        rf: [
            { name: "SYN Flag Count", val: 0.88, desc: "TCP synchronization flag count — excessive SYN flags indicate SYN Flood attacks." },
            { name: "Flow Packets/s", val: 0.80, desc: "Packet transmission rate — elevated rates signal DDoS flooding campaigns." },
            { name: "Destination Port", val: 0.76, desc: "Target service port — rapid port iteration reveals reconnaissance scans." },
            { name: "Fwd Pkt Len Max", val: 0.68, desc: "Maximum forward packet length — oversized payloads suggest DoS resource exhaustion." },
            { name: "Flow Duration", val: 0.55, desc: "Total flow time — short bursts indicate bots, long sessions suggest active shells." }
        ],
        et: [
            { name: "Destination Port", val: 0.84, desc: "Target service port — rapid port iteration reveals reconnaissance scans." },
            { name: "SYN Flag Count", val: 0.78, desc: "TCP synchronization flag count — excessive SYN flags indicate SYN Flood attacks." },
            { name: "Fwd Pkt Len Max", val: 0.70, desc: "Maximum forward packet length — oversized payloads suggest DoS resource exhaustion." },
            { name: "Flow Packets/s", val: 0.64, desc: "Packet transmission rate — elevated rates signal DDoS flooding campaigns." },
            { name: "Flow Duration", val: 0.60, desc: "Total flow time — short bursts indicate bots, long sessions suggest active shells." }
        ]
    };

    const featureBarsContainer = document.getElementById('feature-bars');
    const tabBtns = document.querySelectorAll('.tab-btn');

    function renderFeatures(modelKey) {
        featureBarsContainer.innerHTML = '';
        const features = featureImportances[modelKey];
        
        features.forEach(feat => {
            const el = document.createElement('div');
            el.className = 'feature-item';
            
            // Allow click to show desc
            el.addEventListener('click', () => {
                el.classList.toggle('active');
            });
            
            el.innerHTML = `
                <div class="feature-item-header">
                    <span>${feat.name}</span>
                    <span>${feat.val.toFixed(2)}</span>
                </div>
                <div class="feature-bar-bg">
                    <div class="feature-bar-fill" style="width: 0%;"></div>
                </div>
                <div class="feature-desc">${feat.desc}</div>
            `;
            featureBarsContainer.appendChild(el);
            
            // Trigger animation
            setTimeout(() => {
                el.querySelector('.feature-bar-fill').style.width = (feat.val * 100) + "%";
            }, 50);
        });
    }

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderFeatures(btn.getAttribute('data-model'));
        });
    });

    // Initialize first tab
    renderFeatures('xgb');


    // --- 6. Ensemble Metrics Checkboxes ---
    const chkXgb = document.getElementById('check-xgb');
    const chkRf = document.getElementById('check-rf');
    const chkEt = document.getElementById('check-et');
    
    const metricAcc = document.getElementById('ens-acc');
    const metricPrec = document.getElementById('ens-prec');
    const metricRec = document.getElementById('ens-rec');
    const metricF1 = document.getElementById('ens-f1');

    function updateEnsembleMetrics() {
        const x = chkXgb.checked;
        const r = chkRf.checked;
        const e = chkEt.checked;
        
        let acc, prec, rec, f1;

        if (x && r && e) { acc="99.89%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (x && r && !e) { acc="99.89%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (x && !r && e) { acc="99.83%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (!x && r && e) { acc="99.83%"; prec="0.99"; rec="0.99"; f1="0.99"; }
        else if (x && !r && !e) { acc="99.91%"; prec="1.00"; rec="1.00"; f1="1.00"; }
        else if (!x && r && !e) { acc="99.89%"; prec="1.00"; rec="1.00"; f1="1.00"; }
        else if (!x && !r && e) { acc="99.81%"; prec="0.99"; rec="0.98"; f1="0.99"; }
        else { acc="0.00%"; prec="0.00"; rec="0.00"; f1="0.00"; } // None selected

        metricAcc.textContent = acc;
        metricPrec.textContent = prec;
        metricRec.textContent = rec;
        metricF1.textContent = f1;
    }

    [chkXgb, chkRf, chkEt].forEach(chk => {
        chk.addEventListener('change', updateEnsembleMetrics);
    });

});
