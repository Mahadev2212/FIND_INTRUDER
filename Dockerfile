# ChainTrace – one service: FastAPI API + React build, talking to one PostgreSQL (DATABASE_URL).
# Build: docker build -t chaintrace .      Run: docker run -p 8000:8000 -e DATABASE_URL=... chaintrace

# ── 1. Frontend build (skipped gracefully until frontend/package.json exists) ──
FROM node:20-slim AS frontend
WORKDIR /frontend
COPY frontend/ ./
RUN if [ -f package.json ]; then \
        (npm ci || npm install) && npm run build; \
    else \
        echo "frontend/package.json not found - API only" && mkdir -p dist; \
    fi

# ── 2. Backend ──
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PORT=8000
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend/ backend/
COPY simulator/ simulator/
COPY --from=frontend /frontend/dist frontend/dist
RUN chmod +x backend/start.sh
WORKDIR /app/backend
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s CMD python -c "import urllib.request,os; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\",\"8000\")}/api/health')"
CMD ["./start.sh"]
