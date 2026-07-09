import re
import math
import json

class SimpleVectorStore:
    def __init__(self):
        self.documents = []  # List of {"id": idx, "text": text, "metadata": dict}
        self.vocab = {}      # Term to index mapping
        self.idf = {}        # Inverse document frequency
        self.doc_vectors = [] # List of TF-IDF vectors (dicts)
        
    def _tokenize(self, text):
        # Basic alphanumeric tokenizer, downcased
        return re.findall(r"\b\w+\b", text.lower())

    def _get_ngrams(self, tokens):
        # Generate unigrams and bigrams for semantic expansion
        ngrams = list(tokens)
        for i in range(len(tokens) - 1):
            ngrams.append(f"{tokens[i]}_{tokens[i+1]}")
        return ngrams

    def add_documents(self, docs):
        """
        docs: List of strings or dicts with {"text": ..., "metadata": ...}
        """
        self.documents = []
        for idx, doc in enumerate(docs):
            if isinstance(doc, str):
                self.documents.append({"id": idx, "text": doc, "metadata": {}})
            else:
                self.documents.append({
                    "id": idx, 
                    "text": doc.get("text", ""), 
                    "metadata": doc.get("metadata", {})
                })
        self._build_index()

    def _build_index(self):
        # 1. Calculate Term Frequencies (TF) and document counts
        doc_count = len(self.documents)
        if doc_count == 0:
            return
            
        term_doc_counts = {}
        doc_tfs = []
        
        vocab_set = set()
        for doc in self.documents:
            tokens = self._tokenize(doc["text"])
            ngrams = self._get_ngrams(tokens)
            
            # TF for this document
            tf = {}
            for term in ngrams:
                tf[term] = tf.get(term, 0) + 1
                vocab_set.add(term)
            doc_tfs.append(tf)
            
            # Document frequency count
            for term in set(ngrams):
                term_doc_counts[term] = term_doc_counts.get(term, 0) + 1
                
        # 2. Build Vocabulary Index
        self.vocab = {term: idx for idx, term in enumerate(vocab_set)}
        
        # 3. Calculate IDF
        self.idf = {}
        for term, count in term_doc_counts.items():
            self.idf[term] = math.log(1.0 + (doc_count / (1.0 + count)))
            
        # 4. Build TF-IDF Vectors
        self.doc_vectors = []
        for tf in doc_tfs:
            vector = {}
            norm_sq = 0.0
            for term, val in tf.items():
                tfidf_val = val * self.idf[term]
                vector[term] = tfidf_val
                norm_sq += tfidf_val ** 2
            
            # Save normalized vector
            norm = math.sqrt(norm_sq)
            if norm > 0:
                vector = {t: v / norm for t, v in vector.items()}
            self.doc_vectors.append(vector)

    def search(self, query, k=3):
        """
        Retrieves top k documents matching the query based on Cosine Similarity.
        """
        if not self.documents or not self.doc_vectors:
            return []
            
        q_tokens = self._tokenize(query)
        q_ngrams = self._get_ngrams(q_tokens)
        
        # Build query TF-IDF vector
        q_tf = {}
        for term in q_ngrams:
            q_tf[term] = q_tf.get(term, 0) + 1
            
        q_vector = {}
        q_norm_sq = 0.0
        for term, val in q_tf.items():
            if term in self.idf:
                tfidf_val = val * self.idf[term]
                q_vector[term] = tfidf_val
                q_norm_sq += tfidf_val ** 2
                
        q_norm = math.sqrt(q_norm_sq)
        if q_norm > 0:
            q_vector = {t: v / q_norm for t, v in q_vector.items()}
        else:
            # Query has no overlapping vocabulary terms
            return [{"document": doc, "score": 0.0} for doc in self.documents[:k]]
            
        # Compute Cosine Similarity against all documents
        results = []
        for idx, doc_vector in enumerate(self.doc_vectors):
            similarity = 0.0
            # Dot product of normalized vectors
            for term, val in q_vector.items():
                if term in doc_vector:
                    similarity += val * doc_vector[term]
            results.append({
                "document": self.documents[idx],
                "score": similarity
            })
            
        # Sort by similarity score descending
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:k]

    def to_json(self):
        """Serializes the index to a JSON string for SQLite storage."""
        return json.dumps({
            "documents": self.documents,
            "vocab": self.vocab,
            "idf": self.idf,
            "doc_vectors": self.doc_vectors
        })

    @classmethod
    def from_json(cls, json_str):
        """Deserializes the index from a JSON string."""
        data = json.loads(json_str)
        store = cls()
        store.documents = data["documents"]
        store.vocab = data["vocab"]
        store.idf = data["idf"]
        store.doc_vectors = data["doc_vectors"]
        return store
