from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.database import Base

class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    full_name       = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(String(20), default="user", nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)
    documents       = relationship("Document",     back_populates="owner",     cascade="all, delete-orphan")
    queries         = relationship("Query",        back_populates="user",      cascade="all, delete-orphan")
    conversations   = relationship("Conversation", back_populates="user",      cascade="all, delete-orphan")

class Document(Base):
    __tablename__ = "documents"
    id           = Column(Integer, primary_key=True, index=True)
    filename     = Column(String(500), nullable=False)
    owner_id     = Column(Integer, ForeignKey("users.id"), nullable=False)
    chunks_count = Column(Integer, default=0)
    file_size_kb = Column(Float, default=0)
    uploaded_at  = Column(DateTime, default=datetime.utcnow)
    owner        = relationship("User", back_populates="documents")

class Query(Base):
    __tablename__ = "queries"
    id               = Column(Integer, primary_key=True, index=True)
    user_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    question         = Column(String(1000), nullable=False)
    answer_preview   = Column(String(500))
    confidence       = Column(Integer, default=0)
    chunks_used      = Column(Integer, default=0)
    response_time_ms = Column(Integer, default=0)
    created_at       = Column(DateTime, default=datetime.utcnow)
    user             = relationship("User", back_populates="queries")

class Conversation(Base):
    __tablename__ = "conversations"
    id         = Column(Integer, primary_key=True, index=True)
    user_id    = Column(Integer, ForeignKey("users.id"), nullable=False)
    title      = Column(String(200), nullable=False, default="New Chat")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user       = relationship("User", back_populates="conversations")
    messages   = relationship("ChatMessage", back_populates="conversation",
                              cascade="all, delete-orphan", order_by="ChatMessage.created_at")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id              = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role            = Column(String(20), nullable=False)
    content         = Column(Text, nullable=False)
    sources_json    = Column(Text)
    confidence      = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)
    conversation    = relationship("Conversation", back_populates="messages")
