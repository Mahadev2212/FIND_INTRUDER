#!/bin/sh
# ChainTrace production start (Render / Railway / Docker). Hosts set $PORT.
# Tables are created on startup from db/schema.sql when DATABASE_URL is set.
set -e
cd "$(dirname "$0")"
exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WEB_CONCURRENCY:-1}" --proxy-headers
