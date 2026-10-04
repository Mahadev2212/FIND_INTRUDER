"""
ChainTrace – FastAPI Application
Serves REST API endpoints and React frontend build.
Owner: Bhanu Prasad
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from typing import List
import uvicorn

from app.schemas import AnalysisStats, SimulateRequest
from app.db import get_analysis, list_analyses, save_analysis
# from engine.parsers import parse_logs
# from engine.rules import run_rules
# from engine.baseline import build_baseline
# from engine.scoring import score_entities
# from engine.correlate import correlate_alerts
# from engine.story import generate_stories
# from engine.evaluate import evaluate

app = FastAPI(title="ChainTrace", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    """Liveness check including DB ping."""
    # TODO: ping DB
    return {"status": "ok", "db": "ok"}


@app.post("/api/analyze")
async def analyze(files: List[UploadFile] = File(...)):
    """Upload 1+ log files (multipart) and run analysis pipeline."""
    # TODO: Bhanu implements full pipeline
    # 1. Parse all uploaded files
    # 2. Normalize + sort by timestamp
    # 3. Build baseline
    # 4. Run detection rules R1-R11
    # 5. Score entities
    # 6. Correlate alerts into incidents
    # 7. Generate attack stories
    # 8. Save to PostgreSQL in one transaction
    raise HTTPException(status_code=501, detail="Not yet implemented")


@app.post("/api/simulate")
async def simulate(body: SimulateRequest):
    """Generate synthetic logs with chosen attack scenarios and analyse them."""
    # TODO: Bhanu implements
    raise HTTPException(status_code=501, detail="Not yet implemented")


@app.get("/api/analyses")
async def list_all_analyses():
    """List previous analyses newest first (enabled by PostgreSQL)."""
    return await list_analyses()


@app.get("/api/analyses/{analysis_id}/summary")
async def get_summary(analysis_id: str):
    """Overview cards + events-over-time histogram + top entities."""
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis.get("summary", {})


@app.get("/api/analyses/{analysis_id}/incidents")
async def get_incidents(analysis_id: str):
    """Incident list sorted by risk (without story)."""
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis.get("incidents", [])


@app.get("/api/analyses/{analysis_id}/incidents/{incident_id}")
async def get_incident_detail(analysis_id: str, incident_id: str):
    """Full incident with story, alerts, and evidence raw lines."""
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    incidents = analysis.get("incidents", [])
    for inc in incidents:
        if inc.get("id") == incident_id:
            return inc
    raise HTTPException(status_code=404, detail="Incident not found")


@app.get("/api/analyses/{analysis_id}/entities")
async def get_entities(analysis_id: str):
    """Risk-scored IPs and users."""
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return analysis.get("entities", [])


@app.get("/api/analyses/{analysis_id}/evaluation")
async def get_evaluation(analysis_id: str):
    """Precision/recall metrics (simulated runs only)."""
    analysis = await get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    evaluation = analysis.get("evaluation")
    if not evaluation:
        raise HTTPException(status_code=404, detail="No evaluation data (simulation only)")
    return evaluation


# Serve React frontend build in production
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="static")


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
