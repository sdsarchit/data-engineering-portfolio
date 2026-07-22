/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: VISUAL NIDS LAB CONTROLLER
   Simulates Tkinter GUI, Matplotlib reporting canvas, and Ensemble Classifiers
   ========================================================================== */

// Real data points from interface_1.csv
const interface1Data = [
    { srcIp: "192.168.0.9", srcPort: "51250", dstIp: "157.240.15.60", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51250", dstIp: "157.240.15.60", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51273", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51287", dstIp: "34.232.97.135", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51288", dstIp: "52.184.87.25", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "52.184.87.25", srcPort: "443", dstIp: "192.168.0.9", dstPort: "51288", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51289", dstIp: "52.170.57.27", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "8.6.0.1", srcPort: "0", dstIp: "8.0.6.4", dstPort: "0", protocol: "0", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51294", dstIp: "52.98.56.210", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51203", dstIp: "20.198.162.78", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "52681", dstIp: "142.250.196.46", dstPort: "443", protocol: "17", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "5353", dstIp: "224.0.0.251", dstPort: "5353", protocol: "17", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51280", dstIp: "157.240.15.60", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51302", dstIp: "13.107.4.52", dstPort: "80", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51290", dstIp: "142.250.71.46", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51297", dstIp: "142.250.182.74", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51300", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51296", dstIp: "142.250.195.170", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51286", dstIp: "13.35.238.213", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.9", srcPort: "51301", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" }
];

// Mock data including various network attack intrusion vectors
const attackData = [
    { srcIp: "192.168.0.9", srcPort: "51250", dstIp: "157.240.15.60", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "192.168.0.12", srcPort: "49202", dstIp: "192.168.0.1", dstPort: "80", protocol: "6", label: "DoS" },
    { srcIp: "192.168.0.12", srcPort: "49203", dstIp: "192.168.0.1", dstPort: "80", protocol: "6", label: "DoS" },
    { srcIp: "192.168.0.9", srcPort: "51273", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "172.16.0.1", srcPort: "53112", dstIp: "192.168.0.10", dstPort: "22", protocol: "6", label: "SSH-Patator" },
    { srcIp: "172.16.0.1", srcPort: "53114", dstIp: "192.168.0.10", dstPort: "22", protocol: "6", label: "SSH-Patator" },
    { srcIp: "192.168.0.9", srcPort: "51288", dstIp: "52.184.87.25", dstPort: "443", protocol: "6", label: "BENIGN" },
    { srcIp: "10.0.0.15", srcPort: "80", dstIp: "192.168.0.10", dstPort: "80", protocol: "6", label: "Web Attack" },
    { srcIp: "185.190.140.2", srcPort: "34822", dstIp: "192.168.0.5", dstPort: "135", protocol: "6", label: "PortScan" },
    { srcIp: "185.190.140.2", srcPort: "34823", dstIp: "192.168.0.5", dstPort: "137", protocol: "17", label: "PortScan" },
    { srcIp: "185.190.140.2", srcPort: "34824", dstIp: "192.168.0.5", dstPort: "139", protocol: "6", label: "PortScan" },
    { srcIp: "185.190.140.2", srcPort: "34825", dstIp: "192.168.0.5", dstPort: "445", protocol: "6", label: "PortScan" },
    { srcIp: "192.168.0.9", srcPort: "5353", dstIp: "224.0.0.251", dstPort: "5353", protocol: "17", label: "BENIGN" },
    { srcIp: "203.0.113.5", srcPort: "60112", dstIp: "192.168.0.8", dstPort: "8080", protocol: "6", label: "Bot" },
    { srcIp: "203.0.113.5", srcPort: "60115", dstIp: "192.168.0.8", dstPort: "8080", protocol: "6", label: "Bot" },
    { srcIp: "192.168.0.15", srcPort: "58221", dstIp: "192.168.0.1", dstPort: "80", protocol: "6", label: "DDoS" },
    { srcIp: "192.168.0.16", srcPort: "58222", dstIp: "192.168.0.1", dstPort: "80", protocol: "6", label: "DDoS" },
    { srcIp: "192.168.0.17", srcPort: "58223", dstIp: "192.168.0.1", dstPort: "80", protocol: "6", label: "DDoS" },
    { srcIp: "192.168.0.9", srcPort: "51301", dstIp: "142.250.195.131", dstPort: "443", protocol: "6", label: "BENIGN" }
];

let selectedDataset = [];
let processIndex = 0;
let processInterval = null;
let currentDistribution = {};
let isProcessing = false;
let myPieChart = null;

document.addEventListener("DOMContentLoaded", () => {
    // Checkbox configuration listeners
    const checks = ["check-xgb", "check-rf", "check-et"];
    checks.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", updateEnsembleMetrics);
    });

    // Menu Buttons Wire-up
    const btnStart = document.getElementById("t-menu-start");
    const btnStop = document.getElementById("t-menu-stop");
    const btnTest = document.getElementById("t-menu-test");
    const btnReport = document.getElementById("t-menu-report");
    const btnBrowse = document.getElementById("nids-browse-btn");
    const datasetSelect = document.getElementById("nids-dataset-select");

    if (btnStart) btnStart.addEventListener("click", startDetection);
    if (btnStop) btnStop.addEventListener("click", stopDetection);
    if (btnTest) btnTest.addEventListener("click", runTestMode);
    if (btnReport) btnReport.addEventListener("click", openReportWindow);
    if (btnBrowse) btnBrowse.addEventListener("click", () => datasetSelect.focus());

    datasetSelect.addEventListener("change", () => {
        const val = datasetSelect.value;
        if (val === "interface_1.csv") {
            selectedDataset = [...interface1Data];
            logToTerminal(`Selected file: D:\\Desktop_backup\\files\\interface_1.csv loaded successfully.\nReady to run.\n`);
        } else if (val === "sample_attacks.csv") {
            selectedDataset = [...attackData];
            logToTerminal(`Selected file: sample_attacks.csv (Simulated Attack Stream) loaded successfully.\nReady to run.\n`);
        }
    });

    // OK button on warning alert popup
    const btnAlertOk = document.getElementById("nids-alert-ok");
    if (btnAlertOk) {
        btnAlertOk.addEventListener("click", () => {
            document.getElementById("nids-alert").style.display = "none";
            // Resume detection processing loop
            resumeDetectionLoop();
        });
    }

    // Close Report Modal
    const btnCloseReport = document.getElementById("close-report-btn");
    if (btnCloseReport) {
        btnCloseReport.addEventListener("click", () => {
            document.getElementById("nids-report-window").style.display = "none";
        });
    }

    // Initial terminal reset
    resetTerminal();
    updateEnsembleMetrics();
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
        term.innerText = "\n {:<18}   {:<18}   {:<18}   {:<18}   {:<18}\n".replace(/{:<18}/g, "                  ")
            .replace("                  ", "Source IP")
            .replace("                  ", "Source Port")
            .replace("                  ", "Destination IP")
            .replace("                  ", "Destination Port")
            .replace("                  ", "Label");
        term.innerText += "---------------------------------------------------------------------------------------\n";
    }
}

/* ==========================================================================
   DETECTION ORCHESTRATOR
   ========================================================================== */
function startDetection() {
    if (isProcessing) return;
    if (selectedDataset.length === 0) {
        alert("No file selected. Please select a file from the dropdown first!");
        return;
    }

    // Toggle menu highlight state
    document.getElementById("t-menu-start").classList.add("active");
    document.getElementById("t-menu-stop").classList.remove("active");

    isProcessing = true;
    processIndex = 0;
    currentDistribution = { "No Intrusion": 0 };
    resetTerminal();
    
    resumeDetectionLoop();
}

function resumeDetectionLoop() {
    if (!isProcessing) return;
    processInterval = setInterval(processNextRecord, 250);
}

function processNextRecord() {
    if (processIndex >= selectedDataset.length) {
        clearInterval(processInterval);
        isProcessing = false;
        document.getElementById("t-menu-start").classList.remove("active");
        logToTerminal(`\n[Process completed] Total flows analyzed: ${selectedDataset.length}. Ready for Report.\n`);
        return;
    }

    const row = selectedDataset[processIndex];
    let k = row.label;
    if (k === "BENIGN") {
        k = "No Intrusion";
    }

    // Increment distribution metrics
    currentDistribution[k] = (currentDistribution[k] || 0) + 1;

    // Output line
    const formatLine = (ip1, p1, ip2, p2, lbl) => {
        return ` ${ip1.padEnd(18)}   ${p1.padEnd(18)}   ${ip2.padEnd(18)}   ${p2.padEnd(18)}   ${lbl}\n`;
    };

    const outLine = formatLine(row.srcIp, row.srcPort, row.dstIp, row.dstPort, k);
    logToTerminal(outLine);

    processIndex++;

    // If an intrusion attack is detected, pause and trigger Tkinter pop-up
    if (k !== "No Intrusion") {
        clearInterval(processInterval);
        showIntrusionAlert(k);
    }
}

function showIntrusionAlert(type) {
    const modal = document.getElementById("nids-alert");
    const msg = document.getElementById("nids-alert-message");
    if (modal && msg) {
        msg.innerText = `Intrusion Of Type '${type}' Detected!`;
        modal.style.display = "flex";
    }
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

function runTestMode() {
    selectedDataset = [...interface1Data];
    document.getElementById("nids-dataset-select").value = "interface_1.csv";
    logToTerminal(`\n[Test Mode] Loading local dataset: data.csv (interface_1.csv)\n`);
    startDetection();
}

/* ==========================================================================
   MATPLOTLIB PIE CHART REPORT MODULE
   ========================================================================== */
function openReportWindow() {
    if (Object.keys(currentDistribution).length <= 1 && currentDistribution["No Intrusion"] === 0) {
        alert("No detection report data available. Please select a CSV and run the detector first!");
        return;
    }

    const reportWin = document.getElementById("nids-report-window");
    if (reportWin) {
        reportWin.style.display = "flex";
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

    // Update Summary Texts (matches ax2.text details from Section 7.5)
    const summaryTextEl = document.getElementById("report-summary-text");
    if (summaryTextEl) {
        summaryTextEl.innerHTML = `
            <h3>Matplotlib Analytics</h3>
            <p><strong>Number of Intruders:</strong> ${s}</p>
            <p><strong>Number of Non-Intruders:</strong> ${benignCount}</p>
            <p><strong>Total Scanned Flows:</strong> ${s + benignCount}</p>
            <p style="color: var(--text-muted); font-size: 0.75rem; margin-top: 1rem;">CICIDS2017 Ensemble Pipeline</p>
        `;
    }

    if (myPieChart) {
        myPieChart.destroy();
    }

    // Chart.js matches tkinter pie distribution colors
    myPieChart = new Chart(canvas, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3b82f6', // Benign Blue
                    '#ef4444', // Red
                    '#f59e0b', // Yellow
                    '#10b981', // Green
                    '#8b5cf6', // Purple
                    '#f97316'  // Orange
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
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

/* ==========================================================================
   ENSEMBLE MODEL COMBINATOR MATH
   ========================================================================== */
function updateEnsembleMetrics() {
    const xgb = document.getElementById("check-xgb").checked;
    const rf = document.getElementById("check-rf").checked;
    const et = document.getElementById("check-et").checked;

    let acc = "0.00%";
    let prec = "0.00";
    let rec = "0.00";
    let f1 = "0.00";

    // Matching Section 7.2 and 7.3 Ensemble outcomes exactly:
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

    // Update frontend
    document.getElementById("ens-acc").innerText = acc;
    document.getElementById("ens-prec").innerText = prec;
    document.getElementById("ens-rec").innerText = rec;
    document.getElementById("ens-f1").innerText = f1;
}
