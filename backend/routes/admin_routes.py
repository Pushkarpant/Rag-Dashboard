from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
import os
from backend.database import get_db
from backend.models import User, Document, Query
from backend.auth import get_current_admin
from backend.services.vector_store import delete_document_chunks

router = APIRouter(prefix="/admin", tags=["admin"])

DOCS_FOLDER = "documents"


def _purge_document(db: Session, doc: Document) -> None:
    """Fully remove one document: Pinecone vectors, the file on disk, and the DB
    row. Shared by admin document-delete and admin user-delete so a deleted
    user leaves no orphaned vectors behind (Postgres cascade drops the rows, but
    Pinecone is a separate store and won't cascade)."""
    # Vectors are scoped by (filename, owner_id) — the same key the upload used.
    delete_document_chunks(doc.filename, doc.owner_id)
    fp = os.path.join(DOCS_FOLDER, str(doc.owner_id), doc.filename)
    if os.path.exists(fp):
        try:
            os.remove(fp)
        except OSError:
            pass  # best-effort; disk file is ephemeral anyway
    db.delete(doc)

@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return {
        "total_users":          db.query(User).count(),
        "total_documents":      db.query(Document).count(),
        "total_queries":        db.query(Query).count(),
        "total_chunks":         int(db.query(func.sum(Document.chunks_count)).scalar() or 0),
        "avg_confidence":       round(db.query(func.avg(Query.confidence)).scalar() or 0, 1),
        "avg_response_time_ms": round(db.query(func.avg(Query.response_time_ms)).scalar() or 0, 0),
    }

@router.get("/users")
def admin_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return [{"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role,
             "created_at": u.created_at.isoformat(),
             "documents": db.query(Document).filter(Document.owner_id == u.id).count(),
             "queries":   db.query(Query).filter(Query.user_id   == u.id).count()}
            for u in db.query(User).order_by(User.created_at.desc()).all()]

@router.get("/queries")
def admin_queries(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    rows = db.query(Query).order_by(Query.created_at.desc()).limit(limit).all()
    return [{"id": q.id, "question": q.question,
             "user_email": (db.query(User).filter(User.id == q.user_id).first() or User(email="Unknown")).email,
             "confidence": q.confidence, "chunks_used": q.chunks_used,
             "response_time_ms": q.response_time_ms, "created_at": q.created_at.isoformat()}
            for q in rows]

@router.get("/documents")
def admin_documents(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    rows = db.query(Document).order_by(Document.uploaded_at.desc()).all()
    return [{"id": d.id, "filename": d.filename,
             "owner_email": (db.query(User).filter(User.id == d.owner_id).first() or User(email="Unknown")).email,
             "chunks_count": d.chunks_count, "uploaded_at": d.uploaded_at.isoformat()}
            for d in rows]

@router.get("/activity-timeline")
def admin_activity(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    return [{"date": (datetime.utcnow() - timedelta(days=i)).strftime("%b %d"),
             "queries": db.query(Query).filter(
                 func.date(Query.created_at) == (datetime.utcnow() - timedelta(days=i)).date()
             ).count()}
            for i in range(13, -1, -1)]


@router.delete("/documents/{doc_id}")
def admin_delete_document(doc_id: int,
                          db: Session = Depends(get_db),
                          _: User = Depends(get_current_admin)):
    """Admin: delete ANY user's document (vectors + file + row)."""
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    filename = doc.filename
    _purge_document(db, doc)
    db.commit()
    return {"deleted": filename, "id": doc_id}


@router.delete("/users/{user_id}")
def admin_delete_user(user_id: int,
                      db: Session = Depends(get_db),
                      admin: User = Depends(get_current_admin)):
    """Admin: delete ANY user and ALL their data — documents (incl. Pinecone
    vectors + disk files), queries, and conversations. Postgres cascades the
    child rows once the User is deleted; we purge Pinecone/disk first because
    those live outside the database and won't cascade."""
    if user_id == admin.id:
        raise HTTPException(400, "You cannot delete your own admin account.")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")

    # Purge external (Pinecone + disk) state for each of the user's documents.
    # We only need vector/file cleanup here; the DB rows go via cascade on delete.
    for doc in db.query(Document).filter(Document.owner_id == user_id).all():
        delete_document_chunks(doc.filename, doc.owner_id)
        fp = os.path.join(DOCS_FOLDER, str(doc.owner_id), doc.filename)
        if os.path.exists(fp):
            try:
                os.remove(fp)
            except OSError:
                pass

    email = target.email
    db.delete(target)   # cascade removes documents, queries, conversations
    db.commit()
    return {"deleted_user": email, "id": user_id}
