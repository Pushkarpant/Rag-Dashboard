# RAG Evaluation (Ragas)

Automated regression testing for the retrieval pipeline. Replaces "trust the
heuristic confidence score" with objective, LLM-judged metrics that run on every
Pull Request.

## What it measures

For each golden question the script runs the **real** pipeline
(Pinecone retrieval → Cohere rerank → Gemini answer) and scores it:

| Metric | Question it answers | Needs |
|--------|--------------------|-------|
| **Faithfulness** | Is the answer grounded in the retrieved context (no hallucination)? | answer + contexts |
| **Answer Relevancy** | Does the answer actually address the question? | question + answer |
| **Context Precision** | Are the retrieved chunks relevant, or is there noise? | question + contexts + expected answer |
| **Context Recall** | Did retrieval surface everything the answer needs? | contexts + expected answer |

## The Golden Q&A set — `golden_qa.csv`

Three columns:

| Column | Meaning |
|--------|---------|
| `question` | The user question to ask the pipeline |
| `expected_answer` | The correct/reference answer (Ragas `reference`) — used by Context Precision & Recall |
| `source_context` | The ground-truth passage the answer should come from (documentation / non-LLM checks; optional for the four metrics above) |

```csv
question,expected_answer,source_context
"What is the max upload size?","The maximum is 20 MB.","Files over 20 * 1024 * 1024 bytes are rejected."
```

**Important:** the documents these questions are about must already be **indexed
in Pinecone** (upload them through the app first). Retrieval can only find what's
in the index. Use `EVAL_USER_ID` to scope retrieval to the owner who uploaded the
eval corpus; omit it to search the whole index.

## Run locally

```bash
pip install -r eval/requirements.txt
python eval/evaluate_rag.py
```

Reads keys from `.env` (or the environment). Writes per-sample scores to
`eval/results.csv` and prints an aggregate table. **Exit code 1** if any metric
is below its threshold (see `THRESHOLDS` in `evaluate_rag.py`, default `0.70`).

## Configuration

| Env var | Purpose |
|---------|---------|
| `GEMINI_API_KEY` | Answer generation **and** the Ragas judge LLM/embeddings |
| `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` | Retrieval |
| `COHERE_API_KEY` | Reranking (falls back to Pinecone order if unset) |
| `EVAL_USER_ID` | Optional — restrict retrieval to one owner's docs |
| `EVAL_CSV` | Optional — path to a different golden set |

## CI

`.github/workflows/rag-eval.yml` runs this on every PR. It needs these **GitHub
Actions secrets** set in the repo (Settings → Secrets → Actions):
`GEMINI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `COHERE_API_KEY`.

The judge uses Gemini, so evaluation consumes Gemini quota on every PR — keep the
golden set focused (a dozen high-signal questions beats hundreds).
