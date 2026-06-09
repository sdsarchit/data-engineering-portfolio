import sys
import os
import sqlite3
import pandas as pd

DB_PATH = r"C:\Users\sdsar\.gemini\antigravity\scratch\data-engineering-portfolio\backend\data.db"

print("--- Testing stats ---")
try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM processed_metrics")
    processed_count = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM quarantine_records")
    quarantine_count = cursor.fetchone()[0]
    cursor.execute("SELECT MAX(ingested_at) FROM processed_metrics")
    last_ingested = cursor.fetchone()[0] or "Never"
    conn.close()
    
    total = processed_count + quarantine_count
    success_rate = (processed_count / total * 100.0) if total > 0 else 100.0
    db_size_bytes = os.path.getsize(DB_PATH)
    db_size_kb = round(db_size_bytes / 1024.0, 2)
    print("Clean count:", processed_count)
    print("Quarantine count:", quarantine_count)
    print("Success rate:", success_rate)
    print("DB size KB:", db_size_kb)
    print("Last Ingested:", last_ingested)
except Exception as e:
    print("Stats failed:", e)

print("--- Testing charts ---")
try:
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql("SELECT city, timestamp, pm2_5, pm2_5_rolling_avg, aqi_category FROM processed_metrics ORDER BY timestamp ASC", conn)
    conn.close()
    print("DF Empty:", df.empty)
    if not df.empty:
        series = {}
        for city in df["city"].unique():
            city_df = df[df["city"] == city]
            city_df = city_df.tail(12)
            series[city] = {
                "timestamps": city_df["timestamp"].tolist(),
                "pm2_5": city_df["pm2_5"].tolist(),
                "pm2_5_rolling_avg": city_df["pm2_5_rolling_avg"].tolist(),
                "aqi_category": city_df["aqi_category"].tolist()
            }
        aqi_breakdown = df["aqi_category"].value_counts().to_dict()
        print("AQI Breakdown:", aqi_breakdown)
        print("Series Keys:", list(series.keys()))
except Exception as e:
    print("Charts failed:", e)
