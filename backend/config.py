# backend/config.py
# UPDATED — Configured for Gemini + Google Embeddings (fully free!)

from dotenv import load_dotenv
import os

load_dotenv()


class Settings:

    # ── Gemini (replaces OpenAI — completely FREE tier) ──────────────────
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")

    # Gemini models available free:
    # gemini-3.5-flash → fast, free, good quality ← WE USE THIS
    # gemini-1.5-pro   → smarter, limited free quota
    # gemini-2.0-flash → newest, experimental
    GEMINI_MODEL: str = "gemini-3.5-flash"

    # Google Embedding model (FREE with Gemini key)
    # gemini-embedding-001 → 3072 dimensions
    EMBEDDING_MODEL: str = "gemini-embedding-001"

    # IMPORTANT: Google embeddings = 3072 dimensions
    # OpenAI embeddings = 1536 dimensions
    # Your Pinecone index MUST match this!
    EMBEDDING_DIMENSIONS: int = 3072

    # ── Pinecone ──────────────────────────────────────────────────────────
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX: str = os.getenv("PINECONE_INDEX_NAME", "rag-documents")

    # ── Auth (JWT) ────────────────────────────────────────────────────────
    # Generate a real secret with:
    #   python -c "import secrets; print(secrets.token_hex(32))"
    # Put the result in your .env file. Never commit the real value.
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")

    # ── App Settings ──────────────────────────────────────────────────────
    # How many document chunks to retrieve per question
    # More = more context but slower and pricier
    DEFAULT_TOP_K: int = 5

    # Minimum similarity score to include a chunk
    # Below this → likely not relevant
    MIN_SIMILARITY_SCORE: float = 0.5

    # Max characters per chunk when splitting documents
    CHUNK_SIZE: int = 1000

    # Overlap between chunks (prevents context loss at boundaries)
    CHUNK_OVERLAP: int = 200


settings = Settings()


# ─── IMPORTANT NOTE ON PINECONE INDEX ────────────────────────────────────────
# If you previously created a Pinecone index with 1536 dimensions (OpenAI),
# you MUST create a NEW index with 3072 dimensions for Google embeddings!
#
# Steps:
# 1. Go to pinecone.io → Indexes
# 2. Delete old index (if exists with 1536 dims)
# 3. Create new index:
#    Name: rag-documents
#    Dimensions: 3072   ← CRITICAL
#    Metric: cosine
#    Cloud: AWS
#    Region: us-east-1
# ─────────────────────────────────────────────────────────────────────────────
