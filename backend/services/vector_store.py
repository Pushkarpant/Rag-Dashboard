from pinecone import Pinecone
from backend.config import settings
from backend.services.embedding_service import get_embedding, get_query_embedding
from typing import List, Dict, Optional

pc    = Pinecone(api_key=settings.PINECONE_API_KEY)
index = pc.Index(settings.PINECONE_INDEX)

def store_chunks(chunks: List[Dict]) -> int:
    if not chunks:
        return 0
    total, batch_size = 0, 50
    for i in range(0, len(chunks), batch_size):
        batch   = chunks[i:i + batch_size]
        vectors = []
        for c in batch:
            try:
                vectors.append({
                    "id":     c["id"],
                    "values": get_embedding(c["text"]),
                    "metadata": {"text": c["text"], **c["metadata"]}
                })
            except Exception as e:
                print(f"  ⚠ embed failed for {c['id']}: {e}")
        if vectors:
            index.upsert(vectors=vectors)
            total += len(vectors)
            print(f"  📦 stored batch of {len(vectors)}")
    return total

def search_similar(query: str, top_k: int = 7,
                   user_id: Optional[int] = None) -> List[Dict]:
    qv     = get_query_embedding(query)
    filt   = {"owner_id": {"$eq": user_id}} if user_id is not None else None
    result = index.query(vector=qv, top_k=top_k,
                         include_metadata=True, filter=filt)
    chunks = []
    for m in result.matches:
        if m.score >= settings.MIN_SIMILARITY_SCORE:
            chunks.append({
                "score":    round(m.score, 4),
                "text":     m.metadata.get("text", ""),
                "filename": m.metadata.get("filename", "Unknown"),
                "page":     m.metadata.get("page", 0),
                "chunk_id": m.id,
            })
    return sorted(chunks, key=lambda x: x["score"], reverse=True)

def get_stats() -> Dict:
    try:
        s = index.describe_index_stats()
        return {"total_chunks": s.total_vector_count,
                "ready": s.total_vector_count > 0,
                "dimensions": s.dimension}
    except Exception as e:
        return {"total_chunks": 0, "ready": False, "error": str(e)}

def delete_document_chunks(filename: str, owner_id: int) -> int:
    try:
        dummy  = [0.0] * settings.EMBEDDING_DIMENSIONS
        result = index.query(
            vector=dummy, top_k=10000, include_metadata=True,
            filter={"filename": {"$eq": filename},
                    "owner_id": {"$eq": owner_id}}
        )
        if not result.matches:
            return 0
        ids = [m.id for m in result.matches]
        index.delete(ids=ids)
        return len(ids)
    except Exception as e:
        print(f"Error deleting chunks: {e}")
        return 0
