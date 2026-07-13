"""Re-score an existing eval/results.csv WITHOUT re-running the pipeline.

The pipeline half (Pinecone retrieval → Cohere rerank → Gemini answer) is
expensive and already captured in results.csv. When the Ragas judge half fails
part-way (Gemini rate-limits leave NaN scores), re-running the whole evaluator
wastes those pipeline calls and risks the same throttling.

This script loads the saved (user_input, retrieved_contexts, response,
reference) rows and runs ONLY the Ragas scoring, with the judge throttled to a
single worker + generous retries so the free-tier Gemini rate limit doesn't
produce NaNs again. It rewrites results.csv and prints the same gate table as
evaluate_rag.py.

Usage:
    eval/.venv/Scripts/python.exe eval/rescore.py
"""
import ast
import os
import sys

import pandas as pd
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv()

HERE = os.path.dirname(os.path.abspath(__file__))
# EVAL_RESULTS lets you re-score a subset file (e.g. a 2-question sample that
# fits inside the Gemini free-tier daily quota) instead of the full results.csv.
RESULTS_CSV = os.getenv("EVAL_RESULTS", os.path.join(HERE, "results.csv"))

THRESHOLDS = {
    "faithfulness":                         0.70,
    "answer_relevancy":                     0.70,
    "llm_context_precision_with_reference": 0.70,
    "context_recall":                       0.70,
}


def _as_list(cell):
    """results.csv stores retrieved_contexts as a stringified Python list."""
    if isinstance(cell, list):
        return cell or [""]
    try:
        val = ast.literal_eval(cell)
        if isinstance(val, list) and val:
            return [str(x) for x in val]
    except (ValueError, SyntaxError):
        pass
    return [str(cell)] if str(cell).strip() else [""]


def build_judge():
    # Judge LLM → Groq 8B (cheap, separate token pool); embeddings → Gemini.
    # Mirrors evaluate_rag.build_judge() so rescoring is identical to a fresh run.
    from langchain_openai import ChatOpenAI
    from langchain_google_genai import GoogleGenerativeAIEmbeddings
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from backend.config import settings

    gemini_key = settings.GEMINI_API_KEY or os.getenv("GOOGLE_API_KEY", "")
    os.environ.setdefault("GOOGLE_API_KEY", gemini_key)

    emb_model = settings.EMBEDDING_MODEL
    if not emb_model.startswith("models/"):
        emb_model = f"models/{emb_model}"

    llm = LangchainLLMWrapper(ChatOpenAI(
        model=settings.GROQ_JUDGE_MODEL,
        api_key=settings.GROQ_API_KEY,
        base_url=settings.GROQ_BASE_URL,
        temperature=0))
    emb = LangchainEmbeddingsWrapper(GoogleGenerativeAIEmbeddings(
        model=emb_model, google_api_key=gemini_key))
    return llm, emb


def build_metrics():
    from ragas.metrics import (
        Faithfulness,
        ResponseRelevancy,
        LLMContextPrecisionWithReference,
        LLMContextRecall,
    )
    return [
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ]


def main() -> int:
    if not os.path.exists(RESULTS_CSV):
        print(f"✖ {RESULTS_CSV} not found — run evaluate_rag.py first.")
        return 2

    df_in = pd.read_csv(RESULTS_CSV)
    need = {"user_input", "retrieved_contexts", "response", "reference"}
    if not need.issubset(df_in.columns):
        print(f"✖ results.csv missing columns {need - set(df_in.columns)}")
        return 2

    samples = [{
        "user_input":         str(r["user_input"]),
        "response":           str(r["response"]),
        "retrieved_contexts": _as_list(r["retrieved_contexts"]),
        "reference":          str(r["reference"]),
    } for _, r in df_in.iterrows()]
    print(f"▶ Re-scoring {len(samples)} saved sample(s) — no pipeline re-run.")

    from ragas import evaluate, EvaluationDataset
    from ragas.run_config import RunConfig

    dataset = EvaluationDataset.from_list(samples)
    llm, emb = build_judge()
    metrics = build_metrics()

    # Throttle the judge: 1 worker + long retry backoff so free-tier Gemini
    # rate limits don't leave NaN scores like the interrupted run did.
    # Faithfulness is the slow metric — it makes SEVERAL sequential judge calls
    # per answer (claim extraction → per-claim verification), so a single job can
    # run for minutes on the 8B Groq judge. 180s wasn't enough (Job[4] timed out →
    # NaN); 600s gives each chain room to finish.
    run_config = RunConfig(max_workers=1, timeout=600, max_retries=10, max_wait=90)

    print("▶ Scoring with Ragas (throttled: max_workers=1)…")
    result = evaluate(dataset=dataset, metrics=metrics, llm=llm,
                      embeddings=emb, run_config=run_config)

    df = result.to_pandas()
    df.to_csv(RESULTS_CSV, index=False)
    print(f"\n✔ Per-sample results written to {RESULTS_CSV}\n")

    print("=" * 52)
    print(f"{'METRIC':<40}{'SCORE':>7}  GATE")
    print("-" * 52)
    failed = []
    for m in metrics:
        name = m.name
        if name not in df.columns:
            print(f"{name:<40}{'  n/a':>7}  (column missing)")
            continue
        score = float(pd.to_numeric(df[name], errors="coerce").mean())
        threshold = THRESHOLDS.get(name)
        if score != score:  # NaN
            status = "NaN (judge failed)"
            failed.append((name, score, threshold))
        elif threshold is None:
            status = "—"
        elif score >= threshold:
            status = f"PASS (≥{threshold})"
        else:
            status = f"FAIL (<{threshold})"
            failed.append((name, score, threshold))
        print(f"{name:<40}{score:>7.3f}  {status}")
    print("=" * 52)

    if failed:
        print("\n✖ Below-threshold / unscored metrics:")
        for name, score, threshold in failed:
            print(f"    {name}: {score:.3f} (threshold {threshold})")
        return 1

    print("\n✔ All metrics passed their thresholds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
