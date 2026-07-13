from openai import OpenAI
from backend.services.vector_store import search_similar
from backend.services.reranker import rerank_chunks
from backend.config import settings
from typing import Dict, List
import re

# Generation runs on Groq via its OpenAI-compatible endpoint (same `openai` SDK,
# different base_url). Groq/Llama has no "safety_settings" concept — the harm
# categories that Gemini needed are simply gone. Sampling params (temperature,
# max_tokens) move into each request below.
#
# The client is built lazily: the OpenAI SDK raises at construction if the key is
# empty, so eager creation would crash app startup whenever GROQ_API_KEY is unset.
# Lazy init keeps import safe; a missing key then fails softly inside _safe_generate.
_client: OpenAI | None = None

def _get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.GROQ_API_KEY, base_url=settings.GROQ_BASE_URL)
    return _client

def normalise_score(raw: float) -> int:
    lo, hi = settings.SCORE_MIN, settings.SCORE_MAX
    return max(0, min(100, int(((raw - lo) / (hi - lo)) * 100)))

def calculate_confidence(chunks: List[Dict]) -> int:
    if not chunks:
        return 0
    scores    = [c["score"] for c in chunks]
    best      = max(scores)
    avg       = sum(scores) / len(scores)
    cov_bonus = min(len(set(c["filename"] for c in chunks)) * 0.05, 0.15)
    return min(int((best * 0.60 + avg * 0.30 + cov_bonus) * 100), 100)

def generate_answer(question: str, context: str) -> str:
    prompt = f"""You are a precise document analysis AI. Answer ONLY using the document context below.

RULES:
1. Use ONLY information from the DOCUMENT CONTEXT
2. If the answer is not in the documents say: "This information is not found in the uploaded documents."
3. State each fact directly. Do NOT wrap facts in citation phrases like "as
   stated in SOURCE 1" or "this is also confirmed in SOURCE 2", and do NOT make
   claims ABOUT the sources — those cannot be verified against the text and read
   as filler. Instead, end the whole answer with ONE line:
   "Source: <document name>, Page <n>".
4. Be specific — use exact numbers, names, dates when present
5. Structure clearly with paragraphs

DOCUMENT CONTEXT:
{context}

QUESTION: {question}

ANSWER (based strictly on the documents above):"""
    return _safe_generate(prompt) or \
        "I couldn't generate an answer for that. Please try rephrasing your question."


def _safe_generate(prompt: str) -> str:
    """Call Groq (OpenAI-compatible) and pull out the text defensively.

    The network call can fail (rate limit, timeout, bad key) and, rarely, a
    response can come back with no usable content. Guard both so /ask degrades
    gracefully to a fallback message instead of throwing a 500.
    """
    try:
        resp = _get_client().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1,
            max_tokens=1500,
        )
    except Exception as e:
        print(f"  ⚠ Groq call failed: {e}")
        return ""
    try:
        text = (resp.choices[0].message.content or "").strip()
        if text:
            return text
    except Exception as e:
        print(f"  ⚠ Could not extract answer text: {e}")
    return ""

def generate_followups(question: str, answer: str) -> List[str]:
    prompt = f"""Generate exactly 3 short follow-up questions (under 10 words each) based on:

Question: {question}
Answer snippet: {answer[:300]}

Return only 3 questions, one per line, no numbering or bullets."""
    try:
        raw = _safe_generate(prompt)
        lines = [re.sub(r'^[\d\.\-\*\•]\s*', '', l.strip())
                 for l in raw.strip().split('\n')
                 if l.strip()]
        if not lines:
            raise ValueError("no follow-ups generated")
        return lines[:3]
    except Exception:
        return ["Can you provide more details?",
                "What are the key implications?",
                "Are there any exceptions?"]

def format_context(chunks: List[Dict]) -> str:
    sep = "\n" + "=" * 50 + "\n"
    parts = [
        f"[SOURCE {i+1}]\nDocument: {c['filename']}\nPage: {c['page']}\n"
        f"Relevance: {normalise_score(c['score'])}%\nContent:\n{c['text']}"
        for i, c in enumerate(chunks)
    ]
    return sep + sep.join(parts) + sep

def answer_question(question: str, top_k: int = None,
                    user_id: int = None) -> Dict:
    # `top_k` is kept for API compatibility but no longer drives the counts:
    # retrieval width and final size are governed by config (retrieve-then-rerank).
    print(f"\n🔍 '{question}' (user={user_id})")

    # 1) Retrieve a WIDE candidate set from Pinecone (no cosine pre-filter, so the
    #    reranker judges everything). 2) Cross-encoder rerank down to the best few.
    candidates = search_similar(question, top_k=settings.RETRIEVAL_CANDIDATES,
                                user_id=user_id, min_score=0.0)
    print(f"  📦 {len(candidates)} candidates retrieved")

    if not candidates:
        return {"answer": "No documents found. Please upload some documents first.",
                "sources": [], "question": question,
                "confidence": 0, "suggestions": [], "chunks_used": 0}

    chunks = rerank_chunks(question, candidates, top_n=settings.RERANK_TOP_N)
    print(f"  🎯 {len(chunks)} chunks after rerank")

    context  = format_context(chunks)
    answer   = generate_answer(question, context)
    conf     = calculate_confidence(chunks)
    sugg     = generate_followups(question, answer)

    sources = [{
        "filename":       c["filename"],
        "page":           c["page"],
        "relevance_score": normalise_score(c["score"]) / 100,
        "display_score":   normalise_score(c["score"]),
        "excerpt":         c["text"][:400] + ("..." if len(c["text"]) > 400 else "")
    } for c in chunks]

    print(f"  ✅ Done — confidence {conf}%")
    return {"answer": answer, "sources": sources, "question": question,
            "confidence": conf, "suggestions": sugg, "chunks_used": len(chunks)}
