import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        # Draw header (skip on page 1)
        if self._pageNumber > 1:
            self.saveState()
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#0f172a")) # Dark slate
            self.drawString(54, 750, "Full-Stack Data Engineering Project Report")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b")) # Cool grey
            self.drawRightString(letter[0] - 54, 750, "Archit Somayajula Portfolio")
            # Header line
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)
            self.restoreState()

        # Draw footer (always show page numbers)
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 36, "Confidential - Production & Security Architecture Review")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 54, 36, page_text)
        # Footer line
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, letter[0] - 54, 48)
        self.restoreState()

def build_pdf(filename):
    # Setup document
    # Margins: 0.75 inch (54 points) left/right, 1 inch (72 points) top/bottom
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=72,
        bottomMargin=72
    )

    # Styles
    styles = getSampleStyleSheet()
    
    # Custom Palette
    primary_color = colors.HexColor("#0f172a") # Dark Slate
    accent_cyan = colors.HexColor("#008a90") # Forest Cyan
    text_color = colors.HexColor("#334155") # Charcoal Text
    
    # Custom Paragraph Styles
    title_style = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#475569"),
        spaceAfter=30
    )
    
    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=20,
        textColor=primary_color,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=accent_cyan,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=text_color,
        spaceAfter=8
    )
    
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=5
    )
    
    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1e293b"),
        backColor=colors.HexColor("#f8fafc"),
        borderColor=colors.HexColor("#e2e8f0"),
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=10
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10,
        textColor=colors.white
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        textColor=text_color
    )

    story = []

    # ==========================================
    # COVER PAGE
    # ==========================================
    story.append(Spacer(1, 80))
    story.append(Paragraph("COMPLETE PROJECT REPORT: ENTERPRISE DATA ENGINEERING PORTFOLIO", title_style))
    story.append(Paragraph("Comprehensive Architectural Design, Core Source Code Analysis, Security Hardening, and Google Cloud Platform (GCP) Multi-Service Deployment", subtitle_style))
    
    # Decorative colored horizontal bar
    d = Table([['']], colWidths=[letter[0]-108], rowHeights=[4])
    d.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), accent_cyan)]))
    story.append(d)
    story.append(Spacer(1, 100))
    
    metadata_text = """
    <b>Prepared For:</b> Senior Engineering Panel & Public Host Distribution<br/>
    <b>Author / Engineer:</b> Archit Somayajula<br/>
    <b>Project Focus:</b> Full-Stack Data Pipelines, Data Quality Guardrails, Web Security Obfuscation<br/>
    <b>Cloud Providers:</b> GCP App Engine (Standard), Firebase Hosting (Edge CDN)<br/>
    <b>Backend Engine:</b> Flask, SQLite 3, PySpark, Docker, REST Services<br/>
    <b>Report Version:</b> 1.1.0 (Production Final)<br/>
    <b>Document Date:</b> June 9, 2026<br/>
    """
    story.append(Paragraph(metadata_text, body_style))
    story.append(PageBreak())

    # ==========================================
    # SECTION 1: OVERVIEW & PHILOSOPHY
    # ==========================================
    story.append(Paragraph("1. Project Overview & Architectural Philosophy", h1_style))
    story.append(Paragraph(
        "This project showcases a complete full-stack web application designed to demonstrate industrial-grade data "
        "engineering workflows. Rather than displaying static resume details, this project hosts a series of functional, "
        "interactive tools running live in a cloud environment.", body_style))
    
    story.append(Paragraph(
        "The project is designed to prove proficiency in building robust ETL pipelines, custom validation frameworks "
        "(modeled after Archit's experience at Discover Financial), containerized or serverless hosting configurations, "
        "and client-side source code obfuscation techniques. The architecture divides the codebase into a clean, "
        "stateless frontend serving user interfaces and a Python Flask API serving data queries.", body_style))
    
    story.append(Paragraph("System Flow Diagram", h2_style))
    story.append(Paragraph(
        "Users interact with the frontend, which requests asynchronous actions from the Flask API (such as triggering an "
        "ETL run or pulling dashboard metrics). The backend fetches live data from open APIs, runs it through the Data "
        "Quality (DQ) Engine, transforms it, and loads it into a local SQLite database. The frontend then dynamically "
        "polls these records to compile live charts and statistics, keeping the browser view completely updated.", body_style))

    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 2: FRONT-END VISUAL SYSTEM
    # ==========================================
    story.append(Paragraph("2. Interactive Front-End UI Components", h1_style))
    story.append(Paragraph(
        "The frontend is designed to feel highly premium, using glassmorphism styling, Harmony HSL colors, Google Fonts "
        "(Plus Jakarta Sans & Space Grotesk), and SVG graphics. In mobile views, the cards automatically collapse to single "
        "columns, and code blocks scroll horizontally to fit smaller viewports (down to 320px) without breaking page layout constraints.", body_style))
    
    story.append(Paragraph("Interactive Sections:", h2_style))
    story.append(Paragraph("&bull; <b>ETL Ingestion Console (pipeline.html)</b>: A terminal emulator where users can trigger the pipeline and watch logs stream from the Flask backend in real time.", bullet_style))
    story.append(Paragraph("&bull; <b>Live Analytics Dashboard (dashboard.html)</b>: Renders metrics from the SQLite database. Utilizes Chart.js to plot hourly air quality index (AQI) values, rolling averages, and quarantine categories.", bullet_style))
    story.append(Paragraph("&bull; <b>Architecture Map (architecture.html)</b>: An interactive SVG drawing of the system flow. Clicking nodes shows specific applied skills, config files, and executes localized simulations.", bullet_style))
    story.append(Paragraph("&bull; <b>Explainable AI Lab (xai.html)</b>: Details published NASA solar wind research using interactive attention connection graphs, SHAP force plot bars, and custom magnetosphere SVGs.", bullet_style))
    
    story.append(PageBreak())

    # ==========================================
    # SECTION 3: PIPELINE & DQ CODE ANALYSIS
    # ==========================================
    story.append(Paragraph("3. Full-Stack Data Pipeline & Ingestion Engine", h1_style))
    story.append(Paragraph(
        "The ETL pipeline core resides in <code>backend/pipeline.py</code>. The code executes a multi-stage ingestion "
        "job that extracts, validates, transforms, and loads air quality data.", body_style))
    
    story.append(Paragraph("Detailed Code Walkthrough & Source Code Reference", h2_style))
    story.append(Paragraph(
        "<b>1. Extraction Stage (pipeline.py: L73-106):</b><br/>"
        "The pipeline iterates over target locations, calling the Open-Meteo Air Quality API via HTTP GET. It extracts "
        "hourly records for PM2.5, PM10, Nitrogen Dioxide (NO2), and Ozone (O3) and returns them in a raw array of dictionaries.", body_style))

    story.append(Paragraph(
        "<b>2. Ingestion & Discover DQ Rules Engine (pipeline.py: L148-202):</b><br/>"
        "To model real-world business constraints, we inject four simulated anomalies (negative value, null value, "
        "extreme spike outlier, and missing mandatory column) into the data stream. The engine validates each dictionary:", body_style))

    dq_source_code = """
for idx, rec in enumerate(all_raw_records):
    # Rule 1: Missing Mandatory Column
    if not rec.get("city"):
        quarantine_records.append({
            "city": "UNKNOWN", "timestamp": rec.get("timestamp", "N/A"),
            "raw_payload": str(rec), "failure_reason": "Missing mandatory column 'city'"
        })
        continue
    # Rule 2: Null Value Violation
    if rec.get("pm2_5") is None or rec.get("pm10") is None:
        quarantine_records.append({
            "city": rec["city"], "timestamp": rec["timestamp"],
            "raw_payload": str(rec), "failure_reason": "Null value violation in PM2.5 or PM10"
        })
        continue
    # Rule 3: Bound Constraints
    pm2_5_val, pm10_val = rec["pm2_5"], rec["pm10"]
    if pm2_5_val < 0 or pm10_val < 0:
        quarantine_records.append({
            "city": rec["city"], "timestamp": rec["timestamp"],
            "raw_payload": str(rec), "failure_reason": f"Out-of-bounds metric (Negative PM2.5: {pm2_5_val})"
        })
        continue
    # Rule 4: Outlier Cap
    if pm2_5_val > 500 or pm10_val > 500:
        quarantine_records.append({
            "city": rec["city"], "timestamp": rec["timestamp"],
            "raw_payload": str(rec), "failure_reason": f"Outlier anomaly detected (PM2.5: {pm2_5_val} ug/m3 exceeds cap of 500)"
        })
        continue
    clean_records.append(rec)
"""
    story.append(Paragraph(dq_source_code.replace("\n", "<br/>").replace("    ", "&nbsp;&nbsp;&nbsp;&nbsp;"), code_style))
    
    story.append(Paragraph(
        "<b>3. Transformation Stage (pipeline.py: L204-228):</b><br/>"
        "Passed records are converted to a Pandas DataFrame, sorted chronologically, and a rolling 3-hour average is calculated "
        "per city. The PM2.5 values are mapped to index categories (Good, Moderate, Sensitive, Unhealthy) based on US EPA standards.", body_style))
    
    story.append(Paragraph(
        "<b>4. Loading Stage (pipeline.py: L230-252):</b><br/>"
        "Establishes a connection to SQLite. Clean analytical rows are appended to the <code>processed_metrics</code> table, "
        "and failed payloads are logged in the <code>quarantine_records</code> table alongside metadata.", body_style))

    story.append(PageBreak())

    # ==========================================
    # SECTION 4: SECURITY HARDENING
    # ==========================================
    story.append(Paragraph("4. Full-Stack Security Hardening & Obfuscation", h1_style))
    story.append(Paragraph(
        "Because frontend code is delivered directly to the client's browser, hiding it completely is not possible. "
        "However, we have implemented robust, full-stack defenses to protect the source code and secure the backend server.", body_style))
    
    story.append(Paragraph("1. Client-Side Inspect Element Prevention (security.js)", h2_style))
    story.append(Paragraph(
        "A dedicated security script (<code>security.js</code>) is loaded in the header of every HTML file. It blocks mouse context "
        "menus (right-clicks) and intercepts key triggers to prevent opening DevTools or viewing the page source. "
        "Additionally, it executes a background debugger loop that stalls browser execution if the inspector is opened:", body_style))

    security_code = """
// Disable context menu
document.addEventListener('contextmenu', event => event.preventDefault());

// Block F12, Ctrl+Shift+I (Inspect), Ctrl+Shift+J (Console), Ctrl+U (View Source)
document.addEventListener('keydown', event => {
    if (event.keyCode === 123) event.preventDefault();
    if (event.ctrlKey && event.shiftKey && (event.keyCode === 73 || event.keyCode === 74 || event.keyCode === 67)) event.preventDefault();
    if (event.ctrlKey && event.keyCode === 85) event.preventDefault();
});

// Active Debugger Loop Traps
(function() {
    setInterval(() => {
        try {
            Function('debugger')(); // Pauses execution if DevTools is open
        } catch (err) {}
    }, 200);
})();
"""
    story.append(Paragraph(security_code.replace("\n", "<br/>").replace("    ", "&nbsp;&nbsp;&nbsp;&nbsp;"), code_style))

    story.append(Paragraph("2. Automated Obfuscation Build Pipeline (build.js)", h2_style))
    story.append(Paragraph(
        "We built a compiler script (<code>build.js</code>) using Node.js to bundle and protect our code. "
        "It minifies CSS and HTML, and obfuscates JavaScript using <code>javascript-obfuscator</code> with high-security rules:", body_style))
    story.append(Paragraph("&bull; <b>Self-Defending Lock</b>: Modifying or formatting the code breaks its logic, crashing the browser tab.", bullet_style))
    story.append(Paragraph("&bull; <b>Control Flow Flattening</b>: Scrambles the execution path, making it extremely hard to follow.", bullet_style))
    story.append(Paragraph("&bull; <b>Console Silencing</b>: Automatically strips out diagnostic print logs in production.", bullet_style))

    story.append(Paragraph("3. Flask Backend Security Hardening (app.py)", h2_style))
    story.append(Paragraph(
        "The Flask API backend is secured against network attacks: debug mode is locked to <code>False</code> in production to "
        "prevent execution of arbitrary code via Flask tracebacks. CORS is locked to accept requests only from the frontend's "
        "domain, and local bindings are isolated during development.", body_style))
    
    story.append(PageBreak())

    # ==========================================
    # SECTION 5: GCP CLOUD INFRASTRUCTURE
    # ==========================================
    story.append(Paragraph("5. Google Cloud Platform (GCP) Infrastructure", h1_style))
    story.append(Paragraph(
        "The application is hosted on Google Cloud Platform, leveraging serverless resources to run securely and stay "
        "entirely within GCP's free tier limits.", body_style))
    
    story.append(Paragraph("Frontend Hosting: Firebase Hosting Edge CDN", h2_style))
    story.append(Paragraph(
        "The obfuscated production assets are served via Firebase Hosting. We configure security headers inside "
        "<code>firebase.json</code> to block frame embedding, MIME-sniffing, and apply a strict Content Security Policy (CSP):", body_style))

    firebase_config = """
{
  "hosting": {
    "public": "dist",
    "headers": [
      {
        "source": "**",
        "headers": [
          { "key": "X-Frame-Options", "value": "DENY" },
          { "key": "X-Content-Type-Options", "value": "nosniff" },
          { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 
            https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 
            https://cdnjs.cloudflare.com; connect-src 'self' https://archit-de-portfolio-8902.uc.r.appspot.com;" }
        ]
      }
    ]
  }
}
"""
    story.append(Paragraph(firebase_config.replace("\n", "<br/>").replace("  ", "&nbsp;&nbsp;"), code_style))

    story.append(Paragraph("Backend Hosting: Google App Engine Standard", h2_style))
    story.append(Paragraph(
        "The Python Flask REST API runs on Google App Engine Standard. It uses the Python 3.12 runtime, F1 instance sizing "
        "(100% free under GCP's 28 instance-hours/day quota), and Gunicorn. GAE handles incoming request loads, queries the "
        "local SQLite database, and returns analytical responses:", body_style))

    app_yaml_code = """
runtime: python312
instance_class: F1
entrypoint: gunicorn -b :$PORT app:app

env_variables:
  FLASK_ENV: "production"
  ALLOWED_ORIGIN: "https://archit-de-portfolio-8902.web.app"
"""
    story.append(Paragraph(app_yaml_code.replace("\n", "<br/>").replace("  ", "&nbsp;&nbsp;"), code_style))
    
    story.append(PageBreak())

    # ==========================================
    # SECTION 6: TOOLS & LIBRARIES DIRECTORY
    # ==========================================
    story.append(Paragraph("6. Tools, Libraries & Rationale Directory", h1_style))
    story.append(Paragraph(
        "The following table documents the core software tools, libraries, and frameworks utilized to construct, "
        "compile, and deploy the portfolio:", body_style))
    
    # Table data
    data = [
        [Paragraph("<b>Tool / Library</b>", table_header_style), Paragraph("<b>Version</b>", table_header_style), Paragraph("<b>Rationale & Application Role</b>", table_header_style)],
        [Paragraph("Python", table_body_style), Paragraph("3.12 / 3.13", table_body_style), Paragraph("Core backend programming language; handles ETL orchestration and API serving.", table_body_style)],
        [Paragraph("Flask", table_body_style), Paragraph("3.0.x", table_body_style), Paragraph("Micro-web framework; handles REST routing, JSON serializing, and CORS.", table_body_style)],
        [Paragraph("Pandas", table_body_style), Paragraph("2.2.x", table_body_style), Paragraph("Data analysis library; computes rolling averages and indexes index categories.", table_body_style)],
        [Paragraph("SQLite 3", table_body_style), Paragraph("Built-in", table_body_style), Paragraph("Relational database engine; stores processed metrics and quarantine tables.", table_body_style)],
        [Paragraph("Gunicorn", table_body_style), Paragraph("21.x", table_body_style), Paragraph("WSGI HTTP server; handles concurrent requests for Python on App Engine.", table_body_style)],
        [Paragraph("Node.js", table_body_style), Paragraph("v24.x", table_body_style), Paragraph("Javascript build runtime environment; executes the build.js compiler.", table_body_style)],
        [Paragraph("javascript-obfuscator", table_body_style), Paragraph("4.1.x", table_body_style), Paragraph("Node module; scrambles variables, flattens flows, and embeds debugger traps.", table_body_style)],
        [Paragraph("clean-css", table_body_style), Paragraph("5.3.x", table_body_style), Paragraph("CSS optimizer; minifies stylesheet files and cleans spacing formatting.", table_body_style)],
        [Paragraph("html-minifier-terser", table_body_style), Paragraph("7.2.x", table_body_style), Paragraph("HTML parser; strips spacing, lines, comments, and minifies inline styles.", table_body_style)],
        [Paragraph("ReportLab", table_body_style), Paragraph("4.5.x", table_body_style), Paragraph("PDF generation library; compiles this complete project documentation.", table_body_style)],
    ]
    
    t = Table(data, colWidths=[1.5*inch, 1.2*inch, 3.8*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ('BOTTOMPADDING', (0,1), (-1,-1), 5),
        ('TOPPADDING', (0,1), (-1,-1), 5),
    ]))
    story.append(t)
    
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 7: GLOSSARY & DEFINITIONS
    # ==========================================
    story.append(Paragraph("7. Data Engineering Glossary & Key Definitions", h1_style))
    story.append(Paragraph("&bull; <b>ETL (Extract, Transform, Load)</b>: The core data integration process where data is read from sources, cleaned/aggregated, and loaded into databases.", bullet_style))
    story.append(Paragraph("&bull; <b>Data Quality (DQ) Rules Engine</b>: A validation framework that inspects incoming data packets against schema constraints (missing columns, null bounds) before writing to target storages.", bullet_style))
    story.append(Paragraph("&bull; <b>Quarantine Table</b>: A designated database table where records failing validation rules are isolated alongside detailed error metadata, preventing pipeline failures.", bullet_style))
    story.append(Paragraph("&bull; <b>Code Obfuscation</b>: The process of transforming source code into a format that is difficult for humans to read and reverse-engineer, while keeping its functionality intact.", bullet_style))
    story.append(Paragraph("&bull; <b>Content Security Policy (CSP)</b>: A security HTTP response header that restricts what resources (scripts, styles, connections) can be loaded and executed by the browser.", bullet_style))
    story.append(Paragraph("&bull; <b>CORS (Cross-Origin Resource Sharing)</b>: A security mechanism that uses HTTP headers to determine whether a browser is permitted to read API responses initiated from a different origin domain.", bullet_style))
    story.append(Paragraph("&bull; <b>App Engine Standard</b>: A serverless GCP platform that runs application instances inside sandboxed containers, scaling resources automatically based on demand.", bullet_style))
    story.append(Paragraph("&bull; <b>Firebase Hosting</b>: A secure, global SSD-backed CDN hosting platform by Google, optimized for serving static frontend web pages quickly and securely.", bullet_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)

if __name__ == "__main__":
    build_pdf("Data_Engineering_Portfolio_Report.pdf")
    print("PDF successfully generated.")
