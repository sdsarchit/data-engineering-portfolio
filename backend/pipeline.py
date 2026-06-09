import os
import sqlite3
import requests
import pandas as pd
from datetime import datetime

class ETLPipeline:
    def __init__(self, db_path="data.db", log_callback=None):
        self.db_path = db_path
        self.log_callback = log_callback
        self.logs = []
        self._log("Initializing Data Pipeline Engine...")
        self._init_db()

    def _log(self, message):
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        full_msg = f"[{timestamp}] {message}"
        self.logs.append(full_msg)
        print(full_msg)
        if self.log_callback:
            self.log_callback(full_msg)

    def _init_db(self):
        self._log(f"Connecting to SQLite database: {self.db_path}")
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create table for cleaned hourly metrics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS processed_metrics (
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
            )
        """)
        
        # Create quarantine table for failed records (matching Discover Financial experience!)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS quarantine_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                city TEXT,
                timestamp TEXT,
                raw_payload TEXT,
                failure_reason TEXT,
                ingested_at TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        self._log("Database tables initialized successfully.")

    def run_etl(self):
        self.logs = [] # Reset logs for this run
        self._log("Starting ETL Pipeline Job...")
        
        # Target cities relevant to Archit's resume & background!
        cities = {
            "Castro Valley, CA": {"lat": 37.6941, "lon": -122.0722},
            "Painesville, OH": {"lat": 41.7245, "lon": -81.2457},
            "Newark, NJ": {"lat": 40.7357, "lon": -74.1724}
        }
        
        all_raw_records = []
        
        # Step 1: Extraction
        self._log("--- STAGE 1: EXTRACTION (API Ingestion) ---")
        for city_name, coords in cities.items():
            self._log(f"Fetching live Air Quality metrics for {city_name} (Lat: {coords['lat']}, Lon: {coords['lon']})...")
            url = f"https://air-quality-api.open-meteo.com/v1/air-quality?latitude={coords['lat']}&longitude={coords['lon']}&hourly=pm2_5,pm10,nitrogen_dioxide,ozone&forecast_days=1"
            
            try:
                response = requests.get(url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    hourly = data.get("hourly", {})
                    times = hourly.get("time", [])
                    pm2_5 = hourly.get("pm2_5", [])
                    pm10 = hourly.get("pm10", [])
                    no2 = hourly.get("nitrogen_dioxide", [])
                    o3 = hourly.get("ozone", [])
                    
                    self._log(f"Successfully extracted {len(times)} hourly data points for {city_name}.")
                    
                    for i in range(len(times)):
                        record = {
                            "city": city_name,
                            "timestamp": times[i],
                            "pm2_5": pm2_5[i] if i < len(pm2_5) else None,
                            "pm10": pm10[i] if i < len(pm10) else None,
                            "no2": no2[i] if i < len(no2) else None,
                            "o3": o3[i] if i < len(o3) else None
                        }
                        all_raw_records.append(record)
                else:
                    self._log(f"Warning: Failed to fetch data for {city_name}. HTTP Status {response.status_code}")
            except Exception as e:
                self._log(f"Error extracting data for {city_name}: {str(e)}")
        
        if not all_raw_records:
            self._log("CRITICAL ERROR: No records extracted from APIs. Pipeline aborting.")
            return {"status": "FAILED", "reason": "Extraction empty"}

        # Deliberately inject simulated anomalies to demonstrate the Data Quality Rule Engine in action!
        self._log("Simulating real-world dirty data ingestion by injecting validation anomalies...")
        all_raw_records.append({
            "city": "Castro Valley, CA",
            "timestamp": "2026-05-28T00:00",
            "pm2_5": -99.9, # Invalid negative
            "pm10": 15.0,
            "no2": 5.0,
            "o3": 12.0
        })
        all_raw_records.append({
            "city": "Newark, NJ",
            "timestamp": "2026-05-28T04:00",
            "pm2_5": 850.0, # Anomaly: Extreme spike
            "pm10": 420.0,
            "no2": 12.0,
            "o3": 15.0
        })
        all_raw_records.append({
            "city": "Painesville, OH",
            "timestamp": "2026-05-28T08:00",
            "pm2_5": None, # Null violation
            "pm10": 30.0,
            "no2": None,
            "o3": 25.0
        })
        all_raw_records.append({
            "city": "", # Schema violation: Missing city name
            "timestamp": "2026-05-28T12:00",
            "pm2_5": 12.5,
            "pm10": 22.0,
            "no2": 10.0,
            "o3": 18.0
        })

        self._log(f"Total raw records parsed (including 4 test anomalies): {len(all_raw_records)}")
        
        # Step 2: Ingest into Data Quality Rule Engine
        self._log("--- STAGE 2: DATA QUALITY RULE ENGINE (Discover Financial DQ Engine Framework) ---")
        clean_records = []
        quarantine_records = []
        
        for idx, rec in enumerate(all_raw_records):
            # Check schema & nulls
            if not rec.get("city"):
                rec_str = str(rec)
                quarantine_records.append({
                    "city": "UNKNOWN",
                    "timestamp": rec.get("timestamp", "N/A"),
                    "raw_payload": rec_str,
                    "failure_reason": "Rule Failure: Missing mandatory column 'city'"
                })
                continue
                
            if rec.get("pm2_5") is None or rec.get("pm10") is None:
                rec_str = str(rec)
                quarantine_records.append({
                    "city": rec["city"],
                    "timestamp": rec["timestamp"],
                    "raw_payload": rec_str,
                    "failure_reason": "Rule Failure: Null value violation in PM2.5 or PM10"
                })
                continue
                
            # Check bounds and anomalies
            pm2_5_val = rec["pm2_5"]
            pm10_val = rec["pm10"]
            
            if pm2_5_val < 0 or pm10_val < 0:
                rec_str = str(rec)
                quarantine_records.append({
                    "city": rec["city"],
                    "timestamp": rec["timestamp"],
                    "raw_payload": rec_str,
                    "failure_reason": f"Rule Failure: Out-of-bounds metric (Negative PM2.5: {pm2_5_val} or PM10: {pm10_val})"
                })
                continue
                
            if pm2_5_val > 500 or pm10_val > 500:
                rec_str = str(rec)
                quarantine_records.append({
                    "city": rec["city"],
                    "timestamp": rec["timestamp"],
                    "raw_payload": rec_str,
                    "failure_reason": f"Rule Failure: Outlier anomaly detected (Extreme PM2.5: {pm2_5_val} ug/m3 exceeds safety cap of 500)"
                })
                continue
                
            # Passed all DQ checks
            clean_records.append(rec)
            
        self._log(f"DQ Rule Engine Complete: {len(clean_records)} passed checks, {len(quarantine_records)} quarantined.")
        
        # Step 3: Transformation
        self._log("--- STAGE 3: TRANSFORMATION (Pandas Cleansing & Rolling Aggregations) ---")
        df = pd.DataFrame(clean_records)
        
        # Sort chronologically to compute accurate rolling averages
        df = df.sort_values(by=["city", "timestamp"])
        
        # Calculate Rolling 3-Hour Average of PM2.5 per City
        df["pm2_5_rolling_avg"] = df.groupby("city")["pm2_5"].transform(
            lambda x: x.rolling(3, min_periods=1).mean().round(2)
        )
        
        # Map PM2.5 to Air Quality Categories (EPA Standard)
        def get_aqi_category(pm2_5):
            if pm2_5 <= 12.0:
                return "Good"
            elif pm2_5 <= 35.4:
                return "Moderate"
            elif pm2_5 <= 55.4:
                return "Sensitive"
            else:
                return "Unhealthy"
                
        df["aqi_category"] = df["pm2_5"].apply(get_aqi_category)
        df["ingested_at"] = datetime.now().isoformat()
        
        self._log("Calculated 3-hour rolling averages & structured EPA Air Quality Index (AQI) categories.")
        
        # Step 4: Storing / Loading
        self._log("--- STAGE 4: LOADING (SQLite Target Database Storage) ---")
        conn = sqlite3.connect(self.db_path)
        
        # Write quarantined records to DB
        q_count = 0
        if quarantine_records:
            q_df = pd.DataFrame(quarantine_records)
            q_df["ingested_at"] = datetime.now().isoformat()
            # Append to quarantine table
            q_df.to_sql("quarantine_records", conn, if_exists="append", index=False)
            q_count = len(q_df)
            self._log(f"Successfully committed {q_count} quarantined records to DB quarantine_records table.")
            
        # Write clean processed records to DB
        p_count = len(df)
        df.to_sql("processed_metrics", conn, if_exists="append", index=False)
        self._log(f"Successfully committed {p_count} cleansed analytical records to DB processed_metrics table.")
        
        conn.commit()
        conn.close()
        
        self._log("ETL Data Pipeline Job completed successfully! Dashboard metrics ready.")
        
        return {
            "status": "COMPLETED",
            "ingested_raw": len(all_raw_records),
            "processed_clean": p_count,
            "quarantined": q_count,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Test execution
    pipeline = ETLPipeline(db_path="data.db")
    results = pipeline.run_etl()
    print("Execution results summary:", results)
