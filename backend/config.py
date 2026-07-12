from dotenv import load_dotenv
import os
load_dotenv()

class Settings:
    # ── Generation (answers + follow-ups) → Groq / Llama ─────────────────────
    # Groq exposes an OpenAI-COMPATIBLE endpoint, so we drive it with the already
    # installed `openai` SDK by pointing base_url at Groq. Moving generation here
    # frees Gemini's tiny generate_content free-tier quota (~20/day); Gemini now
    # only does EMBEDDINGS, which have a much larger, separate quota.
    GROQ_API_KEY:          str   = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL:            str   = "llama-3.3-70b-versatile"   # website answers — best quality
    # The Ragas eval judge is token-HUNGRY (faithfulness decomposes every answer
    # into claims → many calls). Running it on the 70B model drains that model's
    # 100k-tokens/day pool in a single eval. The 8B model has its OWN separate
    # daily pool, so the judge uses it and leaves the 70B budget for real users.
    GROQ_JUDGE_MODEL:      str   = os.getenv("GROQ_JUDGE_MODEL", "llama-3.1-8b-instant")
    GROQ_BASE_URL:         str   = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")

    # ── Embeddings → Gemini (UNCHANGED) ──────────────────────────────────────
    # Must stay Gemini: the Pinecone index is 3072-d to match gemini-embedding-001,
    # and every stored vector uses it. Groq has no embeddings API anyway.
    GEMINI_API_KEY:        str   = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL:          str   = "gemini-3.5-flash"   # kept for reference/fallback
    EMBEDDING_MODEL:       str   = "gemini-embedding-001"
    # gemini-embedding-001 returns 3072-dim vectors natively, and the live
    # Pinecone index is created with 3072 dims. This MUST match the index —
    # it is used to build the dummy query vector in delete_document_chunks(),
    # and a mismatch makes every document deletion silently fail.
    EMBEDDING_DIMENSIONS:  int   = 3072
    PINECONE_API_KEY:      str   = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX:        str   = os.getenv("PINECONE_INDEX_NAME", "rag-documents")
    JWT_SECRET:            str   = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")

    # Retrieve-then-rerank pipeline:
    #   Pinecone returns RETRIEVAL_CANDIDATES (coarse, bi-encoder cosine) →
    #   Cohere rerank (cross-encoder) picks the RERANK_TOP_N best → LLM.
    COHERE_API_KEY:        str   = os.getenv("COHERE_API_KEY", "")
    RERANK_MODEL:          str   = "rerank-v3.5"
    # Fetch a WIDE candidate set. Pinecone's coarse cosine ranking lets a large,
    # mediocre-but-similar document (e.g. a 20-page PDF whose every page scores
    # ~0.56) crowd the truly relevant chunk out of a narrow top-K. Pulling more
    # candidates lets the cross-encoder reranker actually SEE the right chunk and
    # lift it — the reranker can only reorder what retrieval hands it.
    RETRIEVAL_CANDIDATES:  int   = 50     # fetched from Pinecone before reranking
    RERANK_TOP_N:          int   = 5      # kept after rerank, fed to the LLM
    # Cohere's first call after an idle period pays TLS/DNS/connection warmup and
    # can exceed a tight timeout; when it does, we silently fall back to raw
    # Pinecone order (noise-heavy) and answer quality drops. Give it real headroom
    # — a healthy rerank of ~50 chunks still returns in ~1-2s.
    RERANK_TIMEOUT_S:      float = 15.0   # per-call timeout for the Cohere API

    DEFAULT_TOP_K:         int   = 7
    MIN_SIMILARITY_SCORE:  float = 0.30
    CHUNK_SIZE:            int   = 1000
    CHUNK_OVERLAP:         int   = 200
    SCORE_MIN:             float = 0.30
    SCORE_MAX:             float = 0.90

settings = Settings()
