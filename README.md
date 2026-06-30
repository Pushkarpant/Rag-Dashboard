<div align="center">

# 🔵 RAG Document Intelligence Dashboard

### Ask questions from your documents using AI — like ChatGPT but for your private data

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**[🌐 Live Demo](#)** · **[📹 Demo Video](#)** · **[🐛 Report Bug](../../issues)**

</div>

---

## 📸 Screenshots

> _Screenshots will be added after deployment_

---

## 🎯 What is This?

Most companies have thousands of internal documents — risk reports, compliance papers, product docs, manuals. Finding information means **manually reading hundreds of files**.

This project solves that. Upload any PDF or text document and ask questions in plain English. The AI finds the most relevant sections and gives you accurate answers with exact sources.

**Example:**
> 💬 "What are the main credit risks mentioned in our Q3 report?"
> 
> 🤖 "Based on the Q3 Risk Report (page 12), the main credit risks are: 1) PD underestimation in low-income segments, 2) Concentration risk in real estate sector, 3) Data quality gaps..."

---

## ✨ Features

- 📄 **Upload any document** — PDF or TXT files
- 💬 **Natural language questions** — no search keywords needed
- 🎯 **Source citations** — exact page and document for every answer
- ⚡ **Redis caching** — repeated questions answered instantly
- 🔍 **Semantic search** — finds answers even with different wording
- 📊 **Analytics dashboard** — queries, documents, response times
- 🐳 **Docker ready** — one command to run everything

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  USER BROWSER                   │
│            React App (Port 3000)                │
└──────────────────────┬──────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────▼──────────────────────────┐
│           FastAPI Backend (Port 8000)           │
│                                                 │
│  ┌─────────────┐     ┌──────────────────────┐  │
│  │ RAG Service │     │  Document Processor  │  │
│  │             │     │  (PDF → Chunks)      │  │
│  └──────┬──────┘     └──────────┬───────────┘  │
└─────────│──────────────────────│───────────────┘
          │                      │
    ┌─────▼──────┐    ┌──────────▼──────┐
    │  Pinecone  │    │   PostgreSQL    │
    │ (Vectors)  │    │  (History/Meta) │
    └─────┬──────┘    └─────────────────┘
          │
    ┌─────▼──────┐    ┌─────────────────┐
    │  OpenAI    │    │     Redis       │
    │  (GPT-3.5) │    │   (Caching)    │
    └────────────┘    └─────────────────┘
```

**How it works:**
1. **Ingest** — Upload PDF → Split into 500-word chunks → Convert to vectors → Store in Pinecone
2. **Query** — User asks question → Convert to vector → Find 5 most similar chunks → Send to GPT → Return answer with sources

---

## 🚀 Getting Started

### Prerequisites

```
Python 3.11+
Node.js 18+
Docker & Docker Compose
```

### API Keys Needed

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [OpenAI](https://platform.openai.com) | GPT + Embeddings | $5 credit |
| [Pinecone](https://pinecone.io) | Vector Database | 100k vectors |

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Pushkarpant/rag-dashboard.git
cd rag-dashboard

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment variables
cp .env.example .env
# Edit .env with your API keys

# 5. Run with Docker (easiest)
docker-compose up

# OR run manually:
uvicorn backend.main:app --reload
```

### Environment Variables

```bash
# .env file
OPENAI_API_KEY=sk-your-key-here
PINECONE_API_KEY=your-pinecone-key
PINECONE_INDEX_NAME=rag-documents
DATABASE_URL=postgresql://user:pass@localhost/ragdb
REDIS_URL=redis://localhost:6379
```

### Running the Frontend

```bash
cd frontend
npm install
npm start
# Opens at localhost:3000
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Health check |
| `POST` | `/ask` | Ask a question |
| `POST` | `/documents/upload` | Upload a document |
| `GET` | `/documents/stats` | Get document statistics |
| `GET` | `/history` | Get question history |

**Ask a Question:**
```bash
curl -X POST http://localhost:8000/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What is credit risk?", "top_k": 5}'
```

**Response:**
```json
{
  "answer": "Credit risk is the risk of loss...",
  "sources": [
    {
      "filename": "risk_report_q3.pdf",
      "page": 12,
      "relevance_score": 0.94,
      "excerpt": "Credit risk refers to..."
    }
  ],
  "chunks_used": 5
}
```

---

## 🗂️ Project Structure

```
rag-dashboard/
│
├── backend/
│   ├── main.py                 # FastAPI app + routes
│   ├── config.py               # Settings + env vars
│   ├── routes/
│   │   ├── ask.py              # Question endpoint
│   │   └── documents.py        # Upload endpoint
│   └── services/
│       ├── rag_service.py      # Core RAG logic
│       ├── embedding_service.py # OpenAI embeddings
│       ├── vector_store.py     # Pinecone operations
│       └── document_processor.py # PDF processing
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── ChatInterface.tsx
│       │   ├── MessageBubble.tsx
│       │   ├── SourceCard.tsx
│       │   └── UploadDocument.tsx
│       └── services/
│           └── api.ts
│
├── documents/                  # Uploaded files
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
└── .env.example
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | FastAPI (Python) | REST API server |
| AI/LLM | OpenAI GPT-3.5 | Answer generation |
| Embeddings | OpenAI ada-002 | Text to vectors |
| Vector DB | Pinecone | Semantic search |
| Cache | Redis | Response caching |
| Database | PostgreSQL | History + metadata |
| Frontend | React + TypeScript | User interface |
| Container | Docker | Deployment |

---

## 🎓 Key Concepts

**What is RAG?**

Retrieval-Augmented Generation. Instead of training GPT on your data (expensive), we retrieve relevant document chunks at query time and give them to GPT as context. This means:
- ✅ Works with any documents
- ✅ Always uses latest information
- ✅ Answers with exact sources
- ✅ No training cost

**Why Pinecone?**

Normal search finds exact keyword matches. Pinecone uses vector similarity — it finds documents with the same *meaning*, even if different words are used.

**Why Redis caching?**

OpenAI calls cost money and take ~3 seconds. Same question asked twice? Return cached answer in <10ms at zero cost.

---

## 📝 License

MIT License — see [LICENSE](LICENSE)

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/Pushkarpant">Pushkar</a>
</div>
