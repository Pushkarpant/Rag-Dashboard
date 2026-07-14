# syntax=docker/dockerfile:1
#
# Verity — single-image build (works on any Docker host: Render, Railway, a VPS…).
# Stage 1 builds the React/Vite SPA. Stage 2 runs the FastAPI backend and serves
# that build from backend/static, so the whole app is ONE origin / ONE container.

# ── Stage 1: build the frontend ──────────────────────────────────────────────
FROM node:20-slim AS frontend
WORKDIR /app/frontend

# Install deps first (cached until package files change).
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Build. VITE_API_BASE is intentionally empty → the SPA calls the API by
# relative URL (same origin as this container). See frontend/src/services/api.ts.
COPY frontend/ ./
ENV VITE_API_BASE=""
RUN npm run build          # outputs to frontend/dist

# ── Stage 2: python runtime ──────────────────────────────────────────────────
FROM python:3.13-slim AS runtime

# Faster, quieter, unbuffered Python; no .pyc clutter in the image.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install the slim production dependency set (no torch/transformers — see
# requirements-deploy.txt for why). Copied alone so the layer caches until deps
# change, not on every source edit.
COPY requirements-deploy.txt ./
RUN pip install --no-cache-dir -r requirements-deploy.txt

# App code. `backend` is imported as a package (uvicorn backend.main:app), so it
# must keep its directory name.
COPY backend/ ./backend/

# Drop the compiled SPA where main.py looks for it (backend/static).
COPY --from=frontend /app/frontend/dist ./backend/static

# Default port for local `docker run`. In production the host (Render, Railway…)
# injects its own $PORT, which the CMD below honours.
ENV PORT=8080
EXPOSE 8080

# Bind to $PORT so managed hosts that assign a dynamic port (Render) route traffic
# correctly; falls back to 8080 locally. Shell form so ${PORT} is expanded.
# One worker: the app holds module-level clients (Pinecone, Groq) and does
# blocking work off-thread; scale out with more containers, not in-process workers.
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8080}
