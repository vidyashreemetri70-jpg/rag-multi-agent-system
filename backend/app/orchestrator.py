from app.query_understanding_agent import classify_query
from app.retrieval_agent import retrieve_documents
from app.response_generation_agent import generate_response


def process_query(query):
    understanding = classify_query(query)

    retrieved = retrieve_documents(query)

    documents = retrieved.get("documents", [])

    if not documents:
        return {
            "query": query,
            "query_type": understanding["query_type"],
            "confidence": understanding["confidence"],
            "answer": "Information not found in the knowledge base."
        }

    answer = generate_response(query, documents)

    return {
        "query": query,
        "query_type": understanding["query_type"],
        "confidence": understanding["confidence"],
        "answer": answer
    }