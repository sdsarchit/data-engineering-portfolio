import os
import sqlite3
import threading
import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
from pipeline import ETLPipeline

app = Flask(__name__)
# Enable CORS with restricted origins in production (fallback to * in dev)
allowed_origins = os.environ.get("ALLOWED_ORIGIN", "*")
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

@app.after_request
def add_header(response):
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.db")

# Global pipeline state to manage concurrent triggers and log streaming
pipeline_state = {
    "status": "IDLE",  # IDLE, RUNNING, COMPLETED, FAILED
    "logs": [],
    "last_result": None
}

def log_collector(message):
    pipeline_state["logs"].append(message)

def execute_pipeline_async():
    pipeline_state["status"] = "RUNNING"
    pipeline_state["logs"] = []
    
    try:
        pipeline = ETLPipeline(db_path=DB_PATH, log_callback=log_collector)
        results = pipeline.run_etl()
        pipeline_state["last_result"] = results
        if results.get("status") == "COMPLETED":
            pipeline_state["status"] = "COMPLETED"
        else:
            pipeline_state["status"] = "FAILED"
    except Exception as e:
        err_msg = f"CRITICAL PIPELINE EXCEPTION: {str(e)}"
        pipeline_state["logs"].append(err_msg)
        pipeline_state["status"] = "FAILED"
        pipeline_state["last_result"] = {"status": "FAILED", "reason": str(e)}

@app.route("/api/pipeline/run", methods=["POST"])
def trigger_pipeline():
    if pipeline_state["status"] == "RUNNING":
        return jsonify({"status": "RUNNING", "message": "Pipeline is already running in the background."}), 400
        
    pipeline_state["status"] = "RUNNING"
    pipeline_state["logs"] = []
    pipeline_state["last_result"] = None
    
    # Launch async pipeline thread (mimicking real-time distributed execution!)
    thread = threading.Thread(target=execute_pipeline_async)
    thread.daemon = True
    thread.start()
    
    return jsonify({"status": "RUNNING", "message": "Pipeline triggered successfully."})

@app.route("/api/pipeline/status", methods=["GET"])
def get_pipeline_status():
    return jsonify({
        "status": pipeline_state["status"],
        "logs": pipeline_state["logs"],
        "result": pipeline_state["last_result"]
    })

@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    if not os.path.exists(DB_PATH):
        return jsonify({
            "total_processed": 0,
            "total_quarantined": 0,
            "success_rate": 100.0,
            "db_size_kb": 0,
            "last_ingested": "None"
        })
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Fetch count of successfully processed records
    cursor.execute("SELECT COUNT(*) FROM processed_metrics")
    processed_count = cursor.fetchone()[0]
    
    # Fetch count of quarantined records
    cursor.execute("SELECT COUNT(*) FROM quarantine_records")
    quarantine_count = cursor.fetchone()[0]
    
    # Get last ingestion timestamp
    cursor.execute("SELECT MAX(ingested_at) FROM processed_metrics")
    last_ingested = cursor.fetchone()[0] or "Never"
    
    conn.close()
    
    total = processed_count + quarantine_count
    success_rate = (processed_count / total * 100.0) if total > 0 else 100.0
    
    db_size_bytes = os.path.getsize(DB_PATH)
    db_size_kb = round(db_size_bytes / 1024.0, 2)
    
    return jsonify({
        "total_processed": processed_count,
        "total_quarantined": quarantine_count,
        "success_rate": round(success_rate, 2),
        "db_size_kb": db_size_kb,
        "last_ingested": last_ingested
    })

@app.route("/api/dashboard/charts", methods=["GET"])
def get_chart_data():
    if not os.path.exists(DB_PATH):
        return jsonify({"series": {}, "summary": {}})
        
    conn = sqlite3.connect(DB_PATH)
    
    # Query cleansed records
    df = pd.read_sql("SELECT city, timestamp, pm2_5, pm2_5_rolling_avg, aqi_category FROM processed_metrics ORDER BY timestamp ASC", conn)
    conn.close()
    
    if df.empty:
        return jsonify({"series": {}, "summary": {}})
    
    # Process structured JSON for Chart.js
    series = {}
    for city in df["city"].unique():
        city_df = df[df["city"] == city]
        # Keep latest 12 hourly readings per city to avoid chart clutter
        city_df = city_df.tail(12)
        
        series[city] = {
            "timestamps": city_df["timestamp"].tolist(),
            "pm2_5": city_df["pm2_5"].tolist(),
            "pm2_5_rolling_avg": city_df["pm2_5_rolling_avg"].tolist(),
            "aqi_category": city_df["aqi_category"].tolist()
        }
        
    # Get overall AQI Category breakdown for a doughnut chart
    aqi_breakdown = df["aqi_category"].value_counts().to_dict()
    
    return jsonify({
        "series": series,
        "aqi_breakdown": aqi_breakdown
    })

@app.route("/api/dashboard/quarantine", methods=["GET"])
def get_quarantine_records():
    if not os.path.exists(DB_PATH):
        return jsonify([])
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Query latest 15 quarantined entries
    cursor.execute("""
        SELECT city, timestamp, raw_payload, failure_reason, ingested_at 
        FROM quarantine_records 
        ORDER BY id DESC 
        LIMIT 15
    """)
    rows = cursor.fetchall()
    conn.close()
    
    records = []
    for r in rows:
        records.append({
            "city": r[0],
            "timestamp": r[1],
            "raw_payload": r[2],
            "failure_reason": r[3],
            "ingested_at": r[4]
        })
        
    return jsonify(records)

if __name__ == "__main__":
    # Hardened environment and debug configurations
    flask_env = os.environ.get("FLASK_ENV", "production")
    debug_mode = (flask_env == "development")
    
    # Restrict to localhost during local development for network security
    host_ip = "127.0.0.1" if debug_mode else "0.0.0.0"
    
    print(f"Starting API Server - Mode: {flask_env.upper()} (Host: {host_ip}, Debug: {debug_mode}, Database: {DB_PATH})")
    app.run(host=host_ip, port=5000, debug=debug_mode)
