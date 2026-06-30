# backend/database.py
"""
SQLite database for relational data (users, document ownership, query logs).

WHY A SECOND DATABASE ALONGSIDE PINECONE?
This is called "polyglot persistence" — using the right storage engine
for each job instead of forcing everything into one:

- Pinecone: stores vector embeddings, does similarity search.
  Terrible at relational queries like "how many docs does user 7 own?"

- SQLite: stores users, ownership, audit logs.
  Terrible at "find documents semantically similar to this question".

Production RAG systems at real companies almost always look like this —
a vector store paired with a traditional relational database.
This is a genuine system-design talking point for interviews.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./rag_dashboard.db"

# check_same_thread=False is required for SQLite + FastAPI's
# threaded request handling. Safe here because SQLAlchemy
# manages one session per request (see get_db below).
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session for one request,
    then guarantees it's closed afterward — even if the request fails.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables on startup if they don't already exist."""
    from backend import models  # noqa: registers models with Base before create_all
    Base.metadata.create_all(bind=engine)
