# 🚀 Deployment Guide — RAG Dashboard (Go Live for your LinkedIn demo)

This is a complete, copy-paste friendly walkthrough to take this project from
"runs on my laptop" to "anyone can open a public URL." It also solves the
**Gemini "20 requests/day" problem** with 100% free options.

Everything here uses **free tiers only**. No credit card required for the demo path.

---

## 0. What you're deploying (the mental model)

Your app has **3 moving parts**:

| Part | What it is | Where it will live (free) |
|------|-----------|---------------------------|
| **Frontend** | React + Vite (the UI you see) | **Vercel** (static site) |
| **Backend** | FastAPI + Uvicorn (the API) | **Render** (web service) |
| **Data** | Pinecone (vectors) + Gemini (AI) + SQLite (users/logs) | Pinecone cloud + Google + Render disk |

> The frontend and backend get **two separate URLs**. The frontend must be told
> the backend's public URL — that's the #1 thing people forget.

**Total cost: $0.** Time: ~45–60 minutes the first time.

---

## 1. ⚠️ Pre-flight fixes (do these BEFORE deploying)

There are 3 small code changes that must happen or the deploy will fail or the
live site won't talk to the backend.

### Fix 1 — Make the frontend API URL configurable (CRITICAL)

Right now `frontend/src/services/api.ts` has a **hardcoded** address:

```ts
const BASE = "http://127.0.0.1:8000";
```

On the internet, `127.0.0.1` means "this same computer" — so your live site
would try to call the visitor's own laptop and fail. Change it to read from an
environment variable, with the local address as a fallback:

```ts
const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
```

That's it. Vite exposes any variable starting with `VITE_` to the browser.
Locally it still uses `127.0.0.1:8000`; in production Vercel will inject the
real backend URL (set up in Step 4).

> 🔎 Search the whole `frontend/src` folder for any other `127.0.0.1` or
> `localhost:8000` and replace them the same way (SSE upload calls may have
> their own copy).

### Fix 2 — Slim down `requirements.txt` (CRITICAL for free build)

Your `requirements.txt` pulls in **`torch`, `transformers`, `sentence-transformers`,
`scikit-learn`, `scipy`** — these are **~3–5 GB** of downloads. Your code does
**not** use them (embeddings come from the Gemini API, confirmed in
`backend/services/embedding_service.py`). On Render's free tier this bloat will
make the build **time out or run out of memory and fail.**

Create a lean `requirements.txt` with only what the app imports:

```txt
fastapi==0.138.1
uvicorn==0.49.0
pydantic==2.13.4
pydantic-settings==2.14.2
python-dotenv==1.2.2
python-multipart==0.0.32
email-validator==2.3.0
SQLAlchemy==2.0.51
passlib==1.7.4
PyJWT==2.13.0
google-generativeai==0.8.6
pinecone==9.1.0
pypdf==6.14.2
```

> Keep your original file as `requirements.full.txt` if you want a backup.
> If a deploy log later says `ModuleNotFoundError: X`, just add `X` to this list
> and redeploy — that's the whole debugging loop.

### Fix 3 — Bind the server to Render's port

Render gives your service a port via the `$PORT` environment variable. You don't
edit code for this — you'll set the **Start Command** in Step 3 to use it:

```
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

`--host 0.0.0.0` is required so the server accepts outside traffic (not just
localhost).

### (Optional but recommended) Lock down CORS

`backend/main.py` currently allows **any** origin:

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

For a demo this is fine and you can leave it. If you want it tidy, after you know
your Vercel URL you can replace `["*"]` with `["https://your-app.vercel.app"]`.

---

## 2. Push your code to GitHub

Both Render and Vercel deploy **from a GitHub repo**. Your `.gitignore` already
excludes `.env`, `node_modules`, `*.pdf`, and `*.sqlite` — good, your secrets and
test PDFs won't be uploaded.

```bash
cd "C:/Users/HP/OneDrive/Desktop/rrr/rag_dashboard"

git add .
git commit -m "Prep for deployment: env-based API URL, slim requirements"

# Create an EMPTY repo on github.com first (no README), then:
git remote add origin https://github.com/<your-username>/rag-dashboard.git
git branch -M main
git push -u origin main
```

> ✅ Double-check on GitHub that **`.env` is NOT there**. If you see it, your API
> keys just went public — delete the repo, rotate the keys, fix `.gitignore`,
> and re-push.

---

## 3. Deploy the BACKEND on Render (free)

1. Go to **https://render.com** → sign up with GitHub.
2. **New +** → **Web Service** → connect your `rag-dashboard` repo.
3. Fill in:
   - **Name**: `rag-dashboard-api` (this becomes your URL)
   - **Region**: pick the closest one
   - **Branch**: `main`
   - **Root Directory**: *(leave blank — repo root is the project)*
   - **Runtime**: `Python 3`
   - **Build Command**:
     ```
     pip install -r requirements.txt
     ```
   - **Start Command**:
     ```
     uvicorn backend.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type**: **Free**
4. Click **Advanced** → **Add Environment Variable** and add each of these
   (copy the values from your local `.env`, generate a fresh `JWT_SECRET`):

   | Key | Value |
   |-----|-------|
   | `GEMINI_API_KEY` | your Gemini key |
   | `PINECONE_API_KEY` | your Pinecone key |
   | `PINECONE_INDEX_NAME` | `rag-documents` |
   | `JWT_SECRET` | a new 64-char hex — see below |
   | `PYTHON_VERSION` | `3.12.0` |

   Generate a fresh secret locally and paste the output:
   ```bash
   python -c "import secrets; print(secrets.token_hex(32))"
   ```
5. **Create Web Service.** Watch the logs. First build takes ~5–10 min.
6. When it says **"Live"**, copy your URL, e.g.
   `https://rag-dashboard-api.onrender.com`
7. Test it: open that URL in a browser. You should see:
   ```json
   {"status": "ok", "version": "4.0.0"}
   ```
   🎉 Backend is live.

### ⚠️ Two things to know about Render's free tier

- **It sleeps after 15 min of inactivity.** The next visitor's first request
  takes ~30–50 seconds to "wake" it. For a live demo, **open your site 1 minute
  before** presenting so it's already awake. (Or hit the URL to pre-warm it.)
- **The disk is ephemeral.** Your `rag_dashboard.db` (users, logs) and uploaded
  files in `documents/` are **wiped on every redeploy/restart.** For a demo this
  is usually fine — just be ready to re-signup and re-upload. If you want
  persistence, see the "Going further" section.

---

## 4. Deploy the FRONTEND on Vercel (free)

1. Go to **https://vercel.com** → sign up with GitHub.
2. **Add New… → Project** → import your `rag-dashboard` repo.
3. Configure:
   - **Framework Preset**: `Vite`
   - **Root Directory**: click **Edit** → select **`frontend`**  ← important, your React app is in a subfolder
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `dist` (auto-filled)
4. Expand **Environment Variables** and add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://rag-dashboard-api.onrender.com` |

   (Use YOUR Render URL from Step 3.6 — **no trailing slash**.)
5. Click **Deploy.** ~2 minutes later you get a URL like
   `https://rag-dashboard.vercel.app` — **this is the link you share on LinkedIn.**

### SPA routing note (already handled, but verify)

Your app uses React Router. If refreshing a route like `/admin` shows a 404 on
Vercel, add a `frontend/vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

Commit + push; Vercel auto-redeploys.

---

## 5. Connect the two & smoke-test

1. Open your **Vercel URL**.
2. **Sign up** → **log in**.
3. **Upload a small PDF** (start with a 1–2 page file to save Gemini quota).
4. **Ask a question** about it.

If the question answers correctly, **you're live.** 🎉

**If the UI loads but login/upload fails**, it's almost always one of:
- `VITE_API_URL` typo or trailing slash → fix in Vercel → redeploy.
- Backend still asleep → wait 40s and retry.
- Browser console shows a **CORS** error → confirm `main.py` has the CORS
  middleware (it does by default with `["*"]`).

---

## 6. 🔑 The Gemini "20 requests/day" problem — free fixes

**Why it happens (the important part):** Gemini's free-tier limit is **per Google
Cloud _project_, not per key** — so making more keys in the same project adds
**zero** extra quota. And in *this* app, **every uploaded PDF chunk is a separate
embedding API call** (see `embedding_service.py` — it's called once per chunk in
`document_processor.py`). A single 10-page PDF can be 30–50 chunks = 30–50 calls.
That's why you hit the wall so fast — it's mostly your **uploads**, not your
questions, burning the quota. Also, restrictive **Pro** models have a much lower
daily cap than **Flash** models.

Here are the free solutions, best first:

### ✅ Solution 1 — Use a Flash model (biggest win, do this first)

Flash models get the **highest free-tier quota (~1,500 requests/day)**, while Pro
models are capped at ~50–100/day (and Pro was removed from the free tier in
2026). Your `backend/config.py` uses:

```python
GEMINI_MODEL = "gemini-3.5-flash"     # keep this on a *-flash model
```

Make sure both your **chat model** AND you're aware the **embedding model**
(`gemini-embedding-001`) has its **own separate quota**. Confirm you're on a
current, valid Flash model name for chat. If a model name 404s, check the live
model list at https://ai.google.dev/gemini-api/docs/models and switch to the
newest `*-flash` available to your account (e.g. a Gemini Flash variant). This
alone usually takes you from ~20/day to hundreds/day.

### ✅ Solution 2 — Rotate keys from SEPARATE projects/accounts (true multiplier)

Since quota is **per project**, you get fresh quota by using keys from
**different Google Cloud projects** (or different Google accounts). Create 2–4
projects at https://aistudio.google.com/app/apikey, then round-robin between the
keys in code:

```python
# backend/config.py
import os
GEMINI_API_KEYS = [k for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k]

# a tiny rotator
import itertools
_key_cycle = itertools.cycle(GEMINI_API_KEYS or [os.getenv("GEMINI_API_KEY", "")])
def next_gemini_key() -> str:
    return next(_key_cycle)
```

Then in `embedding_service.py` / `rag_service.py`, call `genai.configure(
api_key=next_gemini_key())` right before each request, and on a `429` (quota)
error, catch it and retry with the next key:

```python
from google.api_core.exceptions import ResourceExhausted

def embed_with_rotation(text, task_type):
    for _ in range(len(GEMINI_API_KEYS) or 1):
        genai.configure(api_key=next_gemini_key())
        try:
            return genai.embed_content(model=settings.EMBEDDING_MODEL,
                                       content=text, task_type=task_type)["embedding"]
        except ResourceExhausted:
            continue      # this key is tapped out today, try the next
    raise RuntimeError("All Gemini keys exhausted for today")
```

Set `GEMINI_API_KEYS=key1,key2,key3` in Render's env vars. **4 free projects ≈ 4×
the daily quota, at $0.** (Keep it reasonable — this is for a personal demo.)

### ✅ Solution 3 — Cache embeddings so you never pay for the same text twice

The heaviest cost is **re-embedding**. Two cheap wins:
- **Don't re-upload the same PDF.** Your `main.py` already deletes + re-embeds on
  duplicate filename — so re-uploading the same file **spends quota again.** Just
  don't re-upload for the demo.
- **Cache query embeddings.** Add a simple dict/`functools.lru_cache` (or a
  Pinecone-side check) keyed on the exact question text so repeated demo
  questions ("What is this document about?") cost **one** embedding, not one each
  time.

```python
from functools import lru_cache

@lru_cache(maxsize=512)
def get_query_embedding_cached(query: str):
    return tuple(get_query_embedding(query))   # tuple so it's hashable/cacheable
```

### ✅ Solution 4 — Pre-load your demo data, then don't upload live

For the LinkedIn demo, **upload your documents once** (spending quota deliberately
when nobody's watching), then during the demo only **ask questions** (cheap).
This keeps you far under any daily cap while presenting. Prepare 3–4 good
questions in advance.

### ✅ Solution 5 — Free Google Cloud credits (if you ever want real headroom)

New Google Cloud accounts get **$300 in free credits (90 days)**. Enabling
billing moves the project to the pay-as-you-go tier where Flash models cost
**fractions of a cent** per request — the credits would cover *thousands* of demo
requests for effectively free.
⚠️ **The billing trap:** once you enable billing on a project, its free tier is
**gone** — every call is billable (just paid from credits). So use a **separate
project** for this and keep a free-tier project for casual testing.

### Quick reference — free-tier reality (verify live, numbers change often)

| Model type | Free requests/day (approx) | Use for |
|-----------|----------------------------|---------|
| Gemini **Flash** / Flash-Lite | ~1,000–1,500 RPD | ✅ your chat model |
| Gemini **Pro** | ~50–100 RPD (removed from free tier in 2026) | ❌ avoid |
| **Embeddings** | separate quota, per project | uploads (batch/cache these!) |

> Limits reset at **midnight Pacific time**, and are measured across **RPM, TPM,
> and RPD** simultaneously — hitting any one triggers a `429`. Always check your
> live limits in AI Studio for your project.

**Recommended combo for a smooth free demo:** Solution 1 (Flash) + Solution 4
(pre-upload) + Solution 2 (2–3 rotating keys as a safety net).

---

## 7. Final pre-demo checklist (do this ~5 min before posting on LinkedIn)

- [ ] Open the Vercel URL once to **wake the Render backend** (first load ~40s).
- [ ] Confirm signup → login → ask works end to end.
- [ ] Your demo documents are **already uploaded** (don't upload live — saves quota).
- [ ] You have **3–4 prepared questions** that showcase good answers.
- [ ] `JWT_SECRET` on Render is the **new** generated one, not the dev default.
- [ ] Optional: record a **30–60s screen capture** as a backup, in case the free
      backend is slow to wake during the live demo.

### Suggested LinkedIn post skeleton

> Built a full-stack **RAG (Retrieval-Augmented Generation) dashboard** —
> upload your PDFs, ask questions, get **cited, document-grounded answers**.
> Stack: **FastAPI · React/Vite · Pinecone · Google Gemini**, with JWT auth,
> an admin panel, and streaming upload progress.
> 🔗 Live demo: `https://your-app.vercel.app`
> 💻 Code: `https://github.com/you/rag-dashboard`
> #AI #RAG #FastAPI #React #LLM

---

## 8. Going further (optional, still free)

- **Persistent database:** SQLite on Render's ephemeral disk resets on redeploy.
  Swap to a free **Postgres** (Render Postgres free tier, Neon, or Supabase) and
  point `backend/database.py` at its `DATABASE_URL`. Uploaded files should go to
  free object storage (e.g. Supabase Storage) rather than local disk.
- **Custom domain:** Vercel gives you a free `*.vercel.app`; you can attach your
  own domain free (you only pay the registrar for the domain itself).
- **Keep backend awake:** a free cron (e.g. cron-job.org) pinging your Render URL
  every 10 min prevents the cold-start sleep during demo season.
- **Alternative hosts:** Railway, Fly.io, or Hugging Face Spaces (Docker) can
  host the backend if you outgrow Render's free tier.

---

### TL;DR

1. Make the frontend API URL an env var; slim `requirements.txt`.
2. Push to GitHub.
3. Backend → **Render** (free web service, set env vars + start command).
4. Frontend → **Vercel** (root = `frontend`, set `VITE_API_URL`).
5. For Gemini limits: **use a Flash model**, **pre-upload demo docs**, and
   **rotate keys from separate projects** — all free.

**Sources on Gemini free-tier limits:**
[Google AI — Rate limits](https://ai.google.dev/gemini-api/docs/rate-limits) ·
[Google AI — Pricing](https://ai.google.dev/gemini-api/docs/pricing) ·
[Gemini API Free Tier 2026 guide](https://pecollective.com/tools/gemini-free-tier-guide/) ·
[Why more keys don't add quota](https://blog.laozhang.ai/en/posts/gemini-api-free-tier)
