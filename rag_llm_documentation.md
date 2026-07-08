# Dynamic RAG Schema Resolver & SQL Translation Documentation

This document outlines the architecture and execution flow of the **Retrieval-Augmented Generation (RAG) Schema Resolver** and the **Deterministic LLM SQL Translation Engine** implemented for both the local simulator and GCP App Engine backend.

---

## 🗺️ System Flow Architecture

The following diagram illustrates how natural language queries are semantically resolved to target database columns and converted to executable SQL:

```mermaid
graph TD
    A[User Query: 'average dust where location equals Oakland'] --> B[NLP Tokenizer & Preprocessor]
    B --> C[RAG Schema Resolver]
    D[(Database Metadata Registry)] --> C
    C -->|Synonym Matching & Vector Weights| E[Mapped Column: pm2_5]
    C -->|Semantic Category Mapping| F[Mapped Filter: city]
    E & F --> G[Deterministic SQL Parser]
    G --> H[Generated SQL: SELECT AVG(pm2_5) FROM ... WHERE city = 'Oakland']
    H --> I[(SQLite Analytical Database)]
    I --> J[JSON Formatted Query Output]
```

---

## 🧠 1. Retrieval-Augmented Generation (RAG) Schema Resolver

Because user-uploaded datasets contain arbitrary column names, a rigid query builder will fail. The `RAGSchemaResolver` indexes the dataset's schema and performs synonym matching to map search concepts to actual columns.

### Semantic Category Mapping
The resolver categorizes column spaces using a keyword expansion mapping directory:
* **Time Dimensions**: maps keywords like `date`, `timestamp`, `year`, `timeline`, `clock`, `created_at`.
* **Locations**: maps keywords like `city`, `region`, `town`, `country`, `address`, `lat/lon`.
* **Financial Metrics**: maps keywords like `price`, `cost`, `revenue`, `sales`, `profit`.
* **Quantities**: maps keywords like `quantity`, `count`, `amount`, `total`, `rows`.
* **Numerical Metrics**: maps keywords like `value`, `reading`, `pm25`, `dust`, `speed`, `temperature`.

### Math & Scoring Logic
The retrieval matching score $S$ for a candidate column is calculated by analyzing the token overlap between the tokenized user query $Q$ and the synonym list $T_{col}$ of column $col$:

$$S(col) = 10 \cdot |Q \cap \{col_{name}\}| + 5 \cdot |Q \cap T_{col}| + 3 \cdot \mathbb{I}(type(col) = \text{"number"})$$

* A **substring match** gets a weight boost of **+10** (e.g. user queries "speed" and column name is `average_speed`).
* An **exact synonym match** gets a weight of **+5** (e.g. user queries "dust" and synonym index matches it to `pm2_5`).
* If the user query implies aggregation (e.g. *"average"*, *"sum"*), **numerical data types** get a weight boost of **+3**.

---

## ⚙️ 2. Deterministic LLM SQL Translation Engine

To avoid external API calls, latency, and credential exposures on GCP App Engine, the system maps operations deterministically:

### Translation Rules:
1. **Aggregation Matches**:
   * **Average**: Matches `average`, `avg`, `mean`. Generates `AVG(target_col)`.
   * **Maximum**: Matches `max`, `highest`, `maximum`. Generates `MAX(target_col)`.
   * **Minimum**: Matches `min`, `lowest`, `minimum`. Generates `MIN(target_col)`.
   * **Count**: Matches `count`, `how many`, `rows`. Generates `COUNT(*)`.
2. **Semantic Filter Extraction**:
   * Uses regular expression pattern matchers to capture conditions (e.g., `[concept] [is/equals] [value]`).
   * The filter concept is fed back through the `RAGSchemaResolver` to resolve the column name (e.g. translating `"location equals Castro Valley"` into `"city = 'Castro Valley'"`).

---

## 💻 3. Source Code Implementation Reference

### Python Backend Implementation (`backend/app.py`):
```python
class RAGSchemaResolver:
    def __init__(self, columns, column_types, sample_rows=None):
        self.columns = columns
        self.column_types = column_types
        self.sample_rows = sample_rows or []
        self.index = self._build_semantic_index()

    def _build_semantic_index(self):
        semantic_dictionary = {
            "time": ["date", "time", "timestamp", "year", "month", "hour", "created_at", "updated_at", "timeline", "clock"],
            "location": ["city", "region", "town", "location", "country", "state", "place", "area", "address", "geographic"],
            "quantity": ["quantity", "count", "amount", "number", "total", "sum", "size", "volume"],
            "financial": ["price", "cost", "revenue", "sales", "profit", "income", "charge", "fee"],
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
            index.append({
                "column": col,
                "type": self.column_types.get(col, "string"),
                "terms": list(set(related_terms))
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
                    score += 10
                for term in doc["terms"]:
                    if q_word == term:
                        score += 5
                    elif q_word in term or term in q_word:
                        score += 2
            if "average" in query.lower() or "mean" in query.lower() or "sum" in query.lower():
                if doc["type"] == "number":
                    score += 3
            if score > highest_score:
                highest_score = score
                best_col = doc["column"]
        return best_col
```

---

## 🧪 4. Query Examples & Expected SQL Generation

Here is how the RAG model dynamically parses query requests on the weather dataset:

| User Natural Language Prompt | Dynamic RAG Mappings | Generated SQL Query |
| :--- | :--- | :--- |
| **"how many rows are there"** | Column: None <br/>Filter: None | `SELECT COUNT(*) as count FROM dynamic_processed_data` |
| **"what is average dust reading"** | Column: `pm2_5`<br/>Filter: None | `SELECT AVG(pm2_5) as average_pm2_5 FROM dynamic_processed_data` |
| **"average pm25 where location equals Oakland"** | Column: `pm2_5`<br/>Filter: `city` | `SELECT AVG(pm2_5) as average_pm2_5 FROM dynamic_processed_data WHERE city = 'Oakland'` |
| **"show highest value"** | Column: `pm2_5`<br/>Filter: None | `SELECT MAX(pm2_5) as max_pm2_5 FROM dynamic_processed_data` |
