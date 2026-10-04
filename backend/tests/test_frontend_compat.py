"""
ChainTrace – fields the React dashboard (frontend/src/App.jsx) reads beyond the mock contract.
Owner: Bhanu Prasad
"""

from fastapi.testclient import TestClient

import app.main as main
from app.db import MemoryStore


def test_dashboard_fields_exist():
    main.store = MemoryStore()
    c = TestClient(main.app)
    aid = c.post("/api/simulate", json={"scenarios": ["S1"], "seed": 42}).json()["analysis_id"]

    s = c.get(f"/api/analyses/{aid}/summary").json()
    assert s["stats"]["parsed"] == s["parsed"] and s["stats"]["incidents"] == 1   # summary.stats.*
    assert {"hour", "time", "count"} <= set(s["events_over_time"][0])               # AreaChart dataKey="time"

    d = c.get(f"/api/analyses/{aid}/incidents/inc-1").json()
    lines = d["evidence_lines"]
    assert lines and all({"raw", "line_no", "file"} <= set(ev) for ev in lines)
    assert len({ev["id"] for ev in lines}) == len(lines) == len(d["evidence"])      # deduplicated, complete
