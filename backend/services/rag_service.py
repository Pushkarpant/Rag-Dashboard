# backend/services/rag_service.py
# COMPLETELY REWRITTEN — Better Gemini prompts, confidence scoring, follow-up suggestions

import google.generativeai as genai
from backend.services.vector_store import search_similar
from backend.config import settings
from typing import Dict, List
import re

# Configure Gemini
genai.configure(api_key=settings.GEMINI_API_KEY)

# Use Gemini 1.5 Flash — free, fast, capable
model = genai.GenerativeModel(
    model_name="gemini-3.5-flash",

    # Generation config — CRITICAL for quality
    generation_config=genai.types.GenerationConfig(
        temperature=0.1,       # Near 0 = factual, not creative
        top_p=0.8,             # Focus on high-probability tokens
        top_k=40,              # Limit vocabulary per step
        max_output_tokens=1500 # Enough for detailed answers
    ),

    # Safety settings — reduce unnecessary refusals
    safety_settings=[
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_ONLY_HIGH"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_ONLY_HIGH"},
    ]
)


def calculate_confidence(chunks: List[Dict]) -> int:
    """
    Calculate answer confidence based on retrieval scores.

    Algorithm:
    - Best chunk score × 60% (most important)
    - Average of all chunks × 30%
    - Coverage bonus × 10% (having multiple sources)

    Returns 0-100 integer.
    """
    if not chunks:
        return 0

    scores = [c["score"] for c in chunks]
    best_score = max(scores)
    avg_score = sum(scores) / len(scores)

    # Coverage bonus: more unique sources = more confident
    unique_files = len(set(c["filename"] for c in chunks))
    coverage_bonus = min(unique_files * 0.05, 0.15)

    raw = (best_score * 0.60) + (avg_score * 0.30) + coverage_bonus

    # Convert to 0-100 integer
    return min(int(raw * 100), 100)


def generate_answer(question: str, context: str) -> str:
    """
    Generate answer using Gemini with a strongly-worded prompt.

    The key to good Gemini responses is being VERY explicit
    about what you want and don't want.
    """

    prompt = f"""You are a precise document analysis AI. Your ONLY job is to answer questions based on the provided document excerpts.

STRICT RULES YOU MUST FOLLOW:
1. ONLY use information from the DOCUMENT CONTEXT below
2. NEVER use your training knowledge to fill in gaps
3. If the answer is not in the documents, say exactly: "This information is not found in the uploaded documents."
4. ALWAYS cite which document and page you found each piece of information
5. Be specific and detailed — extract exact numbers, names, dates when present
6. Structure your answer clearly with paragraphs
7. Do NOT make assumptions or inferences beyond what the documents state

DOCUMENT CONTEXT:
{context}

QUESTION: {question}

YOUR ANSWER (based strictly on the documents above):"""

    response = model.generate_content(prompt)
    return response.text.strip()


def generate_followup_questions(question: str, answer: str) -> List[str]:
    """
    Generate 3 intelligent follow-up questions based on the Q&A.
    These help users explore the topic further.
    """

    prompt = f"""Based on this question and answer from a document analysis session, generate exactly 3 short follow-up questions a user might want to ask next.

Original Question: {question}
Answer Summary: {answer[:300]}

Rules:
- Each question must be under 10 words
- Questions should explore different aspects
- Make them specific and actionable
- Return ONLY the 3 questions, one per line, no numbering or bullets

THREE FOLLOW-UP QUESTIONS:"""

    try:
        response = model.generate_content(prompt)
        lines = [l.strip() for l in response.text.strip().split('\n') if l.strip()]
        # Clean up any numbering or bullets
        cleaned = []
        for line in lines[:3]:
            line = re.sub(r'^[\d\.\-\*\•]\s*', '', line)
            if line:
                cleaned.append(line)
        return cleaned[:3]
    except Exception:
        return [
            "Can you provide more details?",
            "What are the key implications?",
            "Are there any exceptions to this?"
        ]


def format_context(chunks: List[Dict]) -> str:
    """
    Format retrieved chunks into clean context string for Gemini.
    Good formatting = better answers.
    """
    parts = []
    for i, chunk in enumerate(chunks):
        part = (
            f"[SOURCE {i+1}]\n"
            f"Document: {chunk['filename']}\n"
            f"Page: {chunk['page']}\n"
            f"Relevance: {chunk['score']:.0%}\n"
            f"Content:\n{chunk['text']}\n"
        )
        parts.append(part)

    return "\n" + "="*50 + "\n".join(parts) + "="*50


def answer_question(question: str, top_k: int = 5, user_id: int = None) -> Dict:
    """
    MAIN RAG PIPELINE — Complete flow:
    1. Search Pinecone for relevant chunks (scoped to user_id only)
    2. Format context properly
    3. Generate answer with Gemini (strict prompt)
    4. Calculate confidence score
    5. Generate follow-up questions
    6. Return everything formatted

    user_id enforces multi-tenant isolation — this user only ever
    retrieves chunks from documents they personally uploaded.

    Returns complete response dict.
    """

    print(f"\n🔍 Processing: '{question}' (user={user_id})")

    # ─── STEP 1: Retrieve relevant chunks ─────────────────────────────
    chunks = search_similar(question, top_k=top_k, user_id=user_id)
    print(f"  📦 Retrieved {len(chunks)} chunks")

    # No documents uploaded yet
    if not chunks:
        return {
            "answer": "No documents found. Please upload PDF or TXT documents first, then ask your question.",
            "sources": [],
            "question": question,
            "confidence": 0,
            "suggestions": [],
            "chunks_used": 0
        }

    # Filter low-relevance chunks (below 0.5 similarity)
    # This improves answer quality significantly
    good_chunks = [c for c in chunks if c["score"] >= 0.5]

    if not good_chunks:
        return {
            "answer": "I searched your documents but couldn't find information relevant enough to answer this question confidently. Try rephrasing or uploading more relevant documents.",
            "sources": [],
            "question": question,
            "confidence": 15,
            "suggestions": [
                "Try rephrasing the question",
                "Upload more specific documents",
                "Break the question into smaller parts"
            ],
            "chunks_used": 0
        }

    # ─── STEP 2: Format context ────────────────────────────────────────
    context = format_context(good_chunks)

    # ─── STEP 3: Generate answer ───────────────────────────────────────
    print("  🤖 Generating answer with Gemini...")
    try:
        answer = generate_answer(question, context)
    except Exception as e:
        print(f"  ❌ Gemini error: {e}")
        answer = f"Error generating answer: {str(e)}. Please check your Gemini API key."

    # ─── STEP 4: Calculate confidence ─────────────────────────────────
    confidence = calculate_confidence(good_chunks)
    print(f"  ✅ Confidence: {confidence}%")

    # ─── STEP 5: Generate follow-up questions ─────────────────────────
    print("  💡 Generating follow-up suggestions...")
    suggestions = generate_followup_questions(question, answer)

    # ─── STEP 6: Format sources ────────────────────────────────────────
    sources = []
    for chunk in good_chunks:
        sources.append({
            "filename": chunk["filename"],
            "page": chunk["page"],
            "relevance_score": round(chunk["score"], 3),
            "excerpt": chunk["text"][:400] + ("..." if len(chunk["text"]) > 400 else "")
        })

    print(f"  ✅ Done! Returning answer with {len(sources)} sources")

    return {
        "answer": answer,
        "sources": sources,
        "question": question,
        "confidence": confidence,
        "suggestions": suggestions,
        "chunks_used": len(good_chunks)
    }
