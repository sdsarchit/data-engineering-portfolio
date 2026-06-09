/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: VISUAL XAI RESEARCH LAB CONTROLLER
   Coordinates Sliders, SVG Dials, Space HUD compression, and Attention graphs
   ========================================================================= */

// Define feature names for the attention nodes
const featuresList = [
    "Scalar B",
    "BZ GSE",
    "Plasma Temp",
    "Proton Density",
    "Plasma Speed"
];

document.addEventListener("DOMContentLoaded", () => {
    initSliders();
    initSpaceHud();
    initAttentionGraph();
    
    // Initial run of inference
    calculateInference();
    
});

/* ==========================================================================
   SLIDER EVENTS WIRE-UP & HUD INTEGRATION
   ========================================================================== */
function initSliders() {
    const sliders = [
        { id: "input-scalar-b", valId: "val-scalar-b", suffix: " nT" },
        { id: "input-bz-gse", valId: "val-bz-gse", suffix: " nT" },
        { id: "input-plasma-temp", valId: "val-plasma-temp", suffix: " K", format: (v) => parseInt(v).toLocaleString() },
        { id: "input-plasma-speed", valId: "val-plasma-speed", suffix: " km/s" },
        { id: "input-proton-density", valId: "val-proton-density", suffix: " n/cc" }
    ];

    sliders.forEach(s => {
        const input = document.getElementById(s.id);
        const display = document.getElementById(s.valId);
        
        if (input && display) {
            input.addEventListener("input", () => {
                let displayVal = input.value;
                if (s.format) {
                    displayVal = s.format(input.value);
                }
                display.innerText = displayVal + s.suffix;
                
                // Highlight negative BZ GSE
                if (s.id === "input-bz-gse") {
                    if (parseFloat(input.value) < 0) {
                        display.className = "param-val text-cyan";
                    } else {
                        display.className = "param-val text-purple";
                    }
                }
                
                // Reactive updates on input change for real-time responsiveness
                calculateInference();
            });
        }
    });
}

/* ==========================================================================
   SPACE HUD MAGNETOSPHERE CONTROLLER
   ========================================================================== */
let particleInterval = null;
let particlesList = [];

function initSpaceHud() {
    // Generate initial sun flares
    const flaresGroup = document.getElementById("hud-flares");
    flaresGroup.innerHTML = "";
    for (let angle = 0; angle < 360; angle += 45) {
        const rad = (angle * Math.PI) / 180;
        const x2 = 20 + Math.cos(rad) * 28;
        const y2 = 60 + Math.sin(rad) * 28;
        flaresGroup.innerHTML += `<line x1="20" y1="60" x2="${x2}" y2="${y2}"></line>`;
    }

    // Initialize Particle animation loop
    if (particleInterval) clearInterval(particleInterval);
    particleInterval = setInterval(animateHudParticles, 30);
}

function animateHudParticles() {
    const particlesGroup = document.getElementById("hud-particles");
    const speed = parseFloat(document.getElementById("input-plasma-speed").value) / 100; // 2 to 10
    const density = parseFloat(document.getElementById("input-proton-density").value); // 0.5 to 50
    
    // Random spawn based on density setting
    if (Math.random() < (density / 100) + 0.05 && particlesList.length < 40) {
        particlesList.push({
            x: 35,
            y: 35 + Math.random() * 50,
            r: 1 + Math.random() * 2,
            opacity: 0.2 + Math.random() * 0.6
        });
    }

    // Move & filter particles
    particlesList.forEach(p => {
        p.x += speed * 0.8;
        // Warp around Earth magnetosphere
        if (p.x > 210 && p.x < 245) {
            const diffY = p.y - 60;
            p.y += diffY > 0 ? 1.5 : -1.5;
        }
    });

    particlesList = particlesList.filter(p => p.x < 290);

    // Redraw SVG particles
    particlesGroup.innerHTML = particlesList.map(p => `
        <circle cx="${p.x}" cy="${p.y}" r="${p.r}" fill="#cbd5e1" opacity="${p.opacity}"></circle>
    `).join("");
}

function updateSpaceHudVisuals(scalarB, bzGse, temp, speed, density) {
    const hudSun = document.getElementById("hud-sun");
    const shieldOuter = document.getElementById("shield-outer");
    const shieldInner = document.getElementById("shield-inner");
    const shieldCompression = document.getElementById("shield-compression");
    const hudAurora = document.getElementById("hud-aurora");

    // 1. Sun sizing based on temperature
    const tempScale = 0.8 + (temp / 1000000) * 0.5; // 0.8 to 1.3
    hudSun.setAttribute("r", 15 * tempScale);

    // 2. Compression of magnetosphere arcs based on Scalar B and BZ GSE
    // Compression factor: lower values represent stronger compression (pushed closer to Earth)
    const compressionFactor = Math.max(220, 250 - (scalarB * 0.7) + (bzGse * 0.5));
    
    shieldOuter.setAttribute("d", `M 250 60 C ${compressionFactor - 40} -10, ${compressionFactor - 40} 130, 250 60`);
    shieldInner.setAttribute("d", `M 250 60 C ${compressionFactor - 20} 15, ${compressionFactor - 20} 105, 250 60`);
    shieldCompression.setAttribute("d", `M 250 60 C ${compressionFactor} 35, ${compressionFactor} 85, 250 60`);

    // 3. Highlight aurora glows when storm is active
    if (bzGse < 0) {
        const severity = Math.min(1, Math.abs(bzGse) / 30);
        hudAurora.style.stroke = `rgba(16, 185, 129, ${severity})`;
        hudAurora.style.strokeWidth = `${1.5 + severity * 2.5}px`;
        hudAurora.setAttribute("r", `${10 + severity * 4}`);
        shieldCompression.setAttribute("stroke", `rgba(239, 68, 68, ${severity})`); // compress arc glows red
    } else {
        hudAurora.style.stroke = "rgba(16, 185, 129, 0)";
        shieldCompression.setAttribute("stroke", "var(--accent-cyan)");
    }
}

/* ==========================================================================
   INFERENCE, DYNAMIC GAUGE & SHAP FORCE PLOTS CALCULATOR
   ========================================================================== */
function calculateInference() {
    const scalarB = parseFloat(document.getElementById("input-scalar-b").value);
    const bzGse = parseFloat(document.getElementById("input-bz-gse").value);
    const temp = parseFloat(document.getElementById("input-plasma-temp").value);
    const speed = parseFloat(document.getElementById("input-plasma-speed").value);
    const density = parseFloat(document.getElementById("input-proton-density").value);

    // Baseline DST value is 10 nT (Quiet field)
    const baseDst = 10;
    
    // Linear regression weights matching paper findings
    const contributionB = -0.8 * scalarB;
    const contributionBz = 4.2 * bzGse;
    const contributionTemp = -0.000035 * temp;
    const contributionSpeed = -0.04 * speed;
    const contributionDensity = 0.35 * density;
    
    // Sum predictions
    let forecastedDst = Math.round(baseDst + contributionB + contributionBz + contributionTemp + contributionSpeed + contributionDensity);
    forecastedDst = Math.max(-400, Math.min(50, forecastedDst));
    
    // 1. Update Dial Gauge needle angle
    // Scale: +50 (left) to -400 (right). Total range = 450.
    // -90deg is far left, +90deg is far right
    const angle = -90 + ((50 - forecastedDst) / 450) * 180;
    const clampedAngle = Math.max(-90, Math.min(90, angle));
    document.getElementById("gauge-needle").style.transform = `rotate(${clampedAngle}deg)`;

    // Update gauge text details
    const dstDisplay = document.getElementById("gauge-dst-val");
    const statusDisplay = document.getElementById("gauge-status");
    const descDisplay = document.getElementById("gauge-storm-desc");
    
    dstDisplay.innerText = `${forecastedDst} nT`;
    
    if (forecastedDst >= -20) {
        statusDisplay.innerHTML = `<i class="fa-solid fa-circle-check"></i> Quiet Field (No Storm)`;
        statusDisplay.className = "gauge-status text-green";
        descDisplay.innerText = "Earth's magnetic field is stable. Solar wind parameters are normal, showing negligible geomagnetic fluctuations.";
    } else if (forecastedDst >= -50) {
        statusDisplay.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-yellow"></i> Minor Storm (G1)`;
        statusDisplay.className = "gauge-status text-yellow";
        descDisplay.innerText = "Minor geomagnetic storm active. Weak power grid fluctuations may occur. High-latitude auroras might be visible.";
    } else if (forecastedDst >= -100) {
        statusDisplay.innerHTML = `<i class="fa-solid fa-bolt text-orange"></i> Moderate Storm (G2)`;
        statusDisplay.className = "gauge-status text-orange";
        descDisplay.innerText = "Moderate storm active. High-frequency radio propagation may fade in high latitudes, and spacecraft orientation adjustments might be required.";
    } else {
        statusDisplay.innerHTML = `<i class="fa-solid fa-biohazard text-red"></i> Severe Geomagnetic Storm! (G3/G4)`;
        statusDisplay.className = "gauge-status text-red";
        descDisplay.innerText = "WARNING: Extreme solar storm activity! Power grid transformer damage is possible. Satellite tracking issues, voltage alarms, and widespread auroras forecasted.";
    }
    
    // Toggle Storm warning indicator class on the results card
    const resultsCard = document.querySelector(".xai-results-card");
    if (resultsCard) {
        if (forecastedDst < -100) {
            resultsCard.classList.add("warning-active");
        } else {
            resultsCard.classList.remove("warning-active");
        }
    }
    
    // 2. Render Space HUD visuals
    updateSpaceHudVisuals(scalarB, bzGse, temp, speed, density);

    // 3. Render Horizontal SHAP Force plot
    renderShapForcePlot(forecastedDst, contributionB, contributionBz, contributionTemp, contributionSpeed, contributionDensity);
}

function renderShapForcePlot(forecastedDst, b, bz, temp, speed, density) {
    const forceBarNeg = document.getElementById("force-bar-neg");
    const forceBarPos = document.getElementById("force-bar-pos");
    const markerDivider = document.getElementById("force-marker-divider");
    const labelNeg = document.getElementById("force-label-neg");
    const labelPos = document.getElementById("force-label-pos");

    // Scale mapping values: +50 nT = 0%, -400 nT = 100%
    const scaleVal = (val) => ((50 - val) / 450) * 100;
    
    const basePct = scaleVal(10); // Baseline (+10 nT) is at 8.88%
    const predPct = Math.max(2, Math.min(98, scaleVal(forecastedDst)));
    
    // Position predicted marker
    markerDivider.style.left = `${predPct}%`;

    // Separate negative pulls from positive pulls
    const negPull = (b < 0 ? b : 0) + (bz < 0 ? bz : 0) + temp + speed;
    const posPull = (b >= 0 ? b : 0) + (bz >= 0 ? bz : 0) + density;

    labelNeg.innerText = `Negative pull: ${negPull.toFixed(1)} nT`;
    labelPos.innerText = `Positive pull: +${posPull.toFixed(1)} nT`;

    if (predPct >= basePct) {
        // Prediction shifted right (more negative storm status)
        forceBarNeg.style.left = `${basePct}%`;
        forceBarNeg.style.width = `${predPct - basePct}%`;
        forceBarPos.style.left = `${basePct - 4}%`;
        forceBarPos.style.width = `4%`;
    } else {
        // Prediction shifted left (more positive status)
        forceBarNeg.style.left = `${predPct}%`;
        forceBarNeg.style.width = `4%`;
        forceBarPos.style.left = `${predPct}%`;
        forceBarPos.style.width = `${basePct - predPct}%`;
    }

    // Render features list details below
    const container = document.getElementById("shap-bars");
    container.innerHTML = "";
    
    const features = [
        { name: "Scalar B (IMF Mag)", val: b },
        { name: "BZ GSE (Z-Vector)", val: bz },
        { name: "SW Plasma Temp", val: temp },
        { name: "SW Plasma Speed", val: speed },
        { name: "SW Proton Density", val: density }
    ];

    const maxVal = Math.max(...features.map(f => Math.abs(f.val)), 5);
    
    features.forEach(f => {
        const percent = Math.min(100, (Math.abs(f.val) / maxVal) * 100);
        const isPositive = f.val >= 0;
        const bgClass = isPositive ? "bg-pos-pink" : "bg-neg-cyan";
        const textClass = isPositive ? "text-pos-pink" : "text-neg-cyan";
        const sign = isPositive ? "+" : "";
        
        container.innerHTML += `
            <div class="shap-bar-row">
                <span class="shap-feature-label">${f.name}</span>
                <div class="shap-bar-track">
                    <div class="shap-bar-fill ${bgClass}" style="width: ${percent}%;"></div>
                </div>
                <span class="shap-feature-value ${textClass}">${sign}${f.val.toFixed(1)}</span>
            </div>
        `;
    });
}

/* ==========================================================================
   NEURAL ATTENTION CONNECTION GRAPH EXPLORER
   ========================================================================== */
const attentionData = {
    // 5x5 Query-Key Weight Matrix
    1: [
        [0.85, 0.42, 0.12, 0.08, 0.22], // Scalar B Focus
        [0.72, 0.65, 0.18, 0.11, 0.35],
        [0.34, 0.25, 0.55, 0.32, 0.44],
        [0.21, 0.15, 0.45, 0.60, 0.28],
        [0.48, 0.38, 0.33, 0.20, 0.70]
    ],
    2: [
        [0.90, 0.15, 0.05, 0.03, 0.12], // Direct Scalar B tracking
        [0.88, 0.22, 0.08, 0.05, 0.18],
        [0.45, 0.12, 0.48, 0.22, 0.38],
        [0.32, 0.10, 0.38, 0.52, 0.20],
        [0.60, 0.18, 0.25, 0.15, 0.65]
    ],
    3: [
        [0.75, 0.12, 0.08, 0.05, 0.10], // Diagonal Auto-correlations
        [0.10, 0.68, 0.06, 0.08, 0.12],
        [0.08, 0.08, 0.82, 0.10, 0.15],
        [0.05, 0.06, 0.15, 0.79, 0.10],
        [0.12, 0.10, 0.20, 0.11, 0.88]
    ],
    4: [
        [0.35, 0.75, 0.15, 0.10, 0.20], // BZ GSE southward vector orientation
        [0.22, 0.88, 0.12, 0.08, 0.32],
        [0.18, 0.45, 0.50, 0.25, 0.28],
        [0.12, 0.30, 0.35, 0.48, 0.15],
        [0.28, 0.60, 0.20, 0.12, 0.55]
    ]
};

const headDescriptions = {
    1: "Head 1 focus: Scalar B displays high attention weights universally when queried with all parameters. BZ GSE displays contextual attention, indicating high correlation during peak vector variations.",
    2: "Head 2 focus: Strict unilateral query tracking. This head isolates Scalar B (IMF magnitude) as the primary predictive indicator, displaying low attention weights across all other solar wind variables.",
    3: "Head 3 focus: Strong diagonal self-attention mapping. Each feature queries itself with high weight, representing auto-correlation dependencies across immediate hourly time-steps.",
    4: "Head 4 focus: Southward vector orientation mapping. This head queries BZ GSE with extremely high weights, indicating heavy correlation capturing how vector dips allow wind particles to penetate Earth's shield."
};

function initAttentionGraph() {
    const tabs = document.querySelectorAll(".head-tab");
    
    // Initial graph rendering
    renderGraphNodesAndConnections(1);
    
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const headId = parseInt(tab.dataset.head);
            renderGraphNodesAndConnections(headId);
            document.getElementById("head-desc-text").innerText = headDescriptions[headId];
        });
    });
}

function renderGraphNodesAndConnections(headId) {
    const connGroup = document.getElementById("graph-connections");
    const qGroup = document.getElementById("graph-query-nodes");
    const kGroup = document.getElementById("graph-key-nodes");
    
    connGroup.innerHTML = "";
    qGroup.innerHTML = "";
    kGroup.innerHTML = "";
    
    const matrix = attentionData[headId];
    
    // Coordinates
    const xQ = 50;
    const xK = 400;
    const yStep = 55;
    const yStart = 30;
    
    // Draw Connections
    for (let q = 0; q < 5; q++) {
        for (let k = 0; k < 5; k++) {
            const val = matrix[q][k];
            const y1 = yStart + q * yStep;
            const y2 = yStart + k * yStep;
            
            // Highlight connections based on weight values
            const strokeW = Math.max(0.5, val * 6);
            const opacity = val * 0.75 + 0.05;
            
            connGroup.innerHTML += `
                <path d="M ${xQ} ${y1} L ${xK} ${y2}" 
                      id="path-${q}-${k}" 
                      class="attention-path"
                      stroke="rgba(14, 165, 233, ${opacity})" 
                      stroke-width="${strokeW}" 
                      fill="none"
                      style="transition: all 0.3s ease;">
                </path>
            `;
        }
    }
    
    // Draw Query nodes (left) & Key nodes (right)
    for (let i = 0; i < 5; i++) {
        const y = yStart + i * yStep;
        
        // Query Nodes
        qGroup.innerHTML += `
            <g class="graph-node-group" style="cursor: pointer;" onmouseover="hoverQueryNode(${i})" onmouseout="resetQueryNodes()">
                <circle cx="${xQ}" cy="${y}" r="12" fill="#0f172a" stroke="var(--accent-cyan)" stroke-width="2"></circle>
                <text x="${xQ - 18}" y="${y + 4}" fill="#cbd5e1" font-size="9" text-anchor="end" font-weight="600">${featuresList[i]}</text>
            </g>
        `;
        
        // Key Nodes
        kGroup.innerHTML += `
            <g class="graph-node-group">
                <circle cx="${xK}" cy="${y}" r="12" fill="#0f172a" stroke="var(--accent-purple)" stroke-width="2"></circle>
                <text x="${xK + 18}" y="${y + 4}" fill="#cbd5e1" font-size="9" text-anchor="start" font-weight="600">${featuresList[i]}</text>
            </g>
        `;
    }
}

// Hover connection highlights
window.hoverQueryNode = function(qIdx) {
    for (let q = 0; q < 5; q++) {
        for (let k = 0; k < 5; k++) {
            const path = document.getElementById(`path-${q}-${k}`);
            if (path) {
                if (q === qIdx) {
                    path.setAttribute("stroke", "var(--accent-cyan)");
                    // Highlight the connection strongly
                    path.style.opacity = "1";
                } else {
                    path.style.opacity = "0.05";
                }
            }
        }
    }
};

window.resetQueryNodes = function() {
    // Reset all path opacities back to default
    const activeHead = parseInt(document.querySelector(".head-tab.active").dataset.head);
    const matrix = attentionData[activeHead];
    
    for (let q = 0; q < 5; q++) {
        for (let k = 0; k < 5; k++) {
            const path = document.getElementById(`path-${q}-${k}`);
            if (path) {
                const val = matrix[q][k];
                path.setAttribute("stroke", "rgba(14, 165, 233, 1)");
                path.style.opacity = val * 0.75 + 0.05;
            }
        }
    }
};
