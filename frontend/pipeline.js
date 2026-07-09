/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: PIPELINE CONSOLE CONTROLLER
   Manages Live Ingestion Job, polling, flowcharts & transition prompts
   ========================================================================== */

// Dynamic backend API URL: auto-detects local testing, otherwise fallback to custom cloud deployment
const API_BASE = (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://127.0.0.1:5000/api"
    : "https://archit-de-portfolio-8902.uc.r.appspot.com/api"; // Replace with your hosted backend URL when ready

let logPollingInterval = null;
let elapsedTimerInterval = null;
let executionStartTime = null;

let selectedFile = null;

document.addEventListener("DOMContentLoaded", () => {
    // Mode toggles
    const btnModePreset = document.getElementById("btn-mode-preset");
    const btnModeUpload = document.getElementById("btn-mode-upload");
    const uploadContainer = document.getElementById("upload-pipeline-container");
    const btnRunPreset = document.getElementById("btn-run-pipeline");
    const btnRunUpload = document.getElementById("btn-upload-run");
    const consoleLogs = document.getElementById("console-logs");
    
    if (btnModePreset && btnModeUpload) {
        btnModePreset.addEventListener("click", () => {
            btnModePreset.className = "btn btn-primary";
            btnModeUpload.className = "btn btn-secondary";
            if (uploadContainer) uploadContainer.style.display = "none";
            if (btnRunPreset) btnRunPreset.style.display = "block";
            if (btnRunUpload) btnRunUpload.style.display = "none";
            
            consoleLogs.innerHTML = `
                <div class="log-line system">[Ready] Click "Trigger ETL Ingestion" below to begin execution of the live pipeline.</div>
                <div class="log-line system">Standard configuration: Ingests 3 regional coordinates + simulated anomalies.</div>
            `;
        });
        
        btnModeUpload.addEventListener("click", () => {
            btnModePreset.className = "btn btn-secondary";
            btnModeUpload.className = "btn btn-primary";
            if (uploadContainer) uploadContainer.style.display = "block";
            if (btnRunPreset) btnRunPreset.style.display = "none";
            if (btnRunUpload) btnRunUpload.style.display = "block";
            
            consoleLogs.innerHTML = `
                <div class="log-line system">[Ready] Select a CSV or JSON file above, then click "Run Custom Profiler & Load".</div>
            `;
        });
    }

    // Uploader controls
    const fileInput = document.getElementById("file-uploader-input");
    const btnSelectFile = document.getElementById("btn-select-file");
    const selectedFileBadge = document.getElementById("selected-file-badge");
    const selectedFileName = document.getElementById("selected-file-name");
    const btnClearFile = document.getElementById("btn-clear-file");
    
    if (btnSelectFile && fileInput) {
        btnSelectFile.addEventListener("click", (e) => {
            e.stopPropagation();
            fileInput.click();
        });
        fileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });
    }
    
    if (uploadContainer) {
        uploadContainer.addEventListener("click", () => {
            if (fileInput) fileInput.click();
        });
        uploadContainer.addEventListener("dragover", (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = "var(--accent-cyan)";
            uploadContainer.style.backgroundColor = "rgba(14, 165, 233, 0.05)";
        });
        uploadContainer.addEventListener("dragleave", () => {
            uploadContainer.style.borderColor = "var(--border-color)";
            uploadContainer.style.backgroundColor = "transparent";
        });
        uploadContainer.addEventListener("drop", (e) => {
            e.preventDefault();
            uploadContainer.style.borderColor = "var(--border-color)";
            uploadContainer.style.backgroundColor = "transparent";
            if (e.dataTransfer.files.length > 0) {
                handleFileSelection(e.dataTransfer.files[0]);
            }
        });
    }
    
    if (btnClearFile) {
        btnClearFile.addEventListener("click", (e) => {
            e.stopPropagation();
            selectedFile = null;
            if (fileInput) fileInput.value = "";
            if (selectedFileBadge) selectedFileBadge.style.display = "none";
        });
    }

    // Wire up Run buttons
    if (btnRunPreset) {
        btnRunPreset.addEventListener("click", handleRunPipeline);
    }
    if (btnRunUpload) {
        btnRunUpload.addEventListener("click", handleUploadRun);
    }
});

function handleFileSelection(file) {
    const selectedFileBadge = document.getElementById("selected-file-badge");
    const selectedFileName = document.getElementById("selected-file-name");
    
    selectedFile = file;
    if (selectedFileBadge && selectedFileName) {
        selectedFileName.innerText = file.name;
        selectedFileBadge.style.display = "inline-flex";
    }
}

/* ==========================================================================
   Ingestion Log Poller & Terminal Monitor
   ========================================================================== */
async function handleRunPipeline() {
    const runBtn = document.getElementById("btn-run-pipeline");
    const consoleDot = document.getElementById("console-status-dot");
    const consoleTitle = document.getElementById("console-title");
    const consoleLogs = document.getElementById("console-logs");
    const promptCard = document.getElementById("completion-prompt-card");
    
    if (runBtn.classList.contains("disabled")) return;
    
    // UI state adjustments
    runBtn.classList.add("disabled");
    runBtn.disabled = true;
    consoleDot.className = "console-status-dot running";
    consoleTitle.innerText = "ETL Console: RUNNING";
    if (promptCard) promptCard.style.display = "none";
    
    // Reset flowchart glowing nodes
    resetFlowNodes();
    
    // Reset Terminal Console lines
    consoleLogs.innerHTML = `<div class="log-line system">[Trigger] Requesting async ingestion pipeline execution on local backend...</div>`;
    
    executionStartTime = Date.now();
    startElapsedTimer();
    
    try {
        // Trigger Flask backend job
        const response = await fetch(`${API_BASE}/pipeline/run`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });
        
        const data = await response.json();
        
        if (response.status === 200 || response.status === 202) {
            consoleLogs.innerHTML += `<div class="log-line success">[Backend] Ingestion job spawned. Polling stdout logs...</div>`;
            
            // Poll logs every 600ms, incorporating cache-busters to bypass browser local caches!
            logPollingInterval = setInterval(pollPipelineLogs, 600);
        } else {
            stopElapsedTimer();
            consoleLogs.innerHTML += `<div class="log-line error">[Abort] Failed to spawn background job: ${data.message}</div>`;
            resetTerminalUI("failed", "ETL Console: FAILED");
        }
    } catch (err) {
        consoleLogs.innerHTML += `<div class="log-line warning">[Mixed-Content Block / Offline] Cloud environment or offline local backend detected.</div>`;
        consoleLogs.innerHTML += `<div class="log-line system">[Simulator] Initiating Client-Side ETL Ingestion Engine (Netlify Simulation Mode)...</div>`;
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
        
        // Start simulation flow
        setTimeout(runSimulationPipeline, 1000);
    }
}

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

// Log Polling with aggressive cache-busters
async function pollPipelineLogs() {
    const consoleLogs = document.getElementById("console-logs");
    
    try {
        // Append unique timestamp parameter to completely bypass aggressive Microsoft Edge / local caching!
        const cacheBuster = `_=${Date.now()}`;
        const response = await fetch(`${API_BASE}/pipeline/status?${cacheBuster}`);
        const data = await response.json();
        
        const newLogs = data.logs || [];
        
        if (newLogs.length > 0) {
            consoleLogs.innerHTML = "";
            newLogs.forEach(line => {
                let cssClass = "";
                if (line.includes("STAGE")) cssClass = "stage";
                else if (line.includes("Successfully") || line.includes("completed")) cssClass = "success";
                else if (line.includes("Error") || line.includes("FAILED")) cssClass = "error";
                else if (line.includes("Warning") || line.includes("Simulating") || line.includes("anomalies")) cssClass = "warning";
                
                consoleLogs.innerHTML += `<div class="log-line ${cssClass}">${line}</div>`;
            });
            
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
            updateFlowChartAnimation(newLogs);
        }
        
        if (data.status === "COMPLETED" || data.status === "FAILED") {
            clearInterval(logPollingInterval);
            stopElapsedTimer();
            
            const stateClass = data.status.toLowerCase();
            resetTerminalUI(stateClass, `ETL Console: ${data.status}`);
            
            if (data.status === "COMPLETED") {
                completeFlowChartNodes();
                // Pop the dashboard redirect badge with a smooth slide animation
                const promptCard = document.getElementById("completion-prompt-card");
                if (promptCard) {
                    promptCard.style.display = "flex";
                    promptCard.scrollIntoView({ behavior: "smooth" });
                }
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
   Flowchart Node Animations
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
        dqNode.className = "flow-step completed quarantined";
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
   NETLIFY ETL SIMULATOR ENGINE (CLIENT-SIDE INGEST FALLBACK)
   ========================================================================== */
const simLogs = [
    "Initializing Data Ingestion Engine...",
    "Connecting to SQLite Database: data.db (Local Storage Emulation)",
    "Database tables initialized successfully.",
    "Starting ETL Pipeline Job...",
    "--- STAGE 1: EXTRACTION (API Ingestion) ---",
    "Fetching live Air Quality metrics for Castro Valley, CA (Lat: 37.6941, Lon: -122.0722)...",
    "Successfully extracted 24 hourly data points for Castro Valley, CA.",
    "Fetching live Air Quality metrics for Painesville, OH (Lat: 41.7245, Lon: -81.2457)...",
    "Successfully extracted 24 hourly data points for Painesville, OH.",
    "Fetching live Air Quality metrics for Newark, NJ (Lat: 40.7357, Lon: -74.1724)...",
    "Successfully extracted 24 hourly data points for Newark, NJ.",
    "Simulating real-world dirty data ingestion by injecting validation anomalies...",
    "Total raw records parsed (including 4 test anomalies): 76",
    "--- STAGE 2: DATA QUALITY RULE ENGINE (Discover Financial DQ Engine Framework) ---",
    "Checking Rule 1: Non-Negativity Bound Constraint...",
    "Rule Failure: Out-of-bounds metric (Negative PM2.5: -99.9) (Castro Valley, CA). Record Quarantined.",
    "Checking Rule 2: Outlier Safety Cap Constraint...",
    "Rule Failure: Outlier anomaly detected (Extreme PM2.5: 850.0 ug/m3) (Newark, NJ). Record Quarantined.",
    "Checking Rule 3: Null value constraints...",
    "Rule Failure: Null value violation in PM2.5 or PM10 (Painesville, OH). Record Quarantined.",
    "Checking Rule 4: Mandatory Field Constraint...",
    "Rule Failure: Missing mandatory column 'city'. Record Quarantined.",
    "DQ Rule Engine Complete: 72 passed checks, 4 quarantined.",
    "--- STAGE 3: TRANSFORMATION (Pandas Cleansing & Rolling Aggregations) ---",
    "Sorting chronological series data for cities...",
    "Calculating 3-hour rolling averages & structured EPA Air Quality Index (AQI) categories.",
    "--- STAGE 4: LOADING (SQLite Target Database Storage) ---",
    "Successfully committed 4 quarantined records to DB quarantine_records table.",
    "Successfully committed 72 cleansed analytical records to DB processed_metrics table.",
    "ETL Data Pipeline Job completed successfully! Dashboard metrics ready."
];

function runSimulationPipeline() {
    const consoleLogs = document.getElementById("console-logs");
    const consoleTitle = document.getElementById("console-title");
    
    consoleTitle.innerText = "ETL Console: RUNNING (SIM)";
    let logIdx = 0;
    
    function printNextLog() {
        if (logIdx < simLogs.length) {
            const line = simLogs[logIdx];
            const timestamp = new Date().toLocaleTimeString();
            const fullLine = `[${timestamp}] ${line}`;
            
            let cssClass = "";
            if (line.includes("STAGE")) cssClass = "stage";
            else if (line.includes("Successfully") || line.includes("completed")) cssClass = "success";
            else if (line.includes("Error") || line.includes("FAILED")) cssClass = "error";
            else if (line.includes("Warning") || line.includes("Simulating") || line.includes("anomalies") || line.includes("Failure")) cssClass = "warning";
            
            consoleLogs.innerHTML += `<div class="log-line ${cssClass}">${fullLine}</div>`;
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
            
            // Highlight nodes based on logs progress
            updateFlowChartAnimation(simLogs.slice(0, logIdx + 1));
            
            logIdx++;
            setTimeout(printNextLog, 250);
        } else {
            // Completed!
            stopElapsedTimer();
            resetTerminalUI("completed", "ETL Console: COMPLETED (SIM)");
            completeFlowChartNodes();
            
            // Save mock data to local storage
            saveMockDataToLocalStorage();
            
            const promptCard = document.getElementById("completion-prompt-card");
            if (promptCard) {
                promptCard.style.display = "flex";
                promptCard.scrollIntoView({ behavior: "smooth" });
            }
        }
    }
    
    printNextLog();
}

function saveMockDataToLocalStorage() {
    localStorage.setItem("using_simulator_mode", "true");
    localStorage.setItem("sim_total_processed", "72");
    localStorage.setItem("sim_total_quarantined", "4");
    localStorage.setItem("sim_success_rate", "94.74");
    localStorage.setItem("sim_db_size_kb", "24");
    localStorage.setItem("sim_last_ingested", new Date().toLocaleString());
    
    // Generate clean metrics
    const cities = ["Castro Valley, CA", "Newark, NJ", "Painesville, OH"];
    const basePm = { "Castro Valley, CA": 8, "Newark, NJ": 15, "Painesville, OH": 12 };
    const cleanData = [];
    
    cities.forEach(city => {
        let pmHistory = [];
        for (let h = 0; h < 24; h++) {
            const hourStr = h < 10 ? `0${h}:00` : `${h}:00`;
            const timestamp = `2026-06-03T${hourStr}`;
            const rawVal = basePm[city] + Math.sin(h / 2.0) * 4 + Math.random() * 2;
            const pm2_5 = parseFloat(rawVal.toFixed(1));
            pmHistory.push(pm2_5);
            
            const last3 = pmHistory.slice(Math.max(0, pmHistory.length - 3));
            const sum = last3.reduce((a, b) => a + b, 0);
            const avg = parseFloat((sum / last3.length).toFixed(2));
            
            let cat = "Good";
            if (pm2_5 > 12.0) cat = "Moderate";
            
            cleanData.push({
                city: city,
                timestamp: timestamp,
                pm2_5: pm2_5,
                pm2_5_rolling_avg: avg,
                aqi_category: cat
            });
        }
    });
    
    localStorage.setItem("sim_processed_metrics", JSON.stringify(cleanData));
    
    // Static quarantine list
    const qData = [
        {
            city: "Painesville, OH",
            timestamp: "2026-06-03T08:00",
            failure_reason: "Rule Failure: Null value violation in PM2.5 or PM10",
            raw_payload: "{'city': 'Painesville, OH', 'timestamp': '2026-06-03T08:00', 'pm2_5': null, 'pm10': 30.0}"
        },
        {
            city: "Castro Valley, CA",
            timestamp: "2026-06-03T00:00",
            failure_reason: "Rule Failure: Out-of-bounds metric (Negative PM2.5: -99.9 or PM10: 15.0)",
            raw_payload: "{'city': 'Castro Valley, CA', 'timestamp': '2026-06-03T00:00', 'pm2_5': -99.9, 'pm10': 15.0}"
        },
        {
            city: "Newark, NJ",
            timestamp: "2026-06-03T04:00",
            failure_reason: "Rule Failure: Outlier anomaly detected (Extreme PM2.5: 850.0 ug/m3 exceeds safety cap of 500)",
            raw_payload: "{'city': 'Newark, NJ', 'timestamp': '2026-06-03T04:00', 'pm2_5': 850.0, 'pm10': 420.0}"
        },
        {
            city: "UNKNOWN",
            timestamp: "2026-06-03T12:00",
            failure_reason: "Rule Failure: Missing mandatory column 'city'",
            raw_payload: "{'city': '', 'timestamp': '2026-06-03T12:00', 'pm2_5': 12.5, 'pm10': 22.0}"
        }
    ];
    
    localStorage.setItem("sim_quarantine_records", JSON.stringify(qData));
}

async function handleUploadRun() {
    const btnRunUpload = document.getElementById("btn-upload-run");
    const consoleDot = document.getElementById("console-status-dot");
    const consoleTitle = document.getElementById("console-title");
    const consoleLogs = document.getElementById("console-logs");
    const promptCard = document.getElementById("completion-prompt-card");
    
    if (!selectedFile) {
        alert("Please upload/select a file first!");
        return;
    }
    
    if (btnRunUpload.classList.contains("disabled")) return;
    
    // UI state adjustments
    btnRunUpload.classList.add("disabled");
    btnRunUpload.disabled = true;
    consoleDot.className = "console-status-dot running";
    consoleTitle.innerText = "ETL Console: RUNNING (UPLOAD)";
    if (promptCard) promptCard.style.display = "none";
    
    // Reset flowchart nodes
    resetFlowNodes();
    
    consoleLogs.innerHTML = `<div class="log-line system">[Upload] Uploading file to analytics engine: ${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)...</div>`;
    
    executionStartTime = Date.now();
    startElapsedTimer();
    
    try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        
        const response = await fetch(`${API_BASE}/pipeline/upload`, {
            method: "POST",
            body: formData
        });
        
        const data = await response.json();
        
        if (response.status === 200 || response.status === 202) {
            consoleLogs.innerHTML += `<div class="log-line success">[Backend] File uploaded. Spawning analysis pipeline...</div>`;
            logPollingInterval = setInterval(pollUploadLogs, 500);
        } else {
            stopElapsedTimer();
            consoleLogs.innerHTML += `<div class="log-line error">[Abort] Failed to analyze file: ${data.message}</div>`;
            resetTerminalUI("failed", "ETL Console: FAILED");
        }
    } catch (err) {
        consoleLogs.innerHTML += `<div class="log-line warning">[Mixed-Content Block / Offline] Cloud environment or offline local backend detected.</div>`;
        consoleLogs.innerHTML += `<div class="log-line system">[Simulator] Reading file locally for client-side ETL simulation...</div>`;
        consoleLogs.scrollTop = consoleLogs.scrollHeight;
        
        // Start simulation flow
        setTimeout(runClientSideFileParser, 1000);
    }
}

// Log Polling for upload status
async function pollUploadLogs() {
    const consoleLogs = document.getElementById("console-logs");
    const btnRunUpload = document.getElementById("btn-upload-run");
    
    try {
        const cacheBuster = `_=${Date.now()}`;
        const response = await fetch(`${API_BASE}/pipeline/upload/status?${cacheBuster}`);
        const data = await response.json();
        
        const newLogs = data.logs || [];
        
        if (newLogs.length > 0) {
            consoleLogs.innerHTML = "";
            newLogs.forEach(line => {
                let cssClass = "";
                if (line.includes("STAGE")) cssClass = "stage";
                else if (line.includes("Successfully") || line.includes("completed") || line.includes("successfully")) cssClass = "success";
                else if (line.includes("Error") || line.includes("FAILED")) cssClass = "error";
                else if (line.includes("Warning") || line.includes("anomalies") || line.includes("Dropped") || line.includes("Filled")) cssClass = "warning";
                
                consoleLogs.innerHTML += `<div class="log-line ${cssClass}">${line}</div>`;
            });
            
            consoleLogs.scrollTop = consoleLogs.scrollHeight;
            updateFlowChartAnimation(newLogs);
        }
        
        if (data.status === "COMPLETED" || data.status === "FAILED") {
            clearInterval(logPollingInterval);
            stopElapsedTimer();
            
            btnRunUpload.classList.remove("disabled");
            btnRunUpload.disabled = false;
            
            const stateClass = data.status.toLowerCase();
            resetTerminalUI(stateClass, `ETL Console: ${data.status}`);
            
            if (data.status === "COMPLETED") {
                completeFlowChartNodes();
                // Save state to indicate we have a dynamic dataset loaded
                localStorage.setItem("using_custom_dataset", "true");
                
                const promptCard = document.getElementById("completion-prompt-card");
                if (promptCard) {
                    promptCard.style.display = "flex";
                    promptCard.scrollIntoView({ behavior: "smooth" });
                }
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

function runClientSideFileParser() {
    const consoleLogs = document.getElementById("console-logs");
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        
        // Simulating step-by-step logs
        const logs = [];
        logs.push("Initializing Client-Side Data Ingestion Parser...");
        logs.push(`STAGE 1: EXTRACTION - Reading uploaded file content: ${selectedFile.name}`);
        
        try {
            let rows = [];
            let columns = [];
            let totalNulls = 0;
            
            if (selectedFile.name.endsWith(".json")) {
                const parsed = JSON.parse(text);
                rows = Array.isArray(parsed) ? parsed : [parsed];
                if (rows.length > 0) {
                    columns = Object.keys(rows[0]);
                }
            } else {
                // Parse CSV using robust quote-aware splitting
                const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l);
                if (lines.length > 0) {
                    const splitCsvLine = (line) => {
                        const result = [];
                        let current = "";
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                            const char = line[i];
                            if (char === '"' || char === "'") {
                                inQuotes = !inQuotes;
                            } else if (char === ',' && !inQuotes) {
                                result.push(current.trim().replace(/^["']|["']$/g, ''));
                                current = "";
                            } else {
                                current += char;
                            }
                        }
                        result.push(current.trim().replace(/^["']|["']$/g, ''));
                        return result;
                    };

                    columns = splitCsvLine(lines[0]);
                    for (let i = 1; i < lines.length; i++) {
                        const values = splitCsvLine(lines[i]);
                        if (values.length > 0) {
                            const row = {};
                            columns.forEach((col, index) => {
                                row[col] = values[index] !== undefined ? values[index] : "";
                            });
                            rows.push(row);
                        }
                    }
                }
            }
            
            logs.push(`Successfully extracted ${rows.length} rows and ${columns.length} columns.`);
            logs.push("STAGE 2: DATA QUALITY & PROFILING - Analyzing schema rules...");
            
            // Check null values
            const columnTypes = {};
            const cleanColumns = columns.map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
            
            // Standardize rows columns keys
            const cleanRows = rows.map(r => {
                const cleanRow = {};
                columns.forEach((col, idx) => {
                    const val = r[col];
                    if (val === "" || val === undefined || val === null || val.toLowerCase() === "null" || val.toLowerCase() === "na") {
                        totalNulls++;
                    }
                    cleanRow[cleanColumns[idx]] = val;
                });
                return cleanRow;
            });
            
            logs.push(`Analyzed null value profiles. Found ${totalNulls} empty/null values across columns.`);
            
            // Map types
            cleanColumns.forEach(col => {
                const sampleVal = cleanRows[0] ? cleanRows[0][col] : "";
                if (!isNaN(sampleVal) && sampleVal !== "") {
                    columnTypes[col] = "number";
                } else if (col.toLowerCase().includes("date") || col.toLowerCase().includes("time")) {
                    columnTypes[col] = "date";
                } else {
                    columnTypes[col] = "string";
                }
            });
            
            logs.push(`Data types mapped. Numerical columns: ${cleanColumns.filter(c => columnTypes[c] === 'number').length}, String columns: ${cleanColumns.filter(c => columnTypes[c] === 'string').length}.`);
            logs.push("STAGE 3: TRANSFORMATION - Cleansing data...");
            logs.push("Standardized column headers to SQL-compliant names.");
            
            // Impute nulls
            cleanColumns.forEach(col => {
                cleanRows.forEach(r => {
                    const val = r[col];
                    if (val === "" || val === undefined || val === null || val.toLowerCase() === "null" || val.toLowerCase() === "na") {
                        if (columnTypes[col] === "number") {
                            r[col] = "0"; // Mock median
                        } else {
                            r[col] = "N/A";
                        }
                    }
                });
            });
            
            logs.push("Filled null values in columns with defaults (0 for numerical, N/A for strings).");
            logs.push("STAGE 4: LOADING - Storing clean dataset in LocalStorage...");
            logs.push("ETL Job successfully loaded into database. Ready for visualization.");
            
            let logIdx = 0;
            
            function printUploadSimulationLog() {
                if (logIdx < logs.length) {
                    const line = logs[logIdx];
                    const timestamp = new Date().toLocaleTimeString();
                    const fullLine = `[${timestamp}] ${line}`;
                    
                    let cssClass = "";
                    if (line.includes("STAGE")) cssClass = "stage";
                    else if (line.includes("Successfully") || line.includes("completed") || line.includes("successfully")) cssClass = "success";
                    else if (line.includes("Error") || line.includes("FAILED")) cssClass = "error";
                    else if (line.includes("Warning") || line.includes("anomalies") || line.includes("Dropped") || line.includes("Filled")) cssClass = "warning";
                    
                    consoleLogs.innerHTML += `<div class="log-line ${cssClass}">${fullLine}</div>`;
                    consoleLogs.scrollTop = consoleLogs.scrollHeight;
                    
                    // Highlight flow chart nodes
                    updateFlowChartAnimation(logs.slice(0, logIdx + 1));
                    
                    logIdx++;
                    setTimeout(printUploadSimulationLog, 250);
                } else {
                    stopElapsedTimer();
                    resetTerminalUI("completed", "ETL Console: COMPLETED (SIM)");
                    completeFlowChartNodes();
                    
                    // Save to LocalStorage
                    localStorage.setItem("using_custom_dataset", "true");
                    localStorage.setItem("dynamic_metadata", JSON.stringify({
                        filename: selectedFile.name,
                        row_count: cleanRows.length,
                        col_count: cleanColumns.length,
                        total_nulls_cleaned: totalNulls,
                        columns: cleanColumns,
                        column_types: columnTypes,
                        ingested_at: new Date().toISOString()
                    }));
                    localStorage.setItem("dynamic_rows", JSON.stringify(cleanRows));
                    
                    const promptCard = document.getElementById("completion-prompt-card");
                    if (promptCard) {
                        promptCard.style.display = "flex";
                        promptCard.scrollIntoView({ behavior: "smooth" });
                    }
                }
            }
            
            printUploadSimulationLog();
            
        } catch (ex) {
            stopElapsedTimer();
            consoleLogs.innerHTML += `<div class="log-line error">[Abort] Simulation failed: ${ex.message}</div>`;
            resetTerminalUI("failed", "ETL Console: FAILED");
        }
    };
    
    reader.readAsText(selectedFile);
}
