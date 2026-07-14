import sys
# Windows consoles default to cp1252, which can't encode the emoji used in our
# log statements → UnicodeEncodeError crashes startup and request handlers.
# Force UTF-8 (with a safe fallback) so the server runs everywhere.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

import os, time, json, asyncio, math
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db, init_db, SessionLocal
from backend.models import User, Document, Query
from backend.auth import get_current_user
from backend.routes.auth_routes         import router as auth_router
from backend.routes.admin_routes        import router as admin_router
from backend.routes.conversation_routes import router as convo_router
from backend.services.rag_service        import answer_question
from backend.services.document_processor import process_pdf, process_text_file
from backend.services.vector_store       import delete_document_chunks

DOCS_FOLDER = "documents"
os.makedirs(DOCS_FOLDER, exist_ok=True)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    print("✅ DB ready (PostgreSQL)")
    yield


app = FastAPI(title="Verity API", version="4.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(convo_router)

@app.get("/healthz")
def healthz():
    # Lightweight liveness endpoint for the Fly health check — no DB/network hit.
    return {"status": "ok", "version": "4.0.0"}

class QuestionRequest(BaseModel):
    question: str
    top_k: Optional[int] = 7

@app.post("/ask")
async def ask(req: QuestionRequest,
              db: Session = Depends(get_db),
              user: User  = Depends(get_current_user)):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    # ── Per-user rate limit: ASK_LIMIT questions per rolling ASK_WINDOW_HOURS ──
    # Count how many questions this user has asked inside the window. We use the
    # existing Query.created_at rows as the source of truth (no extra table), so
    # the window is genuinely rolling — the oldest question "falls off" as time
    # passes rather than resetting on a fixed clock. Admins are exempt.
    if settings.ASK_LIMIT > 0 and user.role != "admin":
        window_start = datetime.utcnow() - timedelta(hours=settings.ASK_WINDOW_HOURS)
        recent = (db.query(Query)
                    .filter(Query.user_id == user.id,
                            Query.created_at >= window_start)
                    .order_by(Query.created_at.asc())
                    .all())
        if len(recent) >= settings.ASK_LIMIT:
            # The limit clears when the OLDEST question in the window expires.
            resets_at   = recent[0].created_at + timedelta(hours=settings.ASK_WINDOW_HOURS)
            mins_left   = max(1, math.ceil((resets_at - datetime.utcnow()).total_seconds() / 60))
            hrs, mins   = divmod(mins_left, 60)
            wait_str    = f"{hrs}h {mins}m" if hrs else f"{mins}m"
            raise HTTPException(
                status_code=429,
                detail=(f"Message limit reached — you've used all "
                        f"{settings.ASK_LIMIT} questions for the last "
                        f"{settings.ASK_WINDOW_HOURS} hours. You can continue in "
                        f"{wait_str}."),
                headers={"Retry-After": str(mins_left * 60)},
            )

    start = time.time()
    try:
        result = answer_question(question=req.question,
                                 top_k=req.top_k, user_id=user.id)
    except Exception as e:
        raise HTTPException(500, str(e))
    ms = int((time.time() - start) * 1000)
    db.add(Query(user_id=user.id, question=req.question,
                 answer_preview=result["answer"][:500],
                 confidence=result.get("confidence", 0),
                 chunks_used=result.get("chunks_used", 0),
                 response_time_ms=ms))
    db.commit()
    return result

def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"

@app.post("/documents/upload")
async def upload(file: UploadFile = File(...),
                 db: Session = Depends(get_db),
                 user: User  = Depends(get_current_user)):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".txt"]:
        raise HTTPException(400, f"Only PDF/TXT. Got: {ext}")
    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 20 MB)")

    existing = db.query(Document).filter(
        Document.filename == file.filename,
        Document.owner_id == user.id).first()
    if existing:
        delete_document_chunks(file.filename, user.id)
        db.delete(existing); db.commit()

    user_folder = os.path.join(DOCS_FOLDER, str(user.id))
    os.makedirs(user_folder, exist_ok=True)
    save_path   = os.path.join(user_folder, file.filename)
    fname, uid  = file.filename, user.id

    async def stream():
        # Use a fresh DB session scoped to the stream. The request-scoped `db`
        # from Depends(get_db) may already be torn down by the time this
        # generator runs, since it executes after the response starts.
        stream_db = SessionLocal()
        saved = False
        try:
            yield _sse({"stage": "Saving file…",              "pct": 10})
            await asyncio.sleep(0.05)
            with open(save_path, "wb") as f: f.write(contents)
            saved = True

            yield _sse({"stage": "Extracting & splitting…",   "pct": 30})
            await asyncio.sleep(0.05)

            yield _sse({"stage": "Creating embeddings…",       "pct": 55})
            # Offload the blocking embed/index work so the event loop stays free.
            result = await asyncio.to_thread(
                (process_pdf if ext == ".pdf" else process_text_file),
                save_path, uid)

            yield _sse({"stage": "Indexing in Pinecone…",      "pct": 85})
            await asyncio.sleep(0.05)

            stream_db.add(Document(filename=fname, owner_id=uid,
                            chunks_count=result["chunks_stored"],
                            file_size_kb=round(len(contents)/1024, 1)))
            stream_db.commit()

            yield _sse({"stage": "Done!", "pct": 100, "done": True,
                        "filename": fname, "chunks": result["chunks_stored"]})
        except Exception as e:
            stream_db.rollback()
            # Roll back the half-processed upload: remove the orphaned file so a
            # failed upload doesn't leave a document on disk with no DB row/vectors.
            if saved and os.path.exists(save_path):
                try: os.remove(save_path)
                except OSError: pass
            yield _sse({"error": str(e), "pct": 0, "done": True})
        finally:
            stream_db.close()

    return StreamingResponse(stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

@app.get("/documents")
def get_documents(db: Session = Depends(get_db),
                  user: User  = Depends(get_current_user)):
    docs = (db.query(Document)
              .filter(Document.owner_id == user.id)
              .order_by(Document.uploaded_at.desc()).all())
    return {"documents": [{"filename": d.filename, "chunks": d.chunks_count,
                            "uploaded_at": d.uploaded_at.isoformat()} for d in docs],
            "total_chunks":    sum(d.chunks_count for d in docs),
            "total_documents": len(docs)}

@app.delete("/documents/{filename}")
def delete_document(filename: str,
                    db: Session = Depends(get_db),
                    user: User  = Depends(get_current_user)):
    doc = db.query(Document).filter(
        Document.filename == filename,
        Document.owner_id == user.id).first()
    if not doc: raise HTTPException(404, "Document not found")
    delete_document_chunks(filename, user.id)
    db.delete(doc); db.commit()
    fp = os.path.join(DOCS_FOLDER, str(user.id), filename)
    if os.path.exists(fp): os.remove(fp)
    return {"deleted": filename}

@app.get("/stats")
def stats(db: Session = Depends(get_db),
          user: User  = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.owner_id == user.id).all()
    qc   = db.query(Query).filter(Query.user_id == user.id).count()
    return {"total_chunks": sum(d.chunks_count for d in docs),
            "total_documents": len(docs), "total_queries": qc,
            "model": settings.GROQ_MODEL,
            "status": "ready" if docs else "no_documents"}


# ── Serve the built React SPA (single-origin deploy) ─────────────────────────
# In production the Vite build is copied to backend/static (see Dockerfile).
# The frontend calls the API by relative URL (services/api.ts BASE="" in PROD),
# so API and UI share one origin — no CORS, one Fly app. Mounted LAST so the API
# routes above win; the catch-all returns index.html for client-side routes
# (/dashboard, /admin, …) so a hard refresh doesn't 404. Absent in dev (run Vite
# separately), so we guard on the directory existing.
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    # Real build assets (JS/CSS/fonts) live under /assets — serve them directly.
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")),
              name="assets")

    _INDEX = os.path.join(STATIC_DIR, "index.html")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # A concrete file in the build (favicon, etc.) → serve it; otherwise fall
        # through to index.html so React Router handles the route in the browser.
        candidate = os.path.join(STATIC_DIR, full_path)
        if full_path and os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(_INDEX)
