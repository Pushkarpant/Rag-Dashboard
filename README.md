<div align="center">

# ✦ Verity

### Ask your documents. Verify every answer.

**A production-grade RAG platform that turns your private PDFs into a cited, confidence-scored Q&A assistant — like ChatGPT, but grounded in *your* files and honest about what it doesn't know.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Groq](https://img.shields.io/badge/Groq-Llama%203.3%2070B-F55036?style=flat-square)](https://groq.com)
[![Gemini](https://img.shields.io/badge/Gemini-Embeddings-8E75FF?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![Pinecone](https://img.shields.io/badge/Pinecone-Vectors-000000?style=flat-square)](https://pinecone.io)
[![Cohere](https://img.shields.io/badge/Cohere-Rerank%20v3.5-39594C?style=flat-square)](https://cohere.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Ragas](https://img.shields.io/badge/Eval-Ragas%20+%20CI-FF4B4B?style=flat-square)](https://docs.ragas.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](#-license)

</div>

---

## 🎯 The Problem

Every team sits on thousands of internal documents — reports, compliance papers, manuals, research notes. Finding one fact means **manually reading hundreds of pages**. Generic chatbots don't help: they either don't have your documents, or they hallucinate answers that *sound* right but cite nothing.

**Verity fixes that.** Upload a PDF or text file, ask a question in plain English, and get an answer that:

- 📌 **cites its exact sources** — document name + page for every claim,
- 📊 **rates its own confidence** — so you know when to trust it,
- 🧱 **stays grounded** — if the answer isn't in your documents, it says so instead of inventing one.

> 💬 **"What are the main credit risks in the Q3 report?"**
>
> 🤖 *"Based on the Q3 Risk Report (p.12), the main credit risks are: (1) PD underestimation in low-income segments, (2) concentration risk in real estate, (3) data-quality gaps in the origination pipeline…"*
> — **87% confidence · 3 sources**

---

## ✨ Features

| | |
|---|---|
| 📄 **Upload anything** | PDF or TXT, up to 20 MB, with **live processing progress** streamed over Server-Sent Events |
| 💬 **Natural-language Q&A** | No keyword search — ask the way you'd ask a colleague |
| 🎯 **Source citations** | Exact document + page for every answer, with expandable excerpts |
| 📈 **Confidence scoring** | Every answer rates its own reliability from retrieval signal |
| 🥇 **Two-stage retrieval** | Pinecone recall → **Cohere cross-encoder rerank** for precision |
| 🔐 **Multi-tenant isolation** | Every user's documents & vectors are scoped to their account |
| 🗂️ **Chat history** | Conversations are saved, auto-titled, and resumable from the sidebar |
| 💡 **Smart follow-ups** | Each answer suggests 3 relevant next questions |
| 📊 **Admin analytics** | Users, queries, confidence distribution, latency & 14-day activity timeline |
| 🧪 **Automated RAG eval** | Ragas metrics gate every Pull Request in CI |
| 🎨 **Polished UI** | Dark/light themes, aurora backgrounds, animated micro-interactions |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                        USER BROWSER                       │
│         React 18 · TypeScript · Vite · Recharts           │
└─────────────────────────────┬────────────────────────────┘
                              │  HTTPS · JSON · SSE · JWT
┌─────────────────────────────▼────────────────────────────┐
│                     FastAPI Backend                       │
│                                                           │
│   Auth (JWT)  ·  RAG Service  ·  Document Processor       │
│   Conversations  ·  Admin Analytics                       │
└───┬───────────────────┬───────────────────────┬──────────┘
    │                   │                       │
┌───▼──────┐   ┌────────▼─────────┐   ┌─────────▼──────────┐
│ Pinecone │   │   PostgreSQL     │   │ Groq · Llama 3.3   │
│ (vectors)│   │ users · docs ·   │   │ 70B (answers)      │
│  3072-d  │   │ queries · chats  │   │ Gemini embed-001   │
└───┬──────┘   └──────────────────┘   └────────────────────┘
    │
┌───▼─────────────────┐
│  Cohere Rerank v3.5 │  cross-encoder re-ranking between recall and the LLM
└─────────────────────┘
```

### How it works

**Ingest**
```
Upload → save to documents/{user_id}/ → extract text (pypdf)
       → chunk (1000 chars, 200 overlap, recursive splitter)
       → embed each chunk (Gemini embedding-001, 3072-d)
       → upsert to Pinecone with owner_id metadata
```

**Query — retrieve → rerank → generate**
```
Question → embed → Pinecone top-50 (filtered by owner_id, no cosine cutoff)
         → Cohere rerank (cross-encoder) → keep top-5
         → Llama 3.3 70B (on Groq) generates a strictly-grounded, cited answer
         → confidence score + 3 follow-up suggestions
```

The two-stage retrieval is the key quality lever: Pinecone's bi-encoder cosine search is *fast but coarse*, so it casts a wide net (50 candidates). Cohere's cross-encoder then reads the query and each chunk **together** to produce a far more accurate ordering, and only the best 5 reach the LLM. The reranker **fails soft** — if the Cohere key is missing or the call times out, the pipeline degrades gracefully to Pinecone order.

> **LLM note:** answer generation runs on **Groq** (`llama-3.3-70b-versatile`) via its OpenAI-compatible API — chosen for speed and a far more generous free tier. **Embeddings stay on Gemini** (`gemini-embedding-001`), because the Pinecone index is 3072-d to match it and Groq has no embedding API.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend**    | FastAPI (Python 3.11+), Uvicorn |
| **LLM (answers)** | **Groq** `llama-3.3-70b-versatile` (OpenAI-compatible API) |
| **Embeddings** | Gemini `gemini-embedding-001` (3072-d) |
| **Vector DB**  | Pinecone (cosine, 3072-d) |
| **Reranker**   | Cohere `rerank-v3.5` (cross-encoder) |
| **Database**   | PostgreSQL + SQLAlchemy + Alembic migrations |
| **Auth**       | JWT (PyJWT) + Passlib (`pbkdf2_sha256`) |
| **Frontend**   | React 18 · TypeScript · Vite · React Router · Recharts |
| **Eval / CI**  | Ragas + GitHub Actions (per-PR quality gate) |

---

## 🚀 Getting Started

### Prerequisites

```
Python 3.11+
Node.js 18+
PostgreSQL 14+   (local install or Docker)
```

### API keys needed

| Service | Purpose | Free tier |
|---------|---------|-----------|
| [Groq](https://console.groq.com) | LLM answers (Llama 3.3 70B) + Ragas judge | ✅ generous |
| [Google AI Studio](https://ai.google.dev) | Embeddings only (`gemini-embedding-001`) | ✅ |
| [Pinecone](https://pinecone.io) | Vector database | ✅ 100k vectors |
| [Cohere](https://cohere.com) | Reranking *(optional — degrades gracefully)* | ✅ trial key |

> **Pinecone index:** name `rag-documents`, **dimensions `3072`**, metric `cosine`
> (3072 is the native output of `gemini-embedding-001`).

### 1 · Database (Docker one-liner)

```bash
docker run -d --name rag-postgres \
  -e POSTGRES_USER=rag_user \
  -e POSTGRES_PASSWORD=rag_pass \
  -e POSTGRES_DB=rag_dashboard \
  -p 5432:5432 postgres:16
```

### 2 · Backend

```bash
# from the project root
python -m venv venv
source venv/Scripts/activate      # Windows (Git Bash)
# source venv/bin/activate        # macOS / Linux

pip install -r requirements.txt

cp backend/.env.example .env      # then edit .env with your real keys
alembic upgrade head              # create the schema

uvicorn backend.main:app --reload --port 8000
```

### 3 · Frontend

```bash
cd frontend
npm install
npm run dev                       # → http://localhost:3000
```

> 🔑 **The first account you sign up with automatically becomes the admin.**

### Environment variables (`.env`)

```bash
# AI / retrieval
GROQ_API_KEY=your-groq-key                # LLM answers + Ragas judge (console.groq.com)
GEMINI_API_KEY=your-gemini-api-key        # embeddings only
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=rag-documents
COHERE_API_KEY=your-cohere-key            # optional

# Data + auth
DATABASE_URL=postgresql+psycopg://rag_user:rag_pass@localhost:5432/rag_dashboard
JWT_SECRET=<64-char hex — python -c "import secrets; print(secrets.token_hex(32))">
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/`                        | Health check |
| `POST`   | `/auth/signup`             | Create account (first user = admin) |
| `POST`   | `/auth/login`              | Log in, returns JWT |
| `GET`    | `/auth/me`                 | Current user |
| `POST`   | `/ask`                     | Ask a question 🔒 |
| `POST`   | `/documents/upload`        | Upload a document — **SSE** progress 🔒 |
| `GET`    | `/documents`               | List your documents 🔒 |
| `DELETE` | `/documents/{filename}`    | Delete a document + its vectors 🔒 |
| `GET`    | `/stats`                   | Your usage stats 🔒 |
| `GET`    | `/conversations`           | List / create / delete chats 🔒 |
| `GET`    | `/conversations/{id}/messages` | Full message history 🔒 |
| `GET`    | `/admin/*`                 | Platform analytics 👑 admin only |

🔒 = requires `Authorization: Bearer <token>` · 👑 = admin role

**Ask a question**
```bash
curl -X POST http://127.0.0.1:8000/ask \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is the maximum flight time?"}'
```

---

## 🧪 RAG Evaluation (the part most projects skip)

Verity ships with an **automated quality harness** so retrieval/generation regressions get caught *before* they merge — not in production.

- **Golden set** — hand-written Q&A pairs about a **fictional** test document (a drone manual for a product that doesn't exist), so the LLM *cannot* answer from memory and is forced to use retrieved context.
- **Real pipeline** — every question runs the actual `Pinecone → Cohere → Groq/Llama` path.
- **Four Ragas metrics**, judged by a cheap **Llama 3.1 8B** model on Groq (a *separate* token pool from the 70B answer model, so evaluation never starves the live site):

  | Metric | Answers the question | Tests |
  |--------|----------------------|-------|
  | **Faithfulness**       | Is every claim supported by the retrieved chunks? | Generation (hallucination) |
  | **Answer Relevancy**   | Does the answer address the question? | Generation |
  | **Context Precision**  | Are the retrieved chunks relevant (low noise)? | Retriever |
  | **Context Recall**     | Did retrieval find everything needed? | Retriever |

- **CI gate** — `.github/workflows/rag-eval.yml` runs the evaluator on every PR touching `backend/` or `eval/`. If any metric drops below its threshold (default `0.70`), the check goes red and blocks the merge; `results.csv` is uploaded as an artifact.

```bash
# run it locally
python eval/evaluate_rag.py        # writes eval/results.csv + prints the gate table
```

See [`eval/README.md`](eval/README.md) for the full end-to-end guide.

---

## 🗂️ Project Structure

```
verity/
├── backend/
│   ├── main.py                    # FastAPI app · /ask · /documents · /stats
│   ├── config.py                  # Settings + env vars
│   ├── auth.py                    # JWT + password hashing
│   ├── database.py · models.py    # SQLAlchemy (PostgreSQL)
│   ├── routes/                    # auth · admin · conversations
│   └── services/
│       ├── rag_service.py         # Retrieval → answer → confidence
│       ├── reranker.py            # Cohere cross-encoder rerank
│       ├── embedding_service.py   # Gemini embeddings
│       ├── vector_store.py        # Pinecone upsert / query / delete
│       └── document_processor.py  # PDF/TXT → chunks
├── frontend/
│   └── src/
│       ├── pages/                 # Landing · Login · Signup · Dashboard · AdminPanel
│       ├── components/ · hooks/   # Aurora · ProtectedRoute · useInView · useCountUp
│       ├── context/AuthContext.tsx
│       └── services/api.ts
├── eval/                          # Ragas harness · golden set · test corpus
├── alembic/                       # Database migrations
├── .github/workflows/rag-eval.yml # CI quality gate
├── requirements.txt
└── .env
```

---

## 🎓 Key Concepts

**What is RAG?** Retrieval-Augmented Generation. Instead of training a model on your data, we retrieve the most relevant chunks at query time and hand them to the LLM (Llama 3.3 70B) as context — so answers stay grounded in *your* documents, cite their sources, and always reflect your latest uploads.

**Why rerank?** Vector (bi-encoder) search is fast but only *approximately* relevant. A cross-encoder reranker reads the query and each candidate chunk together, catching relevance a pure embedding distance misses — dramatically improving what the LLM actually sees.

**Why a confidence score?** An answer you can't trust is worse than no answer. Verity derives confidence from retrieval signal (best + average similarity, source coverage) so users know when to double-check.

---

## 📝 License

MIT — see [LICENSE](LICENSE).

<div align="center">

**Verity** · Ask your documents. Verify every answer.
Built with ✦ Groq · Llama 3.3 · Gemini embeddings · Pinecone · Cohere · FastAPI · React

</div>
