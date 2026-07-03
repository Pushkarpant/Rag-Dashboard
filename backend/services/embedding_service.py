import google.generativeai as genai
from backend.config import settings
from typing import List

genai.configure(api_key=settings.GEMINI_API_KEY)

def get_embedding(text: str) -> List[float]:
    clean = " ".join(text.replace("\n", " ").split())[:2000]
    result = genai.embed_content(
        model=settings.EMBEDDING_MODEL,
        content=clean,
        task_type="retrieval_document"
    )
    return result["embedding"]

def get_query_embedding(query: str) -> List[float]:
    clean = " ".join(query.replace("\n", " ").split())[:2000]
    result = genai.embed_content(
        model=settings.EMBEDDING_MODEL,
        content=clean,
        task_type="retrieval_query"
    )
    return result["embedding"]
