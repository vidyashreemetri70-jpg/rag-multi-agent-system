import re

from app.query_understanding_agent import classify_query
from app.clarification_agent import check_clarification
from app.retrieval_agent import retrieve_documents
from app.response_generation_agent import generate_response
from app.conversation_memory_agent import add_memory, get_recent_memory


pending_query = None


def extract_topic(previous_query):

    q = previous_query.strip().rstrip("?")

    # Example:
    # What is RAG?
    # → RAG
    match = re.match(
        r"what\s+is\s+(.+)$",
        q,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    # Example:
    # What happens when soil moisture becomes low?
    # → soil moisture
    match = re.match(
        r"what\s+happens\s+when\s+(.+?)\s+becomes\s+low$",
        q,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    return q


def resolve_context(query, recent_memory):

    if not recent_memory:
        return query

    previous_query = recent_memory[-1]["query"]

    topic = extract_topic(previous_query)

    query_clean = query.strip()
    query_lower = query_clean.lower()

    # Tell me about it
    if query_lower in [
        "tell me about it",
        "tell me about this",
        "tell me about that"
    ]:
        return f"Tell me about {topic}."

    # Why is it important?
    if query_lower in [
        "why is it important?",
        "why is it important",
        "why is this important?",
        "why is this important",
        "why is that important?",
        "why is that important"
    ]:
        return f"Why is {topic} important?"

    # What is it?
    if query_lower in [
        "what is it?",
        "what is it",
        "what is this?",
        "what is this",
        "what is that?",
        "what is that"
    ]:
        return f"What is {topic}?"

    # How does it work?
    if query_lower in [
        "how does it work?",
        "how does it work",
        "how does this work?",
        "how does this work",
        "how does that work?",
        "how does that work"
    ]:
        return f"How does {topic} work?"

    # How can it be used?
    if query_lower in [
        "how can it be used?",
        "how can it be used",
        "how is it used?",
        "how is it used"
    ]:
        return f"How can {topic} be used?"

    # Replace simple pronouns
    resolved_query = re.sub(
        r"\b(it|this|that)\b",
        topic,
        query_clean,
        count=1,
        flags=re.IGNORECASE
    )

    return resolved_query


def process_query(query):

    global pending_query

    query = query.strip()

    if not query:

        return {
            "query": query,
            "needs_clarification": True,
            "clarification_question":
                "Could you please enter your question?"
        }

    # Handle clarification response
    if pending_query is not None:

        original_query = pending_query

        clarification_response = query

        query = (
            original_query
            + " "
            + clarification_response
        )

        pending_query = None

    else:

        clarification = check_clarification(query)

        if clarification["needs_clarification"]:

            pending_query = query

            return {
                "query": query,
                "needs_clarification": True,
                "clarification_question":
                    clarification["question"]
            }

    # Get recent conversation memory
    recent_memory = get_recent_memory(
        limit=3
    )

    # Resolve context from previous conversation
    resolved_query = resolve_context(
        query,
        recent_memory
    )

    # Understand query
    understanding = classify_query(
        resolved_query
    )

    # Retrieve documents
    retrieved = retrieve_documents(
        resolved_query
    )

    documents = retrieved.get(
        "documents",
        []
    )

    metadatas = retrieved.get(
        "metadatas",
        []
    )

    distances = retrieved.get(
        "distances",
        []
    )

    # No relevant information
    if not documents:

        answer = (
            "Information not found "
            "in the knowledge base."
        )

        add_memory(
            query,
            answer
        )

        return {
            "query": query,

            "resolved_query": resolved_query,

            "query_type":
                understanding["query_type"],

            "confidence":
                understanding["confidence"],

            "needs_clarification":
                False,

            "answer":
                answer,

            "evidence":
                []
        }

    # Generate answer
    answer = generate_response(
        resolved_query,
        documents
    )

    # Build evidence
    evidence = []

    for i, document in enumerate(documents):

        metadata = {}

        if i < len(metadatas):

            metadata = (
                metadatas[i]
                or {}
            )

        distance = None

        if i < len(distances):

            distance = distances[i]

        evidence.append({

            # Source document
            "document":
                metadata.get(
                    "document_name",
                    "Unknown document"
                ),

            # File type
            "file_type":
                metadata.get(
                    "file_type",
                    "Unknown"
                ),

            # Chunk ID
            "chunk_id":
                metadata.get(
                    "chunk_id",
                    f"chunk_{i}"
                ),

            # Citation reference
            "citation_id":
                metadata.get(
                    "citation_id",
                    "Not available"
                ),

            # Relevance distance
            "distance":
                distance,

            # Retrieved source content
            "content":
                document
        })

    # Store original user query and answer
    add_memory(
        query,
        answer
    )

    return {

        "query":
            query,

        "resolved_query":
            resolved_query,

        "query_type":
            understanding["query_type"],

        "confidence":
            understanding["confidence"],

        "needs_clarification":
            False,

        "answer":
            answer,

        "evidence":
            evidence
    }