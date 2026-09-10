from app.embeddings import create_embeddings
from app.vector_store import search_documents


def retrieve_documents(query, top_k=3, threshold=1.5):

    # Create embedding for the user's question
    query_embedding = create_embeddings([query])[0]

    # Search the knowledge base
    results = search_documents(
        query_embedding,
        n_results=top_k
    )

    if not results["documents"] or not results["documents"][0]:
        return {
            "documents": [],
            "metadatas": [],
            "distances": []
        }

    documents = []
    metadatas = []
    distances = []

    # Keep only relevant results
    for i, distance in enumerate(results["distances"][0]):

        if distance <= threshold:

            documents.append(
                results["documents"][0][i]
            )

            metadatas.append(
                results["metadatas"][0][i]
            )

            distances.append(distance)

    return {
        "documents": documents,
        "metadatas": metadatas,
        "distances": distances
    }