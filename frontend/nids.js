/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: VISUAL NIDS LAB CONTROLLER
   Coordinates Cyber Dashboard, SVG Topology HUD, Ingest Ticker & Chart.js Reports
   ========================================================================== */

// Unified simulation stream containing benign traffic and attack anomalies
const combinedStream = [
    { srcIp: "192.168.0.9", srcPort: "51250", dstIp: "157.240.15.60", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51250", dstIp: "157.240.15.60", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "185.190.140.2", srcPort: "49202", dstIp: "192.168.0.10", dstPort: "80", protocol: "6", label: "DoS" },
    { srcIp: "185.190.140.2", srcPort: "49203", dstIp: "192.168.0.10", dstPort: "80", protocol: "6", label: "DoS" },
    { srcIp: "192.168.0.9", srcPort: "51273", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "172.16.0.1", srcPort: "53112", dstIp: "192.168.0.10", dstPort: "22", protocol: "6", label: "SSH-Patator" },
    { srcIp: "172.16.0.1", srcPort: "53114", dstIp: "192.168.0.10", dstPort: "22", protocol: "6", label: "SSH-Patator" },
    { srcIp: "192.168.0.9", srcPort: "51288", dstIp: "52.184.87.25", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "185.190.140.2", srcPort: "80", dstIp: "192.168.0.10", dstPort: "80", protocol: "6", label: "Web Attack" },
    { srcIp: "185.190.140.2", srcPort: "34822", dstIp: "192.168.0.10", dstPort: "135", protocol: "6", label: "PortScan" },
    { srcIp: "185.190.140.2", srcPort: "34823", dstIp: "192.168.0.10", dstPort: "137", protocol: "17", label: "PortScan" },
    { srcIp: "185.190.140.2", srcPort: "34824", dstIp: "192.168.0.10", dstPort: "139", protocol: "6", label: "PortScan" },
    { srcIp: "192.168.0.9", srcPort: "5353", dstIp: "224.0.0.251", dstPort: "5353", protocol: "17", label: "BENIGN" },
    { srcIp: "172.16.0.1", srcPort: "60112", dstIp: "192.168.0.10", dstPort: "8080", protocol: "6", label: "Bot" },
    { srcIp: "172.16.0.1", srcPort: "60115", dstIp: "192.168.0.10", dstPort: "8080", protocol: "6", label: "Bot" },
    { srcIp: "185.190.140.2", srcPort: "58221", dstIp: "192.168.0.10", dstPort: "80", protocol: "6", label: "DDoS" },
    { srcIp: "185.190.140.2", srcPort: "58222", dstIp: "192.168.0.10", dstPort: "80", protocol: "6", label: "DDoS" },
    { srcIp: "192.168.0.9", srcPort: "51301", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" }
];

// Feature Importances and security definitions
const featureImportances = {
    xgb: [
        { name: "Flow Packets/s", val: 0.92, desc: "Rate at which packet frames are transmitted. Highly elevated rates are a hallmark signature of DDoS flooding campaigns." },
        { name: "SYN Flag Count", val: 0.85, desc: "Counts TCP Synchronization handshake flags. Excessive SYN rates suggest a SYN Flood aiming to exhaust socket allocations." },
        { name: "Fwd Packet Length Max", val: 0.74, desc: "Maximum payload size of forward packets. Exceptionally large forward packets indicate resource exhaustion payloads (like DoS Hulk)." },
        { name: "Destination Port", val: 0.65, desc: "Specifies target services. Rapid probe iterations across port indices identify port scans or brute force mapping probes." },
        { name: "Flow Duration", val: 0.48, desc: "Total elapsed duration of the flow. Short duration spikes indicate automated scripts, whereas long connections reflect active shells." }
    ],
    rf: [
        { name: "SYN Flag Count", val: 0.88, desc: "Counts TCP Synchronization handshake flags. Excessive SYN rates suggest a SYN Flood aiming to exhaust socket allocations." },
        { name: "Flow Packets/s", val: 0.80, desc: "Rate at which packet frames are transmitted. Highly elevated rates are a hallmark signature of DDoS flooding campaigns." },
        { name: "Destination Port", val: 0.76, desc: "Specifies target services. Rapid probe iterations across port indices identify port scans or brute force mapping probes." },
        { name: "Fwd Packet Length Max", val: 0.68, desc: "Maximum payload size of forward packets. Exceptionally large forward packets indicate resource exhaustion payloads (like DoS Hulk)." },
        { name: "Flow Duration", val: 0.55, desc: "Total elapsed duration of the flow. Short duration spikes indicate automated scripts, whereas long connections reflect active shells." }
    ],
    et: [
        { name: "Destination Port", val: 0.84, desc: "Specifies target services. Rapid probe iterations across port indices identify port scans or brute force mapping probes." },
        { name: "SYN Flag Count", val: 0.78, desc: "Counts TCP Synchronization handshake flags. Excessive SYN rates suggest a SYN Flood aiming to exhaust socket allocations." },
        { name: "Fwd Packet Length Max", val: 0.70, desc: "Maximum payload size of forward packets. Exceptionally large forward packets indicate resource exhaustion payloads (like DoS Hulk)." },
        { name: "Flow Packets/s", val: 0.64, desc: "Rate at which packet frames are transmitted. Highly elevated rates are a hallmark signature of DDoS flooding campaigns." },
        { name: "Flow Duration", val: 0.60, desc: "Total elapsed duration of the flow. Short duration spikes indicate automated scripts, whereas long connections reflect active shells." }
    ]
};

let processIndex = 0;
let processInterval = null;
let currentDistribution = {};
let isProcessing = false;
let myPieChart = null;

// Network Topology Particle Flow
let particlesList = [];
let topologyInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    // Model Select Tab bindings
    const modelButtons = document.querySelectorAll(".model-tab-btn");
    modelButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            modelButtons.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderFeatureImportance(btn.dataset.model);
        });
    });

    // Checkbox configuration listeners
    const checks = ["check-xgb", "check-rf", "check-et"];
    checks.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", updateEnsembleMetrics);
    });

    // Ingest Control Buttons
    const btnStart = document.getElementById("t-menu-start");
    const btnStop = document.getElementById("t-menu-stop");
    const btnReport = document.getElementById("t-menu-report");

    if (btnStart) btnStart.addEventListener("click", startDetection);
    if (btnStop) btnStop.addEventListener("click", stopDetection);
    if (btnReport) btnReport.addEventListener("click", openReportWindow);

    // Close Report Modal
    const btnCloseModal = document.getElementById("close-modal-btn");
    if (btnCloseModal) {
        btnCloseModal.addEventListener("click", () => {
            document.getElementById("report-modal-overlay").style.display = "none";
        });
    }

    // Initial renders
    resetTerminal();
    updateEnsembleMetrics();
    renderFeatureImportance("xgb");
    initTopologyLoop();
});

/* ==========================================================================
   TERMINAL DISPLAY CONTROLS
   ========================================================================== */
function logToTerminal(text) {
    const term = document.getElementById("nids-terminal");
    if (term) {
        term.innerText += text;
        term.scrollTop = term.scrollHeight;
    }
}

function resetTerminal() {
    const term = document.getElementById("nids-terminal");
    if (term) {
        term.innerText = "\n {:<18}   {:<18}   {:<18}   {:<18}   {:<18}\n".replace(/{:<18}/g, "                 ")
            .replace("                 ", "Source IP")
            .replace("                 ", "Source Port")
            .replace("                 ", "Destination IP")
            .replace("                 ", "Destination Port")
            .replace("                 ", "Label");
        term.innerText += "------------------------------------------------------------------------------------\n";
    }
    
    // Clear alerts ticker
    const ticker = document.getElementById("nids-threat-ticker");
    if (ticker) {
        ticker.innerHTML = `<div class="ticker-line" style="color: var(--text-muted);"><i class="fa-solid fa-circle-info"></i> Waiting to begin network flow analysis...</div>`;
    }
}

function pushAlert(type, srcIp, dstPort) {
    const ticker = document.getElementById("nids-threat-ticker");
    if (ticker) {
        if (ticker.innerHTML.includes("Waiting to begin")) {
            ticker.innerHTML = "";
        }
        ticker.innerHTML += `
            <div class="ticker-line">
                <i class="fa-solid fa-triangle-exclamation"></i>
                [ALERT] Src: ${srcIp} ➔ Dest Port: ${dstPort} | Intrusion signature '${type}' detected!
            </div>
        `;
        ticker.scrollTop = ticker.scrollHeight;
    }
}

/* ==========================================================================
   DETECTION PROCESS LOOP
   ========================================================================== */
function startDetection() {
    if (isProcessing) return;

    document.getElementById("t-menu-start").classList.add("active");
    document.getElementById("t-menu-stop").classList.remove("active");

    isProcessing = true;
    processIndex = 0;
    currentDistribution = { "No Intrusion": 0 };
    resetTerminal();
    
    logToTerminal(`[System Ingestion] Initializing real-time traffic stream listener...\n`);
    processInterval = setInterval(processNextRecord, 250);
}

function processNextRecord() {
    if (processIndex >= combinedStream.length) {
        clearInterval(processInterval);
        isProcessing = false;
        document.getElementById("t-menu-start").classList.remove("active");
        logToTerminal(`\n[Process completed] Total flows analyzed: ${combinedStream.length}. Ready for Report.\n`);
        return;
    }

    const row = combinedStream[processIndex];
    let k = row.label;
    if (k === "BENIGN") {
        k = "No Intrusion";
    }

    // Increment metrics
    currentDistribution[k] = (currentDistribution[k] || 0) + 1;

    // Output to emulator
    const formatLine = (ip1, p1, ip2, p2, lbl) => {
        return ` ${ip1.padEnd(17)}   ${p1.padEnd(17)}   ${ip2.padEnd(17)}   ${p2.padEnd(17)}   ${lbl}\n`;
    };

    const outLine = formatLine(row.srcIp, row.srcPort, row.dstIp, row.dstPort, k);
    logToTerminal(outLine);

    // Dynamic topology packet flows
    spawnTopologyPacket(row.label);

    // Non-blocking alert logs
    if (k !== "No Intrusion") {
        pushAlert(k, row.srcIp, row.dstPort);
        triggerNodeHighlights(true);
    } else {
        triggerNodeHighlights(false);
    }

    processIndex++;
}

function stopDetection() {
    clearInterval(processInterval);
    isProcessing = false;
    document.getElementById("t-menu-start").classList.remove("active");
    document.getElementById("t-menu-stop").classList.add("active");
    logToTerminal(`\n[Process stopped by user]\n`);
    setTimeout(() => {
        document.getElementById("t-menu-stop").classList.remove("active");
    }, 500);
}

/* ==========================================================================
   INTERACTIVE SVGs FEATURE CHART RENDER
   ========================================================================== */
function renderFeatureImportance(model) {
    const container = document.getElementById("feature-importance-bars");
    if (!container) return;

    container.innerHTML = "";
    const list = featureImportances[model];
    
    list.forEach(f => {
        const percent = Math.round(f.val * 100);
        
        const row = document.createElement("div");
        row.className = "feature-bar-row";
        row.innerHTML = `
            <span class="feature-lbl">${f.name}</span>
            <div class="feature-track">
                <div class="feature-fill" style="width: ${percent}%;"></div>
            </div>
            <span class="feature-val">${f.val.toFixed(2)}</span>
        `;
        
        row.addEventListener("click", () => {
            const explainer = document.getElementById("feature-explainer");
            if (explainer) {
                explainer.innerHTML = `<strong>${f.name}</strong>: ${f.desc}`;
            }
        });

        container.appendChild(row);
    });

    // Seed initial explainer with first feature
    const explainer = document.getElementById("feature-explainer");
    if (explainer && list.length > 0) {
        explainer.innerHTML = `<strong>${list[0].name}</strong>: ${list[0].desc}`;
    }
}

/* ==========================================================================
   SVG TOPOLOGY PACKET ANIMATIONS
   ========================================================================== */
function initTopologyLoop() {
    if (topologyInterval) clearInterval(topologyInterval);
    topologyInterval = setInterval(animateTopologyParticles, 35);
}

function spawnTopologyPacket(label) {
    const isAttack = label !== "BENIGN";
    const startY = isAttack ? 40 : 120;
    particlesList.push({
        x: 60,
        y: startY,
        progress: 0,
        isAttack: isAttack,
        speed: 0.02 + Math.random() * 0.015
    });
}

function animateTopologyParticles() {
    const particleGroup = document.getElementById("topology-flow-particles");
    if (!particleGroup) return;

    particlesList.forEach(p => {
        p.progress += p.speed;
        
        if (p.progress <= 0.3) {
            const t = p.progress / 0.3;
            p.x = 60 + (200 - 60) * t;
            const startY = p.isAttack ? 40 : 120;
            p.y = startY + (80 - startY) * t;
        } else if (p.progress <= 0.5) {
            const t = (p.progress - 0.3) / 0.2;
            p.x = 200 + (300 - 200) * t;
            p.y = 80;
        } else if (p.progress <= 0.7) {
            const t = (p.progress - 0.5) / 0.2;
            p.x = 300 + (400 - 300) * t;
            p.y = 80;
        } else {
            const t = (p.progress - 0.7) / 0.3;
            p.x = 400 + (540 - 400) * t;
            p.y = 80;
        }
    });

    particlesList = particlesList.filter(p => p.progress < 1.0);

    particleGroup.innerHTML = particlesList.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="${p.isAttack ? 2.5 : 2}" 
                fill="${p.isAttack ? '#ef4444' : '#10b981'}" 
                filter="drop-shadow(0 0 3px ${p.isAttack ? '#ef4444' : '#10b981'})"></circle>
    `).join("");
}

function triggerNodeHighlights(isAttack) {
    const idsNode = document.getElementById("node-ids");
    const fwNode = document.getElementById("node-firewall");
    const serverNode = document.getElementById("node-server");
    const ringIds = document.getElementById("ring-ids");
    const ringFw = document.getElementById("ring-fw");
    const ringSrv = document.getElementById("ring-srv");

    if (isAttack) {
        if (idsNode) idsNode.setAttribute("stroke", "#ef4444");
        if (fwNode) fwNode.setAttribute("stroke", "#ef4444");
        if (serverNode) serverNode.setAttribute("stroke", "#ef4444");
        if (ringIds) ringIds.style.display = "block";
        if (ringFw) ringFw.style.display = "block";
        if (ringSrv) ringSrv.style.display = "block";
    } else {
        if (idsNode) idsNode.setAttribute("stroke", "#8b5cf6");
        if (fwNode) fwNode.setAttribute("stroke", "#f59e0b");
        if (serverNode) serverNode.setAttribute("stroke", "#0ea5e9");
        if (ringIds) ringIds.style.display = "none";
        if (ringFw) ringFw.style.display = "none";
        if (ringSrv) ringSrv.style.display = "none";
    }
}

/* ==========================================================================
   REPORT CANVAS POPUP (MATPLOTLIB PIE CHART)
   ========================================================================== */
function openReportWindow() {
    if (Object.keys(currentDistribution).length <= 1 && currentDistribution["No Intrusion"] === 0) {
        alert("No traffic logs analyzed yet. Please click 'Start Ingestion Stream' first!");
        return;
    }

    const modal = document.getElementById("report-modal-overlay");
    if (modal) {
        modal.style.display = "flex";
        renderReportPieChart();
    }
}

function renderReportPieChart() {
    const canvas = document.getElementById("reportPieChart");
    if (!canvas) return;

    const labels = Object.keys(currentDistribution);
    const data = Object.values(currentDistribution);

    // Sum of intruders
    let s = 0;
    labels.forEach(k => {
        if (k !== "No Intrusion") s += currentDistribution[k];
    });
    const benignCount = currentDistribution["No Intrusion"] || 0;

    const textEl = document.getElementById("report-summary-text");
    if (textEl) {
        textEl.innerHTML = `
            <h3>Report Analytics</h3>
            <p><strong>Intrusion Incidents:</strong> ${s}</p>
            <p><strong>Benign Flow Count:</strong> ${benignCount}</p>
            <p><strong>Total Inspected Packets:</strong> ${s + benignCount}</p>
            <p style="color: var(--text-muted); font-size: 0.72rem; font-family: monospace; margin-top: 1rem;">CICIDS2017 Ensemble Pipeline</p>
        `;
    }

    if (myPieChart) {
        myPieChart.destroy();
    }

    myPieChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#0ea5e9', // Benign Blue
                    '#ef4444', // Red
                    '#f59e0b', // Yellow
                    '#10b981', // Green
                    '#8b5cf6', // Purple
                    '#6366f1'  // Indigo
                ],
                borderWidth: 1,
                borderColor: '#1e293b'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#cbd5e1',
                        font: {
                            family: 'monospace',
                            size: 10
                        }
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   ENSEMBLE ENSEMBLE CLASSIFIERS METRICS MATH
   ========================================================================== */
function updateEnsembleMetrics() {
    const xgb = document.getElementById("check-xgb").checked;
    const rf = document.getElementById("check-rf").checked;
    const et = document.getElementById("check-et").checked;

    let acc = "0.00%";
    let prec = "0.00";
    let rec = "0.00";
    let f1 = "0.00";

    if (xgb && rf && et) {
        acc = "99.89%";
        prec = "0.99";
        rec = "0.99";
        f1 = "0.99";
    } else if (xgb && rf && !et) {
        acc = "99.89%";
        prec = "0.99";
        rec = "0.99";
        f1 = "0.99";
    } else if (xgb && !rf && et) {
        acc = "99.83%";
        prec = "0.99";
        rec = "0.99";
        f1 = "0.99";
    } else if (!xgb && rf && et) {
        acc = "99.83%";
        prec = "0.99";
        rec = "0.99";
        f1 = "0.99";
    } else if (xgb && !rf && !et) {
        acc = "99.91%";
        prec = "1.00";
        rec = "1.00";
        f1 = "1.00";
    } else if (!xgb && rf && !et) {
        acc = "99.89%";
        prec = "1.00";
        rec = "1.00";
        f1 = "1.00";
    } else if (!xgb && !rf && et) {
        acc = "99.81%";
        prec = "0.99";
        rec = "0.98";
        f1 = "0.99";
    }

    document.getElementById("ens-acc").innerText = acc;
    document.getElementById("ens-prec").innerText = prec;
    document.getElementById("ens-rec").innerText = rec;
    document.getElementById("ens-f1").innerText = f1;
}
