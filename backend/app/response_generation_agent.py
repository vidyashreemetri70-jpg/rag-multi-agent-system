import requests


def generate_response(query, retrieved_results):

    # =====================================================
    # RETRIEVED INFORMATION
    # =====================================================

    context = "\n".join(
        retrieved_results
    )

    # =====================================================
    # LLM PROMPT
    # =====================================================

    prompt = f"""
You are a document-based AI knowledge assistant.

CURRENT USER QUESTION:
{query}

RETRIEVED INFORMATION:
{context}

IMPORTANT:

Answer ONLY the CURRENT USER QUESTION shown above.

Do NOT use previous questions.
Do NOT create previous questions.
Do NOT repeat previous questions.
Do NOT split the current question.
Do NOT create additional questions.
Do NOT include conversation history.
Do NOT mention the user's previous query.

RULES:

1. Answer only the current user question.

2. Use ONLY information from RETRIEVED INFORMATION.

3. Do NOT use outside knowledge.

4. Do NOT guess.

5. Do NOT invent information.

6. If the retrieved information does not contain
enough information to answer the question, write:

- Information not found in the knowledge base.

7. Keep the answer simple and direct.

8. Do not include an introduction.

9. Do not include a conclusion.

10. Do not create numbered questions.

11. Do not create multiple questions.

12. Return exactly this format:

<current question>
- <answer>

Do not return anything else.

CURRENT USER QUESTION:
{query}

Now answer ONLY this question.
"""

    # =====================================================
    # CALL OLLAMA
    # =====================================================

    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0
            }
        }
    )

    response.raise_for_status()

    return response.json()["response"].strip()