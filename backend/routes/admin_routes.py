# backend/routes/admin_routes.py
"""
Admin-only analytics endpoints. Every route here requires role='admin',
enforced by the get_current_admin dependency.
"""

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
    """Top-line KPI numbers for the admin dashboard."""
    total_users = db.query(User).count()
    total_documents = db.query(Document).count()
    total_queries = db.query(Query).count()
    total_chunks = db.query(func.sum(Document.chunks_count)).scalar() or 0
    avg_confidence = db.query(func.avg(Query.confidence)).scalar() or 0
    avg_response_time = db.query(func.avg(Query.response_time_ms)).scalar() or 0

    return {
        "total_users": total_users,
        "total_documents": total_documents,
        "total_queries": total_queries,
        "total_chunks": int(total_chunks),
        "avg_confidence": round(avg_confidence, 1),
        "avg_response_time_ms": round(avg_response_time, 0),
    }


@router.get("/users")
def admin_users(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    """Every registered user with their document/query counts."""
    users = db.query(User).order_by(User.created_at.desc()).all()

    result = []
    for u in users:
        doc_count = db.query(Document).filter(Document.owner_id == u.id).count()
        query_count = db.query(Query).filter(Query.user_id == u.id).count()
        result.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "created_at": u.created_at.isoformat(),
            "documents": doc_count,
            "queries": query_count
        })
    return result


@router.get("/queries")
def admin_queries(limit: int = 50, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    """Most recent questions asked across ALL users, newest first."""
    queries = db.query(Query).order_by(Query.created_at.desc()).limit(limit).all()

    result = []
    for q in queries:
        user = db.query(User).filter(User.id == q.user_id).first()
        result.append({
            "id": q.id,
            "question": q.question,
            "user_email": user.email if user else "Unknown",
            "confidence": q.confidence,
            "chunks_used": q.chunks_used,
            "response_time_ms": q.response_time_ms,
            "created_at": q.created_at.isoformat()
        })
    return result


@router.get("/documents")
def admin_documents(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    """Every document uploaded across ALL users."""
    docs = db.query(Document).order_by(Document.uploaded_at.desc()).all()

    result = []
    for d in docs:
        user = db.query(User).filter(User.id == d.owner_id).first()
        result.append({
            "id": d.id,
            "filename": d.filename,
            "owner_email": user.email if user else "Unknown",
            "chunks_count": d.chunks_count,
            "uploaded_at": d.uploaded_at.isoformat()
        })
    return result


@router.get("/activity-timeline")
def admin_activity(db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    """Queries-per-day for the last 14 days, for the dashboard chart."""
    results = []
    for i in range(13, -1, -1):
        day = (datetime.utcnow() - timedelta(days=i)).date()
        count = db.query(Query).filter(func.date(Query.created_at) == day).count()
        results.append({"date": day.strftime("%b %d"), "queries": count})
    return results
