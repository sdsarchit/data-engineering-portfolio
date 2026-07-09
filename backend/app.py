import os
import sqlite3
import threading
import pandas as pd
import io
import json
import re
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

# Initialize database registry table
def init_registry_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dynamic_metadata_registry (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    conn.commit()
    conn.close()

init_registry_db()

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

# ==========================================
# CUSTOM GENERIC FILE INGESTION & NLP QUERY
# ==========================================

# Temporary in-memory log list for the dynamic upload job
dynamic_upload_state = {
    "status": "IDLE", # IDLE, RUNNING, COMPLETED, FAILED
    "logs": []
}

class RAGSchemaResolver:
    """
    RAG (Retrieval-Augmented Generation) Column Schema Resolver.
    Maps natural language concept requests to database schema columns dynamically
    using TF-IDF-like semantic synonym expansion.
    """
    def __init__(self, columns, column_types, sample_rows=None):
        self.columns = columns
        self.column_types = column_types
        self.sample_rows = sample_rows or []
        self.index = self._build_semantic_index()

    def _build_semantic_index(self):
        # Semantic mapping index for RAG concepts
        semantic_dictionary = {
            "time": ["date", "time", "timestamp", "year", "month", "hour", "created_at", "updated_at", "timeline", "clock", "chronological"],
            "location": ["city", "region", "town", "location", "country", "state", "place", "area", "address", "geographic", "lat", "lon", "coordinates"],
            "quantity": ["quantity", "count", "amount", "number", "total", "sum", "size", "volume"],
            "financial": ["price", "cost", "revenue", "sales", "profit", "income", "charge", "fee", "tax", "dollar"],
            "metric": ["value", "reading", "index", "pm25", "pm10", "score", "rate", "speed", "temp", "temperature", "humidity", "weather", "dust"]
        }
        
        index = []
        for col in self.columns:
            col_lower = col.lower()
            related_terms = [col_lower]
            for category, keywords in semantic_dictionary.items():
                if col_lower == category or any(kw in col_lower for kw in keywords):
                    related_terms.extend(keywords)
                    related_terms.append(category)
            
            sample_vals = []
            for row in self.sample_rows[:5]:
                if col in row and row[col] is not None:
                    sample_vals.append(str(row[col]))
            
            index.append({
                "column": col,
                "type": self.column_types.get(col, "string"),
                "terms": list(set(related_terms)),
                "samples": sample_vals
            })
        return index

    def retrieve_relevant_column(self, query):
        q_words = re.findall(r"\w+", query.lower())
        best_col = None
        highest_score = 0
        
        for doc in self.index:
            score = 0
            for q_word in q_words:
                if q_word in doc["column"].lower():
                    score += 10 # Substring match
                for term in doc["terms"]:
                    if q_word == term:
                        score += 5 # Synonym match
                    elif q_word in term or term in q_word:
                        score += 2
            
            if "average" in query.lower() or "mean" in query.lower() or "sum" in query.lower():
                if doc["type"] == "number":
                    score += 3
                    
            if score > highest_score:
                highest_score = score
                best_col = doc["column"]
                
        return best_col

@app.route("/api/pipeline/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"status": "FAILED", "message": "No file part in the request."}), 400
        
    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"status": "FAILED", "message": "No file selected."}), 400
        
    filename = uploaded_file.filename
    ext = os.path.splitext(filename)[1].lower()
    
    if ext not in [".csv", ".json"]:
        return jsonify({"status": "FAILED", "message": "Unsupported file format. Please upload a CSV or JSON file."}), 400
        
    dynamic_upload_state["status"] = "RUNNING"
    dynamic_upload_state["logs"] = []
    
    def log_upload(msg):
        from datetime import datetime
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_msg = f"[{timestamp}] {msg}"
        dynamic_upload_state["logs"].append(full_msg)
        print(full_msg)
        
    from datetime import datetime
    log_upload(f"STAGE 1: EXTRACTION - Reading uploaded file: {filename}")
    
    row_count = 0
    col_count = 0
    total_nulls = 0
    col_types = {}
    df = None
    
    use_spark = False
    try:
        from pyspark.sql import SparkSession
        from pyspark.sql.functions import col
        use_spark = True
    except ImportError:
        pass
        
    if use_spark:
        try:
            log_upload("Initializing PySpark Session for high-efficiency distributed dataset profiling...")
            spark = SparkSession.builder \
                .appName("PortfolioETL") \
                .master("local[2]") \
                .config("spark.driver.memory", "512m") \
                .config("spark.sql.shuffle.partitions", "2") \
                .getOrCreate()
                
            # Save uploaded bytes to temp disk file
            temp_dir = os.path.dirname(os.path.abspath(__file__))
            temp_path = os.path.join(temp_dir, f"temp_spark_{filename}")
            
            uploaded_file.seek(0)
            with open(temp_path, "wb") as f:
                f.write(uploaded_file.read())
                
            if ext == ".csv":
                df_spark = spark.read.csv(temp_path, header=True, inferSchema=True)
            else:
                df_spark = spark.read.json(temp_path)
                
            row_count = df_spark.count()
            col_count = len(df_spark.columns)
            
            # Map column types
            for field in df_spark.schema.fields:
                spark_type = str(field.dataType).lower()
                if "int" in spark_type or "double" in spark_type or "float" in spark_type or "long" in spark_type:
                    col_types[field.name] = "number"
                elif "date" in spark_type or "timestamp" in spark_type or "date" in field.name.lower() or "time" in field.name.lower():
                    col_types[field.name] = "date"
                else:
                    col_types[field.name] = "string"
            
            # Profile nulls using Spark select expression
            from pyspark.sql.functions import count, when, isnan
            null_exprs = [count(when(isnan(c) | col(c).isNull(), c)).alias(c) for c in df_spark.columns]
            null_df = df_spark.select(*null_exprs).collect()[0].asDict()
            total_nulls = sum(null_df.values())
            
            log_upload(f"[PySpark] Successfully extracted {row_count} rows and {col_count} columns.")
            log_upload(f"[PySpark] Analyzed null value profiles. Found {total_nulls} null values.")
            
            # Limit to first 20,000 records for DB insertion to prevent GAE OOM
            df = df_spark.limit(20000).toPandas()
            
            # Clean up temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        except Exception as spark_err:
            log_upload(f"PySpark extraction failed: {str(spark_err)}. Falling back to Pandas...")
            use_spark = False
            if 'temp_path' in locals() and os.path.exists(temp_path):
                os.remove(temp_path)
                
    if not use_spark:
        try:
            # Stream file directly to pandas and limit rows to 20,000
            uploaded_file.seek(0)
            if ext == ".csv":
                df = pd.read_csv(uploaded_file, nrows=20000)
            else:
                df = pd.read_json(uploaded_file)
                if len(df) > 20000:
                    df = df.head(20000)
                
            row_count = len(df)
            col_count = len(df.columns)
            sample_suffix = " (sampled for performance)" if row_count >= 20000 else ""
            log_upload(f"Successfully extracted {row_count} rows and {col_count} columns{sample_suffix}.")
            
            # Profile Nulls in Pandas
            null_counts = df.isnull().sum().to_dict()
            total_nulls = sum(null_counts.values())
            log_upload(f"Analyzed null value profiles. Found {total_nulls} empty/null values across columns.")
            
            # Profile types in Pandas
            numerical_cols = []
            categorical_cols = []
            for col in df.columns:
                dtype = str(df[col].dtype)
                if "int" in dtype or "float" in dtype:
                    col_types[col] = "number"
                    numerical_cols.append(col)
                elif "datetime" in dtype or "date" in col.lower() or "time" in col.lower():
                    col_types[col] = "date"
                else:
                    col_types[col] = "string"
                    categorical_cols.append(col)
            
            log_upload(f"Data types mapped. Numerical columns: {len(numerical_cols)}, String columns: {len(categorical_cols)}.")
            
        except Exception as e:
            log_upload(f"Pandas profiling failed: {str(e)}")
            dynamic_upload_state["status"] = "FAILED"
            return jsonify({"status": "FAILED", "message": f"Parsing failed: {str(e)}"}), 400
        
    # Stage 3: Transformation
    log_upload("STAGE 3: TRANSFORMATION - Cleansing data...")
    try:
        # Standardize headers to be clean SQL names (alphanumeric + underscores)
        old_cols = list(df.columns)
        new_cols = []
        for col in old_cols:
            clean_name = re.sub(r"[^a-zA-Z0-9_]", "", col.replace(" ", "_").strip())
            # Ensure column is not empty string after cleansing
            if not clean_name:
                clean_name = f"col_{len(new_cols)}"
            new_cols.append(clean_name)
            
        df.columns = new_cols
        log_upload("Standardized column headers to SQL-compliant names.")
        
        # Drop columns that are 100% null
        cols_to_drop = [col for col in df.columns if df[col].isnull().all()]
        if cols_to_drop:
            df.drop(columns=cols_to_drop, inplace=True)
            log_upload(f"Dropped {len(cols_to_drop)} columns that were 100% null.")
            
        # Fill missing values: median for numbers, "N/A" for strings
        for col in df.columns:
            if df[col].isnull().any():
                dtype = col_types.get(old_cols[new_cols.index(col)], "string")
                if dtype == "number":
                    median_val = df[col].median()
                    df[col].fillna(median_val, inplace=True)
                    log_upload(f"Filled null values in numerical column '{col}' with column median ({median_val}).")
                else:
                    df[col].fillna("N/A", inplace=True)
                    log_upload(f"Filled null values in text column '{col}' with default 'N/A'.")
                    
        # Update col types keys to match standardized names
        clean_col_types = {new_cols[old_cols.index(k)]: v for k, v in col_types.items()}
        
    except Exception as e:
        log_upload(f"Transformation error: {str(e)}")
        dynamic_upload_state["status"] = "FAILED"
        return jsonify({"status": "FAILED", "message": f"Transformation failed: {str(e)}"}), 400
        
    # Stage 4: Loading into SQLite
    log_upload("STAGE 4: LOADING - Storing clean dataset in database...")
    try:
        conn = sqlite3.connect(DB_PATH)
        # Save to dynamic table
        df.to_sql("dynamic_processed_data", conn, if_exists="replace", index=False)
        
        # Save profile metadata to registry
        metadata = {
            "filename": filename,
            "row_count": row_count,
            "col_count": len(df.columns),
            "total_nulls_cleaned": total_nulls,
            "columns": list(df.columns),
            "column_types": clean_col_types,
            "ingested_at": datetime.now().isoformat()
        }
        
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR REPLACE INTO dynamic_metadata_registry (key, value) VALUES ('latest_metadata', ?)",
            (json.dumps(metadata),)
        )
        conn.commit()
        conn.close()
        
        log_upload("ETL Job successfully loaded into database. Ready for visualization.")
        dynamic_upload_state["status"] = "COMPLETED"
        
        return jsonify({"status": "COMPLETED", "message": "ETL ingestion completed successfully.", "metadata": metadata})
        
    except Exception as e:
        log_upload(f"Loading error: {str(e)}")
        dynamic_upload_state["status"] = "FAILED"
        return jsonify({"status": "FAILED", "message": f"Loading failed: {str(e)}"}), 500

@app.route("/api/pipeline/upload/status", methods=["GET"])
def get_upload_status():
    return jsonify({
        "status": dynamic_upload_state["status"],
        "logs": dynamic_upload_state["logs"]
    })

def seed_preset_into_dynamic():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if dynamic metadata already exists
    cursor.execute("SELECT 1 FROM dynamic_metadata_registry WHERE key = 'latest_metadata'")
    if cursor.fetchone():
        conn.close()
        return
        
    # Check if preset weather data exists in processed_metrics
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='processed_metrics'")
    if not cursor.fetchone():
        conn.close()
        return
        
    try:
        df = pd.read_sql("SELECT * FROM processed_metrics", conn)
        if df.empty:
            conn.close()
            return
            
        df.to_sql("dynamic_processed_data", conn, if_exists="replace", index=False)
        
        # Save registry metadata
        from datetime import datetime
        metadata = {
            "filename": "Preset Weather API Stream",
            "row_count": len(df),
            "col_count": len(df.columns),
            "total_nulls_cleaned": 0,
            "columns": list(df.columns),
            "column_types": {
                "city": "string",
                "timestamp": "date",
                "pm2_5": "number",
                "pm2_5_rolling_avg": "number",
                "aqi_category": "string"
            },
            "ingested_at": datetime.now().isoformat()
        }
        
        cursor.execute(
            "INSERT OR REPLACE INTO dynamic_metadata_registry (key, value) VALUES ('latest_metadata', ?)",
            (json.dumps(metadata),)
        )
        conn.commit()
    except Exception as e:
        print(f"Error seeding preset weather: {str(e)}")
        
    conn.close()

@app.route("/api/dynamic/stats", methods=["GET"])
def get_dynamic_stats():
    if not os.path.exists(DB_PATH):
        return jsonify({"status": "EMPTY", "message": "No database found."})
        
    # Seed preset data if no custom upload exists yet
    seed_preset_into_dynamic()
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM dynamic_metadata_registry WHERE key = 'latest_metadata'")
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return jsonify({"status": "EMPTY", "message": "No custom files uploaded yet."})
        
    metadata = json.loads(row[0])
    
    # Query first 50 rows
    df = pd.read_sql("SELECT * FROM dynamic_processed_data LIMIT 50", conn)
    conn.close()
    
    # Generate numerical summaries
    numerical_summaries = {}
    for col, ctype in metadata["column_types"].items():
        if ctype == "number" and col in df.columns:
            numerical_summaries[col] = {
                "min": float(df[col].min()) if not df[col].empty else 0,
                "max": float(df[col].max()) if not df[col].empty else 0,
                "mean": float(df[col].mean()) if not df[col].empty else 0
            }
            
    return jsonify({
        "status": "SUCCESS",
        "metadata": metadata,
        "summaries": numerical_summaries,
        "rows": df.to_dict(orient="records")
    })

@app.route("/api/dynamic/query", methods=["POST"])
def query_dynamic_data():
    req_data = request.get_json() or {}
    query_str = req_data.get("query", "").strip()
    
    if not query_str:
        return jsonify({"status": "ERROR", "message": "Query string is empty."}), 400
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM dynamic_metadata_registry WHERE key = 'latest_metadata'")
    row = cursor.fetchone()
    
    if not row:
        conn.close()
        return jsonify({"status": "ERROR", "message": "No custom dataset is currently loaded."}), 400
        
    metadata = json.loads(row[0])
    columns = metadata["columns"]
    col_types = metadata["column_types"]
    
    # NLP SQL Query Generator
    q = query_str.lower()
    select_clause = "*"
    where_clause = ""
    limit_clause = " LIMIT 10"
    
    # 1. Dynamically retrieve best matching column using RAG Schema Resolver
    # Query first few rows as sample data to feed semantic index
    cursor.execute("SELECT * FROM dynamic_processed_data LIMIT 5")
    sample_headers = [desc[0] for desc in cursor.description]
    sample_rows = [dict(zip(sample_headers, r)) for r in cursor.fetchall()]
    
    resolver = RAGSchemaResolver(columns, col_types, sample_rows)
    target_col = resolver.retrieve_relevant_column(query_str)
            
    # 2. Match Aggregation
    is_agg = False
    if "average" in q or "avg" in q or "mean" in q:
        if target_col and col_types.get(target_col) == "number":
            select_clause = f"AVG({target_col}) as average_{target_col}"
            is_agg = True
    elif "max" in q or "highest" in q or "maximum" in q:
        if target_col:
            select_clause = f"MAX({target_col}) as max_{target_col}"
            is_agg = True
    elif "min" in q or "lowest" in q or "minimum" in q:
        if target_col:
            select_clause = f"MIN({target_col}) as min_{target_col}"
            is_agg = True
    elif "sum" in q or "total" in q:
        if target_col and col_types.get(target_col) == "number":
            select_clause = f"SUM({target_col}) as total_{target_col}"
            is_agg = True
    elif "count" in q or "how many" in q:
        select_clause = "COUNT(*) as count"
        is_agg = True
        
    # 3. Match Filter (Simple "where region equals East" or "city = Painesville")
    # Resolve semantic column name in filters using RAG resolver
    for col in columns:
        col_lower = col.lower()
        pattern = rf"([\w_]+)\s*(?:is|=|==|equals)\s*([\w\s\-\.,]+)"
        for match in re.finditer(pattern, q):
            filter_concept = match.group(1).strip()
            filter_val = match.group(2).strip().replace("'", "").replace('"', '')
            matched_filter_col = resolver.retrieve_relevant_column(filter_concept)
            if matched_filter_col == col:
                where_clause = f" WHERE {col} = '{filter_val}'"
                break
            
    sql = f"SELECT {select_clause} FROM dynamic_processed_data{where_clause}"
    if not is_agg and "limit" not in q:
        sql += limit_clause
        
    try:
        cursor.execute(sql)
        headers = [desc[0] for desc in cursor.description]
        rows = cursor.fetchall()
        conn.close()
        
        results = []
        for r in rows:
            results.append(dict(zip(headers, r)))
            
        return jsonify({
            "status": "SUCCESS",
            "sql": sql,
            "query": query_str,
            "results": results
        })
        
    except Exception as e:
        conn.close()
        return jsonify({
            "status": "ERROR",
            "sql": sql,
            "message": f"Failed to execute generated SQL query: {str(e)}"
        }), 500

if __name__ == "__main__":
    # Hardened environment and debug configurations
    flask_env = os.environ.get("FLASK_ENV", "production")
    debug_mode = (flask_env == "development")
    
    # Restrict to localhost during local development for network security
    host_ip = "127.0.0.1" if debug_mode else "0.0.0.0"
    
    print(f"Starting API Server - Mode: {flask_env.upper()} (Host: {host_ip}, Debug: {debug_mode}, Database: {DB_PATH})")
    app.run(host=host_ip, port=5000, debug=debug_mode)
