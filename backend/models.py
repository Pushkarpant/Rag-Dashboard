# backend/models.py
"""SQLAlchemy ORM models: User, Document, Query (the relational side of the app)."""

from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)

    # "user" or "admin" — the FIRST person to sign up becomes admin
    # automatically (see auth_routes.py). Everyone after is "user".
    role = Column(String(20), default="user", nullable=False)

    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="owner", cascade="all, delete-orphan")
    queries = relationship("Query", back_populates="user", cascade="all, delete-orphan")


class Document(Base):
    """
    Tracks WHO owns WHICH document and how many chunks it produced.
    The actual chunk text + embeddings live in Pinecone — this table
    is the source of truth for "what exists and who owns it".
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    chunks_count = Column(Integer, default=0)
    file_size_kb = Column(Float, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="documents")


class Query(Base):
    """
    Logs every question asked, by whom, and how the system performed.
    This table powers the entire admin analytics panel.
    """
    __tablename__ = "queries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(String(1000), nullable=False)
    answer_preview = Column(String(500))
    confidence = Column(Integer, default=0)
    chunks_used = Column(Integer, default=0)
    response_time_ms = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="queries")
