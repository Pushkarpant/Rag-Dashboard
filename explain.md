# DocuMind — Complete Project Deep-Dive (Interview Preparation Bible)

> Read this end-to-end and you will be able to defend **every** design decision,
> explain **every** file, answer **every** "why", and survive **any** critique of
> this project. Nothing is hand-waved. Where a decision has a trade-off, the
> trade-off is stated so you can discuss it like an engineer, not a tutorial-follower.

---

## 0. The 30-Second Pitch (memorize this)

> "DocuMind is a full-stack, **multi-tenant RAG (Retrieval-Augmented Generation)**
> platform. A user uploads their PDFs or text files; the system splits them into
> chunks, converts each chunk into a **3072-dimensional embedding vector** using
> Google Gemini, and stores those vectors in **Pinecone**. When the user asks a
> question in plain English, I embed the question, do a **semantic similarity
> search** in Pinecone scoped to that user's documents, feed the top matching
> passages to Gemini as context, and return a **grounded answer with source
> citations, page numbers, and a confidence score**. It has JWT auth, an admin
> analytics panel, streaming upload progress over SSE, and persistent chat
> history. Backend is **FastAPI**, frontend is **React + TypeScript + Vite**."

If you can say that fluently, you've already won half the interview.

---

## 1. What Problem Does This Solve? (The "Why")

**The pain:** Organizations and individuals have hundreds/thousands of documents.
Finding a specific fact means manually reading files, or using keyword search
(Ctrl+F / ElasticSearch) which only finds *exact word matches* — it can't find
"revenue dropped" when you search "sales declined".

**The solution:** RAG lets you ask questions in natural language and get answers
**grounded in your actual documents** — with citations so you can trust and
verify them.

**Why not just use ChatGPT/Gemini directly?**
- A raw LLM answers from its **training data**, which (a) doesn't include *your*
  private documents, (b) has a knowledge cutoff, and (c) **hallucinates** —
  invents plausible-sounding but false facts.
- RAG fixes all three: it injects **your** documents at query time, so answers
  are current, private, and **grounded** (the model is instructed to answer ONLY
  from the provided context and say "not found" otherwise).

**Why not fine-tune a model on the documents?**
- Fine-tuning is expensive, slow, needs retraining every time a document
  changes, and *still* doesn't give you citations. RAG updates instantly (just
  upload a new file) and every fact is traceable to a source. This is the single
  most important architectural talking point — **know why RAG beats fine-tuning
  for document Q&A.**

---

## 2. Core Concept: What is RAG? (Explain like you built it)

RAG = **Retrieval-Augmented Generation**. Two phases:

### Phase A — Ingestion (happens once per document, at upload)
```
PDF/TXT
  → extract text (page by page)
  → split into ~1000-char chunks with 200-char overlap
  → embed each chunk → 3072-dim vector
  → store vector + metadata (text, filename, page, owner_id) in Pinecone
```

### Phase B — Retrieval + Generation (happens on every question)
```
Question
  → embed the question → 3072-dim query vector
  → Pinecone similarity search (cosine), filtered by owner_id, top_k=7
  → keep chunks with score ≥ 0.30
  → build a context string from those chunks
  → send context + question to Gemini with a strict "answer only from context" prompt
  → return answer + sources + confidence + follow-up suggestions
```

**The key insight to articulate:** the LLM never "learns" your documents. Every
answer is produced by **stuffing relevant text into the prompt** at query time.
The retrieval step is what makes it scale — you can't fit 1000 documents in a
prompt, but you *can* fit the 7 most relevant paragraphs.

### Why embeddings / vector search? (critical concept)
- An **embedding** is a list of numbers (here 3072 of them) that represents the
  *meaning* of a piece of text. Texts with similar meaning have vectors that are
  **close together** in 3072-dimensional space.
- **Cosine similarity** measures the angle between two vectors — closer angle =
  more semantically similar. This is why "What are the risks?" matches a
  paragraph about "potential downsides and exposures" even with zero shared
  keywords.
- Keyword search = lexical match. Vector search = **semantic** match. That one
  sentence is the whole justification for the vector database.

---

## 3. High-Level Architecture

```
┌───────────────────────────────────────────────┐
│              USER BROWSER                       │
│   React + TypeScript + Vite   (Port 3000)       │
│   - Pages: Landing/Login/Signup/Dashboard/Admin │
│   - Auth via JWT in sessionStorage              │
└───────────────────────┬───────────────────────┘
                        │ HTTP/JSON · SSE · Bearer JWT
┌───────────────────────▼───────────────────────┐
│           FastAPI Backend   (Port 8000)         │
│                                                 │
│  Routes:  /auth  /admin  /conversations         │
│           /ask  /documents  /stats              │
│  Services: rag · embedding · vector_store ·     │
│            document_processor                    │
│  Auth:  JWT (PyJWT) + Passlib (pbkdf2_sha256)   │
└──────┬───────────────────────┬──────────────────┘
       │                       │
 ┌─────▼──────┐         ┌───────▼────────┐
 │  Pinecone  │         │    SQLite      │
 │ (vectors,  │         │ users, docs,   │
 │  3072-dim) │         │ queries, chats │
 └─────┬──────┘         └────────────────┘
       │
 ┌─────▼─────────────────────────┐
 │  Google Gemini                 │
 │  gemini-3.5-flash  (answers)   │
 │  gemini-embedding-001 (vectors)│
 └────────────────────────────────┘
```

**Two databases, on purpose — know why:**
- **Pinecone** stores the *vectors* (the meaning) — it's optimized for
  fast nearest-neighbor search across millions of high-dimensional vectors.
- **SQLite** stores the *relational/structured* data — users, document
  metadata, query logs, chat history. Relational queries (joins, counts,
  ordering, per-user filters) belong in a SQL database, not a vector DB.
- This is a classic **"right tool for each job"** split. If asked "why not put
  everything in Postgres with pgvector?" — valid alternative; you chose a
  managed vector DB (Pinecone) for zero-ops similarity search and a lightweight
  SQL store for metadata. For production you'd swap SQLite → Postgres.

---

## 4. The Full Request Lifecycle (trace it like a story)

### 4.1 "I upload a PDF"
1. Frontend `uploadDocumentSSE()` (`services/api.ts`) POSTs the file with the
   `Authorization: Bearer <jwt>` header to `/documents/upload`.
2. Backend `upload()` (`main.py`): validates extension (`.pdf`/`.txt`), reads
   bytes, rejects if > 20 MB.
3. **Dedup:** if a document with the same filename already exists for this user,
   it deletes the old vectors from Pinecone AND the old DB row first (so
   re-uploading replaces rather than duplicates).
4. Returns a **`StreamingResponse`** (Server-Sent Events). Inside an async
   generator it `yield`s progress events: `Saving file (10%)` → `Extracting
   (30%)` → `Creating embeddings (55%)` → `Indexing (85%)` → `Done (100%)`.
5. The heavy work (`process_pdf`) runs via `asyncio.to_thread(...)` so the
   blocking embed/index calls don't freeze the event loop.
6. `process_pdf` (`document_processor.py`): `PyPDFLoader` loads the PDF **page by
   page** (so we keep page numbers), `RecursiveCharacterTextSplitter` splits into
   ~1000-char chunks with 200 overlap, and each chunk gets a unique id
   `u{owner}_{filename}_c{i}_{6hex}` plus metadata `{filename, page, chunk_index,
   owner_id}`.
7. `store_chunks` (`vector_store.py`): batches of 50, embeds each chunk's text
   (`get_embedding`, `task_type="retrieval_document"`), and `index.upsert`s the
   vectors into Pinecone.
8. On success, a **document row** is written to SQLite (filename, owner_id,
   chunks_count, size). On failure, the half-saved file is deleted and the DB
   is rolled back — **no orphans**.

### 4.2 "I ask a question"
1. Frontend `sendMessage()` (`Dashboard.tsx`) optimistically renders the user
   bubble + a loading "typing dots" assistant bubble, then calls
   `askQuestion(q)` → POST `/ask`.
2. Backend `ask()` (`main.py`): rejects empty questions, times the request,
   calls `answer_question(...)`, logs a `Query` row (question, answer preview,
   confidence, chunks_used, response_time_ms), returns the result.
3. `answer_question` (`rag_service.py`):
   - `search_similar(question, top_k=7, user_id)` — embeds the question with
     `task_type="retrieval_query"`, queries Pinecone with a **metadata filter
     `owner_id == user.id`** (this is the multi-tenancy boundary), keeps matches
     with score ≥ 0.30, sorts by score desc.
   - If no chunks: returns a friendly "upload documents first" message (confidence 0).
   - `format_context(chunks)` — builds a labeled context block: `[SOURCE n]
     Document / Page / Relevance% / Content` for each chunk.
   - `generate_answer` — sends the strict grounding prompt to Gemini.
   - `calculate_confidence(chunks)` — a weighted score (see §7).
   - `generate_followups` — asks Gemini for 3 short follow-up questions.
   - Returns `{answer, sources[], confidence, suggestions[], chunks_used}`.
4. Frontend swaps the loading bubble for the real answer, renders the confidence
   arc, source cards (expandable), and follow-up chips; then persists both the
   user and assistant messages to the conversation via `/conversations/{id}/messages`.

**If you can narrate §4.1 and §4.2 from memory, you understand the system.**

---

## 5. Backend — File by File (every file, every "why")

### `backend/config.py` — Central settings
- `Settings` class reads secrets from env (`GEMINI_API_KEY`, `PINECONE_API_KEY`,
  `PINECONE_INDEX_NAME`, `JWT_SECRET`) via `python-dotenv`.
- Key constants and **why they matter**:
  - `EMBEDDING_DIMENSIONS = 3072` — MUST match the Pinecone index dimension. The
    comment warns this is used to build the **dummy zero-vector** in
    `delete_document_chunks()`; a mismatch makes deletions silently fail (Pinecone
    rejects a query vector of the wrong length).
  - `DEFAULT_TOP_K = 7` — retrieve 7 chunks per query. Trade-off: more chunks =
    more context/recall but more tokens/cost and more noise.
  - `MIN_SIMILARITY_SCORE = 0.30` — discard weak matches so garbage context
    doesn't pollute the answer.
  - `CHUNK_SIZE = 1000`, `CHUNK_OVERLAP = 200` — chunking parameters (see §6).
  - `SCORE_MIN/MAX = 0.30/0.90` — the raw cosine range mapped to a 0–100%
    display score (see `normalise_score`).
  - `JWT_SECRET` defaults to an insecure dev value — **in the interview, flag
    that this must be overridden in production** (and it is, per deployment.md).

### `backend/database.py` — SQLAlchemy setup
- `create_engine("sqlite:///./rag_dashboard.db", connect_args={"check_same_thread": False})`.
  - **Why `check_same_thread=False`?** SQLite by default forbids using a
    connection across threads. FastAPI + `asyncio.to_thread` can touch the DB
    from worker threads, so we disable that guard.
- `SessionLocal` = session factory. `Base` = declarative base for models.
- `get_db()` = a **dependency generator**: yields a session, closes it in
  `finally`. This is the canonical FastAPI DB-session pattern — one session per
  request, always cleaned up.
- `init_db()` imports models and `create_all` — auto-creates tables on startup
  (called from the `lifespan` handler in `main.py`).

### `backend/models.py` — The data schema (5 tables)
- **User**: id, email (unique, indexed), full_name, hashed_password, role
  (`user`/`admin`), created_at. Relationships cascade-delete documents, queries,
  conversations (delete a user → their data goes too).
- **Document**: id, filename, owner_id (FK), chunks_count, file_size_kb,
  uploaded_at. This is *metadata* — the actual vectors live in Pinecone.
- **Query**: id, user_id, question, answer_preview (first 500 chars),
  confidence, chunks_used, response_time_ms, created_at. This is the **analytics
  log** that powers the admin panel.
- **Conversation**: id, user_id, title, created_at, updated_at (`onupdate`
  auto-bumps). Has many `ChatMessage`, ordered by created_at, cascade-delete.
- **ChatMessage**: id, conversation_id, role (`user`/`assistant`), content
  (Text), `sources_json` (sources serialized as JSON string — SQLite has no
  array type, so we store JSON), confidence, created_at.
- **Talking point:** relationships use `back_populates` (bidirectional) and
  `cascade="all, delete-orphan"` so the ORM keeps referential integrity.

### `backend/auth.py` — Security core
- **Password hashing:** `CryptContext(schemes=["pbkdf2_sha256"])` — passwords are
  never stored in plaintext; `pbkdf2_sha256` is a slow, salted KDF (defends
  against brute force / rainbow tables). `hash_password` / `verify_password`.
- **JWT:** `create_access_token` puts `{"sub": user_id, "exp": now+7days}` and
  signs with HS256 + `JWT_SECRET`. `decode_access_token` verifies signature and
  expiry, raising 401 on expired/invalid.
- **`get_current_user`** — the auth **dependency**: extracts the Bearer token
  (`OAuth2PasswordBearer`), decodes it, loads the `User` from DB. Injected into
  every protected endpoint via `Depends(get_current_user)`. **This is how the
  backend knows who you are.**
- **`get_current_admin`** — layered dependency: calls `get_current_user`, then
  checks `role == "admin"`, else 403. This is **role-based access control (RBAC)**.
- Know the terms: **authentication** (who are you — JWT) vs **authorization**
  (what can you do — the admin check).

### `backend/main.py` — App wiring + core endpoints
- **UTF-8 fix at the top:** Windows consoles are cp1252 and crash on the emoji in
  log statements — it reconfigures stdout/stderr to UTF-8. (A real-world
  cross-platform gotcha; good to mention.)
- **`lifespan`** async context manager: runs `init_db()` on startup (modern
  replacement for the deprecated `@app.on_event("startup")`).
- **CORS middleware** with `allow_origins=["*"]` — lets the browser on :3000 call
  the API on :8000. (For production you'd restrict to your real frontend origin;
  deployment.md notes this.)
- Registers the three routers (auth, admin, conversations).
- **`POST /ask`** — the main Q&A endpoint (see §4.2). Wraps `answer_question`,
  times it, logs the Query row.
- **`POST /documents/upload`** — SSE streaming upload (see §4.1). Key subtlety:
  it opens a **fresh `SessionLocal()`** inside the stream generator, because the
  request-scoped `db` from `Depends(get_db)` may already be closed by the time
  the generator runs (it executes *after* the response starts streaming).
- **`GET /documents`**, **`DELETE /documents/{filename}`**, **`GET /stats`** —
  all scoped to `user.id` (multi-tenant).
- `_sse(data)` helper formats a dict as an SSE line: `data: {json}\n\n`.

### `backend/routes/auth_routes.py`
- `POST /auth/signup` — validates with Pydantic (`EmailStr`, password min 6),
  rejects duplicate email. **First user ever becomes admin** (`is_first =
  count()==0`) — clever bootstrap so there's always exactly one admin without a
  seed script. Returns a JWT immediately (auto-login on signup).
- `POST /auth/login` — verifies password hash, returns JWT.
- `GET /auth/me` — returns the current user (used by the frontend to restore a
  session on refresh).

### `backend/routes/admin_routes.py` (all behind `get_current_admin`)
- `/admin/stats` — aggregates via SQL: total users/docs/queries/chunks, **avg
  confidence**, **avg response time** (uses `func.sum`, `func.avg`).
- `/admin/users` — every user with their doc/query counts.
- `/admin/queries?limit=50` — recent questions with the asker's email.
- `/admin/documents` — all uploads with owner email.
- `/admin/activity-timeline` — **14-day** query-count series (one count per day,
  `func.date(created_at) == that day`) — powers the area chart.
- **Critique-defense:** the admin endpoints do N+1 queries (a sub-query per row
  for counts/emails). Fine for a demo; in production you'd use JOINs/aggregations.
  Knowing this weakness *before* the interviewer points it out is a power move.

### `backend/routes/conversation_routes.py` (chat persistence)
- `GET /conversations` — list this user's conversations (newest first, limit 50).
- `POST /conversations` — create a "New Chat".
- `GET /{id}/messages` — messages for a conversation (**ownership-checked**:
  `Conversation.user_id == user.id`, else 404 — you can't read someone else's chat).
- `POST /{id}/messages` — append a message; **auto-titles** the conversation from
  the first user message (first 60 chars); bumps `updated_at`.
- `DELETE /{id}` — delete a conversation (cascade removes its messages).

### `backend/services/document_processor.py` — Ingestion
- `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200,
  separators=["\n\n","\n",". "," ",""])`.
  - **"Recursive" = it tries separators in order**: split on paragraphs first,
    then lines, then sentences, then words, then characters — so chunks break at
    natural boundaries rather than mid-word. This is the single most important
    ingestion-quality decision. (See §6.)
- `process_pdf` — `PyPDFLoader().load()` returns one Document per page (so page
  numbers survive), split into chunks, each with a unique id + metadata. Note
  `page + 1` because PyPDF is 0-indexed but humans count from 1.
- `process_text_file` — same but `TextLoader`, page fixed to 1.

### `backend/services/embedding_service.py` — Text → vectors
- `get_embedding(text)` — cleans whitespace, truncates to 2000 chars, calls
  `genai.embed_content(model="gemini-embedding-001", task_type="retrieval_document")`.
- `get_query_embedding(query)` — same but `task_type="retrieval_query"`.
- **Why two task_types?** Gemini optimizes the vector differently for the thing
  being *stored* (document) vs the thing *searching* (query). Using the correct
  asymmetric task types measurably improves retrieval quality. **Great detail to
  drop in an interview** — it shows you understand the embedding API, not just
  "call the embed function".

### `backend/services/vector_store.py` — Pinecone interface
- `store_chunks` — batched upserts (batch size 50). Wraps each embed in
  try/except so one bad chunk doesn't kill the whole upload.
- `search_similar` — embeds the query, builds the `owner_id` filter, queries
  Pinecone (`include_metadata=True`), keeps score ≥ `MIN_SIMILARITY_SCORE`,
  returns sorted chunks with text/filename/page/score.
- `get_stats` — `describe_index_stats` (total vectors, dimension).
- `delete_document_chunks` — you can't delete by metadata filter directly on the
  serverless tier, so it **queries with a dummy zero-vector + metadata filter**
  (`filename` + `owner_id`) to find all matching ids (top_k=10000), then
  `index.delete(ids=...)`. This is why the dummy vector must be exactly 3072-dim.

---

## 6. Chunking — Deep Dive (interviewers LOVE this)

**Why chunk at all?** Two reasons:
1. **Embeddings represent a bounded amount of text well.** Embedding a whole
   50-page PDF into one vector blurs all meaning together — retrieval becomes
   useless. Small chunks = precise, targeted retrieval.
2. **Prompt size.** You can only fit so much into the LLM context. Retrieving 7
   small chunks is feasible; retrieving whole documents is not.

**Why 1000 chars?** A balance: big enough to hold a coherent idea/paragraph,
small enough to be a *specific* retrieval unit. Too small (e.g. 100) → context
fragments, lost meaning. Too big (e.g. 5000) → imprecise retrieval, wasted tokens.

**Why 200-char overlap?** So an idea that straddles a chunk boundary isn't
**cut in half and lost**. The overlap means the end of chunk N is repeated at the
start of chunk N+1, so a sentence spanning the boundary appears intact in at
least one chunk. Trade-off: overlap = slight storage/embedding redundancy.

**Why "recursive" splitting?** It respects structure — splits on paragraph
breaks before resorting to mid-sentence/mid-word cuts, producing semantically
clean chunks. Naive fixed-width splitting would cut "revenue was $1,2" | "00,000"
across chunks.

**Follow-up you should be ready for:** "What are the downsides of fixed-size
chunking?" → It ignores document structure (tables, headings, code). Advanced
alternatives: semantic chunking, layout-aware parsing, sentence-window
retrieval, or parent-document retrieval. You chose recursive fixed-size because
it's robust, fast, and dependency-light — a sensible default.

---

## 7. The Answer, Confidence & Scoring Logic

### The grounding prompt (`generate_answer`)
The prompt hard-instructs Gemini to (1) use ONLY the document context, (2) say
"This information is not found in the uploaded documents" if the answer isn't
there, (3) cite document name + page, (4) be specific with numbers/dates, (5)
structure clearly. **This is the anti-hallucination guardrail** — the whole point
of RAG. `temperature=0.1` keeps it factual/deterministic (low creativity).

### `_safe_generate` — defensive text extraction
`response.text` **raises** if Gemini returns no candidate (safety block, empty
finish, recitation stop). This wrapper catches that, falls back to manually
walking `candidates → content → parts`, and returns `""` instead of throwing —
so `/ask` **degrades gracefully** instead of 500-ing. Mention this when asked
"how do you handle LLM failures?".

### `normalise_score(raw)` — raw cosine → 0–100%
Maps the raw similarity (expected ~0.30–0.90) linearly onto 0–100 and clamps.
Purely for **human-readable display** — a user understands "87%" better than
"0.83 cosine".

### `calculate_confidence(chunks)` — a heuristic
```
confidence = min( best*0.60 + avg*0.30 + coverage_bonus, 1.0 ) * 100
```
- `best` (60%) — the single best match matters most.
- `avg` (30%) — reward consistently-relevant retrieval, not one lucky hit.
- `coverage_bonus` — up to +0.15 for pulling from **multiple distinct
  documents** (broader support = more trustworthy).
- **Be honest in the interview:** this is a **heuristic**, not a calibrated
  probability. It reflects *retrieval strength*, not factual correctness. It's a
  reasonable UX signal, and you should be able to say "a more rigorous approach
  would be an LLM self-evaluation or a groundedness/faithfulness check."

### `generate_followups` — 3 suggested next questions
A second Gemini call producing 3 short follow-ups (with a regex strip of any
bullet/number prefixes) — falls back to 3 generic questions on error. Pure UX
sugar to keep the conversation flowing.

---

## 8. Multi-Tenancy & Security (know the boundaries cold)

**How is one user's data isolated from another's?**
- **Pinecone:** every vector is tagged with `owner_id` in metadata; every search
  passes `filter={"owner_id": {"$eq": user_id}}`. A user can only ever retrieve
  their own chunks.
- **SQLite:** every query filters by `owner_id`/`user_id`; conversation and
  document endpoints 404 if the row isn't yours.
- **Files on disk:** uploads are saved under `documents/{user_id}/filename`.
- **Auth:** the `user_id` comes from the **signed JWT**, not from the request
  body — a user cannot spoof another user's id without forging a signature.

**Security strengths to claim:**
- Passwords hashed with pbkdf2_sha256 (salted, slow).
- JWT-signed sessions with expiry.
- RBAC for admin routes.
- Pydantic input validation (email format, password length, file type/size).
- Upload guards: extension allow-list, 20 MB cap.

**Weaknesses to pre-empt (shows maturity):**
- CORS `*` and a dev JWT secret default — must be locked down in prod (they are,
  per deployment.md).
- SQLite is single-writer — fine for a demo, swap to Postgres for concurrency.
- No refresh-token rotation; a stolen JWT is valid until expiry.
- No rate limiting on `/ask` (Gemini free-tier quota is the real bottleneck).

---

## 9. Frontend — File by File

### Stack
React 18 + TypeScript + Vite + React Router v6 + Axios + Recharts. **No CSS
framework** — everything is inline styles + CSS variables + a hand-written
`index.css` (keyframes, utility classes). Note there is **no Tailwind**; styling
is deliberate inline + design tokens.

### `main.tsx` — Entry point
- Mounts `<App/>` inside `<BrowserRouter>` and `<React.StrictMode>`.
- **Applies the saved theme before first paint** (reads `localStorage.rag_theme`,
  sets `data-theme` on `<html>`) to avoid a flash of the wrong theme (FOUC fix).

### `App.tsx` — Routing + guards
- Wraps everything in `<AuthProvider>` and `<ErrorBoundary>`.
- **`SmartLanding`** — logged-in users hitting `/` are redirected to `/dashboard`
  (never see marketing again). **`PublicOnly`** — bounces logged-in users away
  from `/login`/`/signup`.
- Routes: `/` (landing), `/login`, `/signup`, `/dashboard` (protected), `/admin`
  (protected + adminOnly), `*` → redirect home.

### `context/AuthContext.tsx` — Session management (a signature feature)
- Stores the JWT in **`sessionStorage`** (not `localStorage`) so it dies when the
  browser closes — but a **refresh** should keep you logged in.
- **The problem:** Chrome/Edge "continue where you left off" restores
  sessionStorage on reopen, keeping stale sessions alive.
- **The solution:** a **heartbeat**. A `rag_seen` timestamp is stamped every 10s
  and on `beforeunload`/`visibilitychange`. On startup it only restores the
  session if the heartbeat is **< 45s old** (`CLOSE_GRACE_MS`). A refresh takes
  <1s (survives); a real close stops the heartbeat, so on reopen it's stale and
  the session is dropped. **This is a genuinely clever, defensible piece of
  engineering — be ready to whiteboard it.**
- Freshness is decided **once, synchronously** in `useState(sessionIsFresh)`
  before the heartbeat can refresh it (avoids a race).
- Exposes `login/signup/logout`, `user`, `loading`, `token`.

### `services/api.ts` — The API client
- Single Axios instance, `BASE = "http://127.0.0.1:8000"`.
  - **Why `127.0.0.1` not `localhost`?** On Windows, `localhost` resolves to IPv6
    `::1` first, but uvicorn binds IPv4 `127.0.0.1` — so `localhost:8000` hits a
    dead socket. Using the IPv4 literal always works. (A great "war story"
    detail.)
- **Request interceptor:** auto-attaches `Authorization: Bearer <token>` from
  sessionStorage to every request (so individual calls don't repeat it).
- **Response interceptor:** on any `401`, clears the session — so an expired
  token cleanly logs you out everywhere.
- **`uploadDocumentSSE`** — uses `fetch` (not Axios) with a manual
  `ReadableStream` reader to parse the SSE progress stream chunk by chunk,
  buffering partial lines. (Axios doesn't stream response bodies in the browser.)
- Typed wrappers for every endpoint (`askQuestion`, `getDocuments`, admin calls…).

### `pages/Dashboard.tsx` — The main app (813 lines, the centerpiece)
- **State:** messages, input, loading, sidebar open, theme, sidebar tab
  (chats/docs), documents, uploads, conversations, activeConvoId.
- **`useIsMobile`** — reactive viewport hook (updates on resize).
- **Subcomponents:**
  - `ConfidenceArc` — animated SVG ring (uses `useCountUp`); color-coded
    green/gold/red by score threshold (≥70 High, ≥50 Medium, else Low).
  - `SourceCard` — expandable citation card (filename, page, relevance %, excerpt).
  - `MessageBubble` — user vs assistant styling; only "real" AI responses (where
    `sources !== undefined`) show copy/confidence/sources/follow-ups — the
    welcome greeting deliberately has `sources === undefined` so it stays clean.
  - `TypingDots`, `UploadZone` (drag-and-drop), `UploadProgress` (SSE progress bar).
- **`sendMessage`** — creates a conversation if none active, optimistically shows
  the user message + loading bubble, awaits `/ask`, swaps in the answer,
  persists both messages. On error, shows a friendly error bubble.
- **`handleUpload`** — drives the SSE upload, updating a per-file progress row,
  refreshing the document list on completion.
- **UX niceties:** `/` focuses the input, `Esc` blurs, `Enter` sends /
  `Shift+Enter` newline, auto-scroll to bottom, export chat to `.txt`, theme
  toggle persisted to localStorage, admin link only for admins.

### `pages/AdminPanel.tsx` — Analytics dashboard
- Loads all 5 admin endpoints in parallel via `Promise.all`.
- **KPI cards** with `useCountUp` roll-up animation.
- **Recharts:** an `AreaChart` (14-day query activity) and a donut `PieChart`
  (confidence distribution: High/Medium/Low buckets computed client-side).
- Tabs: overview / users / queries / documents (tables). `timeAgo()` helper for
  relative timestamps.

### `pages/Login.tsx` / `Signup.tsx`
- Controlled-input forms, inline validation, error display, loading states.
- Signup has a live **password-strength meter** (0–4 from length + character
  variety) and a hint that the first signup becomes admin.
- Both redirect to `/dashboard` on success.

### `components/ProtectedRoute.tsx` — Route guard
- While `AuthContext` is restoring the session (`loading`), it shows a spinner —
  **not** a redirect. **Critical bug fix:** without this, a hard refresh on
  `/admin` would redirect to `/login` before the session finished restoring.
- Then: no user → `/login`; adminOnly & not admin → `/`.

### `components/ErrorBoundary.tsx` — Crash guard
- A class component (error boundaries **must** be class components — only they
  implement `getDerivedStateFromError`/`componentDidCatch`). Catches any render
  error in the tree and shows a friendly recoverable screen with the real error
  text + "Reload" / "Go to dashboard".

### `components/Aurora.tsx` — Decorative background
- Three blurred, slowly-drifting gradient "orbs" + a faint masked grid. Purely
  visual (`pointerEvents:none`), honors `prefers-reduced-motion`.

### Hooks
- **`useCountUp`** — animates a number 0→value with `easeOutCubic` via
  `requestAnimationFrame`; skips animation for reduced-motion users.
- **`useInView`** — IntersectionObserver-based scroll-reveal (returns ref +
  boolean), with a fallback for environments lacking IntersectionObserver.

### Styling system (`index.css`)
- **CSS custom properties** define the whole theme; dark is the `:root` default,
  `[data-theme="light"]` overrides. Toggling `data-theme` on `<html>` reskins the
  entire app instantly.
- **Brand palette** (green/near-black/beluga — "Koopa Green Shell #54c750"),
  keyframes (fadeUp, aurora drift, sheen, dotBounce…), utility classes (`.press`,
  `.lift`, `.sheen`, `.gradient-text`, `.stagger-in`…), responsive `@media`
  rules, and a `prefers-reduced-motion` block that kills looping animations.

### Vite config — no dev proxy (on purpose)
- The frontend calls the API by **absolute URL** and the backend allows CORS `*`.
  A previous proxy that matched `/admin` **hijacked browser page navigations** —
  refreshing the `/admin` route forwarded the HTML request to FastAPI (which
  returns JSON), so the SPA never loaded and looked crashed. With no proxy, Vite
  serves `index.html` for every route, so client-side routing + hard refresh work.

---

## 10. The Tech Stack & Why Each Choice

| Layer | Tech | Why (the justification) |
|-------|------|------------------------|
| API framework | **FastAPI** | Async, automatic OpenAPI docs, Pydantic validation, dependency injection — modern Python standard. |
| LLM | **Gemini 3.5 Flash** | Flash tier = high free quota, fast, cheap; good enough for grounded Q&A (temp 0.1). |
| Embeddings | **gemini-embedding-001** | 3072-dim, asymmetric task types (doc vs query) for better retrieval. |
| Vector DB | **Pinecone** | Managed, zero-ops nearest-neighbor search; metadata filtering enables multi-tenancy. |
| Relational DB | **SQLite + SQLAlchemy** | Lightweight, file-based, zero setup for a demo; ORM abstracts SQL. |
| Auth | **PyJWT + Passlib** | Stateless JWT sessions + pbkdf2_sha256 password hashing. |
| Frontend | **React + TS + Vite** | Component model, type safety, instant HMR dev server. |
| Charts | **Recharts** | Declarative React charts for the admin panel. |
| PDF/Chunking | **LangChain loaders + RecursiveCharacterTextSplitter** | Battle-tested loaders + structure-aware splitting. |

---

## 11. Likely Interview Questions & Crisp Answers

**Q: What is RAG and why use it over fine-tuning?**
A: Retrieval-Augmented Generation retrieves relevant document chunks at query
time and feeds them to the LLM as context. Beats fine-tuning for document Q&A
because it's instant to update (just upload), gives citations, keeps data
private, and avoids hallucination — no retraining needed.

**Q: Why a vector database instead of keyword search?**
A: Keyword search is lexical (exact matches). Embeddings capture *meaning*, so
semantic search finds relevant passages even with different wording. Pinecone
does fast cosine nearest-neighbor over 3072-dim vectors.

**Q: How do you prevent hallucination?**
A: A strict grounding prompt ("answer ONLY from the context, else say not
found"), low temperature (0.1), a similarity floor (0.30) to drop weak context,
and source citations so every fact is verifiable.

**Q: How is multi-tenancy enforced?**
A: `owner_id` is derived from the signed JWT, tagged onto every Pinecone vector
and every SQL row, and every retrieval/query filters by it. You can't access
another user's data without forging a JWT signature.

**Q: What happens on an upload failure mid-way?**
A: The stream generator rolls back the DB session and deletes the orphaned file,
so a failed upload never leaves a file on disk without a matching DB row/vectors.

**Q: Why 1000/200 chunking?** (see §6) · **Why two embedding task types?** (§5) ·
**Why the heartbeat for logout?** (§9) · **Why 127.0.0.1 not localhost?** (§9).

**Q: What would you improve for production?**
A: Postgres (or pgvector) instead of SQLite; object storage for files; refresh
tokens + shorter JWT expiry; rate limiting; restricted CORS; JOIN-based admin
queries (kill the N+1s); a calibrated groundedness score; retries/back-off on
Gemini 429s and embedding-key rotation; observability/logging; reranking of
retrieved chunks; streaming the LLM answer token-by-token.

**Q: How does the confidence score work — is it real?**
A: It's a heuristic from retrieval similarity (best 60% + avg 30% + multi-doc
coverage bonus), normalized to 0–100. It measures retrieval strength, not proven
factual correctness — a good UX signal, not a calibrated probability. (Being
honest here scores points.)

**Q: What's the biggest limitation?**
A: Retrieval quality is the ceiling — if the right chunk isn't retrieved, the
answer can't be right ("garbage in, garbage out"). Improvements: better chunking,
hybrid (keyword+vector) search, and reranking.

---

## 12. Known Trade-offs / Weaknesses (own them before they're raised)

1. **SQLite** — single-writer, not for high concurrency → Postgres in prod.
2. **Admin N+1 queries** — a sub-query per row; use aggregations/JOINs at scale.
3. **CORS `*` + dev JWT default** — must be tightened in prod (deployment.md does).
4. **Confidence is heuristic** — not a calibrated correctness probability.
5. **No reranking** — top-k by raw cosine only; a cross-encoder reranker would
   improve precision.
6. **Gemini free-tier quota** — every chunk = one embed call; uploads burn quota
   fast (deployment.md covers Flash models + key rotation + caching fixes).
7. **Files on local disk** — ephemeral on serverless hosts; use object storage.
8. **No answer streaming** — the LLM answer arrives all at once; token streaming
   would feel snappier.

---

## 13. One-Paragraph Summary (your closing statement)

> "DocuMind is a production-shaped, multi-tenant RAG platform. It ingests
> documents by chunking and embedding them into Pinecone, and answers questions
> by semantically retrieving the most relevant chunks and having Gemini generate
> a grounded, cited answer with a confidence score. It's built on FastAPI with
> JWT auth and RBAC, a React/TypeScript SPA with persistent chat history, SSE
> upload progress, and an admin analytics dashboard. I made deliberate
> engineering choices at every layer — asymmetric embedding task types for
> retrieval quality, a heartbeat-based session model for logout-on-close, a
> zero-vector trick to delete by metadata in Pinecone, graceful degradation on
> LLM failures — and I know exactly what I'd change to take it to production:
> Postgres, object storage, reranking, rate limiting, and calibrated scoring."

**Now go get the job. ✦**
