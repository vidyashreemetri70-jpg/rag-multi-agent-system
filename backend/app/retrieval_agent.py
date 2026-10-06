from app.embeddings import create_embeddings
from app.vector_store import search_documents


# ============================================================
# M4.3 RETRIEVAL OPTIMIZATION
# ============================================================

def retrieve_documents(
    query,
    top_k=3,
    threshold=0.90
):

    # --------------------------------------------------------
    # Create embedding for the user's question
    # --------------------------------------------------------

    query_embedding = create_embeddings([query])[0]

    # --------------------------------------------------------
    # Search the knowledge base
    # --------------------------------------------------------

    results = search_documents(
        query_embedding,
        n_results=top_k
    )

    # --------------------------------------------------------
    # Check whether Chroma returned results
    # --------------------------------------------------------

    if (
        not results.get("documents")
        or not results["documents"][0]
    ):
        return {
            "documents": [],
            "metadatas": [],
            "distances": []
        }

    documents = []
    metadatas = []
    distances = []

    # --------------------------------------------------------
    # Keep only sufficiently relevant results
    # --------------------------------------------------------

    for i, distance in enumerate(
        results["distances"][0]
    ):

        # M4.3 relevance filtering
        if distance <= threshold:

            documents.append(
                results["documents"][0][i]
            )

            metadatas.append(
                results["metadatas"][0][i]
            )

            distances.append(
                distance
            )

    # --------------------------------------------------------
    # Return only relevant documents
    # --------------------------------------------------------

    return {
        "documents": documents,
        "metadatas": metadatas,
        "distances": distances
    }