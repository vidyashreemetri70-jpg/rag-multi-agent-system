import requests

from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from pathlib import Path

from app.document_processor import extract_text
from app.chunker import chunk_text
from app.embeddings import create_embeddings
from app.vector_store import add_documents, search_documents


app = FastAPI(title="AI Knowledge Retrieval Platform")


UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class QueryRequest(BaseModel):
    query: str


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
def query_documents(request: QueryRequest):

    # Create embedding for the user's question
    query_embedding = create_embeddings([request.query])[0]

    # Search ChromaDB
    results = search_documents(
        query_embedding,
        n_results=3
    )

    # Get relevant document chunks
    retrieved_chunks = results["documents"][0]

    # Combine retrieved chunks
    context = "\n\n".join(retrieved_chunks)

    # Prompt for Llama 3.2
    prompt = f"""
You are an AI Knowledge Retrieval Assistant.

Answer the user's question using ONLY the information
provided in the context.

Context:
{context}

Question:
{request.query}

Give a clear and simple answer.

If the answer is not available in the context, say:
"Information not found in the uploaded documents."
"""

    # Send the prompt to Ollama
    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False
        }
    )

    # Check Ollama response
    if response.status_code != 200:
        return {
            "query": request.query,
            "error": "Ollama is not responding"
        }

    # Get generated answer
    answer = response.json()["response"]

    return {
        "query": request.query,
        "answer": answer,
        "sources": retrieved_chunks
    }