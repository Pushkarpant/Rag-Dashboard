import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from backend.database import get_db
from backend.models import Conversation, ChatMessage, User
from backend.auth import get_current_user
from datetime import datetime

router = APIRouter(prefix="/conversations", tags=["conversations"])

class MessageIn(BaseModel):
    role: str
    content: str
    sources: Optional[List[dict]] = []
    confidence: Optional[int] = 0

@router.get("")
def list_conversations(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    convos = (db.query(Conversation)
              .filter(Conversation.user_id == user.id)
              .order_by(Conversation.updated_at.desc()).limit(50).all())
    return [{"id": c.id, "title": c.title, "updated_at": c.updated_at.isoformat()} for c in convos]

@router.post("")
def create_conversation(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = Conversation(user_id=user.id, title="New Chat")
    db.add(c); db.commit(); db.refresh(c)
    return {"id": c.id, "title": c.title, "updated_at": c.updated_at.isoformat()}

@router.get("/{convo_id}/messages")
def get_messages(convo_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Conversation).filter(Conversation.id == convo_id, Conversation.user_id == user.id).first()
    if not c: raise HTTPException(404, "Conversation not found")
    return [{"id": m.id, "role": m.role, "content": m.content,
             "sources": json.loads(m.sources_json) if m.sources_json else [],
             "confidence": m.confidence, "created_at": m.created_at.isoformat()}
            for m in c.messages]

@router.post("/{convo_id}/messages")
def add_message(convo_id: int, msg: MessageIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Conversation).filter(Conversation.id == convo_id, Conversation.user_id == user.id).first()
    if not c: raise HTTPException(404, "Conversation not found")
    m = ChatMessage(conversation_id=convo_id, role=msg.role, content=msg.content,
                    sources_json=json.dumps(msg.sources or []), confidence=msg.confidence or 0)
    db.add(m)
    if msg.role == "user" and c.title == "New Chat":
        c.title = msg.content[:60] + ("…" if len(msg.content) > 60 else "")
    c.updated_at = datetime.utcnow()
    db.commit(); db.refresh(m)
    return {"id": m.id, "role": m.role}

@router.delete("/{convo_id}")
def delete_conversation(convo_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    c = db.query(Conversation).filter(Conversation.id == convo_id, Conversation.user_id == user.id).first()
    if not c: raise HTTPException(404, "Not found")
    db.delete(c); db.commit()
    return {"deleted": convo_id}
