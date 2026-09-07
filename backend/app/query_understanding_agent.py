def classify_query(query):
    query_lower = query.lower()

    if "difference" in query_lower or "compare" in query_lower:
        query_type = "comparative"
    elif "how" in query_lower or "steps" in query_lower:
        query_type = "procedural"
    elif "?" in query_lower:
        query_type = "factual"
    else:
        query_type = "ambiguous"

    return {
        "query": query,
        "query_type": query_type,
        "confidence": 0.9
    }