from fastapi import FastAPI, UploadFile, File
from app.orchestrator import process_query
from pathlib import Path
from app.document_processor import extract_text, clean_text
from app.chunker import chunk_text
from app.embeddings import create_embeddings
from app.vector_store import add_documents


app = FastAPI(title="AI Knowledge Retrieval Platform")


UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


@app.get("/")
def home():
    return {
        "message": "RAG Knowledge Retrieval Platform is running"
    }


@app.get("/health")
def health():
    return {
        "status": "OK"
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):

    file_path = UPLOAD_DIR / file.filename

    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)

    text = extract_text(str(file_path))
    text = clean_text(text)
    chunks = chunk_text(text)

    embeddings = create_embeddings(chunks)

    file_type = Path(file.filename).suffix.lower().replace(".", "")

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


@app.post("/query")
def query(request: dict):
    return process_query(request["query"])