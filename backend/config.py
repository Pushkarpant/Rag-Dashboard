from dotenv import load_dotenv
import os
load_dotenv()

class Settings:
    GEMINI_API_KEY:        str   = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL:          str   = "gemini-3.5-flash"
    EMBEDDING_MODEL:       str   = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS:  int   = 768
    PINECONE_API_KEY:      str   = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX:        str   = os.getenv("PINECONE_INDEX_NAME", "rag-documents")
    JWT_SECRET:            str   = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")
    DEFAULT_TOP_K:         int   = 7
    MIN_SIMILARITY_SCORE:  float = 0.30
    CHUNK_SIZE:            int   = 1000
    CHUNK_OVERLAP:         int   = 200
    SCORE_MIN:             float = 0.30
    SCORE_MAX:             float = 0.90

settings = Settings()
