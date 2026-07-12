"""Cohere Rerank (cross-encoder) step between Pinecone and the LLM.

Pinecone gives us a coarse bi-encoder ranking (cosine similarity). Cohere's
rerank model reads the query and each chunk *together* and produces a much more
accurate relevance ordering. We fetch a wide candidate set from Pinecone and let
this stage pick the handful the LLM actually sees.

Designed to fail soft: if the Cohere key is missing, or the API errors / times
out, we fall back to the original Pinecone order (truncated) so /ask never breaks
because of a reranker hiccup.
"""
from typing import List, Dict, Optional

import cohere

from backend.config import settings

# Build the client once. A short timeout + a single retry keeps a slow/hung
# Cohere call from stalling the whole request; the caller still gets a fallback.
_client: Optional[cohere.ClientV2] = (
    cohere.ClientV2(
        api_key=settings.COHERE_API_KEY,
        timeout=settings.RERANK_TIMEOUT_S,
        max_retries=1,
    )
    if settings.COHERE_API_KEY
    else None
)


def rerank_chunks(query: str, chunks: List[Dict], top_n: int) -> List[Dict]:
    """Return the `top_n` most relevant chunks, reordered by Cohere rerank.

    Each returned chunk keeps its original fields (including the Pinecone cosine
    `score`, so downstream confidence stays calibrated) and gains a
    `rerank_score` in [0, 1]. On any failure we return the input order,
    truncated to `top_n`.
    """
    if not chunks:
        return []

    # No key configured → skip reranking, behave like the old top-N path.
    if _client is None:
        return chunks[:top_n]

    try:
        documents = [c["text"] for c in chunks]
        resp = _client.rerank(
            model=settings.RERANK_MODEL,
            query=query,
            documents=documents,
            top_n=min(top_n, len(documents)),
        )
        reranked: List[Dict] = []
        for r in resp.results:
            chunk = dict(chunks[r.index])          # copy; don't mutate the input
            chunk["rerank_score"] = float(r.relevance_score)
            reranked.append(chunk)
        return reranked
    except Exception as e:
        # Timeout, rate limit, network, bad response — degrade gracefully.
        print(f"  ⚠ Cohere rerank failed ({type(e).__name__}: {e}); "
              f"falling back to Pinecone order")
        return chunks[:top_n]
