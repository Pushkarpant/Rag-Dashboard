<div align="center">

# ✦ DocuMind — RAG Document Intelligence Dashboard

### Ask questions from your documents using AI — like ChatGPT, but for your private files

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.138-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![Gemini](https://img.shields.io/badge/Gemini-3.5%20Flash-8E75FF?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

</div>

---

## 🎯 What is This?

Most teams have thousands of internal documents — reports, compliance papers, manuals, notes. Finding
information means **manually reading hundreds of files**.

DocuMind solves that. Upload a PDF or text file and ask questions in plain English. The AI retrieves the most
relevant passages and answers with exact **source citations** and a **confidence score**.

> 💬 "What are the main credit risks in the Q3 report?"
>
> 🤖 "Based on the Q3 Risk Report (p.12), the main credit risks are: 1) PD underestimation in low-income
> segments, 2) concentration risk in real estate, 3) data-quality gaps…" — *87% confidence · 3 sources*

---

## ✨ Features

- 📄 **Upload any document** — PDF or TXT, with real-time processing progress (SSE)
- 💬 **Natural-language questions** — no keyword search needed
- 🎯 **Source citations** — exact page + document for every answer
- 📈 **Confidence scoring** — every answer rates its own reliability
- 🔐 **Multi-tenant isolation** — each user's documents are scoped to their account
- 🗂️ **Chat history** — conversations saved and resumable from the sidebar
- 📊 **Admin analytics** — users, queries, confidence distribution, activity timeline
- 🎨 **Polished, animated UI** — dark/light themes, aurora backgrounds, micro-interactions

---

## 🏗️ Architecture

```
┌───────────────────────────────────────────────┐
│              USER BROWSER                      │
│   React + TypeScript + Vite  (Port 3000)       │
└───────────────────────┬───────────────────────┘
                        │ HTTP / JSON · SSE · JWT
┌───────────────────────▼───────────────────────┐
│           FastAPI Backend (Port 8000)          │
│                                                │
│   RAG Service · Document Processor · Auth      │
└──────┬───────────────────────┬─────────────────┘
       │                       │
 ┌─────▼──────┐         ┌───────▼────────┐
 │  Pinecone  │         │    SQLite      │
 │ (Vectors)  │         │ (users/history)│
 └─────┬──────┘         └────────────────┘
       │
 ┌─────▼──────────────────────┐
 │  Google Gemini             │
 │  gemini-3.5-flash (answers)│
 │  gemini-embedding-001      │
 └────────────────────────────┘
```

**How it works:**
1. **Ingest** — Upload → split into ~1000-char chunks (200 overlap) → embed with Gemini → store in Pinecone.
2. **Query** — Question → embed → retrieve top-K similar chunks (per-user filter) → Gemini generates a cited
   answer with a confidence score.

---

## 🚀 Getting Started

### Prerequisites

```
Python 3.11+
Node.js 18+
```

### API Keys Needed

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Google AI Studio](https://ai.google.dev) | Gemini answers + embeddings | Free tier |
| [Pinecone](https://pinecone.io) | Vector database | 100k vectors |

> **Pinecone index:** name `rag-documents`, **dimensions `3072`**, metric `cosine`
> (3072 is the native output of `gemini-embedding-001`).

### Backend

```bash
# 1. From the project root
python -m venv venv
source venv/Scripts/activate     # Windows (Git Bash)
# source venv/bin/activate       # macOS / Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp backend/.env.example .env     # then edit .env with your real keys

# 4. Run the API
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # opens http://localhost:3000
```

The first account you sign up with automatically becomes **admin**.

### Environment Variables (`.env`)

```bash
GEMINI_API_KEY=your-gemini-api-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=rag-documents
JWT_SECRET=<64-char hex — python -c "import secrets; print(secrets.token_hex(32))">
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`    | `/`                       | Health check |
| `POST`   | `/auth/signup`            | Create account (first = admin) |
| `POST`   | `/auth/login`             | Log in, returns JWT |
| `GET`    | `/auth/me`                | Current user |
| `POST`   | `/ask`                    | Ask a question (auth) |
| `POST`   | `/documents/upload`       | Upload a document — SSE progress (auth) |
| `GET`    | `/documents`              | List your documents (auth) |
| `DELETE` | `/documents/{filename}`   | Delete a document + its vectors (auth) |
| `GET`    | `/stats`                  | Your usage stats (auth) |
| `GET`    | `/conversations`          | Chat history (auth) |
| `GET`    | `/admin/*`                | Platform analytics (admin only) |

**Ask a question:**
```bash
curl -X POST http://localhost:8000/ask \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is credit risk?", "top_k": 7}'
```

---

## 🗂️ Project Structure

```
rag_dashboard/
├── backend/
│   ├── main.py                    # FastAPI app + /ask + /documents + /stats
│   ├── config.py                  # Settings + env vars
│   ├── auth.py                    # JWT + password hashing
│   ├── database.py · models.py    # SQLAlchemy (SQLite)
│   ├── routes/                    # auth · admin · conversations
│   └── services/
│       ├── rag_service.py         # Retrieval + Gemini answer + confidence
│       ├── embedding_service.py   # Gemini embeddings
│       ├── vector_store.py        # Pinecone upsert / query / delete
│       └── document_processor.py  # PDF/TXT → chunks
├── frontend/
│   └── src/
│       ├── pages/                 # Landing · Login · Signup · Dashboard · AdminPanel
│       ├── components/ · hooks/   # Aurora, ProtectedRoute, useInView, useCountUp
│       ├── context/AuthContext.tsx
│       └── services/api.ts
├── documents/                     # Uploaded files (per-user folders)
├── requirements.txt
└── .env
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend    | FastAPI (Python) |
| AI / LLM   | Google Gemini `gemini-3.5-flash` |
| Embeddings | Gemini `gemini-embedding-001` (3072-d) |
| Vector DB  | Pinecone |
| Database   | SQLite (SQLAlchemy) |
| Auth       | JWT (PyJWT) + Passlib (pbkdf2_sha256) |
| Frontend   | React + TypeScript + Vite + Recharts |

---

## 🎓 Key Concepts

**What is RAG?** Retrieval-Augmented Generation. Instead of training the model on your data, we retrieve
relevant chunks at query time and give them to Gemini as context — so answers stay grounded in *your*
documents, cite their sources, and always reflect the latest uploads.

**Why vector search?** Keyword search finds exact matches. Vector embeddings find passages with the same
*meaning*, even when the wording differs.

---

## 📝 License

MIT License

<div align="center">
  Built with ✦ Gemini · Pinecone · FastAPI · React
</div>
