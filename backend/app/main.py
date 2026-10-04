"""
ChainTrace – FastAPI Application
Serves REST API endpoints and React frontend build.
Owner: Bhanu Prasad
"""

import os
import sys
import uuid
import json
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn

# Add backend and workspace root to path for engine and simulator imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app.schemas import AnalysisStats, SimulateRequest, AnalysisResponse
from app.db import get_analysis, list_analyses, save_analysis
from engine.parsers import auto_detect_and_parse
from engine.rules import run_all_rules
from engine.baseline import build_baseline
from engine.scoring import score_entities
from engine.correlate import correlate_alerts
from engine.story import generate_stories
from engine.evaluate import evaluate

app = FastAPI(title="ChainTrace", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _run_pipeline(
    raw_files: List[tuple],  # [(filename, content_str)]
    labels: Optional[dict] = None,
    source: str = "upload",
):
    """
    Core detection pipeline:
    1. Parse files + merge & sort events
    2. Build baseline
    3. Run rules R1-R11
    4. Score entities
    5. Correlate alerts into incidents
    6. Generate attack stories
    7. Evaluate if ground-truth labels exist
    """
    total_lines = 0
    total_skipped = 0
    all_events = []
    file_names = []

    for fname, content in raw_files:
        file_names.append(fname)
        total_lines += len(content.splitlines())
        events, skipped, _ = auto_detect_and_parse(content, fname)
        total_skipped += skipped
        all_events.extend(events)

    all_events.sort(key=lambda e: e.ts)

    # Build per-user baseline (first 25% of time window)
    baseline = build_baseline(all_events)

    # Run detection rules
    alerts = run_all_rules(all_events, baseline)

    # Score entities
    entities = score_entities(alerts)

    # Correlate into incidents
    incidents = correlate_alerts(alerts, all_events)

    # Generate stories & recommendations
    incidents = generate_stories(incidents, alerts)

    # Evaluate against ground truth if provided
    eval_metrics = None
    if labels:
        try:
            eval_metrics = evaluate(incidents, entities, labels)
        except Exception as e:
            print(f"[warning] Evaluation failed: {e}")

    stats = {
        "lines_total": total_lines,
        "parsed": len(all_events),
        "skipped": total_skipped,
        "events": len(all_events),
        "alerts": len(alerts),
        "incidents": len(incidents),
    }

    return stats, all_events, alerts, incidents, entities, eval_metrics, file_names


@app.on_event("startup")
async def startup_event():
    """Pre-load a default demo simulation analysis if simulator logs exist."""
    try:
        auth_path = os.path.join("..", "simulator", "combined_auth.log")
        access_path = os.path.join("..", "simulator", "combined_access.log")
        labels_path = os.path.join("..", "simulator", "labels.json")

        if os.path.exists(auth_path) and os.path.exists(access_path):
            with open(auth_path, "r", encoding="utf-8") as f:
                auth_data = f.read()
            with open(access_path, "r", encoding="utf-8") as f:
                access_data = f.read()
            labels = None
            if os.path.exists(labels_path):
                with open(labels_path, "r", encoding="utf-8") as f:
                    labels = json.load(f)

            stats, events, alerts, incidents, entities, eval_metrics, file_names = _run_pipeline(
                [("auth.log", auth_data), ("access.log", access_data)],
                labels=labels,
                source="simulation",
            )
            await save_analysis(
                analysis_id="demo-simulation",
                source="simulation",
                files=file_names,
                stats=stats,
                events=events,
                alerts=alerts,
                incidents=incidents,
                entities=entities,
                evaluation=eval_metrics,
                has_ground_truth=True,
            )
            print("[startup] Demo simulation loaded into analysis cache (ID: demo-simulation)")
    except Exception as e:
        print(f"[startup] Startup pre-load note: {e}")


@app.get("/api/health")
async def health():
    """Liveness check."""
    return {"status": "ok", "db": "ok", "version": "1.2.0"}


@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(files: List[UploadFile] = File(...)):
    """Upload 1+ log files (multipart) and run analysis pipeline."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    raw_files = []
    for f in files:
        raw_bytes = await f.read()
        content = raw_bytes.decode("utf-8", errors="replace")
        raw_files.append((f.filename, content))

    stats, events, alerts, incidents, entities, _, file_names = _run_pipeline(
        raw_files, labels=None, source="upload"
    )

    analysis_id = str(uuid.uuid4())[:8]
    await save_analysis(
        analysis_id=analysis_id,
        source="upload",
        files=file_names,
        stats=stats,
        events=events,
        alerts=alerts,
        incidents=incidents,
        entities=entities,
        evaluation=None,
        has_ground_truth=False,
    )

    return AnalysisResponse(
        analysis_id=analysis_id,
        stats=AnalysisStats(**stats),
        has_ground_truth=False,
    )


@app.post("/api/simulate", response_model=AnalysisResponse)
async def simulate(body: SimulateRequest):
    """Generate synthetic logs with chosen attack scenarios and analyse them."""
    import subprocess

    scenarios = body.scenarios or ["S1", "S2", "S3", "S4", "S5"]

    # Re-run attack injection
    sim_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "simulator"))
    auth_out = os.path.join(sim_dir, "combined_auth.log")
    access_out = os.path.join(sim_dir, "combined_access.log")
    labels_out = os.path.join(sim_dir, "labels.json")
    base_auth = os.path.join(sim_dir, "baseline_auth.log")
    base_access = os.path.join(sim_dir, "baseline_access.log")

    if not os.path.exists(base_auth) or not os.path.exists(base_access):
        from simulator.baseline import gen_auth_log, gen_access_log
        gen_auth_log(base_auth)
        gen_access_log(base_access)

    from simulator.attacks import inject_attacks
    inject_attacks(
        auth_input=base_auth,
        access_input=base_access,
        auth_output=auth_out,
        access_output=access_out,
        labels_output=labels_out,
        scenarios=scenarios,
    )

    with open(auth_out, "r", encoding="utf-8") as f:
        auth_content = f.read()
    with open(access_out, "r", encoding="utf-8") as f:
        access_content = f.read()
    with open(labels_out, "r", encoding="utf-8") as f:
        labels = json.load(f)

    stats, events, alerts, incidents, entities, eval_metrics, file_names = _run_pipeline(
        [("auth.log", auth_content), ("access.log", access_content)],
        labels=labels,
        source="simulation",
    )

    analysis_id = f"sim-{str(uuid.uuid4())[:6]}"
    await save_analysis(
        analysis_id=analysis_id,
        source="simulation",
        files=file_names,
        stats=stats,
        events=events,
        alerts=alerts,
        incidents=incidents,
        entities=entities,
        evaluation=eval_metrics,
        has_ground_truth=True,
    )

    return AnalysisResponse(
        analysis_id=analysis_id,
        stats=AnalysisStats(**stats),
        has_ground_truth=True,
    )


@app.get("/api/analyses")
async def list_all_analyses():
    """List previous analyses newest first."""
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
    """Incident list sorted by risk."""
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


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
