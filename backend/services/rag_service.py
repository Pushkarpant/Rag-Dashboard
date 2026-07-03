import google.generativeai as genai
from backend.services.vector_store import search_similar
from backend.config import settings
from typing import Dict, List
import re

genai.configure(api_key=settings.GEMINI_API_KEY)

model = genai.GenerativeModel(
    model_name=settings.GEMINI_MODEL,
    generation_config=genai.types.GenerationConfig(
        temperature=0.1, top_p=0.8, top_k=40, max_output_tokens=1500
    ),
    safety_settings=[
        {"category": "HARM_CATEGORY_HARASSMENT",        "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_HATE_SPEECH",       "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
    ]
)

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
3. Cite document name and page for each fact
4. Be specific — use exact numbers, names, dates when present
5. Structure clearly with paragraphs

DOCUMENT CONTEXT:
{context}

QUESTION: {question}

ANSWER (based strictly on the documents above):"""
    return model.generate_content(prompt).text.strip()

def generate_followups(question: str, answer: str) -> List[str]:
    prompt = f"""Generate exactly 3 short follow-up questions (under 10 words each) based on:

Question: {question}
Answer snippet: {answer[:300]}

Return only 3 questions, one per line, no numbering or bullets."""
    try:
        lines = [re.sub(r'^[\d\.\-\*\•]\s*', '', l.strip())
                 for l in model.generate_content(prompt).text.strip().split('\n')
                 if l.strip()]
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

def answer_question(question: str, top_k: int = 7,
                    user_id: int = None) -> Dict:
    print(f"\n🔍 '{question}' (user={user_id})")
    chunks = search_similar(question, top_k=top_k, user_id=user_id)
    print(f"  📦 {len(chunks)} chunks retrieved")

    if not chunks:
        return {"answer": "No documents found. Please upload some documents first.",
                "sources": [], "question": question,
                "confidence": 0, "suggestions": [], "chunks_used": 0}

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
