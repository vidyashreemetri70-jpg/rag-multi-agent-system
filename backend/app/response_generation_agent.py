import requests


def generate_response(query, retrieved_results):

    context = "\n".join(retrieved_results)

    prompt = f"""
You are a document-based AI knowledge assistant.

USER QUERY:
{query}

RETRIEVED INFORMATION FROM UPLOADED DOCUMENT:
{context}

STRICT INSTRUCTIONS:

1. Answer ONLY the USER QUERY given above.

2. Use ONLY information from the RETRIEVED INFORMATION.

3. NEVER create additional questions.

4. NEVER answer questions that the user did not ask.

5. NEVER guess or use outside knowledge.

6. Do not invent information.

7. The answer must contain ONE numbered section only.

8. Use this exact format:

1. {query}:
- First important point from the uploaded document.
- Second important point from the uploaded document.
- Third important point from the uploaded document.

9. Use bullet points only for the answer.

10. If the uploaded document does not contain enough information to answer the query, return:

1. {query}:
- Information not found in the knowledge base.

11. Do NOT add any extra questions.

12. Do NOT add any extra answers.

13. Do NOT add text before or after the answer.

14. Every statement must be supported by the uploaded document.

Return ONLY the final answer.
"""

    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False
        }
    )

    response.raise_for_status()

    return response.json()["response"].strip()