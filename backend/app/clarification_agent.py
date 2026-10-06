import re


def check_clarification(query):

    query = query.strip()
    query_lower = query.lower()

    # ============================================================
    # EMPTY QUERY
    # ============================================================

    if not query:

        return {
            "needs_clarification": True,
            "clarification_type": "incomplete",
            "question":
                "Could you please enter your question?"
        }

    # ============================================================
    # REMOVE PUNCTUATION
    # ============================================================

    clean_query = re.sub(
        r"[^\w\s]",
        "",
        query_lower
    )

    words = clean_query.split()

    # ============================================================
    # VERY SHORT / INCOMPLETE QUERIES
    # ============================================================

    if len(words) < 3:

        return {
            "needs_clarification": True,
            "clarification_type": "incomplete",
            "question":
                "Could you please provide more details about your question?"
        }

    # ============================================================
    # AMBIGUOUS REFERENCE WORDS
    # ============================================================

    ambiguous_words = [
        "it",
        "this",
        "that",
        "they",
        "them",
        "something"
    ]

    for word in ambiguous_words:

        if word in words:

            return {
                "needs_clarification": True,
                "clarification_type": "ambiguous",
                "question":
                    "Could you please clarify what you are referring to?"
            }

    # ============================================================
    # BROAD / AMBIGUOUS TOPICS
    # ============================================================

    # These queries are too broad to determine the exact topic.
    # They should trigger clarification instead of retrieval.

    broad_topics = {

        "sensor": (
            "Could you clarify which type of sensor you mean? "
            "For example, a soil moisture sensor, temperature sensor, "
            "or another type of sensor?"
        ),

        "sensors": (
            "Could you clarify which type of sensor you mean? "
            "For example, a soil moisture sensor, temperature sensor, "
            "or another type of sensor?"
        ),

        "ai": (
            "Could you clarify what aspect of artificial intelligence "
            "you would like to know about, such as its definition, "
            "applications, or limitations?"
        ),

        "artificial intelligence": (
            "Could you clarify what aspect of artificial intelligence "
            "you would like to know about, such as its definition, "
            "applications, or limitations?"
        )
    }

    for topic, question in broad_topics.items():

        if topic in clean_query:

            # Do not trigger for already specific questions.
            specific_question_words = [
                "what",
                "how",
                "why",
                "when",
                "where",
                "which",
                "difference",
                "application",
                "applications",
                "benefits",
                "advantages",
                "limitations",
                "uses",
                "used"
            ]

            has_specific_question = any(
                word in words
                for word in specific_question_words
            )

            if not has_specific_question:

                return {
                    "needs_clarification": True,
                    "clarification_type": "ambiguous",
                    "question": question
                }

    # ============================================================
    # MULTI-PART QUERY DETECTION
    # ============================================================

    question_words = [
        "what",
        "why",
        "how",
        "when",
        "where",
        "which"
    ]

    question_count = 0

    for word in question_words:

        if word in words:
            question_count += 1

    if query.count("?") > 1 or question_count > 1:

        return {
            "needs_clarification": False,
            "clarification_type": "multi_part",
            "question": ""
        }

    # ============================================================
    # NORMAL QUERY
    # ============================================================

    return {
        "needs_clarification": False,
        "clarification_type": "clear",
        "question": ""
    }