"""
ChainTrace – FastAPI Application
Serves REST API endpoints and the React frontend build (one service, one URL).
Run: cd backend && uvicorn app.main:app --reload --port 8000
Owner: Bhanu Prasad
"""

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import List

import uvicorn
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse, Response

from app.db import StorageUnavailable, make_store
from app.schemas import AnalysisResponse, SimulateRequest
from engine.parsers import decode_upload
from engine.pipeline import run_analysis, simulate as run_simulation
from engine.report import incident_markdown

log = logging.getLogger("chaintrace")
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"

store = make_store()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log.warning("ChainTrace storage: %s", store.kind)
    if store.kind == "postgres":
        try:
            store.ensure_schema()  # schema.sql is idempotent (IF NOT EXISTS)
        except Exception as exc:  # DB down at boot must not stop the API; requests will return 503
            log.error("Could not apply schema.sql: %s", exc)
    yield


app = FastAPI(title="ChainTrace", version="1.2.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def _storage_error() -> HTTPException:
    return HTTPException(status_code=503, detail="storage unavailable")


def _save(source: str, result) -> dict:
    analysis_id = str(uuid.uuid4())
    try:
        store.save(analysis_id, source, result)
    except StorageUnavailable:
        raise _storage_error()
    return AnalysisResponse(analysis_id=analysis_id, stats=result.stats,
                            has_ground_truth=result.evaluation is not None).model_dump()


def _valid_id(analysis_id: str) -> str:
    """Analysis IDs are UUIDs; anything else is simply 'not found' (Postgres would raise a type error)."""
    try:
        uuid.UUID(analysis_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis_id


def _found(value, what: str = "Analysis"):
    if value is None:
        raise HTTPException(status_code=404, detail=f"{what} not found")
    return value


def _read(fn, *args):
    try:
        return fn(*args)
    except StorageUnavailable:
        raise _storage_error()


@app.get("/api/health")
def health():
    """Liveness check including DB ping."""
    try:
        db = store.ping()
    except StorageUnavailable:
        db = "unavailable"
    return {"status": "ok", "db": db}


@app.post("/api/analyze")
async def analyze(files: List[UploadFile] = File(...)):
    """Upload 1+ log files (multipart) and run the analysis pipeline."""
    contents = []
    for f in files:
        data = await f.read()
        if len(data) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"'{f.filename}' is larger than 50 MB")
        try:
            contents.append((f.filename or "upload.log", decode_upload(data, f.filename or "upload.log")))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc))
    try:
        result = run_analysis(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _save("upload", result)


@app.post("/api/simulate")
def simulate(body: SimulateRequest):
    """Generate baseline traffic + chosen attack scenarios, analyse them, keep ground truth."""
    try:
        result = run_simulation(body.scenarios, body.seed)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return _save("simulation", result)


@app.get("/api/analyses")
def list_all_analyses():
    """List previous analyses newest first."""
    return _read(store.list_analyses)


@app.delete("/api/analyses/{analysis_id}", status_code=204)
def delete_analysis(analysis_id: str):
    """Delete an analysis and all its events, alerts, incidents and entities."""
    _valid_id(analysis_id)
    if not _read(store.delete, analysis_id):
        raise HTTPException(status_code=404, detail="Analysis not found")
    return Response(status_code=204)


@app.get("/api/analyses/{analysis_id}/summary")
def get_summary(analysis_id: str):
    """Overview cards + events-over-time histogram + top entities."""
    _valid_id(analysis_id)
    return _found(_read(store.summary, analysis_id))


@app.get("/api/analyses/{analysis_id}/incidents")
def get_incidents(analysis_id: str):
    """Incident list sorted by risk (without story)."""
    _valid_id(analysis_id)
    return _found(_read(store.incidents, analysis_id))


@app.get("/api/analyses/{analysis_id}/incidents/{incident_id}")
def get_incident_detail(analysis_id: str, incident_id: str):
    """Full incident with story, alerts and evidence raw lines."""
    _valid_id(analysis_id)
    _found(_read(store.exists, analysis_id) or None)
    return _found(_read(store.incident_detail, analysis_id, incident_id), "Incident")


@app.get("/api/analyses/{analysis_id}/incidents/{incident_id}/report")
def get_incident_report(analysis_id: str, incident_id: str, format: str = Query("md", pattern="^(md|json)$")):
    """Downloadable incident report: Markdown (story, timeline, evidence) or the full JSON."""
    _valid_id(analysis_id)
    _found(_read(store.exists, analysis_id) or None)
    detail = _found(_read(store.incident_detail, analysis_id, incident_id), "Incident")
    filename = f"chaintrace-{incident_id}"
    if format == "json":
        return JSONResponse(detail, headers={"Content-Disposition": f'attachment; filename="{filename}.json"'})
    return Response(incident_markdown(analysis_id, detail), media_type="text/markdown; charset=utf-8",
                    headers={"Content-Disposition": f'attachment; filename="{filename}.md"'})


@app.get("/api/analyses/{analysis_id}/entities")
def get_entities(analysis_id: str):
    """Risk-scored IPs and users."""
    _valid_id(analysis_id)
    return _found(_read(store.entities, analysis_id))


@app.get("/api/analyses/{analysis_id}/evaluation")
def get_evaluation(analysis_id: str):
    """Precision/recall metrics (simulated runs only)."""
    _valid_id(analysis_id)
    _found(_read(store.exists, analysis_id) or None)
    evaluation = _read(store.evaluation, analysis_id)
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation data (only simulated runs have ground truth)")
    return evaluation


# ─── Frontend build (production): one service, one URL ────────────────────────
if (FRONTEND_DIST / "index.html").exists():
    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str):
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        file = (FRONTEND_DIST / path).resolve()
        if path and file.is_file() and FRONTEND_DIST.resolve() in file.parents:
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")  # client-side routes
else:
    @app.get("/", include_in_schema=False)
    def root():
        return RedirectResponse("/docs")  # no frontend build yet: show the API docs


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
