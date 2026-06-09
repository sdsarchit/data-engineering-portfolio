/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO JAVASCRIPT
   Core Controller: Pipeline API Poller, Chart.js Integrations, Visual Flow State
   ========================================================================== */

const API_BASE = "http://127.0.0.1:5000/api";

// Main State Variables
let activeCityTab = "Castro Valley, CA";
let chartDataCache = null;
let timeSeriesChartInstance = null;
let aqiChartInstance = null;
let logPollingInterval = null;
let elapsedTimerInterval = null;
let executionStartTime = null;

document.addEventListener("DOMContentLoaded", () => {
    initScrollspy();
    fetchCurrentDashboardState();
    
    // Wire up Pipeline trigger button
    const runBtn = document.getElementById("btn-run-pipeline");
    if (runBtn) {
        runBtn.addEventListener("click", handleRunPipeline);
    }
});

/* ==========================================================================
   SCROLLSPY & NAVIGATION
   ========================================================================== */
function initScrollspy() {
    const sections = document.querySelectorAll("section[id]");
    const navLinks = document.querySelectorAll(".nav-link");

    window.addEventListener("scroll", () => {
        let currentSectionId = "";
        const scrollPosition = window.scrollY + 120; // offset for sticky header

        sections.forEach(sec => {
            const secTop = sec.offsetTop;
            const secHeight = sec.offsetHeight;
            if (scrollPosition >= secTop && scrollPosition < secTop + secHeight) {
                currentSectionId = sec.getAttribute("id");
            }
        });

        navLinks.forEach(link => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${currentSectionId}`) {
                link.classList.add("active");
            }
        });
    });
}

/* ==========================================================================
   LIVE PIPELINE & LOG EXECUTION (ASYNC API POLL)
   ========================================================================== */
async function handleRunPipeline() {
    const runBtn = document.getElementById("btn-run-pipeline");
    const consoleDot = document.getElementById("console-status-dot");
    const consoleTitle = document.getElementById("console-title");
    const consoleLogs = document.getElementById("console-logs");
    
    // Block double execution
    if (runBtn.classList.contains("disabled")) return;
    
    // UI state: running
    runBtn.classList.add("disabled");
    runBtn.disabled = true;
    consoleDot.className = "console-status-dot running";
    consoleTitle.innerText = "ETL Console: RUNNING";
    
    // Reset flow nodes UI
    resetFlowNodes();
    
    // Clear logs screen and prepare terminal
    consoleLogs.innerHTML = `<div class="log-line system">[Trigger] Requesting async ingestion pipeline execution on local backend...</div>`;
    
    executionStartTime = Date.now();
    startElapsedTimer();
    
    try {
        const response = await fetch(`${API_BASE}/pipeline/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        
        const data = await response.json();
        
        if (response.status === 200 || response.status === 202) {
            consoleLogs.innerHTML += `<div class="log-line success">[Backend] Ingestion job spawned (Thread ID: Async-Worker). Polling stdout logs...</div>`;
            
            // Start polling logs every 600ms
            logPollingInterval = setInterval(pollPipelineLogs, 600);
        } else {
            stopElapsedTimer();
            consoleLogs.innerHTML += `<div class="log-line error">[Abort] Failed to spawn background job: ${data.message}</div>`;
            resetTerminalUI("failed", "ETL Console: FAILED");
        }
    } catch (err) {
        stopElapsedTimer();
        consoleLogs.innerHTML += `<div class="log-line error">[Fatal Connection Error] Backend API offline. Please ensure local Flask server is running on http://127.0.0.1:5000.</div>`;
        resetTerminalUI("failed", "ETL Console: OFFLINE");
    }
}

// Timer clock for processing visualizer
function startElapsedTimer() {
    const timerText = document.getElementById("console-timer");
    clearInterval(elapsedTimerInterval);
    elapsedTimerInterval = setInterval(() => {
        const elapsed = ((Date.now() - executionStartTime) / 1000).toFixed(1);
        timerText.innerText = `${elapsed}s`;
    }, 100);
}

function stopElapsedTimer() {
    clearInterval(elapsedTimerInterval);
}

// Polls active output logs from Flask backend state
async function pollPipelineLogs() {
    const consoleLogs = document.getElementById("console-logs");
    const consoleTitle = document.getElementById("console-title");
    
    try {
        const response = await fetch(`${API_BASE}/pipeline/status`);
        const data = await response.json();
        
        // Output new lines to terminal screen
        const currentLinesCount = consoleLogs.querySelectorAll(".log-line").length;
        const newLogs = data.logs || [];
        
        if (newLogs.length > 0) {
            // Re-render log pane
            consoleLogs.innerHTML = "";
            newLogs.forEach(line => {
                let cssClass = "";
                if (line.includes("STAGE")) cssClass = "stage";
                else if (line.includes("Successfully") || line.includes("completed")) cssClass = "success";
                else if (line.includes("Error") || line.includes("FAILED")) cssClass = "error";
                else if (line.includes("Warning") || line.includes("Simulating") || line.includes("anomalies")) cssClass = "warning";
                
                consoleLogs.innerHTML += `<div class="log-line ${cssClass}">${line}</div>`;
            });
            
            // Auto scroll console
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
            
            // Dynamically manage visual flowchart highlights based on logs text!
            updateFlowChartAnimation(newLogs);
        }
        
        // Handle completed pipeline termination
        if (data.status === "COMPLETED" || data.status === "FAILED") {
            clearInterval(logPollingInterval);
            stopElapsedTimer();
            
            const stateClass = data.status.toLowerCase();
            resetTerminalUI(stateClass, `ETL Console: ${data.status}`);
            
            if (data.status === "COMPLETED") {
                // Flash entire flowchart nodes green
                completeFlowChartNodes();
                // Pull newly aggregated SQLite DB metrics to visual dashboard!
                await fetchCurrentDashboardState();
            } else {
                quarantineFlowChartNodes();
            }
        }
    } catch (err) {
        clearInterval(logPollingInterval);
        stopElapsedTimer();
        consoleLogs.innerHTML += `<div class="log-line error">[Error Polling] Connection lost to Flask API server.</div>`;
        resetTerminalUI("failed", "ETL Console: INTERRUPTED");
    }
}

function resetTerminalUI(dotClass, titleText) {
    const runBtn = document.getElementById("btn-run-pipeline");
    const consoleDot = document.getElementById("console-status-dot");
    const consoleTitle = document.getElementById("console-title");
    
    runBtn.classList.remove("disabled");
    runBtn.disabled = false;
    consoleDot.className = `console-status-dot ${dotClass}`;
    consoleTitle.innerText = titleText;
}

/* ==========================================================================
   DYNAMIC FLOWCHART ANIMAION CONTROLLER
   ========================================================================== */
function resetFlowNodes() {
    const steps = ["flow-extract", "flow-dq", "flow-transform", "flow-load"];
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "flow-step";
    });
}

function updateFlowChartAnimation(logs) {
    const extractNode = document.getElementById("flow-extract");
    const dqNode = document.getElementById("flow-dq");
    const transformNode = document.getElementById("flow-transform");
    const loadNode = document.getElementById("flow-load");
    
    // Simple state flags based on keyword detection in logs stdout
    let extracting = false;
    let extracted = false;
    let validation = false;
    let validated = false;
    let transforming = false;
    let transformed = false;
    let loading = false;
    
    logs.forEach(line => {
        if (line.includes("STAGE 1: EXTRACTION")) extracting = true;
        if (line.includes("STAGE 2: DATA QUALITY")) { extracted = true; validation = true; }
        if (line.includes("STAGE 3: TRANSFORMATION")) { validated = true; transforming = true; }
        if (line.includes("STAGE 4: LOADING")) { transformed = true; loading = true; }
    });
    
    if (extracting && !extracted) {
        extractNode.className = "flow-step processing";
    } else if (extracted && !validated) {
        extractNode.className = "flow-step completed";
        dqNode.className = "flow-step processing";
    } else if (validated && !transformed) {
        extractNode.className = "flow-step completed";
        dqNode.className = "flow-step completed quarantined"; // show anomaly detection yellow glow
        transformNode.className = "flow-step processing";
    } else if (transformed) {
        extractNode.className = "flow-step completed";
        dqNode.className = "flow-step completed quarantined";
        transformNode.className = "flow-step completed";
        loadNode.className = "flow-step processing";
    }
}

function completeFlowChartNodes() {
    const steps = ["flow-extract", "flow-dq", "flow-transform", "flow-load"];
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "flow-step completed";
    });
}

function quarantineFlowChartNodes() {
    const steps = ["flow-extract", "flow-dq", "flow-transform", "flow-load"];
    steps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.className = "flow-step quarantined";
    });
}

/* ==========================================================================
   METRICS & CHART.JS VISUAL DASHBOARD
   ========================================================================== */
async function fetchCurrentDashboardState() {
    try {
        const [statsRes, chartRes, quarantineRes] = await Promise.all([
            fetch(`${API_BASE}/dashboard/stats`),
            fetch(`${API_BASE}/dashboard/charts`),
            fetch(`${API_BASE}/dashboard/quarantine`)
        ]);
        
        if (statsRes.status !== 200 || chartRes.status !== 200 || quarantineRes.status !== 200) {
            return; // SQLite might not be seeded or pipeline never run
        }
        
        const stats = await statsRes.json();
        const charts = await chartRes.json();
        const quarantine = await quarantineRes.json();
        
        // Seed Quick System profile variable in hero section
        const heroStatus = document.getElementById("quick-pipeline-status");
        if (heroStatus) {
            heroStatus.innerText = stats.total_processed > 0 ? "DB_SEEDED_SUCCESS" : "READY_TO_RUN";
            heroStatus.className = stats.total_processed > 0 ? "t-variable text-green" : "t-variable text-cyan";
        }
        
        // If no records have been processed, keep visualizer clean
        if (stats.total_processed === 0 && stats.total_quarantined === 0) {
            return;
        }
        
        // Show Visual Dashboard panel
        document.getElementById("dashboard-results-container").style.display = "grid";
        
        // Populate KPIs
        document.getElementById("metric-processed").innerText = stats.total_processed.toLocaleString();
        document.getElementById("metric-quarantined").innerText = stats.total_quarantined.toLocaleString();
        document.getElementById("metric-health").innerText = `${stats.success_rate}%`;
        document.getElementById("metric-dbsize").innerText = `${stats.db_size_kb} KB`;
        
        // Pop quarantine count badge
        document.getElementById("quarantine-badge-count").innerText = `${stats.total_quarantined} Anomalies Blocked`;
        
        // Update Quarantine Table Row Logs
        populateQuarantineTable(quarantine);
        
        // Seed visual charts
        if (charts.series && Object.keys(charts.series).length > 0) {
            chartDataCache = charts.series;
            renderTimeSeriesChart();
            renderAqiBreakdownChart(charts.aqi_breakdown);
        }
    } catch (err) {
        console.warn("Backend local server offline or schema not seeded. Waiting on first manual user trigger.");
    }
}

// Generate the beautiful quarantine rows table
function populateQuarantineTable(records) {
    const tableBody = document.getElementById("quarantine-table-rows");
    tableBody.innerHTML = "";
    
    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No anomalies logged in SQLite quarantine table. Ingestion run is 100% compliant.</td></tr>`;
        return;
    }
    
    records.forEach(r => {
        // Parse time nicely
        const cleanTime = r.timestamp.replace("T", " ");
        tableBody.innerHTML += `
            <tr>
                <td><strong>${r.city}</strong></td>
                <td><i class="fa-regular fa-clock"></i> ${cleanTime}</td>
                <td><span class="label-failure"><i class="fa-solid fa-triangle-exclamation"></i> ${r.failure_reason}</span></td>
                <td><span class="payload-text" title="${escapeHtml(r.raw_payload)}">${escapeHtml(r.raw_payload)}</span></td>
            </tr>
        `;
    });
}

function escapeHtml(text) {
    if (!text) return "";
    return text
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

/* ==========================================================================
   CHART RENDERING CONFIG (HIGH END NEON VISUALS)
   ========================================================================== */
function renderTimeSeriesChart() {
    const cities = Object.keys(chartDataCache);
    const tabsContainer = document.getElementById("city-selector-tabs");
    
    // Generate tabs dynamically based on SQLite seed
    tabsContainer.innerHTML = "";
    cities.forEach(city => {
        const isActive = city === activeCityTab ? "active" : "";
        tabsContainer.innerHTML += `<button class="city-tab ${isActive}" onclick="switchCityTab('${city}')">${city}</button>`;
    });
    
    const activeData = chartDataCache[activeCityTab];
    if (!activeData) return;
    
    // Map nice label hourly times (e.g. T14:00 -> 14:00)
    const cleanLabels = activeData.timestamps.map(t => t.split("T")[1] || t);
    
    const ctx = document.getElementById("timeSeriesChart").getContext("2d");
    
    // Destroy previous Chart instance if active to prevent canvas overlay bugs
    if (timeSeriesChartInstance) {
        timeSeriesChartInstance.destroy();
    }
    
    // Gradient fill under PM2.5 line
    const cyanGradient = ctx.createLinearGradient(0, 0, 0, 200);
    cyanGradient.addColorStop(0, "rgba(0, 242, 254, 0.35)");
    cyanGradient.addColorStop(1, "rgba(0, 242, 254, 0)");
    
    timeSeriesChartInstance = new Chart(ctx, {
        type: "line",
        data: {
            labels: cleanLabels,
            datasets: [
                {
                    label: "Raw PM2.5 (ug/m³)",
                    data: activeData.pm2_5,
                    borderColor: "#00f2fe",
                    borderWidth: 3,
                    backgroundColor: cyanGradient,
                    fill: true,
                    tension: 0.3,
                    pointBackgroundColor: "#00f2fe",
                    pointHoverRadius: 7
                },
                {
                    label: "3-Hour Rolling Avg",
                    data: activeData.pm2_5_rolling_avg,
                    borderColor: "#9d4edd",
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#94a3b8",
                        font: { family: "Space Grotesk", weight: 500 }
                    }
                },
                tooltip: {
                    backgroundColor: "#0d1118",
                    titleColor: "#00f2fe",
                    titleFont: { family: "Space Grotesk" },
                    bodyFont: { family: "Plus Jakarta Sans" },
                    borderColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.03)" },
                    ticks: { color: "#94a3b8", font: { family: "Space Grotesk" } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.03)" },
                    ticks: { color: "#94a3b8", font: { family: "Space Grotesk" } },
                    title: { display: true, text: "Concentration (µg/m³)", color: "#64748b" }
                }
            }
        }
    });
}

// Handler for tabs swapping
window.switchCityTab = function(city) {
    activeCityTab = city;
    // Re-render line graph
    renderTimeSeriesChart();
};

function renderAqiBreakdownChart(breakdown) {
    const ctx = document.getElementById("aqiBreakdownChart").getContext("2d");
    
    if (aqiChartInstance) {
        aqiChartInstance.destroy();
    }
    
    // Fill dynamic categories
    const categories = Object.keys(breakdown);
    const counts = Object.values(breakdown);
    
    // Map nice styling colors matching the air index categories
    const colorMap = {
        "Good": "#10b981",       // Neon green
        "Moderate": "#f59e0b",   // Amber yellow
        "Sensitive": "#ef4444",  // Crimson red
        "Unhealthy": "#b91c1c"   // Dark red
    };
    
    const backgroundColors = categories.map(cat => colorMap[cat] || "#64748b");
    
    aqiChartInstance = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: categories,
            datasets: [{
                data: counts,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: "#0d1118",
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: {
                        color: "#94a3b8",
                        font: { family: "Space Grotesk", weight: 500 },
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: "#0d1118",
                    borderColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    bodyColor: "#f1f5f9",
                    bodyFont: { family: "Plus Jakarta Sans" }
                }
            },
            cutout: "70%"
        }
    });
}
