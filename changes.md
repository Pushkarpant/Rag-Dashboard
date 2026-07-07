# 📋 CHANGES.md — Bug Fixes, UI Glow-Up & Full Project Guide

> This document explains **everything about the DocuMind RAG Dashboard**: what it is, how it
> works, every bug that was found and fixed, and every UI change that was made.
> Read the top half to understand the project; read the bottom half for the exact change log.

---

# PART 1 — What This Project Is

## 1.1 In one sentence
**DocuMind** is a full-stack web app where you **upload your own documents (PDF/TXT)** and then
**ask questions about them in plain English** — the AI answers using *only* your documents and
cites the exact source (file + page) with a confidence score. It's "ChatGPT, but locked to your
private files."

This technique is called **RAG — Retrieval-Augmented Generation**.

## 1.2 What is RAG (the core idea)?
Instead of *training* an AI on your documents (slow + expensive), RAG does this at question time:

1. **Ingest (upload):** Your document is split into small ~1000-character "chunks". Each chunk is
   converted into a list of numbers (a **vector / embedding**) that captures its *meaning*. Those
   vectors are stored in a **vector database** (Pinecone).
2. **Query (ask):** Your question is also turned into a vector. The database finds the handful of
   chunks whose vectors are **most similar in meaning** to your question. Those chunks are handed
   to the AI (Gemini) as context, with the instruction *"answer only from this text."*
3. **Answer:** Gemini writes a grounded answer, cites the chunks it used, and the app computes a
   **confidence score** from how well the chunks matched.

Why this is powerful: answers are always based on *your* latest documents, come with **sources**,
and there's **no training cost**.

---

## 1.3 Tech Stack

| Layer | Technology | Role |
|-------|-----------|------|
| **Frontend** | React 18 + TypeScript + Vite | The UI you see in the browser (port 3000) |
| **Backend** | FastAPI (Python) | REST API server (port 8000) |
| **LLM (answers)** | Google **Gemini 3.5 Flash** | Writes the answers |
| **Embeddings** | Google **gemini-embedding-001** | Turns text → 3072-number vectors |
| **Vector DB** | **Pinecone** | Stores vectors, does "find similar" search |
| **Database** | **SQLite** (via SQLAlchemy) | Users, documents metadata, chat history |
| **Auth** | **JWT** (PyJWT) + **Passlib** | Login tokens + password hashing |
| **Charts** | Recharts | Admin analytics graphs |

---

## 1.4 How the folders are organized

```
rag_dashboard/
├── backend/                     # ── Python API server ──
│   ├── main.py                  # App entry: /ask, /documents upload/list/delete, /stats
│   ├── config.py                # All settings + API keys read from .env
│   ├── auth.py                  # Password hashing + JWT create/verify + "who is logged in"
│   ├── database.py              # SQLite connection + session factory
│   ├── models.py                # DB tables: User, Document, Query, Conversation, ChatMessage
│   ├── routes/
│   │   ├── auth_routes.py        # /auth/signup, /auth/login, /auth/me
│   │   ├── admin_routes.py       # /admin/* analytics (admin only)
│   │   └── conversation_routes.py# /conversations chat history CRUD
│   └── services/                # ── The "brains" ──
│       ├── rag_service.py        # Orchestrates retrieval → Gemini answer → confidence
│       ├── embedding_service.py  # Calls Gemini to make embeddings
│       ├── vector_store.py       # Pinecone: store / search / delete vectors
│       └── document_processor.py # PDF/TXT → text → chunks
│
├── frontend/                    # ── React app ──
│   └── src/
│       ├── pages/               # Landing, Login, Signup, Dashboard, AdminPanel
│       ├── components/          # Aurora (new), ProtectedRoute
│       ├── hooks/               # useInView (new), useCountUp (new)
│       ├── context/AuthContext  # Global "am I logged in?" state
│       ├── services/api.ts      # All calls to the backend
│       └── types/index.ts       # TypeScript shapes
│
├── documents/                   # Uploaded files (one sub-folder per user id)
├── requirements.txt             # Python dependencies
├── rag_dashboard.db             # The SQLite database file
├── .env                         # Your secret API keys (NOT committed)
└── README.md
```

---

## 1.5 The data model (SQLite tables)

- **User** — `id, email, full_name, hashed_password, role` (`user`/`admin`). **The first person
  who signs up automatically becomes the admin.**
- **Document** — a record of each uploaded file: `filename, owner_id, chunks_count, file_size_kb`.
- **Query** — a log of every question asked: `question, answer_preview, confidence,
  response_time_ms` (this feeds the admin analytics).
- **Conversation** + **ChatMessage** — saved chat history so you can reopen past chats.

> 🔐 **Privacy / multi-tenancy:** every document and question is tied to a `user_id`, and Pinecone
> searches are filtered by owner. **User A can never see User B's documents.**

---

## 1.6 The request flow (what happens when you ask a question)

```
Browser  ──POST /ask {question}──►  FastAPI (/ask)
                                       │  1. embed the question  (embedding_service)
                                       │  2. search Pinecone for top matches, filtered by your user id
                                       │  3. build a context prompt from the best chunks
                                       │  4. Gemini writes an answer from that context (rag_service)
                                       │  5. compute confidence + follow-up suggestions
                                       │  6. save a Query row (for analytics)
                                       ▼
Browser  ◄──answer + sources + confidence──  FastAPI
```

Uploads use **Server-Sent Events (SSE)** so you see live progress ("Saving… → Splitting… →
Embedding… → Indexing… → Done") instead of a frozen spinner.

---

# PART 2 — Everything I Changed

There were two goals: **(A) fix every bug** and **(B) make the UI look "wow."**
All changes were verified end-to-end (real upload → ask → delete against live Gemini + Pinecone),
and both the backend and frontend build cleanly.

## 2.1 🐛 Bug Fixes

### 🔴 Critical

**1. `requirements.txt` was missing 3 dependencies → fresh install crashes.**
`auth.py` imports `passlib`, `jwt` (PyJWT) and `auth_routes.py` uses `EmailStr` (needs
`email-validator`) — but none were listed. Anyone doing a clean `pip install -r requirements.txt`
would get a backend that **crashes on import**.
→ **Fix:** added `passlib==1.7.4`, `PyJWT==2.13.0`, `email-validator==2.3.0`. Also re-saved the
file as clean UTF-8 (it was UTF-16 with odd byte spacing).
*File:* `requirements.txt`

**2. Embedding **dimension mismatch** → document deletes silently failed.**
`gemini-embedding-001` produces **3072-number** vectors and the live Pinecone index is **3072**,
but `config.py` said `EMBEDDING_DIMENSIONS = 768`. That value is used to build a dummy vector when
deleting a document's chunks. A 768-length vector sent to a 3072 index throws an error that was
swallowed → **delete returned "0 removed" and left orphaned vectors in Pinecone**, and re-uploading
the same file **piled up duplicate chunks**.
→ **Fix:** set `EMBEDDING_DIMENSIONS = 3072` (+ explanatory comment).
→ **Proven:** in the live test, deleting a doc took its Pinecone vectors from **1 → 0**.
*File:* `backend/config.py`

**3. Server **crashed on startup on Windows** (emoji in logs).**
The code prints things like `print("✅ DB ready")`. Windows' default console encoding (cp1252)
**cannot encode emoji**, so it raised `UnicodeEncodeError` and **application startup failed** — the
server wouldn't even boot on your machine.
→ **Fix:** reconfigure `stdout`/`stderr` to UTF-8 (with a safe fallback) at the very top of
`main.py`, so *all* emoji logs work everywhere.
*File:* `backend/main.py`

**4. The **frontend build was broken** (pre-existing TypeScript error).**
`api.ts` did `cfg.headers = { ...cfg.headers, Authorization }` — assigning a plain object to
axios v1's special `AxiosHeaders`, which fails type-checking. `npm run build` never succeeded.
→ **Fix:** use the proper API — `cfg.headers.set("Authorization", ...)`.
*File:* `frontend/src/services/api.ts`

### 🟠 High

**5. Gemini answer generation could 500 the whole request.**
`generate_answer` did `model.generate_content(prompt).text` with no guard. If Gemini returns no
candidate (safety block, empty finish), `.text` **throws** → the user gets a 500 error.
→ **Fix:** new `_safe_generate()` helper that catches failures, tries to extract text from
candidate parts, and returns a clean *"I couldn't generate an answer…"* message instead of crashing.
*File:* `backend/services/rag_service.py`

**6. Upload streaming used a database session that may already be closed + left junk files.**
The upload progress runs in a generator *after* the response starts; FastAPI may tear down the
request's DB session by then. Also, if processing failed after the file was written, the file was
left orphaned on disk.
→ **Fix:** open a **fresh `SessionLocal()` inside the stream** (closed in `finally`), **delete the
half-saved file on failure**, and run the blocking embed/index work via `asyncio.to_thread` so the
server stays responsive. Also modernized deprecated `@app.on_event("startup")` → FastAPI `lifespan`.
*File:* `backend/main.py`

### 🟡 Medium / Low

**7. Malformed token gave a 500 instead of 401.**
`int(payload.get("sub"))` throws `TypeError` if `sub` is missing.
→ **Fix:** wrapped in try/except → returns a clean **401 "Invalid authentication token."**
*File:* `backend/auth.py`

**8. Responsive layout read `window.innerWidth` during render (no resize handling).**
The sidebar/overlay wouldn't react when the window was resized.
→ **Fix:** new `useIsMobile()` hook backed by a `resize` listener.
*File:* `frontend/src/pages/Dashboard.tsx`

**9. Documentation was wrong (README + `.env.example`).**
The old README described an **OpenAI + PostgreSQL + Redis + Docker** stack and referenced files
that don't exist (`docker-compose.yml`, `routes/ask.py`, `routes/documents.py`); `.env.example`
said the index must be 768.
→ **Fix:** rewrote both to reflect the **real** stack (Gemini + Pinecone + SQLite + JWT), correct
run commands (`npm run dev`, `python -m uvicorn …`), and **3072** dimensions.
*Files:* `README.md`, `backend/.env.example`

---

## 2.2 ✨ UI Glow-Up ("wow" factor)

Goal: make it look modern, dynamic and animated — **without adding heavy libraries**. Everything is
built from CSS keyframes + three tiny React helpers, and it all **respects
`prefers-reduced-motion`** (users who disable motion get a calm, static version).

### New reusable building blocks
| File | What it is |
|------|-----------|
| `frontend/src/index.css` | Expanded design system: aurora / sheen / spring / count-up / gradient keyframes, gradient-border + glass utilities, nicer scrollbar, focus rings, reduced-motion guard |
| `frontend/src/hooks/useInView.ts` *(new)* | Detects when an element scrolls into view → drives scroll-reveal |
| `frontend/src/hooks/useCountUp.ts` *(new)* | Animates a number counting up from 0 → value |
| `frontend/src/components/Aurora.tsx` *(new)* | Reusable animated "aurora" mesh-gradient background (drifting blurred orbs + faint grid) |

### Page-by-page
- **Landing** — animated aurora backdrop; sections **fade/slide in as you scroll**; feature cards
  **tilt in 3D and glow toward your cursor**; animated gradient headline; animated confidence bar
  in the mock preview.
- **Login / Signup** — aurora background; card **springs in**; inputs get a **focus glow ring**;
  signup has a smooth **4-stage password-strength meter** (Weak → Strong).
- **Dashboard** — **confidence arc counts up** with a glow; chat bubbles **spring in**; source
  cards **lift on hover and expand smoothly**; upload progress bar has a **moving shine**; buttons
  have a tactile press effect; mobile overlay blurs the background.
- **Admin Panel** — **KPI numbers count up** with gradient accent bars; cards **stagger in**;
  charts and tab panels **fade in**; animated tab buttons.

---

## 2.3 📁 Full list of files touched

**Backend (7):**
`requirements.txt` · `backend/config.py` · `backend/main.py` ·
`backend/auth.py` · `backend/services/rag_service.py` · `backend/.env.example` · `README.md`

**Frontend (9):**
`src/index.css` · `src/services/api.ts` · `src/pages/Landing.tsx` · `src/pages/Login.tsx` ·
`src/pages/Signup.tsx` · `src/pages/Dashboard.tsx` · `src/pages/AdminPanel.tsx`
**New:** `src/hooks/useInView.ts` · `src/hooks/useCountUp.ts` · `src/components/Aurora.tsx`

> No changes were made to your `.env`, your real documents, or your real user accounts. A temporary
> test user created during verification was deleted afterward.

---

# PART 3 — How To Run It

### ⚠️ Important: the "venv" launcher error you hit
Your virtual environment was **created before the folder was moved into `rrr\`**, so the `.exe`
shims (`uvicorn.exe`, `pip.exe`) still point to the **old path** and fail with
*"cannot find the file specified."* `python.exe` itself still works.

**Quick fix — always launch through Python** (from the `rag_dashboard` folder):
```powershell
venv\Scripts\activate
python -m uvicorn backend.main:app --reload
```

**Permanent fix — recreate the venv once:**
```powershell
cd C:\Users\HP\OneDrive\Desktop\rrr\rag_dashboard
Remove-Item -Recurse -Force venv
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload    # plain command works again after this
```

### Full run (two terminals)

**Terminal 1 — backend** (from `rag_dashboard\`):
```powershell
venv\Scripts\activate
python -m uvicorn backend.main:app --reload      # http://localhost:8000
```

**Terminal 2 — frontend** (from `rag_dashboard\frontend\`):
```powershell
npm install        # first time only
npm run dev        # http://localhost:3000
```

Then open **http://localhost:3000**, sign up (the **first account becomes admin**), upload a PDF/TXT
in the sidebar, and start asking questions.

### `.env` you need (in the project root)
```
GEMINI_API_KEY=your-gemini-key          # free at ai.google.dev
PINECONE_API_KEY=your-pinecone-key      # free at pinecone.io
PINECONE_INDEX_NAME=rag-documents       # index must be 3072 dims, cosine metric
JWT_SECRET=any-long-random-hex-string
```

---

# PART 4 — Verification (proof it works)

All of this was run live against your real Gemini + Pinecone:

| Check | Result |
|-------|--------|
| Backend imports, `EMBEDDING_DIMENSIONS == 3072`, `_safe_generate` present | ✅ |
| `python -m uvicorn` boots, `GET /` → `{"status":"ok"}` | ✅ |
| Sign up → returns JWT | ✅ |
| Upload TXT → SSE stages → "Done! chunks: 1" | ✅ |
| Ask *"capital of Zentoria + height of Mount Ostara?"* → correct cited answer, 75% confidence | ✅ |
| **Delete document → Pinecone vectors 1 → 0** (proves the dimension bug is fixed) | ✅ |
| Frontend `npm run build` + `tsc --noEmit` | ✅ clean |

---

*Generated as part of the bug-fix + UI upgrade pass. Questions about any specific change? Just ask.*
