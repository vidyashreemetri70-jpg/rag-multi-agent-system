
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

from app.conversation_memory_agent import (
    get_memory,
    clear_memory
)

from app.orchestrator import process_query
from app.speech_to_text import transcribe_audio
from app.document_processor import extract_text, clean_text
from app.chunker import chunk_text
from app.embeddings import create_embeddings
from app.vector_store import add_documents

from app.query_analytics import (
    get_analytics,
    get_analytics_summary,
    detect_knowledge_gaps,
    get_query_type_statistics,
    get_domain_statistics,
    get_common_queries,
    get_low_confidence_queries,
    get_retrieval_statistics,
    get_daily_statistics,
    get_analytics_report
)


app = FastAPI(title="AI Knowledge Retrieval Platform")


# ===============================
# CORS
# ===============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===============================
# UPLOAD DIRECTORY
# ===============================

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


# ===============================
# HOME
# ===============================

@app.get("/")
def home():

    return {
        "message": "RAG Knowledge Retrieval Platform is running"
    }


# ===============================
# HEALTH
# ===============================

@app.get("/health")
def health():

    return {
        "status": "OK"
    }


# ===============================
# DOCUMENT UPLOAD & INDEXING
# ===============================

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:

        content = await file.read()

        buffer.write(content)


    # Extract text
    text = extract_text(str(file_path))


    # Clean text
    text = clean_text(text)


    # Create chunks
    chunks = chunk_text(text)


    # Create embeddings
    embeddings = create_embeddings(chunks)


    # Get file type
    file_type = (
        Path(file.filename)
        .suffix
        .lower()
        .replace(".", "")
    )


    # Store in vector database
    add_documents(
        chunks,
        embeddings,
        document_name=file.filename,
        file_type=file_type
    )


    return {
        "message": "File uploaded and indexed successfully",
        "filename": file.filename,
        "file_type": file_type,
        "chunks": len(chunks)
    }


# ===============================
# QUERY
# ===============================

@app.post("/query")
def query(request: dict):

    return process_query(
        request["query"]
    )


# ===============================
# CONVERSATION MEMORY
# ===============================

@app.get("/memory")
def memory():

    return {
        "conversation_memory": get_memory()
    }


# ===============================
# CLEAR CONVERSATION MEMORY
# ===============================

@app.get("/memory/clear")
def clear_memory_data():

    clear_memory()

    return {
        "message": "Conversation memory cleared successfully"
    }


# ===============================
# WHISPER SPEECH TO TEXT
# ===============================

@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...)):

    audio_path = UPLOAD_DIR / "voice_input.webm"


    with open(audio_path, "wb") as buffer:

        content = await file.read()

        buffer.write(content)


    text = transcribe_audio(
        str(audio_path)
    )


    return {
        "text": text
    }




# ===============================
# M4.1 QUERY ANALYTICS
# ===============================

@app.get("/analytics")
def analytics():

    return {
        "analytics": get_analytics()
    }


# ===============================
# M4.1 ANALYTICS SUMMARY
# ===============================

@app.get("/analytics/summary")
def analytics_summary():

    return get_analytics_summary()


# ===============================
# M4.1 KNOWLEDGE GAPS
# ===============================

@app.get("/analytics/knowledge-gaps")
def knowledge_gaps():

    return {
        "knowledge_gaps":
            detect_knowledge_gaps()
    }


# ===============================
# M4.1 QUERY TYPE STATISTICS
# ===============================

@app.get("/analytics/query-types")
def query_type_statistics():

    return {
        "query_type_statistics":
            get_query_type_statistics()
    }


# ===============================
# M4.1 DOMAIN STATISTICS
# ===============================

@app.get("/analytics/domains")
def domain_statistics():

    return {
        "domain_statistics":
            get_domain_statistics()
    }


# ===============================
# M4.1 COMMON QUERIES
# ===============================

@app.get("/analytics/common-queries")
def common_queries():

    return {
        "common_queries":
            get_common_queries()
    }


# ===============================
# M4.1 LOW CONFIDENCE QUERIES
# ===============================

@app.get("/analytics/low-confidence")
def low_confidence_queries():

    return {
        "low_confidence_queries":
            get_low_confidence_queries()
    }


# ===============================
# M4.1 RETRIEVAL STATISTICS
# ===============================

@app.get("/analytics/retrieval")
def retrieval_statistics():

    return get_retrieval_statistics()


# ===============================
# M4.1 DAILY STATISTICS
# ===============================

@app.get("/analytics/daily")
def daily_statistics():

    return {
        "daily_statistics":
            get_daily_statistics()
    }


# ===============================
# M4.1 COMPLETE ANALYTICS REPORT
# ===============================

@app.get("/analytics/report")
def analytics_report():

    return get_analytics_report()