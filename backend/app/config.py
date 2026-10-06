"""Tunable settings (Milestone 4). Every value can be overridden via environment variable.

Optimised defaults were selected with tests/m4/evaluate.py (see docs/m4/M4_OPTIMIZATION.md).
"""
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", Path(__file__).resolve().parents[1] / "data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# --- Ingestion ---
CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "500"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
COLLECTION_NAME = os.getenv("COLLECTION_NAME", "rag_documents_v2")  # cosine space

# --- Retrieval (distance = cosine distance, 0 = identical) ---
RETRIEVAL_CANDIDATES = int(os.getenv("RETRIEVAL_CANDIDATES", "10"))  # fetched before re-ranking
RETRIEVAL_TOP_K = int(os.getenv("RETRIEVAL_TOP_K", "3"))             # kept after re-ranking
RETRIEVAL_DISTANCE_THRESHOLD = float(os.getenv("RETRIEVAL_DISTANCE_THRESHOLD", "0.65"))
RELATIVE_SCORE_MARGIN = float(os.getenv("RELATIVE_SCORE_MARGIN", "0.15"))  # drop chunks far below the best
KEYWORD_WEIGHT = float(os.getenv("KEYWORD_WEIGHT", "0.2"))           # hybrid re-rank weight
FULL_CONFIDENCE_SCORE = float(os.getenv("FULL_CONFIDENCE_SCORE", "0.75"))  # score mapped to confidence 1.0

# --- Confidence / fallback ---
LOW_CONFIDENCE_THRESHOLD = float(os.getenv("LOW_CONFIDENCE_THRESHOLD", "0.45"))

# --- Memory ---
MEMORY_LIMIT = int(os.getenv("MEMORY_LIMIT", "3"))

# --- LLM ---
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "90"))

# --- Analytics ---
ANALYTICS_DB = Path(os.getenv("ANALYTICS_DB", DATA_DIR / "analytics.db"))
GAP_SIMILARITY = float(os.getenv("GAP_SIMILARITY", "0.6"))  # token-Jaccard to group repeated queries
