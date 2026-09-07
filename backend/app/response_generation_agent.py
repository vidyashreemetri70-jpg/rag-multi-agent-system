import requests


def generate_response(query, retrieved_results):
    context = "\n".join(retrieved_results)

    prompt = f"""
Answer the question using only the context below.

Context:
{context}

Question:
{query}

If the answer is not available in the context, say:
"Information not found in the knowledge base."

Answer clearly and do not make up information.
"""

    response = requests.post(
        "http://127.0.0.1:11434/api/generate",
        json={
            "model": "llama3.2",
            "prompt": prompt,
            "stream": False
        }
    )

    return response.json()["response"]