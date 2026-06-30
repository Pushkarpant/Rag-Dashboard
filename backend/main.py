# backend/main.py
"""
RAG Dashboard API v3.0
Adds on top of the original RAG pipeline:
  - JWT authentication (signup/login)
  - Multi-tenant document isolation (each user only sees their own docs)
  - Every question logged to SQLite, powering the admin analytics panel
  - Admin-only routes for platform-wide visibility
"""

import os
import time
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.database import get_db, init_db
from backend.models import User, Document, Query
from backend.auth import get_current_user
from backend.routes.auth_routes import router as auth_router
from backend.routes.admin_routes import router as admin_router

from backend.services.rag_service import answer_question
from backend.services.document_processor import process_pdf, process_text_file
from backend.services.vector_store import delete_document_chunks

app = FastAPI(title="RAG Dashboard API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the auth (/auth/*) and admin (/admin/*) routers
app.include_router(auth_router)
app.include_router(admin_router)

DOCUMENTS_FOLDER = "documents"
os.makedirs(DOCUMENTS_FOLDER, exist_ok=True)


@app.on_event("startup")
def on_startup():
    init_db()
    print("✅ Database tables ready (rag_dashboard.db)")


class QuestionRequest(BaseModel):
    question: str
    top_k: Optional[int] = 5


@app.get("/")
def home():
    return {
        "message": "RAG Dashboard API v3.0",
        "status": "running",
        "features": ["JWT auth", "multi-tenant documents", "admin analytics"]
    }


# ── Core RAG endpoint (now requires login) ─────────────────────────────────────

@app.post("/ask")
async def ask(
    request: QuestionRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    if not request.question.strip():
        raise HTTPException(400, "Question cannot be empty")
    if len(request.question) > 1000:
        raise HTTPException(400, "Question too long (max 1000 characters)")

    start = time.time()
    try:
        result = answer_question(
            question=request.question,
            top_k=request.top_k,
            user_id=user.id
        )
    except Exception as e:
        raise HTTPException(500, f"Error: {str(e)}")
    elapsed_ms = int((time.time() - start) * 1000)

    # Every question is logged — this single table powers the
    # entire admin analytics panel (totals, recent activity, timing).
    db.add(Query(
        user_id=user.id,
        question=request.question,
        answer_preview=result["answer"][:500],
        confidence=result.get("confidence", 0),
        chunks_used=result.get("chunks_used", 0),
        response_time_ms=elapsed_ms
    ))
    db.commit()

    return result


# ── Document management (per-user, requires login) ─────────────────────────────

@app.post("/documents/upload")
async def upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt"]:
        raise HTTPException(400, f"Only PDF and TXT files supported. Got: {ext}")

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large. Maximum 20MB.")

    # Re-uploading the same filename replaces the old version cleanly
    # (old chunks deleted from Pinecone, old DB row removed)
    existing = db.query(Document).filter(
        Document.filename == file.filename,
        Document.owner_id == user.id
    ).first()
    if existing:
        delete_document_chunks(file.filename, user.id)
        db.delete(existing)
        db.commit()

    # Per-user folder on disk avoids filename collisions between users
    user_folder = os.path.join(DOCUMENTS_FOLDER, str(user.id))
    os.makedirs(user_folder, exist_ok=True)
    save_path = os.path.join(user_folder, file.filename)

    with open(save_path, "wb") as f:
        f.write(contents)

    try:
        if ext == ".pdf":
            result = process_pdf(save_path, owner_id=user.id)
        else:
            result = process_text_file(save_path, owner_id=user.id)

        db.add(Document(
            filename=file.filename,
            owner_id=user.id,
            chunks_count=result["chunks_stored"],
            file_size_kb=round(len(contents) / 1024, 1)
        ))
        db.commit()

        return {"message": f"✅ '{file.filename}' processed!", "details": result}

    except Exception as e:
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(500, f"Processing failed: {str(e)}")


@app.get("/documents")
def get_documents(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Returns ONLY the current user's documents — true multi-tenant isolation."""
    docs = db.query(Document).filter(
        Document.owner_id == user.id
    ).order_by(Document.uploaded_at.desc()).all()

    return {
        "documents": [
            {
                "filename": d.filename,
                "chunks": d.chunks_count,
                "uploaded_at": d.uploaded_at.isoformat()
            } for d in docs
        ],
        "total_chunks": sum(d.chunks_count for d in docs),
        "total_documents": len(docs)
    }


@app.delete("/documents/{filename}")
def delete_document(
    filename: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Ownership check — a user can only delete THEIR OWN documents,
    # even if they somehow guess another user's exact filename.
    doc = db.query(Document).filter(
        Document.filename == filename,
        Document.owner_id == user.id
    ).first()

    if not doc:
        raise HTTPException(404, "Document not found")

    deleted_chunks = delete_document_chunks(filename, user.id)
    db.delete(doc)
    db.commit()

    file_path = os.path.join(DOCUMENTS_FOLDER, str(user.id), filename)
    if os.path.exists(file_path):
        os.remove(file_path)

    return {"message": f"Deleted {filename}", "chunks_removed": deleted_chunks}


@app.get("/stats")
def get_user_stats(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """Stats scoped to the current user (not platform-wide — see /admin/stats for that)."""
    docs = db.query(Document).filter(Document.owner_id == user.id).all()
    query_count = db.query(Query).filter(Query.user_id == user.id).count()

    return {
        "total_chunks": sum(d.chunks_count for d in docs),
        "total_documents": len(docs),
        "total_queries": query_count,
        "model": "gemini-3.5-flash",
        "embedding_model": "text-embedding-004",
        "status": "ready" if docs else "no_documents"
    }
