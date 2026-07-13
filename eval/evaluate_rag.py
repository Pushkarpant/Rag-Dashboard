"""RAG regression evaluation with the Ragas framework.

For every "golden" question we run the REAL pipeline (Pinecone retrieval →
Cohere rerank → Gemini answer), then score the result with four Ragas metrics:

  • Faithfulness        — is the answer grounded in the retrieved context?
  • Answer Relevancy    — does the answer actually address the question?
  • Context Precision   — are the retrieved chunks relevant (little noise)?
  • Context Recall      — did retrieval find everything the answer needs?

The script prints a table, writes eval/results.csv, and exits non-zero if any
metric falls below its threshold — so it can gate a Pull Request in CI.

Usage:
    python eval/evaluate_rag.py
Env (see eval/README.md):
    GEMINI_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_NAME, COHERE_API_KEY
    EVAL_USER_ID    (optional) restrict retrieval to one owner's documents
    EVAL_CSV        (optional) path to the golden set (default eval/golden_qa.csv)
"""
import os
import sys

import pandas as pd
from dotenv import load_dotenv

# Make `backend` importable when run from the project root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
GOLDEN_CSV = os.getenv("EVAL_CSV", os.path.join(HERE, "golden_qa.csv"))
RESULTS_CSV = os.path.join(HERE, "results.csv")
EVAL_USER_ID = int(os.environ["EVAL_USER_ID"]) if os.getenv("EVAL_USER_ID") else None

# Minimum acceptable mean score per metric. A PR fails if any metric drops below.
# Keyed by the Ragas metric `.name` so the gate stays correct if names change.
THRESHOLDS = {
    "faithfulness":                         0.70,
    "answer_relevancy":                     0.70,
    "llm_context_precision_with_reference": 0.70,
    "context_recall":                       0.70,
}


# ─────────────────────────────────────────────────────────────────────────────
# Run the real RAG pipeline to produce (answer, retrieved_contexts)
# ─────────────────────────────────────────────────────────────────────────────
def run_pipeline(question: str):
    """Execute retrieval + rerank + generation exactly as the app does."""
    from backend.config import settings
    from backend.services.vector_store import search_similar
    from backend.services.reranker import rerank_chunks
    from backend.services.rag_service import generate_answer, format_context

    candidates = search_similar(
        question, top_k=settings.RETRIEVAL_CANDIDATES,
        user_id=EVAL_USER_ID, min_score=0.0,
    )
    chunks = rerank_chunks(question, candidates, top_n=settings.RERANK_TOP_N)
    contexts = [c["text"] for c in chunks]
    answer = (
        generate_answer(question, format_context(chunks))
        if chunks
        else "This information is not found in the uploaded documents."
    )
    return answer, contexts


# ─────────────────────────────────────────────────────────────────────────────
# Ragas judge (LLM + embeddings) — uses Gemini, matching the app
# ─────────────────────────────────────────────────────────────────────────────
def build_judge():
    # JUDGE LLM → Groq (OpenAI-compatible), matching the app's answer model.
    # This is the heavy consumer (many calls per metric), so moving it off Gemini
    # is what actually spares the ~20/day generate_content free-tier quota.
    from langchain_openai import ChatOpenAI
    # JUDGE EMBEDDINGS → stay Gemini. Some Ragas metrics (e.g. Answer Relevancy)
    # need an embedder and Groq has none; Gemini embeddings use a separate, large
    # quota, so they don't reintroduce the generate_content bottleneck.
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from backend.config import settings

    # langchain-google-genai reads GOOGLE_API_KEY; mirror the app's GEMINI key.
    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    os.environ.setdefault("GOOGLE_API_KEY", gemini_key)

    emb_model = settings.EMBEDDING_MODEL
    if not emb_model.startswith("models/"):
        emb_model = f"models/{emb_model}"

    llm = LangchainLLMWrapper(ChatOpenAI(
        model=settings.GROQ_JUDGE_MODEL,   # cheap 8B — separate daily token pool
        api_key=settings.GROQ_API_KEY,
        base_url=settings.GROQ_BASE_URL,
        temperature=0))
    emb = LangchainEmbeddingsWrapper(GoogleGenerativeAIEmbeddings(
        model=emb_model, google_api_key=gemini_key))
    return llm, emb


def build_metrics():
    from ragas.metrics import (
        Faithfulness,
        ResponseRelevancy,               # a.k.a. Answer Relevancy
        LLMContextPrecisionWithReference,
        LLMContextRecall,
    )
    return [
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ]


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main() -> int:
    if not os.path.exists(GOLDEN_CSV):
        print(f"✖ Golden set not found: {GOLDEN_CSV}")
        return 2

    golden = pd.read_csv(GOLDEN_CSV)
    required = {"question", "expected_answer"}
    if not required.issubset(golden.columns):
        print(f"✖ {GOLDEN_CSV} must have columns {required}; got {list(golden.columns)}")
        return 2
    if golden.empty:
        print("✖ Golden set is empty.")
        return 2

    print(f"▶ Running pipeline over {len(golden)} golden question(s)…")
    samples = []
    for _, row in golden.iterrows():
        question = str(row["question"]).strip()
        answer, contexts = run_pipeline(question)
        samples.append({
            "user_input":         question,
            "response":           answer,
            "retrieved_contexts": contexts or [""],   # ragas needs a non-empty list
            "reference":          str(row["expected_answer"]).strip(),
        })
        print(f"  • {question[:60]!r} → {len(contexts)} contexts")

    # Lazy imports so a missing golden set fails fast without the heavy ragas load.
    from ragas import evaluate, EvaluationDataset
    from ragas.run_config import RunConfig

    dataset = EvaluationDataset.from_list(samples)
    llm, emb = build_judge()
    metrics = build_metrics()

    # Throttle the judge. Ragas defaults to high parallelism (~16 workers) with a
    # fixed per-job timeout. Faithfulness is the heavy metric — it makes several
    # SEQUENTIAL LLM calls per answer (claim extraction → per-claim verification) —
    # so under parallel load on the Groq endpoint those chains blow past the
    # timeout and every faithfulness job dies → NaN. Few workers + a long timeout
    # + retries let each chain finish. (Same config rescore.py uses.)
    run_config = RunConfig(max_workers=2, timeout=600, max_retries=10, max_wait=90)

    print("▶ Scoring with Ragas (Faithfulness, Answer Relevancy, "
          "Context Precision, Context Recall)…")
    result = evaluate(dataset=dataset, metrics=metrics, llm=llm, embeddings=emb,
                      run_config=run_config)

    df = result.to_pandas()
    df.to_csv(RESULTS_CSV, index=False)
    print(f"\n✔ Per-sample results written to {RESULTS_CSV}\n")

    # ── Aggregate + gate ─────────────────────────────────────────────────────
    print("=" * 52)
    print(f"{'METRIC':<40}{'SCORE':>7}  GATE")
    print("-" * 52)
    failed = []
    for m in metrics:
        name = m.name
        if name not in df.columns:
            print(f"{name:<40}{'  n/a':>7}  (column missing)")
            continue
        score = float(df[name].mean())
        threshold = THRESHOLDS.get(name)
        if threshold is None:
            status = "—"
        elif score >= threshold:
            status = f"PASS (≥{threshold})"
        else:
            status = f"FAIL (<{threshold})"
            failed.append((name, score, threshold))
        print(f"{name:<40}{score:>7.3f}  {status}")
    print("=" * 52)

    if failed:
        print("\n✖ Evaluation FAILED — below-threshold metrics:")
        for name, score, threshold in failed:
            print(f"    {name}: {score:.3f} < {threshold}")
        return 1

    print("\n✔ All metrics passed their thresholds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
