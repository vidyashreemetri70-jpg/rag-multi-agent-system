import re


def check_clarification(query):

    query = query.strip()
    query_lower = query.lower()

    # Empty query
    if not query:
        return {
            "needs_clarification": True,
            "clarification_type": "incomplete",
            "question": "Could you please enter your question?"
        }

    # Remove punctuation for word checking
    clean_query = re.sub(
        r"[^\w\s]",
        "",
        query_lower
    )

    words = clean_query.split()

    # Very short / incomplete queries
    if len(words) < 3:
        return {
            "needs_clarification": True,
            "clarification_type": "incomplete",
            "question": "Could you please provide more details about your question?"
        }

    # Ambiguous reference words
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

    # Multi-part query detection
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

    # Normal query
    return {
        "needs_clarification": False,
        "clarification_type": "clear",
        "question": ""
    }