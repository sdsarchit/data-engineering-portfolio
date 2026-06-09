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
            self.drawString(54, 750, "Data Engineering Portfolio Project Report")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b")) # Cool grey
            self.drawRightString(letter[0] - 54, 750, "Archit Somayajula")
            # Header line
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, letter[0] - 54, 742)
            self.restoreState()

        # Draw footer (always show page numbers)
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(54, 36, "Confidential - Professional Portfolio Documentation")
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
        fontSize=26,
        leading=32,
        textColor=primary_color,
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=13,
        leading=18,
        textColor=colors.HexColor("#475569"),
        spaceAfter=40
    )
    
    h1_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=primary_color,
        spaceBefore=18,
        spaceAfter=10,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SubSectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=accent_cyan,
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['BodyText'],
        fontName='Helvetica',
        fontSize=10,
        leading=15,
        textColor=text_color,
        spaceAfter=10
    )
    
    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=20,
        firstLineIndent=-10,
        spaceAfter=6
    )
    
    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
        backColor=colors.HexColor("#f8fafc"),
        borderColor=colors.HexColor("#e2e8f0"),
        borderWidth=0.5,
        borderPadding=8,
        spaceAfter=12
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    table_body_style = ParagraphStyle(
        'TableBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=text_color
    )

    story = []

    # ==========================================
    # COVER PAGE
    # ==========================================
    story.append(Spacer(1, 100))
    story.append(Paragraph("DATA ENGINEERING PORTFOLIO PROJECT REPORT", title_style))
    story.append(Paragraph("Enterprise-Grade Full-Stack Hosting, Obfuscation Pipelines, and Google Cloud Platform (GCP) Architecture", subtitle_style))
    
    # Decorative colored horizontal bar
    d = Table([['']], colWidths=[letter[0]-108], rowHeights=[4])
    d.setStyle(TableStyle([('BACKGROUND', (0,0), (-1,-1), accent_cyan)]))
    story.append(d)
    story.append(Spacer(1, 120))
    
    metadata_text = """
    <b>Prepared For:</b> Public Presentation & Industry Review<br/>
    <b>Engineer:</b> Archit Somayajula<br/>
    <b>Core Specialty:</b> Data Engineering & Platform Architecture<br/>
    <b>Deployment Targets:</b> GCP App Engine, Firebase Hosting, SQLite Analytics<br/>
    <b>Date:</b> June 9, 2026<br/>
    """
    story.append(Paragraph(metadata_text, body_style))
    story.append(PageBreak())

    # ==========================================
    # SECTION 1: EXECUTIVE SUMMARY
    # ==========================================
    story.append(Paragraph("1. Executive Summary & Goals", h1_style))
    story.append(Paragraph(
        "This project documentation details the engineering process, codebase architectural layout, and full-stack "
        "security implementations of Archit Somayajula's Data Engineering Portfolio. The primary goal of this application "
        "is to provide a production-ready, interactive demonstration platform showcasing data pipelines, data quality engines, "
        "and explainable AI integrations under real-world scenarios.", body_style))
    
    story.append(Paragraph("Key Core System Offerings:", h2_style))
    story.append(Paragraph("&bull; <b>Interactive Ingestion Console</b>: Live execution of python-based ETL pipeline jobs with step-by-step stdout log streaming.", bullet_style))
    story.append(Paragraph("&bull; <b>Data Quality Verification</b>: Interactive anomalies log quarantine monitoring modeled after financial validation frameworks.", bullet_style))
    story.append(Paragraph("&bull; <b>Orchestrated Blueprints</b>: Visual system flow chart showcasing skill integrations across Apache Spark, Airflow, and Snowflake.", bullet_style))
    story.append(Paragraph("&bull; <b>Explainable AI Lab</b>: Attention connection graphs and SHAP contribution visualizers detailing published NASA space weather research.", bullet_style))
    
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 2: SYSTEM ARCHITECTURE
    # ==========================================
    story.append(Paragraph("2. System Architecture & Component Design", h1_style))
    story.append(Paragraph(
        "The system has been re-architected from a simple local showcase into a multi-page full-stack cloud-native "
        "application. It maintains strict separation of concerns, executing as a stateless serverless backend API and "
        "an edge-cached obfuscated static web interface.", body_style))
    
    story.append(Paragraph("Frontend Design System", h2_style))
    story.append(Paragraph(
        "The frontend is built using standard semantic HTML5, Vanilla CSS3, and JavaScript (ES6). Spacing is governed "
        "by HSL CSS design tokens. A responsive menu-drawer is provided for mobile viewports, stacking grid cards vertically "
        "and isolating layouts to fit standard mobile viewports (down to 320px) without horizontal page stretching.", body_style))
    
    story.append(Paragraph("Backend REST API", h2_style))
    story.append(Paragraph(
        "The API is written in Python utilizing the Flask framework. The backend maintains global pipeline state variables "
        "managing concurrent trigger requests and streams stdout logs to pollers via JSON API interfaces. It queries stats, "
        "breakdown summaries, and the latest quarantine logs from a SQLite database file.", body_style))
    
    story.append(Paragraph("SQLite Data Warehouse Schema", h2_style))
    story.append(Paragraph(
        "Data is organized into two primary SQLite tables representing clean processed analytical records and isolated, "
        "quarantined schema/bounds violations:", body_style))

    schema_code = """
CREATE TABLE processed_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT,
    timestamp TEXT,
    pm2_5 REAL,
    pm10 REAL,
    no2 REAL,
    o3 REAL,
    pm2_5_rolling_avg REAL,
    aqi_category TEXT,
    ingested_at TEXT
);

CREATE TABLE quarantine_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT,
    timestamp TEXT,
    raw_payload TEXT,
    failure_reason TEXT,
    ingested_at TEXT
);
"""
    story.append(Paragraph(schema_code.replace("\n", "<br/>").replace("    ", "&nbsp;&nbsp;&nbsp;&nbsp;"), code_style))
    story.append(PageBreak())

    # ==========================================
    # SECTION 3: PIPELINE & DQ RULES ENGINE
    # ==========================================
    story.append(Paragraph("3. Pipeline & Data Quality Rules Engine", h1_style))
    story.append(Paragraph(
        "The pipeline simulates real-world distributed architectures. Upon invocation, the ETL engine handles extraction, "
        "validation, transformation, and storage sequentially:", body_style))
    
    story.append(Paragraph("1. Extraction", h2_style))
    story.append(Paragraph(
        "Fetches live hourly air quality reports from the Open-Meteo Air Quality API for Castro Valley, CA, Painesville, OH, "
        "and Newark, NJ. It extracts PM2.5, PM10, Nitrogen Dioxide (NO2), and Ozone (O3) parameters.", body_style))

    story.append(Paragraph("2. Ingestion & Discover DQ Rules Engine", h2_style))
    story.append(Paragraph(
        "To model Archit's real-world professional data quality experience at Discover Financial Services, all raw entries "
        "are passed through a custom Data Quality Rule Engine. To demonstrate the engine's capabilities, four simulated anomalies "
        "(negative values, null values, extreme outliers, and missing mandatory schema keys) are intentionally injected into "
        "the extraction stream. The engine evaluates each record against strict rules:", body_style))
    
    story.append(Paragraph("&bull; <b>Mandatory Columns</b>: Validates presence of mandatory keys (e.g. 'city'). Violators routed to Quarantine.", bullet_style))
    story.append(Paragraph("&bull; <b>Null Checks</b>: Detects missing metric readings (e.g. PM2.5 = Null). Violators routed to Quarantine.", bullet_style))
    story.append(Paragraph("&bull; <b>Bound Constraints</b>: Verifies reading values are positive (e.g. PM2.5 < 0). Violators routed to Quarantine.", bullet_style))
    story.append(Paragraph("&bull; <b>Outlier Cap</b>: Evaluates extreme outlier anomalies (e.g. PM2.5 > 500 ug/m3). Violators routed to Quarantine.", bullet_style))
    
    story.append(Paragraph("3. Transformation", h2_style))
    story.append(Paragraph(
        "Valid records undergo cleaning and calculation: computes 3-hour rolling averages of PM2.5 and labels EPA "
        "Air Quality Index categories (Good, Moderate, Sensitive, Unhealthy) via Pandas transformations.", body_style))

    story.append(Paragraph("4. Loading", h2_style))
    story.append(Paragraph(
        "Analytical data sets are bulk-committed to 'processed_metrics', and dirty payloads are quarantined in "
        "'quarantine_records' alongside failure reason annotations.", body_style))

    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 4: SECURITY & OBFUSCATION
    # ==========================================
    story.append(Paragraph("4. Full-Stack Security Hardening & Obfuscation", h1_style))
    story.append(Paragraph(
        "To ensure the website remains secure and resilient in a public environment, robust defense measures "
        "have been applied to both the client-side files and backend APIs.", body_style))
    
    story.append(Paragraph("Client-Side Inspect Element Protection", h2_style))
    story.append(Paragraph(
        "To deter unauthorized copying, a dedicated script (security.js) blocks common inspection shortcuts. "
        "Furthermore, if DevTools is opened, an active debugger trap pauses browser execution, rendering the inspector frozen.", body_style))
    
    story.append(Paragraph("Automated Obfuscation Build Pipeline", h2_style))
    story.append(Paragraph(
        "We implemented an automated build script (build.js) that compiles raw assets from 'frontend/' into 'dist/' "
        "using DevDependencies. It minifies HTML and CSS, and obfuscates JavaScript using javascript-obfuscator:", body_style))
    
    story.append(Paragraph("&bull; <b>Self-Defending Lock</b>: Script crashes automatically if pretty-printed or formatted.", bullet_style))
    story.append(Paragraph("&bull; <b>Control Flow Flattening</b>: Obfuscates code logical structures, making it unreadable.", bullet_style))
    story.append(Paragraph("&bull; <b>Silencing Outputs</b>: Removes all diagnostic console.log calls in production.", bullet_style))

    story.append(Paragraph("Backend API Hardening", h2_style))
    story.append(Paragraph(
        "The Flask backend has been hardened against attack vectors: debug mode is disabled by default, preventing arbitrary "
        "code execution via Flask tracebacks. Additionally, CORS is restricted to allow connections only from the frontend's "
        "domain, and local bindings are isolated during development.", body_style))
    
    story.append(PageBreak())

    # ==========================================
    # SECTION 5: GCP DEPLOYMENT
    # ==========================================
    story.append(Paragraph("5. Google Cloud Platform (GCP) Deployment", h1_style))
    story.append(Paragraph(
        "The project is hosted in production on Google Cloud Platform, leveraging serverless components to stay "
        "entirely within GCP's free tiers.", body_style))
    
    story.append(Paragraph("Frontend: Firebase Hosting CDN", h2_style))
    story.append(Paragraph(
        "The obfuscated 'dist/' directory is hosted on Firebase Hosting. Custom HTTP security headers are enforced "
        "via firebase.json to block framing, prevent MIME-sniffing, restrict permissions, and enforce a strict Content Security Policy:", body_style))

    csp_headers = """
"headers": [
  { "key": "X-Frame-Options", "value": "DENY" },
  { "key": "X-Content-Type-Options", "value": "nosniff" },
  { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 
    https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com 
    https://cdnjs.cloudflare.com; connect-src 'self' http://127.0.0.1:5000 
    https://archit-de-portfolio-8902.uc.r.appspot.com https://air-quality-api.open-meteo.com;" }
]
"""
    story.append(Paragraph(csp_headers.replace("\n", "<br/>").replace("  ", "&nbsp;&nbsp;"), code_style))

    story.append(Paragraph("Backend: Google App Engine Standard", h2_style))
    story.append(Paragraph(
        "The Flask API backend is deployed on App Engine Standard. It runs on a free F1 instance using the Python 3.12 runtime "
        "and Gunicorn. It connects securely to the SQLite database and handles requests on demand.", body_style))
    
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 6: SOURCE CODE FILE DIRECTORY
    # ==========================================
    story.append(Paragraph("6. Project Directory Map", h1_style))
    story.append(Paragraph(
        "Below is a directory mapping of the core files in the repository, outlining their roles in development and deployment:", body_style))
    
    # Table data
    data = [
        [Paragraph("<b>File / Folder</b>", table_header_style), Paragraph("<b>Target Environment</b>", table_header_style), Paragraph("<b>Function / Role</b>", table_header_style)],
        [Paragraph("run.bat", table_body_style), Paragraph("Local Windows Dev", table_body_style), Paragraph("Launcher; sets dev environment and launches Flask/HTTP servers.", table_body_style)],
        [Paragraph("package.json", table_body_style), Paragraph("Build Environment", table_body_style), Paragraph("Defines npm tasks and build dependencies for minifiers & obfuscators.", table_body_style)],
        [Paragraph("build.js", table_body_style), Paragraph("Build Node Runtime", table_body_style), Paragraph("Automated compiler script mapping frontend/ to protected dist/.", table_body_style)],
        [Paragraph("firebase.json", table_body_style), Paragraph("Firebase Hosting CDN", table_body_style), Paragraph("Defines static root and embeds HTTP security headers (CSP, Frame options).", table_body_style)],
        [Paragraph("netlify.toml", table_body_style), Paragraph("Netlify Cloud CDN", table_body_style), Paragraph("Secondary configuration mapping build target dist/ and headers.", table_body_style)],
        [Paragraph("backend/app.py", table_body_style), Paragraph("Flask App Engine API", table_body_style), Paragraph("REST endpoint handler; queries SQLite statistics and handles ETL triggers.", table_body_style)],
        [Paragraph("backend/pipeline.py", table_body_style), Paragraph("Python Backend", table_body_style), Paragraph("ETL process engine featuring the Custom Discover DQ rules checks.", table_body_style)],
        [Paragraph("backend/app.yaml", table_body_style), Paragraph("App Engine Standard", table_body_style), Paragraph("Declares python312 runtime, F1 class, and CORS Allowed Origins.", table_body_style)],
        [Paragraph("frontend/security.js", table_body_style), Paragraph("Obfuscated Frontend", table_body_style), Paragraph("Active protection scripts blocking mouse context and key shortcuts.", table_body_style)],
    ]
    
    # Table style
    t = Table(data, colWidths=[1.5*inch, 1.8*inch, 3.2*inch])
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

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)

if __name__ == "__main__":
    build_pdf("Data_Engineering_Portfolio_Report.pdf")
    print("PDF successfully generated.")
