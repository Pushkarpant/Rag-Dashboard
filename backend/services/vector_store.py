# backend/services/vector_store.py
# Multi-tenant version — every chunk is tagged with owner_id,
# and every search/delete is scoped to a specific user.

from pinecone import Pinecone
from backend.config import settings
from backend.services.embedding_service import get_embedding, get_query_embedding
from typing import List, Dict, Optional

pc = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX)


def store_chunks(chunks: List[Dict]) -> int:
    """
    Store document chunks in Pinecone.

    chunks format:
    [{"id": "...", "text": "...", "metadata": {"filename": ..., "page": ..., "owner_id": ...}}]

    The "owner_id" key inside metadata is what makes this multi-tenant —
    document_processor.py is responsible for putting it there.
    """
    if not chunks:
        return 0

    total_stored = 0
    batch_size = 50

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        vectors = []

        for chunk in batch:
            try:
                embedding = get_embedding(chunk["text"])
                vectors.append({
                    "id": chunk["id"],
                    "values": embedding,
                    "metadata": {
                        "text": chunk["text"],
                        **chunk["metadata"]
                    }
                })
            except Exception as e:
                print(f"  ⚠️ Failed to embed chunk {chunk['id']}: {e}")
                continue

        if vectors:
            index.upsert(vectors=vectors)
            total_stored += len(vectors)
            print(f"  📦 Stored batch: {len(vectors)} chunks")

    return total_stored


def search_similar(query: str, top_k: int = 5, user_id: Optional[int] = None) -> List[Dict]:
    """
    Search for document chunks most relevant to the query.

    user_id is the multi-tenant boundary. When provided, Pinecone's
    metadata filter restricts results to ONLY that user's own chunks —
    this is what stops User A from ever seeing User B's documents,
    even though both live in the same Pinecone index.
    """
    query_embedding = get_query_embedding(query)

    query_filter = None
    if user_id is not None:
        query_filter = {"owner_id": {"$eq": user_id}}

    results = index.query(
        vector=query_embedding,
        top_k=top_k,
        include_metadata=True,
        filter=query_filter
    )

    chunks = []
    for match in results.matches:
        if match.score >= settings.MIN_SIMILARITY_SCORE:
            chunks.append({
                "score": round(match.score, 4),
                "text": match.metadata.get("text", ""),
                "filename": match.metadata.get("filename", "Unknown"),
                "page": match.metadata.get("page", 0),
                "chunk_id": match.id
            })

    chunks.sort(key=lambda x: x["score"], reverse=True)
    return chunks


def get_stats() -> Dict:
    """Get Pinecone index statistics (across all users — admin use only)."""
    try:
        stats = index.describe_index_stats()
        return {
            "total_chunks": stats.total_vector_count,
            "ready": stats.total_vector_count > 0,
            "dimensions": stats.dimension
        }
    except Exception as e:
        return {"total_chunks": 0, "ready": False, "error": str(e)}


def delete_document_chunks(filename: str, owner_id: int) -> int:
    """
    Delete all chunks for a specific document, scoped to one user.

    Filtering by BOTH filename AND owner_id matters: two different
    users could each upload a file named "report.pdf" — without the
    owner_id filter, deleting one would risk touching the other's data.
    """
    try:
        dummy_vector = [0.0] * 3072
        results = index.query(
            vector=dummy_vector,
            top_k=10000,
            include_metadata=True,
            filter={
                "filename": {"$eq": filename},
                "owner_id": {"$eq": owner_id}
            }
        )

        if not results.matches:
            return 0

        ids = [m.id for m in results.matches]
        index.delete(ids=ids)
        return len(ids)
    except Exception as e:
        print(f"Error deleting chunks: {e}")
        return 0
