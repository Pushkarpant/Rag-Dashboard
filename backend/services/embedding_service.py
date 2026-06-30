# # backend/services/embedding_service.py
# # UPDATED — Uses Google's FREE embedding model instead of OpenAI
# # No cost! Works with your Gemini API key.

# from google import genai 
# from backend.config import settings
# from typing import List

# # Configure Gemini with your API key
# client = genai.Client(
#     api_key=settings.GEMINI_API_KEY
# )

# def get_embedding(text: str) -> List[float]:
#     """
#     Convert text to vector embedding using Google's FREE model.

#     Model: gemini-embedding-001
#     - Completely FREE with Gemini API key
#     - 3072 dimensions (vs OpenAI's 1536)
#     - Works great for semantic search

#     Input: any text string
#     Output: list of 3072 decimal numbers representing meaning
#     """

#     # Clean the text — remove excessive whitespace
#     clean_text = " ".join(text.replace("\n", " ").split())

#     # Limit text length (API has limits)
#     # 2000 chars is safe for embedding
#     if len(clean_text) > 2000:
#         clean_text = clean_text[:2000]

#     result = genai.embed_content(
#         model="gemini-embedding-001",
#         content=clean_text,
#         task_type="retrieval_document"
#         # task_type options:
#         # "retrieval_document" → for storing documents
#         # "retrieval_query" → for search queries
#         # This distinction improves search quality!
#     )

#     return result['embedding']


# def get_query_embedding(query: str) -> List[float]:
#     """
#     Get embedding specifically for a SEARCH QUERY.

#     Using task_type="retrieval_query" is important!
#     Google's model is optimized differently for:
#     - Documents being stored (retrieval_document)
#     - Queries being searched (retrieval_query)
#     Using the right task_type improves search accuracy by ~10%
#     """

#     clean_query = " ".join(query.replace("\n", " ").split())

#     result = genai.embed_content(
#         model="gemini-embedding-001",
#         content=clean_query,
#         task_type="retrieval_query"  # DIFFERENT from document embedding!
#     )

#     return result['embedding']


# def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
#     """
#     Get embeddings for multiple texts.
#     More efficient than calling get_embedding() in a loop.

#     Used when ingesting many document chunks at once.
#     """

#     embeddings = []

#     # Process in batches of 10 (API rate limit safe)
#     batch_size = 10
#     for i in range(0, len(texts), batch_size):
#         batch = texts[i:i + batch_size]

#         for text in batch:
#             embedding = get_embedding(text)
#             embeddings.append(embedding)

#         print(f"  Embedded {min(i + batch_size, len(texts))}/{len(texts)} texts")

#     return embeddings


# backend/services/embedding_service.py

from google import genai
from backend.config import settings
from typing import List

# Initialize Gemini client
client = genai.Client(
    api_key=settings.GEMINI_API_KEY
)


def clean_text(text: str) -> str:
    """
    Clean and truncate text.
    """

    text = " ".join(text.replace("\n", " ").split())

    return text[:2000]


def get_embedding(text: str) -> List[float]:
    """
    Generate embedding for documents.
    """

    clean = clean_text(text)

    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=clean
    )

    return response.embeddings[0].values


def get_query_embedding(query: str) -> List[float]:
    """
    Generate embedding for search queries.
    """

    clean = clean_text(query)

    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=clean
    )

    return response.embeddings[0].values


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """
    Batch embedding generation.
    """

    cleaned = [clean_text(t) for t in texts]

    response = client.models.embed_content(
        model="gemini-embedding-001",
        contents=cleaned
    )

    return [e.values for e in response.embeddings]