from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from backend.database import get_db
from backend.models import User, Document, Query
from backend.auth import get_current_admin

router = APIRouter(prefix="/admin", tags=["admin"])

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
