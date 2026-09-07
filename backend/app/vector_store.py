import chromadb

client = chromadb.PersistentClient(path="data/vector_store")

collection = client.get_or_create_collection(
    name="rag_documents"
)


def add_documents(chunks, embeddings, document_name="unknown", file_type="unknown"):
    for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):

        collection.add(
            ids=[f"{document_name}_{i}"],
            documents=[chunk],
            embeddings=[embedding],
            metadatas=[{
                "document_name": document_name,
                "file_type": file_type,
                "chunk_id": i
            }]
        )


def search_documents(query_embedding, n_results=3):
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    return results