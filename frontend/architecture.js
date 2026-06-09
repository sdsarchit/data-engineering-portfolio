/* ==========================================================================
   ARCHIT SOMAYAJULA PORTFOLIO: ENTERPRISE ARCHITECTURE CONTROLLER
   Coordinates Pipeline Nodes, Code Viewer, Checklists, and Simulations
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initNodeClickHandlers();
    initWorkspaceTabs();
    
    // Initialize default node (Sources)
    selectNode("sources");
});

/* ==========================================================================
   BLUEPRINT DATA FOR PIPELINE STAGES
   ========================================================================== */
const nodeBlueprints = {
    sources: {
        title: "1. Enterprise Data Sources",
        desc: "Ingests raw business logs, database updates, and external IoT streams into cloud data lakes. Emulates high-throughput pipelines parsing structured CSVs and nested JSON payloads.",
        icon: '<i class="fa-solid fa-database text-cyan"></i>',
        checklist: [
            "Ingesting S3 & Local Streams",
            "Parsing CSV / JSON Payloads",
            "Legacy DB Migrations (Oracle, Teradata)",
            "Schema Evolution Handling"
        ],
        metrics: [
            { label: "Ingestion Latency", value: "1.2s avg" },
            { label: "Daily Data Volume", value: "2.4 TB" }
        ],
        code: `# Production Code: Data Stream Extractor
import json
import requests
import boto3

def extract_s3_payload(bucket, key):
    """Ingests raw JSON metrics from S3 external landing stage"""
    s3 = boto3.client('s3')
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        payload = json.loads(response['Body'].read().decode('utf-8'))
        return payload
    except Exception as e:
        print(f"Extraction failed: {e}")
        raise e
`,
        config: `{
  "source_type": "s3_external_stage",
  "bucket_name": "s3a://data-lake-raw-ingest/",
  "ingest_frequency": "hourly",
  "schema": {
    "city": "string",
    "latitude": "float",
    "longitude": "float",
    "metrics": "array"
  }
}`,
        simControls: `
            <button class="btn btn-primary" id="btn-trigger-api-stream"><i class="fa-solid fa-cloud-arrow-down"></i> Pull API Payload Stream</button>
        `,
        initSim: function() {
            document.getElementById("btn-trigger-api-stream").addEventListener("click", () => {
                const logs = document.getElementById("sim-console-logs");
                const viz = document.getElementById("sim-visualization-box");
                
                logs.innerHTML = '<div class="log-line system">[Fetching] Requesting stream from Open-Meteo REST API...</div>';
                viz.innerHTML = '<div class="spinner-loader" style="width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 1s infinite linear;"></div>';
                
                setTimeout(() => {
                    logs.innerHTML += '<div class="log-line success">[Success] 200 OK. Raw JSON stream payload received:</div>';
                    
                    const mockData = {
                        location: "Painesville, OH",
                        coordinates: [41.7242, -81.2457],
                        aqi_pm2_5: 12.5,
                        timestamp: new Date().toISOString()
                    };
                    
                    logs.innerHTML += `<div class="log-line system">${JSON.stringify(mockData)}</div>`;
                    
                    viz.innerHTML = `
                        <div class="glass-card" style="padding: 1rem; width: 90%; border-color: var(--accent-cyan); text-align: left; font-size: 0.8rem;">
                            <span class="text-gradient font-bold" style="font-size: 0.95rem;">Incoming Stream:</span>
                            <div style="font-family: var(--font-mono); margin-top: 0.4rem;">
                                <div><strong>City:</strong> Painesville</div>
                                <div><strong>PM2.5:</strong> 12.5 ug/m3</div>
                                <div><strong>Coords:</strong> [41.72, -81.24]</div>
                            </div>
                        </div>
                    `;
                }, 1200);
            });
        }
    },
    orchestration: {
        title: "2. Orchestration & Scheduling",
        desc: "Schedules and coordinates recurring data pipelines. Employs Apache Airflow DAG workflows and Azure Data Factory (ADF) triggers to run tasks with full dependency tracking.",
        icon: '<i class="fa-solid fa-clock-rotate-left text-cyan"></i>',
        checklist: [
            "Apache Airflow DAG Design",
            "Azure Data Factory Ingestion Triggers",
            "AWS Glue Crawler Scheduling",
            "Task SLA Monitoring & Retries"
        ],
        metrics: [
            { label: "SLA Success Rate", value: "99.92%" },
            { label: "Scheduled Tasks / Day", value: "48 runs" }
        ],
        code: `# Production Code: Airflow Ingestion DAG
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'Archit.DE',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': True
}

with DAG(
    'weather_etl_pipeline',
    default_args=default_args,
    schedule_interval='0 * * * *', # Hourly
    start_date=datetime(2026, 1, 1),
    catchup=False
) as dag:
    
    # sequence mapping defined in tasks definitions
    # run_weather_extractor >> run_dq_validator >> run_spark_join >> load_snowflake
    pass
`,
        config: `# Airflow DAG Task DAG Graph Outline
dag_id: weather_etl_pipeline
schedule_interval: "0 * * * *"
tasks:
  - id: run_weather_extractor
    operator: PythonOperator
    pool: ingestion_pool
  - id: run_dq_validator
    operator: PythonOperator
    dependencies: [run_weather_extractor]
  - id: run_spark_join
    operator: DatabricksSubmitRunOperator
    dependencies: [run_dq_validator]
  - id: load_snowflake
    operator: SnowflakeOperator
    dependencies: [run_spark_join]
`,
        simControls: `
            <button class="btn btn-primary" id="btn-trigger-airflow"><i class="fa-solid fa-play"></i> Trigger Airflow DAG Run</button>
        `,
        initSim: function() {
            document.getElementById("btn-trigger-airflow").addEventListener("click", () => {
                const logs = document.getElementById("sim-console-logs");
                const viz = document.getElementById("sim-visualization-box");
                
                logs.innerHTML = "";
                
                const workflow = [
                    { time: 0, msg: "[Airflow] Scheduler initiating DAG weather_etl_pipeline...", type: "system" },
                    { time: 600, msg: "[Airflow] Task run_weather_extractor: starting running on worker-node-4", type: "stage" },
                    { time: 1300, msg: "[Airflow] Task run_weather_extractor: SUCCESS. Output file generated in S3 staging.", type: "success" },
                    { time: 1900, msg: "[Airflow] Task run_dq_validator: executing Discover schema sanity rules...", type: "stage" },
                    { time: 2600, msg: "[Airflow] Task run_dq_validator: SUCCESS. Checked 3 local records.", type: "success" },
                    { time: 3200, msg: "[Airflow] Task load_snowflake: copying staging data to warehouse tables...", type: "stage" },
                    { time: 4000, msg: "[Airflow] Task load_snowflake: SUCCESS. Ingest run completed.", type: "success" },
                    { time: 4500, msg: "[Airflow] DAG run finished successfully. Status: CLOSED.", type: "system" }
                ];
                
                viz.innerHTML = '<div class="airflow-dag-graph" style="display: flex; gap: 0.5rem; align-items: center;"></div>';
                const graph = viz.querySelector(".airflow-dag-graph");
                
                const tasks = ["Extract", "Validate", "Load"];
                tasks.forEach(t => {
                    graph.innerHTML += `
                        <div class="dag-task-node" id="task-${t}" style="padding: 0.5rem 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.8rem; background: rgba(255,255,255,0.02); transition: var(--transition-smooth);">
                            ${t}
                        </div>
                        ${t !== "Load" ? '<i class="fa-solid fa-arrow-right text-muted" id="arrow-' + t + '"></i>' : ''}
                    `;
                });
                
                workflow.forEach(step => {
                    setTimeout(() => {
                        const line = document.createElement("div");
                        line.className = `log-line ${step.type}`;
                        line.innerText = step.msg;
                        logs.appendChild(line);
                        logs.scrollTop = logs.scrollHeight;
                        
                        // Active node indicators
                        if (step.msg.includes("run_weather_extractor: starting")) {
                            document.getElementById("task-Extract").style.borderColor = "var(--accent-cyan)";
                            document.getElementById("task-Extract").style.background = "rgba(14, 165, 233, 0.1)";
                        } else if (step.msg.includes("run_weather_extractor: SUCCESS")) {
                            document.getElementById("task-Extract").style.borderColor = "var(--accent-green)";
                            document.getElementById("task-Extract").style.background = "rgba(16, 185, 129, 0.1)";
                            document.getElementById("arrow-Extract").className = "fa-solid fa-arrow-right text-green";
                        } else if (step.msg.includes("run_dq_validator: executing")) {
                            document.getElementById("task-Validate").style.borderColor = "var(--accent-cyan)";
                            document.getElementById("task-Validate").style.background = "rgba(14, 165, 233, 0.1)";
                        } else if (step.msg.includes("run_dq_validator: SUCCESS")) {
                            document.getElementById("task-Validate").style.borderColor = "var(--accent-green)";
                            document.getElementById("task-Validate").style.background = "rgba(16, 185, 129, 0.1)";
                            document.getElementById("arrow-Validate").className = "fa-solid fa-arrow-right text-green";
                        } else if (step.msg.includes("load_snowflake: copying")) {
                            document.getElementById("task-Load").style.borderColor = "var(--accent-cyan)";
                            document.getElementById("task-Load").style.background = "rgba(14, 165, 233, 0.1)";
                        } else if (step.msg.includes("load_snowflake: SUCCESS")) {
                            document.getElementById("task-Load").style.borderColor = "var(--accent-green)";
                            document.getElementById("task-Load").style.background = "rgba(16, 185, 129, 0.1)";
                        }
                    }, step.time);
                });
            });
        }
    },
    processing: {
        title: "3. PySpark Processing (Databricks)",
        desc: "Processes high-volume datasets using Apache Spark on Azure Databricks. Optimizes sharding performance by utilizing map-side broadcast joins instead of standard shuffles.",
        icon: '<i class="fa-solid fa-bolt text-cyan"></i>',
        checklist: [
            "PySpark DataFrame API",
            "Broadcast Hash Joins",
            "Executor Shard Partitioning",
            "Spark UI DAG Tuning"
        ],
        metrics: [
            { label: "Shuffle Latency Cut", value: "95% Reduction" },
            { label: "Spark Join Runtime", value: "0.15s" }
        ],
        code: `# Production Code: Map-Side Broadcast Join
from pyspark.sql import SparkSession
from pyspark.sql.functions import broadcast

# Spark cluster context initiation
spark = SparkSession.builder \\
    .appName("MapSideBroadcastJoinOptimizer") \\
    .getOrCreate()

# Large transaction log stream Parquet tables
large_df = spark.read.parquet("s3a://data-lakehouse/large_metrics/")
# Small geography key-value metadata tables (<10MB)
small_lookup_df = spark.read.parquet("s3a://data-lakehouse/city_metadata/")

# Optimize by broadcasting small lookup dataframe to bypass shuffle
optimized_df = large_df.join(broadcast(small_lookup_df), "city_id")
`,
        config: `# Spark cluster configuration profile parameters
spark.sql.autoBroadcastJoinThreshold: 10485760 # 10MB
spark.sql.shuffle.partitions: 8
spark.executor.instances: 4
spark.executor.cores: 2
spark.executor.memory: "4g"
`,
        simControls: `
            <div class="toggle-control-group" style="display: flex; gap: 0.5rem; flex-direction: column;">
                <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Join strategy:</label>
                <div class="join-strategy-buttons" style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary active" id="strategy-shuffle" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Standard Shuffle</button>
                    <button class="btn btn-secondary" id="strategy-broadcast" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;">Broadcast Join</button>
                </div>
            </div>
            <button class="btn btn-primary" id="btn-trigger-spark"><i class="fa-solid fa-play"></i> Execute Spark Job</button>
        `,
        initSim: function() {
            const strategyShuffle = document.getElementById("strategy-shuffle");
            const strategyBroadcast = document.getElementById("strategy-broadcast");
            let activeStrat = "shuffle";
            
            strategyShuffle.addEventListener("click", () => {
                strategyShuffle.classList.add("active");
                strategyBroadcast.classList.remove("active");
                activeStrat = "shuffle";
            });
            strategyBroadcast.addEventListener("click", () => {
                strategyBroadcast.classList.add("active");
                strategyShuffle.classList.remove("active");
                activeStrat = "broadcast";
            });
            
            document.getElementById("btn-trigger-spark").addEventListener("click", () => {
                const logs = document.getElementById("sim-console-logs");
                const viz = document.getElementById("sim-visualization-box");
                
                logs.innerHTML = '<div class="log-line system">[Spark Session] Initializing task driver...</div>';
                viz.innerHTML = '<div class="spark-dag-canvas" style="display: flex; flex-direction: column; align-items: center; gap: 0.4rem;"></div>';
                
                const canvas = viz.querySelector(".spark-dag-canvas");
                canvas.innerHTML = `
                    <div class="dag-box" id="box-1" style="padding: 0.4rem 0.8rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">Large Dataframe</div>
                    <div class="dag-arrow" id="arr-1"><i class="fa-solid fa-angles-down text-muted"></i></div>
                    <div class="dag-box" id="box-2" style="padding: 0.4rem 0.8rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">Shuffle &amp; Partition Exchange</div>
                    <div class="dag-arrow" id="arr-2"><i class="fa-solid fa-angles-down text-muted"></i></div>
                    <div class="dag-box" id="box-3" style="padding: 0.4rem 0.8rem; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.75rem;">Hash Join Stage</div>
                `;
                
                if (activeStrat === "shuffle") {
                    setTimeout(() => {
                        logs.innerHTML += '<div class="log-line stage">[1/3] Shuffling partitions across cluster network...</div>';
                        document.getElementById("box-1").style.borderColor = "var(--accent-cyan)";
                    }, 400);
                    setTimeout(() => {
                        logs.innerHTML += '<div class="log-line warning">[2/3] Exchanged 160MB data. Network serialization latency detected.</div>';
                        document.getElementById("box-2").style.borderColor = "var(--accent-purple)";
                        document.getElementById("arr-1").querySelector("i").className = "fa-solid fa-angles-down text-purple";
                    }, 1400);
                    setTimeout(() => {
                        logs.innerHTML += '<div class="log-line success">[3/3] Hash join finished. Runtime: 4.5s.</div>';
                        document.getElementById("box-3").style.borderColor = "var(--accent-green)";
                        document.getElementById("arr-2").querySelector("i").className = "fa-solid fa-angles-down text-green";
                    }, 2400);
                } else {
                    setTimeout(() => {
                        logs.innerHTML += '<div class="log-line stage">[1/2] Broadcasting small lookup table...</div>';
                        document.getElementById("box-1").style.borderColor = "var(--accent-cyan)";
                    }, 400);
                    setTimeout(() => {
                        logs.innerHTML += '<div class="log-line success">[2/2] Bypassed shuffle exchange. Map-Side Hash Join finished. Runtime: 0.15s.</div>';
                        document.getElementById("box-2").style.opacity = "0.3";
                        document.getElementById("box-2").innerText = "Bypassed (Map-Side)";
                        document.getElementById("box-3").style.borderColor = "var(--accent-green)";
                        document.getElementById("arr-1").querySelector("i").className = "fa-solid fa-angles-down text-green";
                        document.getElementById("arr-2").querySelector("i").className = "fa-solid fa-angles-down text-green";
                    }, 1200);
                }
            });
        }
    },
    quality: {
        title: "4. Discover DQ Guard & Quarantine",
        desc: "A custom data quality validation engine modeled after Discover Financial patterns. Filters null values and range violations, isolating anomalies in local database tables.",
        icon: '<i class="fa-solid fa-shield-halved text-cyan"></i>',
        checklist: [
            "Type Sanity Checking",
            "Null / Boundary Constraints",
            "Anomaly DB Quarantine Routing",
            "Slack Alert Webhooks"
        ],
        metrics: [
            { label: "Data Hygiene Rate", value: "100%" },
            { label: "Isolated Anomalies", value: "16 Records" }
        ],
        code: `# Production Code: Data Quality Sanity Checker
import pandas as pd
from datetime import datetime

def evaluate_dq_rules(payload):
    """Inspects values against Discover Financial schema rules"""
    violations = []
    
    # Boundary Constraint checking
    pm2_5 = payload.get('pm2_5')
    if pm2_5 is None:
        violations.append("null_pm2_5_metric")
    elif pm2_5 < 0 or pm2_5 > 500:
        violations.append("pm2_5_out_of_bounds")
        
    # Coordinate boundary checking
    lat = payload.get('latitude')
    lon = payload.get('longitude')
    if lat is None or not (-90 <= lat <= 90):
        violations.append("lat_coordinate_bounds_error")
        
    return violations
`,
        config: `-- Quarantine Isolation DB Schema
CREATE TABLE processed_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city VARCHAR(50),
    latitude FLOAT,
    longitude FLOAT,
    pm2_5 FLOAT,
    ingested_at TIMESTAMP
);

CREATE TABLE quarantine_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city VARCHAR(50),
    raw_payload TEXT,
    failure_reason VARCHAR(100),
    quarantined_at TIMESTAMP
);`,
        simControls: `
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Select Payload To Inject:</label>
                <select id="dq-payload-type" class="select-input" style="padding: 0.4rem; font-size: 0.8rem;">
                    <option value="clean">Clean Payload (Normal Ingestion)</option>
                    <option value="negative">Negative Metric anomaly (PM2.5 = -99.9)</option>
                    <option value="nulls">Null Coordinate Boundary Anomaly</option>
                </select>
            </div>
            <button class="btn btn-primary" id="btn-trigger-dq"><i class="fa-solid fa-shield"></i> Inject Anomaly</button>
        `,
        initSim: function() {
            document.getElementById("btn-trigger-dq").addEventListener("click", () => {
                const type = document.getElementById("dq-payload-type").value;
                const logs = document.getElementById("sim-console-logs");
                const viz = document.getElementById("sim-visualization-box");
                
                logs.innerHTML = '<div class="log-line system">[DQ Engine] Intercepting incoming stream packet...</div>';
                viz.innerHTML = '<div class="spinner-loader" style="width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 1s infinite linear;"></div>';
                
                setTimeout(() => {
                    if (type === "clean") {
                        logs.innerHTML += '<div class="log-line success">[Passed] Schema checks succeeded. Writing to processed_metrics table.</div>';
                        viz.innerHTML = `
                            <div class="glass-card" style="padding: 0.75rem; border-color: var(--accent-green); font-size: 0.75rem; text-align: left;">
                                <div class="text-green font-bold"><i class="fa-solid fa-circle-check"></i> PROCESSED_METRICS</div>
                                <div style="font-family: var(--font-mono); margin-top: 0.2rem;">Commit SUCCESS. Ingested 1 row.</div>
                            </div>
                        `;
                    } else if (type === "negative") {
                        logs.innerHTML += '<div class="log-line error">[Failed] Rule failure: pm2_5_out_of_bounds (PM2.5 = -99.9)</div>';
                        logs.innerHTML += '<div class="log-line warning">[Quarantine] Isolation Routing task initialized.</div>';
                        viz.innerHTML = `
                            <div class="glass-card" style="padding: 0.75rem; border-color: var(--accent-yellow); font-size: 0.75rem; text-align: left;">
                                <div class="text-yellow font-bold"><i class="fa-solid fa-triangle-exclamation"></i> QUARANTINE_RECORDS</div>
                                <div style="font-family: var(--font-mono); margin-top: 0.2rem;">
                                    <div><strong>Reason:</strong> pm2_5_out_of_bounds</div>
                                    <div><strong>Value:</strong> -99.9</div>
                                </div>
                            </div>
                        `;
                    } else {
                        logs.innerHTML += '<div class="log-line error">[Failed] Rule failure: lat_coordinate_bounds_error (Latitude = null)</div>';
                        logs.innerHTML += '<div class="log-line warning">[Quarantine] Isolation Routing task initialized.</div>';
                        viz.innerHTML = `
                            <div class="glass-card" style="padding: 0.75rem; border-color: var(--accent-yellow); font-size: 0.75rem; text-align: left;">
                                <div class="text-yellow font-bold"><i class="fa-solid fa-triangle-exclamation"></i> QUARANTINE_RECORDS</div>
                                <div style="font-family: var(--font-mono); margin-top: 0.2rem;">
                                    <div><strong>Reason:</strong> lat_coordinate_bounds_error</div>
                                    <div><strong>Value:</strong> null</div>
                                </div>
                            </div>
                        `;
                    }
                }, 1000);
            });
        }
    },
    warehouse: {
        title: "5. Snowflake Data Warehouse",
        desc: "Consolidates cleaned datasets into analytical tables inside Snowflake. Implements external copy stages and complex window ranking SQL queries for business intelligence.",
        icon: '<i class="fa-solid fa-snowflake text-cyan"></i>',
        checklist: [
            "Snowflake COPY STAGE ingest",
            "Virtual Warehouse Autoscaling",
            "SQL Window Ranks & Aggregations",
            "Database Schema Modeling"
        ],
        metrics: [
            { label: "Query Speed", value: "0.52s avg" },
            { label: "Storage Size", value: "58.2 GB" }
        ],
        code: `-- Production SQL: Analytical Window Ranking
SELECT 
    CASE_ID,
    ASSIGNED_UNIT,
    INGEST_TIME,
    RESOLUTION_TIME,
    ROW_NUMBER() OVER (
        PARTITION BY ASSIGNED_UNIT 
        ORDER BY INGEST_TIME DESC
    ) AS STATUS_RANK
FROM DATA_LAKEHOUSE.ANALYTICS.CASES
WHERE STATUS = 'RESOLVED';
`,
        config: `-- Copy Stage staging setup configurations
CREATE OR REPLACE STAGE my_s3_stage
  URL = 's3://dw-prod-ingest/'
  CREDENTIALS = (AWS_KEY_ID='***' AWS_SECRET_KEY='***');

CREATE OR REPLACE FILE FORMAT csv_format
  TYPE = 'CSV'
  FIELD_DELIMITER = ','
  SKIP_HEADER = 1;
`,
        simControls: `
            <div style="display: flex; flex-direction: column; gap: 0.5rem; width: 100%;">
                <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Warehouse Size:</label>
                <select id="sf-wh-size" class="select-input" style="padding: 0.4rem; font-size: 0.8rem;">
                    <option value="XS">XS (1 Credit/Hr)</option>
                    <option value="S">S (2 Credits/Hr)</option>
                    <option value="M">M (4 Credits/Hr)</option>
                    <option value="L">L (8 Credits/Hr)</option>
                </select>
            </div>
            <button class="btn btn-primary" id="btn-trigger-sf"><i class="fa-solid fa-circle-nodes"></i> Trigger Snowflake query</button>
        `,
        initSim: function() {
            document.getElementById("btn-trigger-sf").addEventListener("click", () => {
                const wh = document.getElementById("sf-wh-size").value;
                const logs = document.getElementById("sim-console-logs");
                const viz = document.getElementById("sim-visualization-box");
                
                logs.innerHTML = `<div class="log-line system">[Compute] Deploying Virtual Warehouse size: ${wh}...</div>`;
                viz.innerHTML = '<div class="spinner-loader" style="width: 30px; height: 30px; border: 3px solid rgba(255,255,255,0.1); border-top-color: var(--accent-cyan); border-radius: 50%; animation: spin 1s infinite linear;"></div>';
                
                const runtimes = { XS: 4.2, S: 2.1, M: 1.1, L: 0.5 };
                const time = runtimes[wh];
                
                setTimeout(() => {
                    logs.innerHTML += '<div class="log-line stage">[Execution] Analyzing Case-Management aggregate partition columns...</div>';
                }, 400);
                
                setTimeout(() => {
                    logs.innerHTML += `<div class="log-line success">[Completed] Query execution finished. Time Elapsed: ${time}s.</div>`;
                    viz.innerHTML = `
                        <div class="sf-table-wrapper" style="width: 100%; max-height: 150px; overflow-y: auto;">
                            <table class="sf-results-table">
                                <thead>
                                    <tr><th>CASE_ID</th><th>ASSIGNED_UNIT</th><th>STATUS_RANK</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td>CS-908</td><td>Unit-Delta</td><td>1</td></tr>
                                    <tr><td>CS-702</td><td>Unit-Alpha</td><td>2</td></tr>
                                    <tr><td>CS-411</td><td>Unit-Beta</td><td>3</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `;
                }, time * 1000 + 600);
            });
        }
    },
    api: {
        title: "6. API Serving (Django / Celery / Redis)",
        desc: "Delivers cached analytical endpoints to business dashboards. Utilizes Celery background worker tasks and Redis cache keys to keep p95 latency under 200ms.",
        icon: '<i class="fa-solid fa-server text-cyan"></i>',
        checklist: [
            "Django REST API Endpoints",
            "Redis Cache Store Caching",
            "Celery Async Task Broker",
            "Concurrency Load Balancing"
        ],
        metrics: [
            { label: "Supported Load", value: "15,000 req/s" },
            { label: "Cached Latency", value: "38ms p95" }
        ],
        code: `# Production Code: Django View Caching
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response

class DashboardMetricsView(APIView):
    def get(self, request):
        # Fetch data from local Redis key cache store
        data = cache.get('dashboard_metrics_cache')
        
        if not data:
            # Query backend DB and seed Redis (Cache-Through)
            data = compute_heavy_metrics.delay().get()
            cache.set('dashboard_metrics_cache', data, timeout=300)
            
        return Response(data)
`,
        config: `# Django Settings cache client configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}`,
        simControls: `
            <div style="display: flex; flex-direction: column; gap: 0.4rem; width: 100%;">
                <label style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase;">Load requests:</label>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem;">
                    <span>Slider:</span>
                    <span id="load-val">100 req/s</span>
                </div>
                <input type="range" id="sim-load-slider" min="50" max="1000" value="100" step="50" style="width: 100%;">
            </div>
            <button class="btn btn-primary" id="btn-trigger-api-sim"><i class="fa-solid fa-chart-line"></i> Simulate load test</button>
        `,
        initSim: function() {
            const slider = document.getElementById("sim-load-slider");
            const sliderVal = document.getElementById("load-val");
            
            slider.addEventListener("input", () => {
                sliderVal.innerText = `${slider.value} req/s`;
            });
            
            document.getElementById("btn-trigger-api-sim").addEventListener("click", () => {
                const load = parseInt(slider.value);
                const logs = document.getElementById("sim-console-logs");
                const viz = document.getElementById("sim-visualization-box");
                
                logs.innerHTML = `<div class="log-line system">[Load Generator] Injecting traffic boost: ${load} req/s...</div>`;
                viz.innerHTML = '<div style="position: relative; width: 100%; height: 100%;"><canvas id="apiBenchmarkChartSim"></canvas></div>';
                
                const ctx = viz.querySelector("canvas").getContext("2d");
                
                const steps = [50, 100, 200, 400, 600, 800, 1000];
                const syncData = [];
                const asyncData = [];
                const activeLabels = [];
                
                const chart = new Chart(ctx, {
                    type: "line",
                    data: {
                        labels: activeLabels,
                        datasets: [
                            {
                                label: "Sync API",
                                data: syncData,
                                borderColor: "#f97316",
                                tension: 0.2,
                                fill: false
                            },
                            {
                                label: "Celery+Redis",
                                data: asyncData,
                                borderColor: "#0ea5e9",
                                tension: 0.2,
                                fill: false
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            y: { max: 3000, min: 0 }
                        }
                    }
                });
                
                let idx = 0;
                function addPoint() {
                    if (idx >= steps.length || steps[idx] > load) {
                        logs.innerHTML += '<div class="log-line success">[Completed] Benchmark test finished. Sync DB calls timeout at >400 req/s. Celery holds steady.</div>';
                        return;
                    }
                    
                    const step = steps[idx];
                    activeLabels.push(step);
                    
                    const syncL = step <= 100 ? 120 : (step <= 200 ? 400 : (step <= 400 ? 1100 : 3000));
                    const asyncL = 30 + Math.round(step * 0.04);
                    
                    syncData.push(syncL);
                    asyncData.push(asyncL);
                    chart.update();
                    
                    logs.innerHTML += `<div class="log-line system">Vol: ${step} req/s | Sync: ${syncL}ms | Cached: ${asyncL}ms</div>`;
                    
                    idx++;
                    setTimeout(addPoint, 300);
                }
                
                addPoint();
            });
        }
    },
    ai: {
        title: "7. AI/ML Inference & XAI Lab",
        desc: "Executes deep learning and machine learning models in production. Hosts space weather forecasting transformers explained by SHAP, SVHN handwritten readers, and XGBoost intrusion alerts.",
        icon: '<i class="fa-solid fa-brain text-cyan"></i>',
        checklist: [
            "Explainable AI (SHAP & LIME)",
            "Neural Transformer Analysis",
            "Deep Learning SVHN Classifiers",
            "Ensemble Random Forest/XGBoost"
        ],
        metrics: [
            { label: "NIDS Accuracy", value: "98.8%" },
            { label: "SVHN Digit Acc", value: "99.1%" }
        ],
        code: `# Production Code: SHAP Explainer
import shap
import xgboost as xgb

def compute_shapley_weights(model, X_train, X_test):
    """Runs Cooperative Game Theory Shapley calculations"""
    # Centroid reference cluster scaling
    summary_bg = shap.kmeans(X_train, 100)
    explainer = shap.KernelExplainer(model.predict, summary_bg)
    shap_vals = explainer.shap_values(X_test)
    return shap_vals
`,
        config: `# Model layers blueprint stack config
model: DST_Transformer
layers:
  - type: Conv1D
    kernels: 32
    size: 1
  - type: LSTM
    units: 250
  - type: MultiHeadAttention
    heads: 4
  - type: DenseVariational
    neurons: 10
  - type: MonteCarloDropout
    rate: 0.15
`,
        simControls: `
            <a href="xai.html" class="btn btn-primary btn-block text-center" style="display: block; width: 100%; text-decoration: none;"><i class="fa-solid fa-sun-plant-wilt"></i> Launch Explainable AI NASA Lab</a>
        `,
        initSim: function() {
            const logs = document.getElementById("sim-console-logs");
            const viz = document.getElementById("sim-visualization-box");
            logs.innerHTML = '<div class="log-line system">[XAI Lab] Click the launch button above to open the dedicated satellite storm prediction panel.</div>';
            viz.innerHTML = `
                <div class="glass-card" style="padding: 1rem; border-color: var(--accent-cyan); font-size: 0.8rem;">
                    <div class="font-bold"><i class="fa-solid fa-brain text-cyan"></i> ML Feature Weightings</div>
                    <div style="margin-top: 0.4rem; color: var(--text-secondary);">Provides interactive LIME weights and 5x5 Query-Key multi-head attention matrix maps.</div>
                </div>
            `;
        }
    }
};

/* ==========================================================================
   NODE CLICK HANDLER EVENT BINDINGS
   ========================================================================== */
function initNodeClickHandlers() {
    const nodes = document.querySelectorAll(".arch-node");
    
    nodes.forEach(node => {
        node.addEventListener("click", () => {
            // Remove active color classes
            nodes.forEach(n => {
                n.classList.remove("active", "active-orange", "active-green");
            });
            
            const nodeId = node.dataset.node;
            
            // Assign class based on index color matches
            if (nodeId === "warehouse") {
                node.classList.add("active-orange");
            } else if (nodeId === "ai" || nodeId === "quality") {
                node.classList.add("active-green");
            } else {
                node.classList.add("active");
            }
            
            // Flow connection visual animation styling updates
            updateConnectorFlows(nodeId);
            
            selectNode(nodeId);
        });
    });
}

function updateConnectorFlows(nodeId) {
    // Reset all connectors
    const connectors = document.querySelectorAll(".arch-connector");
    connectors.forEach(c => c.classList.remove("flowing"));
    
    const nodeOrder = ["sources", "orchestration", "processing", "quality", "warehouse", "api", "ai"];
    const activeIndex = nodeOrder.indexOf(nodeId);
    
    // Animate connector corresponding to the active node transitions
    for (let i = 1; i <= activeIndex; i++) {
        const conn = document.getElementById(`conn-${i}`);
        if (conn) {
            conn.classList.add("flowing");
        }
    }
}

/* ==========================================================================
   WORKSPACE TAB CONTROLS (Code, Config, Sim)
   ========================================================================== */
function initWorkspaceTabs() {
    const tabs = document.querySelectorAll(".workspace-tab");
    const panels = document.querySelectorAll(".workspace-panel");
    
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            panels.forEach(p => p.classList.remove("active"));
            
            tab.classList.add("active");
            const panelId = `workspace-${tab.dataset.tab}`;
            const targetPanel = document.getElementById(panelId);
            if (targetPanel) {
                targetPanel.classList.add("active");
            }
        });
    });
}

/* ==========================================================================
   POPULATE DATA CARD BY NODE ID
   ========================================================================== */
function selectNode(nodeId) {
    const data = nodeBlueprints[nodeId];
    if (!data) return;
    
    // 1. Text Details
    document.getElementById("details-title").innerHTML = `${data.icon} ${data.title}`;
    document.getElementById("details-desc").innerText = data.desc;
    
    // 2. Checklist
    const checklistWrap = document.getElementById("details-checklist");
    checklistWrap.innerHTML = data.checklist.map(skill => `
        <div class="checklist-item"><i class="fa-solid fa-circle-check"></i> ${skill}</div>
    `).join("");
    
    // 3. Metrics
    const metricsWrap = document.getElementById("details-metrics");
    metricsWrap.innerHTML = data.metrics.map(m => `
        <div class="metric-mini-card">
            <span>${m.label}</span>
            <strong>${m.value}</strong>
        </div>
    `).join("");
    
    // 4. Code Blocks (Syntax highlight tags emulated)
    const codePre = document.getElementById("code-content");
    codePre.innerHTML = highlightSyntax(data.code, "python");
    
    const configPre = document.getElementById("config-content");
    configPre.innerHTML = highlightSyntax(data.config, nodeId === "sources" || nodeId === "api" ? "json" : (nodeId === "quality" || nodeId === "warehouse" ? "sql" : "yaml"));
    
    // 5. Simulation Interface setup
    const simControlsWrap = document.getElementById("sim-controls-container");
    simControlsWrap.innerHTML = data.simControls;
    
    // Reset simulator terminal
    document.getElementById("sim-console-logs").innerHTML = `<div class="log-line system">[Ready] Click simulated trigger actions above to test ${data.title}.</div>`;
    document.getElementById("sim-visualization-box").innerHTML = `<div class="text-secondary" style="font-family: var(--font-heading); font-weight: 600;">Simulation Visualizer Ready</div>`;
    
    // Initialize specific simulation hooks
    if (data.initSim) {
        data.initSim();
    }
}

/* ==========================================================================
   SIMPLE SYNTAX HIGHLIGHTER UTILITY
   ========================================================================== */
function highlightSyntax(raw, lang) {
    if (lang === "python") {
        return raw
            .replace(/(#.*)/g, '<span class="c-comment">$1</span>')
            .replace(/\b(def|import|from|class|return|try|except|pass|as|if|elif|else|print|raise)\b/g, '<span class="c-keyword">$1</span>')
            .replace(/(".*?"|'.*?')/g, '<span class="c-string">$1</span>')
            .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\()/g, '<span class="c-function">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="c-number">$1</span>');
    } else if (lang === "sql") {
        return raw
            .replace(/(--.*)/g, '<span class="c-comment">$1</span>')
            .replace(/\b(SELECT|FROM|WHERE|AND|OR|CREATE|TABLE|OR|REPLACE|STAGE|FILE|FORMAT|TYPE|SKIP_HEADER|FIELD_DELIMITER|URL|CREDENTIALS|ROW_NUMBER|OVER|PARTITION|BY|ORDER|DESC|AS|VARCHAR|INTEGER|PRIMARY|KEY|AUTOINCREMENT|TIMESTAMP)\b/gi, '<span class="c-keyword">$1</span>')
            .replace(/(".*?"|'.*?')/g, '<span class="c-string">$1</span>')
            .replace(/\b(\d+)\b/g, '<span class="c-number">$1</span>');
    } else if (lang === "json") {
        return raw
            .replace(/(".*?")\s*:/g, '<span class="c-keyword">$1</span> :')
            .replace(/:\s*(".*?")/g, ': <span class="c-string">$1</span>')
            .replace(/:\s*(\d+|true|false|null)/g, ': <span class="c-number">$1</span>');
    } else { // YAML / Configuration fallback
        return raw
            .replace(/(#.*)/g, '<span class="c-comment">$1</span>')
            .replace(/^(\s*[\w-]+)\s*:/gm, '<span class="c-keyword">$1</span>:')
            .replace(/:\s*(".*?"|'.*?'|[\w\/-]+)/g, ': <span class="c-string">$1</span>');
    }
}
