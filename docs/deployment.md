# Deploying ChainTrace

One service (FastAPI serves the API **and** the React build) plus one PostgreSQL. Owner: Bhanu.

## Option A: Render Blueprint (recommended)
1. Push the branch to GitHub (already done for `bhanu-claude` / `bhanu`).
2. Render dashboard → **New → Blueprint** → select `Mahadev2212/FIND_INTRUDER` and the branch.
3. Render reads `render.yaml`: it creates `chaintrace` (Docker web service) and `chaintrace-db` (Postgres),
   and wires `DATABASE_URL` automatically.
4. Open `https://<service>.onrender.com/api/health` → `{"status":"ok","db":"ok"}`.

Tables are created on startup from `backend/db/schema.sql` (idempotent), so no manual `psql` step is needed.

## Option B: Any Docker host / Railway
```bash
docker build -t chaintrace .
docker run -p 8000:8000 -e DATABASE_URL="postgresql://user:pass@host:5432/chaintrace?sslmode=require" chaintrace
```
Managed Postgres (Neon / Supabase / Railway) works the same: only `DATABASE_URL` changes.

## Option C: Localhost fallback (venue Wi-Fi down)
```bash
cd backend
python -m venv venv && venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env     # set DATABASE_URL to local Postgres, or delete the line for in-memory mode
uvicorn app.main:app --port 8000
```
- With `DATABASE_URL` → PostgreSQL (history survives restarts).
- Without it → in-memory store (fine for a demo, lost on restart). `/api/health` shows `"db": "memory"`.
- Postgres configured but down → API returns **503 "storage unavailable"** (T19), the engine CLI still works:
  `python -m engine.pipeline --simulate`.

## Frontend build
The Dockerfile builds `frontend/` with Node 20 if `frontend/package.json` exists and copies `dist/` into the image.
Until Mahadev's app is in the repo the image is API-only and `/` redirects to `/docs`.
For local "one URL" testing: `cd frontend && npm run build`, then the backend serves `frontend/dist` automatically.

## What was verified (without Docker installed locally)
| Check | Result |
|---|---|
| Full test suite on Python 3.11 (image version) | 74 passed |
| `start.sh` with `$PORT` + empty Postgres → tables auto-created | ✓ |
| `/api/simulate` persisted to Postgres (5,890 events, 5 incidents) | ✓ |
| Restart backend → old analysis, story and evidence reload (T18) | ✓ |
| SPA serving: `/` and `/incidents/abc` → `index.html`; `/api/nope` → 404 | ✓ |
