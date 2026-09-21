# ============================================================
# CONVERSATION MEMORY AGENT
# ============================================================

conversation_history = []


def add_memory(query, answer):

    conversation_history.append({
        "query": query,
        "answer": answer
    })


def get_memory():

    return conversation_history


def get_recent_memory(limit=3):

    return conversation_history[-limit:]


def get_last_memory():

    if not conversation_history:
        return None

    return conversation_history[-1]


def clear_memory():

    conversation_history.clear()