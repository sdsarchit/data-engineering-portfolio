/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: VISUAL DASHBOARD CONTROLLER
   Fetches and seeds Chart.js graphics, KPI cards & quarantine tables
   ========================================================================== */

// Dynamic backend API URL: auto-detects local testing, otherwise fallback to custom cloud deployment
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:5000/api"
    : "https://archit-de-portfolio-8902.uc.r.appspot.com/api"; // Replace with your hosted backend URL when ready

let activeCityTab = "Castro Valley, CA";
let chartDataCache = null;
let timeSeriesChartInstance = null;
let aqiChartInstance = null;

let customChartInstance = null;
let dynamicDataCache = null;

document.addEventListener("DOMContentLoaded", () => {
    // Top-level Dashboard Tab Toggles
    const tabWeather = document.getElementById("tab-weather");
    const tabCustom = document.getElementById("tab-custom");
    const weatherWrapper = document.getElementById("weather-dashboard-wrapper");
    const customWrapper = document.getElementById("custom-dashboard-wrapper");
    
    if (tabWeather && tabCustom) {
        tabWeather.addEventListener("click", () => {
            tabWeather.className = "btn btn-primary";
            tabCustom.className = "btn btn-secondary";
            if (weatherWrapper) weatherWrapper.style.display = "block";
            if (customWrapper) customWrapper.style.display = "none";
            fetchCurrentDashboardState();
        });
        
        tabCustom.addEventListener("click", () => {
            tabWeather.className = "btn btn-secondary";
            tabCustom.className = "btn btn-primary";
            if (weatherWrapper) weatherWrapper.style.display = "none";
            if (customWrapper) customWrapper.style.display = "block";
            loadDynamicDashboard();
        });
    }

    // Submit AI Query
    const btnSubmitQuery = document.getElementById("btn-submit-query");
    const queryInput = document.getElementById("agent-query-input");
    if (btnSubmitQuery) {
        btnSubmitQuery.addEventListener("click", handleAgentQuery);
    }
    if (queryInput) {
        queryInput.addEventListener("keypress", (e) => {
            if (e.key === "Enter") handleAgentQuery();
        });
    }

    // Chart Selectors
    const selX = document.getElementById("chart-x-col");
    const selY = document.getElementById("chart-y-col");
    if (selX && selY) {
        selX.addEventListener("change", renderCustomDynamicChart);
        selY.addEventListener("change", renderCustomDynamicChart);
    }

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
        
        renderAqiBreakdownChart(breakdown);
    }
}

async function loadDynamicDashboard() {
    const tableBody = document.getElementById("custom-table-rows");
    
    // Check if custom dataset was uploaded locally or if backend is available
    try {
        const cacheBuster = `_=${Date.now()}`;
        const response = await fetch(`${API_BASE}/dynamic/stats?${cacheBuster}`);
        const data = await response.json();
        
        if (data.status === "SUCCESS") {
            const meta = data.metadata;
            dynamicDataCache = {
                metadata: meta,
                rows: data.rows,
                summaries: data.summaries
            };
            populateCustomDashboardUI(dynamicDataCache);
            return;
        }
    } catch (err) {
        console.warn("Backend offline. Loading custom dataset from client-side localStorage...");
    }
    
    // Client-side local storage fallback
    if (localStorage.getItem("using_custom_dataset") === "true") {
        const meta = JSON.parse(localStorage.getItem("dynamic_metadata") || "{}");
        const rows = JSON.parse(localStorage.getItem("dynamic_rows") || "[]");
        
        dynamicDataCache = {
            metadata: meta,
            rows: rows,
            summaries: {}
        };
        populateCustomDashboardUI(dynamicDataCache);
    } else if (localStorage.getItem("sim_processed_metrics")) {
        const cleanData = JSON.parse(localStorage.getItem("sim_processed_metrics") || "[]");
        const meta = {
            filename: "Preset Weather Simulator (Offline)",
            row_count: cleanData.length,
            col_count: 5,
            total_nulls_cleaned: 0,
            columns: ["city", "timestamp", "pm2_5", "pm2_5_rolling_avg", "aqi_category"],
            column_types: {
                city: "string",
                timestamp: "date",
                pm2_5: "number",
                pm2_5_rolling_avg: "number",
                aqi_category: "string"
            },
            ingested_at: new Date().toISOString()
        };
        
        dynamicDataCache = {
            metadata: meta,
            rows: cleanData,
            summaries: {}
        };
        populateCustomDashboardUI(dynamicDataCache);
    } else {
        // Show empty message in table
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="100%" class="text-center text-muted" style="padding: 3rem 0;">No custom files ingested yet. Please go to the ETL Ingestion Console and upload a CSV/JSON dataset first.</td></tr>`;
        }
    }
}

function populateCustomDashboardUI(data) {
    const meta = data.metadata;
    const rows = data.rows;
    
    // Set KPIs
    document.getElementById("custom-metric-rows").innerText = meta.row_count.toLocaleString();
    document.getElementById("custom-metric-cols").innerText = meta.col_count.toLocaleString();
    document.getElementById("custom-metric-nulls").innerText = meta.total_nulls_cleaned.toLocaleString();
    document.getElementById("custom-metric-filename").innerText = meta.filename;
    
    const ingestDate = new Date(meta.ingested_at).toLocaleString();
    document.getElementById("custom-metric-date").innerHTML = `<i class="fa-solid fa-clock"></i> Ingested: ${ingestDate}`;
    
    document.getElementById("custom-rows-count-badge").innerText = `${meta.row_count} Rows Loaded`;
    
    // Populate Dropdowns
    const selX = document.getElementById("chart-x-col");
    const selY = document.getElementById("chart-y-col");
    if (selX && selY) {
        const prevX = selX.value;
        const prevY = selY.value;
        
        selX.innerHTML = "";
        selY.innerHTML = "";
        
        meta.columns.forEach(col => {
            selX.innerHTML += `<option value="${col}">${col}</option>`;
            const colType = meta.column_types[col];
            if (colType === "number") {
                selY.innerHTML += `<option value="${col}">${col}</option>`;
            }
        });
        
        // Restore values if available
        if (prevX && meta.columns.includes(prevX)) selX.value = prevX;
        if (prevY && meta.columns.includes(prevY)) {
            selY.value = prevY;
        } else if (selY.options.length > 0) {
            selY.selectedIndex = 0;
        }
    }
    
    // Build Data Explorer Table
    const tableHead = document.getElementById("custom-table-head");
    const tableBody = document.getElementById("custom-table-rows");
    
    if (tableHead && tableBody) {
        tableHead.innerHTML = "<tr>" + meta.columns.map(c => `<th>${c}</th>`).join("") + "</tr>";
        
        tableBody.innerHTML = "";
        const limitRows = rows.slice(0, 50);
        
        if (limitRows.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${meta.columns.length}" class="text-center text-muted">Empty dataset table.</td></tr>`;
        } else {
            limitRows.forEach(r => {
                const cells = meta.columns.map(c => {
                    let val = r[c];
                    if (val === undefined || val === null) val = "";
                    return `<td>${escapeHtml(String(val))}</td>`;
                }).join("");
                tableBody.innerHTML += `<tr>${cells}</tr>`;
            });
        }
    }
    
    renderCustomDynamicChart();
}

function renderCustomDynamicChart() {
    const selX = document.getElementById("chart-x-col");
    const selY = document.getElementById("chart-y-col");
    const canvas = document.getElementById("customDynamicChart");
    if (!selX || !selY || !canvas || !dynamicDataCache) return;
    
    const colX = selX.value;
    const colY = selY.value;
    if (!colX || !colY) return;
    
    // Downsample chart data points to first 200 rows for high-performance rendering
    const chartRows = dynamicDataCache.rows.slice(0, 200);
    const labels = chartRows.map(r => String(r[colX]).slice(0, 15)); // truncate for spacing
    const values = chartRows.map(r => parseFloat(r[colY]) || 0);
    
    const ctx = canvas.getContext("2d");
    if (customChartInstance) {
        customChartInstance.destroy();
    }
    
    const barGradient = ctx.createLinearGradient(0, 0, 0, 200);
    barGradient.addColorStop(0, "rgba(14, 165, 233, 0.6)");
    barGradient.addColorStop(1, "rgba(14, 165, 233, 0.05)");
    
    customChartInstance = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [{
                label: `${colY} by ${colX}`,
                data: values,
                backgroundColor: barGradient,
                borderColor: "#0ea5e9",
                borderWidth: 2,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: "#94a3b8", font: { family: "Space Grotesk" } }
                },
                tooltip: {
                    backgroundColor: "#0d1118",
                    borderColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    titleColor: "#0ea5e9"
                }
            },
            scales: {
                x: {
                    grid: { color: "rgba(255, 255, 255, 0.02)" },
                    ticks: { color: "#94a3b8", font: { family: "Space Grotesk", size: 9 } }
                },
                y: {
                    grid: { color: "rgba(255, 255, 255, 0.02)" },
                    ticks: { color: "#94a3b8", font: { family: "Space Grotesk" } }
                }
            }
        }
    });
}

async function handleAgentQuery() {
    const input = document.getElementById("agent-query-input");
    const responseBox = document.getElementById("agent-response-box");
    if (!input || !responseBox || !dynamicDataCache) return;
    
    const query = input.value.trim();
    if (!query) return;
    
    responseBox.innerHTML = `
        <div style="color: var(--accent-cyan);"><i class="fa-solid fa-spinner fa-spin"></i> Parsing NLP prompt...</div>
    `;
    input.value = "";
    
    try {
        const response = await fetch(`${API_BASE}/dynamic/query`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: query })
        });
        
        const data = await response.json();
        
        if (data.status === "SUCCESS") {
            const sqlQuery = data.sql;
            const res = data.results[0];
            
            responseBox.innerHTML = `
                <div style="color: var(--accent-purple); font-weight: bold;"><i class="fa-solid fa-code"></i> Generated SQL Query:</div>
                <div style="background: rgba(0,0,0,0.5); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.8rem; border: 1px solid var(--border-color); color: #a5f3fc; font-size: 0.78rem; word-break: break-all;">${sqlQuery}</div>
                <div style="color: var(--accent-green); font-weight: bold;"><i class="fa-solid fa-list-check"></i> Query Output:</div>
                <div style="padding-left: 0.5rem; color: #f1f5f9; font-size: 0.95rem;">${formatQueryResult(res)}</div>
            `;
            return;
        }
    } catch (err) {
        console.warn("Backend offline. Executing client-side SQL simulation...");
    }
    
    // Offline / Local Simulation Mode
    simulateClientSideAgentQuery(query, responseBox);
}

function formatQueryResult(res) {
    if (!res) return "No results returned.";
    const keys = Object.keys(res);
    return keys.map(k => `<strong>${k}:</strong> ${res[k]}`).join(" | ");
}

function simulateClientSideAgentQuery(query, responseBox) {
    const q = query.toLowerCase();
    const rows = dynamicDataCache.rows;
    const meta = dynamicDataCache.metadata;
    const columns = meta.columns;
    
    // Dynamically retrieve column using client-side RAG Schema Resolver
    const resolver = new RAGSchemaResolver(columns, meta.column_types, rows);
    const col = resolver.retrieveRelevantColumn(q);
    
    let answer = "";
    let sql = "";
    
    if (q.includes("average") || q.includes("avg") || q.includes("mean")) {
        if (col) {
            const vals = rows.map(r => parseFloat(r[col]) || 0);
            const avg = vals.reduce((a, b) => a + b, 0) / Math.max(1, vals.length);
            sql = `SELECT AVG(${col}) as average_${col} FROM dynamic_processed_data`;
            answer = `Average value of <strong>${col}</strong> is: <strong>${avg.toFixed(2)}</strong>`;
        } else {
            answer = "Please mention a numerical column name in your query (e.g. average speed).";
        }
    } else if (q.includes("max") || q.includes("highest") || q.includes("maximum")) {
        if (col) {
            const vals = rows.map(r => parseFloat(r[col]) || 0);
            const max = Math.max(...vals);
            sql = `SELECT MAX(${col}) as max_${col} FROM dynamic_processed_data`;
            answer = `Maximum value of <strong>${col}</strong> is: <strong>${max}</strong>`;
        } else {
            answer = "Please mention a column name in your query.";
        }
    } else if (q.includes("min") || q.includes("lowest") || q.includes("minimum")) {
        if (col) {
            const vals = rows.map(r => parseFloat(r[col]) || 0);
            const min = Math.min(...vals);
            sql = `SELECT MIN(${col}) as min_${col} FROM dynamic_processed_data`;
            answer = `Minimum value of <strong>${col}</strong> is: <strong>${min}</strong>`;
        } else {
            answer = "Please mention a column name in your query.";
        }
    } else if (q.includes("sum") || q.includes("total")) {
        if (col) {
            const vals = rows.map(r => parseFloat(r[col]) || 0);
            const sum = vals.reduce((a, b) => a + b, 0);
            sql = `SELECT SUM(${col}) as total_${col} FROM dynamic_processed_data`;
            answer = `Sum total of <strong>${col}</strong> is: <strong>${sum.toFixed(2)}</strong>`;
        } else {
            answer = "Please specify a numerical column name.";
        }
    } else if (q.includes("count") || q.includes("how many") || q.includes("rows")) {
        sql = `SELECT COUNT(*) as count FROM dynamic_processed_data`;
        answer = `Total record count in dataset is: <strong>${rows.length} rows</strong>`;
    } else {
        sql = `SELECT * FROM dynamic_processed_data LIMIT 5`;
        answer = `I found <strong>${rows.length} records</strong>. Try asking "what is average [column]", "maximum [column]" or "total count".`;
    }
    
    responseBox.innerHTML = `
        <div style="color: var(--accent-purple); font-weight: bold;"><i class="fa-solid fa-code"></i> Generated SQL Query (Simulated):</div>
        <div style="background: rgba(0,0,0,0.5); padding: 0.5rem; border-radius: 4px; margin-bottom: 0.8rem; border: 1px solid var(--border-color); color: #a5f3fc; font-size: 0.78rem; word-break: break-all;">${sql}</div>
        <div style="color: var(--accent-green); font-weight: bold;"><i class="fa-solid fa-list-check"></i> Query Output:</div>
        <div style="padding-left: 0.5rem; color: #f1f5f9; font-size: 0.95rem;">${answer}</div>
    `;
}

class RAGSchemaResolver {
    constructor(columns, columnTypes, sampleRows) {
        this.columns = columns;
        this.columnTypes = columnTypes;
        this.sampleRows = sampleRows || [];
        this.index = this.buildSemanticIndex();
    }

    buildSemanticIndex() {
        const semanticDictionary = {
            "time": ["date", "time", "timestamp", "year", "month", "hour", "created_at", "updated_at", "timeline", "clock", "chronological"],
            "location": ["city", "region", "town", "location", "country", "state", "place", "area", "address", "geographic", "lat", "lon", "coordinates"],
            "quantity": ["quantity", "count", "amount", "number", "total", "sum", "size", "volume"],
            "financial": ["price", "cost", "revenue", "sales", "profit", "income", "charge", "fee", "tax", "dollar"],
            "metric": ["value", "reading", "index", "pm25", "pm10", "score", "rate", "speed", "temp", "temperature", "humidity", "weather", "dust"]
        };
        
        return this.columns.map(col => {
            const colLower = col.toLowerCase();
            const relatedTerms = [colLower];
            
            for (const [category, keywords] of Object.entries(semanticDictionary)) {
                if (colLower === category || keywords.some(kw => colLower.includes(kw))) {
                    relatedTerms.push(...keywords);
                    relatedTerms.push(category);
                }
            }
            
            return {
                column: col,
                type: this.columnTypes[col] || "string",
                terms: Array.from(new Set(relatedTerms))
            };
        });
    }

    retrieveRelevantColumn(query) {
        const qWords = query.toLowerCase().match(/\w+/g) || [];
        let bestCol = null;
        let highestScore = 0;
        
        this.index.forEach(doc => {
            let score = 0;
            qWords.forEach(qWord => {
                if (doc.column.toLowerCase().includes(qWord)) {
                    score += 10;
                }
                doc.terms.forEach(term => {
                    if (qWord === term) {
                        score += 5;
                    } else if (term.includes(qWord) || qWord.includes(term)) {
                        score += 2;
                    }
                });
            });
            
            if (query.includes("average") || query.includes("mean") || query.includes("sum")) {
                if (doc.type === "number") {
                    score += 3;
                }
            }
            
            if (score > highest_score) {
                highest_score = score;
                bestCol = doc.column;
            }
        });
        
        return bestCol;
    }
}
