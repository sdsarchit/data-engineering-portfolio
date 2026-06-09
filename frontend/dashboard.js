/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: VISUAL DASHBOARD CONTROLLER
   Fetches and seeds Chart.js graphics, KPI cards & quarantine tables
   ========================================================================== */

// Dynamic backend API URL: auto-detects local testing, otherwise fallback to custom cloud deployment
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:5000/api"
    : "https://your-data-pipeline-backend.onrender.com/api"; // Replace with your hosted backend URL when ready

let activeCityTab = "Castro Valley, CA";
let chartDataCache = null;
let timeSeriesChartInstance = null;
let aqiChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    fetchCurrentDashboardState();
});

// Fetching with aggressive cache-busters to completely disable local caching
async function fetchCurrentDashboardState() {
    const emptyState = document.getElementById("dashboard-empty-state");
    const coreContent = document.getElementById("dashboard-core-content");
    
    // First, check if simulator mode is actively selected
    if (localStorage.getItem("using_simulator_mode") === "true") {
        console.log("[Dashboard] Reading metrics from local emulation database...");
        loadSimulationDashboard(emptyState, coreContent);
        return;
    }
    
    try {
        const cacheBuster = `_=${Date.now()}`;
        const [statsRes, chartRes, quarantineRes] = await Promise.all([
            fetch(`${API_BASE}/dashboard/stats?${cacheBuster}`),
            fetch(`${API_BASE}/dashboard/charts?${cacheBuster}`),
            fetch(`${API_BASE}/dashboard/quarantine?${cacheBuster}`)
        ]);
        
        if (statsRes.status !== 200 || chartRes.status !== 200 || quarantineRes.status !== 200) {
            if (localStorage.getItem("sim_processed_metrics")) {
                loadSimulationDashboard(emptyState, coreContent);
            } else {
                showEmptyState(emptyState, coreContent);
            }
            return;
        }
        
        const stats = await statsRes.json();
        const charts = await chartRes.json();
        const quarantine = await quarantineRes.json();
        
        // Show empty state if database has no records
        if (stats.total_processed === 0 && stats.total_quarantined === 0) {
            if (localStorage.getItem("sim_processed_metrics")) {
                loadSimulationDashboard(emptyState, coreContent);
            } else {
                showEmptyState(emptyState, coreContent);
            }
            return;
        }
        
        // Show core dashboard content
        if (emptyState) emptyState.style.display = "none";
        if (coreContent) coreContent.style.display = "block";
        
        // Populate KPIs
        document.getElementById("metric-processed").innerText = stats.total_processed.toLocaleString();
        document.getElementById("metric-quarantined").innerText = stats.total_quarantined.toLocaleString();
        document.getElementById("metric-health").innerText = `${stats.success_rate}%`;
        document.getElementById("metric-dbsize").innerText = `${stats.db_size_kb} KB`;
        
        // Set Quarantine warnings badge
        document.getElementById("quarantine-badge-count").innerText = `${stats.total_quarantined} Anomalies Blocked`;
        
        // Populate Anomaly table
        populateQuarantineTable(quarantine);
        
        // Populate Chart.js
        if (charts.series && Object.keys(charts.series).length > 0) {
            chartDataCache = charts.series;
            renderTimeSeriesChart();
            renderAqiBreakdownChart(charts.aqi_breakdown);
        }
    } catch (err) {
        console.warn("Backend local API offline or not initialized. Attempting simulator fallback...", err);
        if (localStorage.getItem("sim_processed_metrics")) {
            loadSimulationDashboard(emptyState, coreContent);
        } else {
            showEmptyState(emptyState, coreContent);
        }
    }
}

function showEmptyState(emptyState, coreContent) {
    if (emptyState) emptyState.style.display = "flex";
    if (coreContent) coreContent.style.display = "none";
}

/* ==========================================================================
   Detailed Quarantine Table Builder
   ========================================================================== */
function populateQuarantineTable(records) {
    const tableBody = document.getElementById("quarantine-table-rows");
    if (!tableBody) return;
    
    tableBody.innerHTML = "";
    
    if (records.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted">No anomalies logged in SQLite quarantine table. Ingestion run is 100% compliant.</td></tr>`;
        return;
    }
    
    records.forEach(r => {
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
   Chart Rendering Systems
   ========================================================================== */
function renderTimeSeriesChart() {
    const cities = Object.keys(chartDataCache);
    const tabsContainer = document.getElementById("city-selector-tabs");
    if (!tabsContainer) return;
    
    // Seed City tab filters
    tabsContainer.innerHTML = "";
    cities.forEach(city => {
        const isActive = city === activeCityTab ? "active" : "";
        tabsContainer.innerHTML += `<button class="city-tab ${isActive}" onclick="switchCityTab('${city}')">${city}</button>`;
    });
    
    const activeData = chartDataCache[activeCityTab];
    if (!activeData) return;
    
    const cleanLabels = activeData.timestamps.map(t => t.split("T")[1] || t);
    const ctx = document.getElementById("timeSeriesChart").getContext("2d");
    
    if (timeSeriesChartInstance) {
        timeSeriesChartInstance.destroy();
    }
    
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

window.switchCityTab = function(city) {
    activeCityTab = city;
    renderTimeSeriesChart();
};

function renderAqiBreakdownChart(breakdown) {
    const ctx = document.getElementById("aqiBreakdownChart").getContext("2d");
    if (aqiChartInstance) {
        aqiChartInstance.destroy();
    }
    
    const categories = Object.keys(breakdown);
    const counts = Object.values(breakdown);
    
    const colorMap = {
        "Good": "#10b981",       
        "Moderate": "#f59e0b",   
        "Sensitive": "#ef4444",  
        "Unhealthy": "#b91c1c"   
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

/* ==========================================================================
   Simulator Dashboard Loader
   ========================================================================== */
function loadSimulationDashboard(emptyState, coreContent) {
    if (emptyState) emptyState.style.display = "none";
    if (coreContent) coreContent.style.display = "block";
    
    // Read from localStorage
    const totalP = localStorage.getItem("sim_total_processed") || "0";
    const totalQ = localStorage.getItem("sim_total_quarantined") || "0";
    const successR = localStorage.getItem("sim_success_rate") || "100";
    const dbSize = localStorage.getItem("sim_db_size_kb") || "0";
    
    document.getElementById("metric-processed").innerText = parseInt(totalP).toLocaleString();
    document.getElementById("metric-quarantined").innerText = parseInt(totalQ).toLocaleString();
    document.getElementById("metric-health").innerText = `${successR}%`;
    document.getElementById("metric-dbsize").innerText = `${dbSize} KB`;
    document.getElementById("quarantine-badge-count").innerText = `${totalQ} Anomalies Blocked`;
    
    // Load lists
    const cleanData = JSON.parse(localStorage.getItem("sim_processed_metrics") || "[]");
    const qData = JSON.parse(localStorage.getItem("sim_quarantine_records") || "[]");
    
    populateQuarantineTable(qData);
    
    // Group cleanData by city for charts
    if (cleanData.length > 0) {
        const series = {};
        const breakdown = {};
        
        cleanData.forEach(item => {
            if (!series[item.city]) {
                series[item.city] = {
                    timestamps: [],
                    pm2_5: [],
                    pm2_5_rolling_avg: [],
                    aqi_category: []
                };
            }
            series[item.city].timestamps.push(item.timestamp);
            series[item.city].pm2_5.push(item.pm2_5);
            series[item.city].pm2_5_rolling_avg.push(item.pm2_5_rolling_avg);
            series[item.city].aqi_category.push(item.aqi_category);
            
            // Build AQI breakdown counts
            breakdown[item.aqi_category] = (breakdown[item.aqi_category] || 0) + 1;
        });
        
        chartDataCache = series;
        renderTimeSeriesChart();
        renderAqiBreakdownChart(breakdown);
    }
}
