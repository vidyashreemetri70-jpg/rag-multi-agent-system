import re
import time

from app.query_understanding_agent import classify_query
from app.clarification_agent import check_clarification
from app.retrieval_agent import retrieve_documents
from app.response_generation_agent import generate_response
from app.conversation_memory_agent import (
    add_memory,
    get_recent_memory
)
from app.query_analytics import record_query


# ============================================================
# M4 CLARIFICATION STATE
# ============================================================

pending_query = None


# ============================================================
# EXTRACT TOPIC FROM PREVIOUS QUERY
# ============================================================

def extract_topic(previous_query):

    q = previous_query.strip().rstrip("?")

    match = re.match(
        r"what\s+is\s+(.+)$",
        q,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    match = re.match(
        r"what\s+happens\s+when\s+(.+?)\s+becomes\s+low$",
        q,
        re.IGNORECASE
    )

    if match:
        return match.group(1).strip()

    return q


# ============================================================
# RESOLVE CONVERSATION CONTEXT
# ============================================================

def resolve_context(query, recent_memory):

    if not recent_memory:
        return query

    previous_query = recent_memory[-1]["query"]

    topic = extract_topic(previous_query)

    query_clean = query.strip()
    query_lower = query_clean.lower()

    if query_lower in [
        "tell me about it",
        "tell me about this",
        "tell me about that"
    ]:
        return f"Tell me about {topic}."

    if query_lower in [
        "why is it important?",
        "why is it important",
        "why is this important?",
        "why is this important",
        "why is that important?",
        "why is that important"
    ]:
        return f"Why is {topic} important?"

    if query_lower in [
        "what is it?",
        "what is it",
        "what is this?",
        "what is this",
        "what is that?",
        "what is that"
    ]:
        return f"What is {topic}?"

    if query_lower in [
        "how does it work?",
        "how does it work",
        "how does this work?",
        "how does this work",
        "how does that work?",
        "how does that work"
    ]:
        return f"How does {topic} work?"

    if query_lower in [
        "how can it be used?",
        "how can it be used",
        "how is it used?",
        "how is it used"
    ]:
        return f"How can {topic} be used?"

    resolved_query = re.sub(
        r"\b(it|this|that)\b",
        topic,
        query_clean,
        count=1,
        flags=re.IGNORECASE
    )

    return resolved_query


# ============================================================
# DETECT NEW QUESTION
# ============================================================

def is_new_question(query):

    words = (
        query.lower()
        .replace("?", "")
        .strip()
        .split()
    )

    if not words:
        return False

    question_words = [
        "what",
        "why",
        "how",
        "when",
        "where",
        "which",
        "who",
        "can",
        "does",
        "do",
        "is",
        "are"
    ]

    return (
        len(words) >= 2
        and words[0] in question_words
    )


# ============================================================
# CLEAN CLARIFICATION RESPONSE
# ============================================================

def resolve_clarification(original_query, clarification_response):

    original_lower = original_query.lower()
    response_lower = clarification_response.lower().strip()

    # --------------------------------------------------------
    # SENSOR CLARIFICATION
    # --------------------------------------------------------

    if "sensor" in original_lower:

        if "soil moisture sensor" in response_lower:

            return "What is a soil moisture sensor?"

        if "temperature sensor" in response_lower:

            return "What is a temperature sensor?"

        if "humidity sensor" in response_lower:

            return "What is a humidity sensor?"

        if "light sensor" in response_lower:

            return "What is a light sensor?"

        if "pressure sensor" in response_lower:

            return "What is a pressure sensor?"

    # --------------------------------------------------------
    # If the clarification response is already a complete
    # question, use it directly.
    # --------------------------------------------------------

    if is_new_question(clarification_response):

        return clarification_response

    # --------------------------------------------------------
    # General clarification
    # --------------------------------------------------------

    return (
        original_query
        + " "
        + clarification_response
    )


# ============================================================
# PROCESS USER QUERY
# ============================================================

def process_query(query):

    global pending_query

    start_time = time.perf_counter()

    query = str(query).strip()

    # ========================================================
    # EMPTY QUERY
    # ========================================================

    if not query:

        response_time = (
            time.perf_counter()
            - start_time
        )

        record_query(
            query=query,
            query_type="incomplete",
            confidence=0.0,
            retrieval_confidence=0.0,
            answered=False,
            needs_clarification=True,
            retrieved_documents=[],
            relevance_distances=[],
            knowledge_gap=False,
            response_status="clarification",
            response_time=response_time
        )

        return {
            "query": query,
            "needs_clarification": True,
            "clarification_question":
                "Could you please enter your question?",
            "answer":
                "Could you please enter your question?"
        }

    # ========================================================
    # HANDLE PENDING CLARIFICATION
    # ========================================================

    clarification_resolved = False

    if pending_query is not None:

        original_query = pending_query.strip()

        clarification_response = query.strip()

        # ----------------------------------------------------
        # IMPORTANT DUPLICATE PROTECTION
        #
        # If the frontend accidentally sends the original
        # clarification query again, do NOT treat it as the
        # user's clarification answer.
        # ----------------------------------------------------

        if (
            clarification_response.lower()
            == original_query.lower()
        ):

            if "sensor" in original_query.lower():

                clarification_question = (
                    "Could you clarify which type of sensor "
                    "you mean? For example, a soil moisture "
                    "sensor, temperature sensor, or another "
                    "type of sensor?"
                )

            else:

                clarification_question = (
                    "Could you please provide more details "
                    "about your question?"
                )

            return {
                "query": original_query,
                "needs_clarification": True,
                "clarification_question":
                    clarification_question,
                "answer":
                    clarification_question
            }

        # ----------------------------------------------------
        # NEW QUESTION
        #
        # Example:
        #
        # Previous:
        # Tell me about sensors.
        #
        # New:
        # What is artificial intelligence?
        #
        # Process the new question independently.
        # ----------------------------------------------------

        if is_new_question(
            clarification_response
        ):

            query = clarification_response

        else:

            # ------------------------------------------------
            # ACTUAL CLARIFICATION ANSWER
            # ------------------------------------------------

            query = resolve_clarification(
                original_query,
                clarification_response
            )

        # ----------------------------------------------------
        # Clear pending state immediately.
        # ----------------------------------------------------

        pending_query = None

        clarification_resolved = True

    # ========================================================
    # NORMAL CLARIFICATION CHECK
    # ========================================================

    if not clarification_resolved:

        clarification = check_clarification(query)

        if clarification["needs_clarification"]:

            pending_query = query

            response_time = (
                time.perf_counter()
                - start_time
            )

            record_query(
                query=query,
                query_type=
                    clarification.get(
                        "clarification_type",
                        "ambiguous"
                    ),
                confidence=0.0,
                retrieval_confidence=0.0,
                answered=False,
                needs_clarification=True,
                retrieved_documents=[],
                relevance_distances=[],
                knowledge_gap=False,
                response_status="clarification",
                response_time=response_time
            )

            return {
                "query": query,
                "needs_clarification": True,
                "clarification_question":
                    clarification["question"],
                "answer":
                    clarification["question"]
            }

    # ========================================================
    # GET RECENT CONVERSATION MEMORY
    # ========================================================

    recent_memory = get_recent_memory(
        limit=3
    )

    # ========================================================
    # RESOLVE CONTEXT
    # ========================================================

    resolved_query = resolve_context(
        query,
        recent_memory
    )

    # ========================================================
    # QUERY UNDERSTANDING
    # ========================================================

    understanding = classify_query(
        resolved_query
    )

    # ========================================================
    # M4.3 AMBIGUOUS QUERY HANDLING
    #
    # Only run this for queries that were NOT already resolved
    # through the clarification flow.
    # ========================================================

    if (
        understanding["query_type"] == "ambiguous"
        and not clarification_resolved
    ):

        pending_query = query

        clarification_question = (
            "Could you please clarify your question?"
        )

        if "sensor" in query.lower():

            clarification_question = (
                "Could you clarify which type of sensor "
                "you mean? For example, a soil moisture "
                "sensor, temperature sensor, or another "
                "type of sensor?"
            )

        response_time = (
            time.perf_counter()
            - start_time
        )

        record_query(
            query=query,
            query_type=
                understanding["query_type"],
            confidence=
                understanding["confidence"],
            retrieval_confidence=0.0,
            answered=False,
            needs_clarification=True,
            retrieved_documents=[],
            relevance_distances=[],
            knowledge_gap=False,
            response_status="clarification",
            response_time=response_time
        )

        return {
            "query": query,
            "resolved_query": resolved_query,
            "query_type":
                understanding["query_type"],
            "confidence":
                understanding["confidence"],
            "retrieval_confidence": 0.0,
            "needs_clarification": True,
            "clarification_question":
                clarification_question,
            "answer":
                clarification_question,
            "evidence": []
        }

    # ========================================================
    # RETRIEVAL
    # ========================================================

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

    # ========================================================
    # M4.3 RETRIEVAL CONFIDENCE
    # ========================================================

    if distances:

        best_distance = min(
            float(distance)
            for distance in distances
        )

        retrieval_confidence = max(
            0.0,
            min(
                1.0,
                1.0 - best_distance
            )
        )

    else:

        retrieval_confidence = 0.0

    # ========================================================
    # KNOWLEDGE GAP DETECTION
    # ========================================================

    if not documents:

        answer = (
            "Information not found "
            "in the knowledge base."
        )

        response_time = (
            time.perf_counter()
            - start_time
        )

        record_query(
            query=query,
            query_type=
                understanding["query_type"],
            confidence=
                understanding["confidence"],
            retrieval_confidence=
                retrieval_confidence,
            answered=False,
            needs_clarification=False,
            retrieved_documents=[],
            relevance_distances=[],
            knowledge_gap=True,
            response_status="unanswered",
            response_time=response_time
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
            "retrieval_confidence":
                retrieval_confidence,
            "needs_clarification": False,
            "answer": answer,
            "evidence": []
        }

    # ========================================================
    # RESPONSE GENERATION
    # ========================================================

    answer = generate_response(
        resolved_query,
        documents
    )

    # ========================================================
    # BUILD SOURCE EVIDENCE
    # ========================================================

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
            "document":
                metadata.get(
                    "document_name",
                    "Unknown document"
                ),

            "file_type":
                metadata.get(
                    "file_type",
                    "Unknown"
                ),

            "chunk_id":
                metadata.get(
                    "chunk_id",
                    f"chunk_{i}"
                ),

            "citation_id":
                metadata.get(
                    "citation_id",
                    "Not available"
                ),

            "distance":
                distance,

            "content":
                document
        })

    # ========================================================
    # GET RETRIEVED DOCUMENT NAMES
    # ========================================================

    retrieved_document_names = []

    for metadata in metadatas:

        metadata = metadata or {}

        retrieved_document_names.append(
            metadata.get(
                "document_name",
                "Unknown"
            )
        )

    # ========================================================
    # RESPONSE TIME
    # ========================================================

    response_time = (
        time.perf_counter()
        - start_time
    )

    # ========================================================
    # RECORD SUCCESSFUL QUERY
    # ========================================================

    record_query(
        query=query,
        query_type=
            understanding["query_type"],
        confidence=
            understanding["confidence"],
        retrieval_confidence=
            retrieval_confidence,
        answered=True,
        needs_clarification=False,
        retrieved_documents=
            retrieved_document_names,
        relevance_distances=
            distances,
        knowledge_gap=False,
        response_status="answered",
        response_time=response_time
    )

    # ========================================================
    # STORE CONVERSATION MEMORY
    # ========================================================

    add_memory(
        query,
        answer
    )

    # ========================================================
    # RETURN FINAL RESPONSE
    # ========================================================

    return {
        "query": query,
        "resolved_query": resolved_query,
        "query_type":
            understanding["query_type"],
        "confidence":
            understanding["confidence"],
        "retrieval_confidence":
            retrieval_confidence,
        "needs_clarification": False,
        "answer": answer,
        "evidence": evidence,
        "response_time":
            round(
                response_time,
                4
            )
    }