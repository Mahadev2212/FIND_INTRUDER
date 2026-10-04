"""
ChainTrace – incident report export tests (P2).
Owner: Bhanu Prasad
"""

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.db import MemoryStore


@pytest.fixture(scope="module")
def setup():
    main.store = MemoryStore()
    c = TestClient(main.app)
    aid = c.post("/api/simulate", json={"scenarios": ["S1", "S3"], "seed": 42}).json()["analysis_id"]
    return c, aid


def test_markdown_report_has_story_and_evidence(setup):
    c, aid = setup
    r = c.get(f"/api/analyses/{aid}/incidents/inc-1/report")
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/markdown")
    assert 'filename="chaintrace-inc-1.md"' in r.headers["content-disposition"]
    md = r.text
    assert md.startswith("# Incident inc-1: SSH compromise with persistence")
    assert "## Attack story" in md and "## Recommended response" in md
    assert "T1110.001" in md and "sysupdate" in md
    assert "auth.log:" in md and "Accepted password for deploy from 185.220.101.7" in md  # raw evidence lines
    assert "first 15 and last 5 shown" in md and "more line(s) omitted" in md  # 214-line brute force truncated


def test_json_report_matches_incident_detail(setup):
    c, aid = setup
    r = c.get(f"/api/analyses/{aid}/incidents/inc-2/report?format=json")
    assert r.status_code == 200 and "chaintrace-inc-2.json" in r.headers["content-disposition"]
    assert r.json() == c.get(f"/api/analyses/{aid}/incidents/inc-2").json()


def test_report_errors(setup):
    c, aid = setup
    assert c.get(f"/api/analyses/{aid}/incidents/inc-99/report").status_code == 404
    assert c.get(f"/api/analyses/{aid}/incidents/inc-1/report?format=pdf").status_code == 422
    assert c.get("/api/analyses/nope/incidents/inc-1/report").status_code == 404


def test_story_timestamps_match_the_moment_described(setup):
    """R4's evidence starts with earlier failures, but its story step is the login itself (02:41)."""
    c, aid = setup
    d = c.get(f"/api/analyses/{aid}/incidents/inc-1").json()
    login = next(s for s in d["story"] if s["stage"] == "Initial Access")
    assert login["ts"].startswith("2026-10-04T02:41") and "At 02:41" in login["text"]
    times = [s["ts"] for s in d["story"]]
    assert times == sorted(times)
