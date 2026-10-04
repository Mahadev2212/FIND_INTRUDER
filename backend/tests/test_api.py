"""
ChainTrace – API + persistence tests (T4, T5, T7, T18, T19 and the contract the frontend mocks use).
Postgres tests run only when TEST_DATABASE_URL is set (they create their own rows).
Owner: Bhanu Prasad
"""

import os

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.db import MemoryStore, PostgresStore, StorageUnavailable
from engine.pipeline import simulate

TEST_DB = os.getenv("TEST_DATABASE_URL")
needs_pg = pytest.mark.skipif(not TEST_DB, reason="set TEST_DATABASE_URL to run Postgres tests")


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(main, "store", MemoryStore())
    return TestClient(main.app)


@pytest.fixture(scope="module")
def sim_result():
    return simulate(["S1", "S2", "S3", "S4", "S5"], seed=42)


def _walk(c: TestClient, aid: str) -> dict:
    out = {"summary": c.get(f"/api/analyses/{aid}/summary").json(),
           "incidents": c.get(f"/api/analyses/{aid}/incidents").json(),
           "entities": c.get(f"/api/analyses/{aid}/entities").json(),
           "evaluation": c.get(f"/api/analyses/{aid}/evaluation").json()}
    out["details"] = [c.get(f"/api/analyses/{aid}/incidents/{i['id']}").json() for i in out["incidents"]]
    return out


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok", "db": "memory"}


def test_simulate_full_flow_matches_mock_contract(client):
    r = client.post("/api/simulate", json={"scenarios": ["S1", "S2", "S3", "S4", "S5"], "seed": 42})
    assert r.status_code == 200
    body = r.json()
    assert body["has_ground_truth"] is True
    assert set(body["stats"]) == {"lines_total", "parsed", "skipped", "events", "alerts", "incidents"}
    aid = body["analysis_id"]

    data = _walk(client, aid)
    s = data["summary"]
    for key in ("lines_total", "parsed", "skipped", "alerts", "incidents", "incidents_by_level",
                "events_over_time", "top_entities"):
        assert key in s
    assert len(s["top_entities"]) == 5

    incs = data["incidents"]
    assert len(incs) == 5 and "story" not in incs[0]
    assert incs == sorted(incs, key=lambda i: -i["risk_score"])

    d = data["details"][0]
    assert d["story"] and d["alerts"] and d["evidence"]
    for a in d["alerts"]:
        for eid in a["evidence_event_ids"]:
            assert d["evidence"][eid]["raw"]  # click-to-evidence works for every alert
    assert set(a["entity"]) == {"ip", "user"}

    ev = data["evaluation"]
    assert ev["scenarios_detected"] == 5 and ev["critical_false_positives"] == 0

    listing = client.get("/api/analyses").json()
    assert listing[0]["id"] == aid and listing[0]["source"] == "simulation"


def test_upload_flow(client):
    log = ("Oct  4 02:03:11 web01 sshd[1]: Failed password for root from 185.220.101.7 port 1 ssh2\n" * 12
           + "Oct  4 02:10:00 web01 sshd[2]: Accepted password for root from 185.220.101.7 port 2 ssh2\n")
    r = client.post("/api/analyze", files=[("files", ("auth.log", log.encode(), "text/plain"))])
    assert r.status_code == 200, r.text
    aid = r.json()["analysis_id"]
    assert r.json()["has_ground_truth"] is False
    assert client.get(f"/api/analyses/{aid}/incidents").json()[0]["level"] == "critical"
    assert client.get(f"/api/analyses/{aid}/evaluation").status_code == 404  # uploads have no ground truth


def test_t4_empty_file_is_400(client):
    r = client.post("/api/analyze", files=[("files", ("empty.log", b"", "text/plain"))])
    assert r.status_code == 400 and "no parsable lines" in r.json()["detail"].lower()


def test_t5_binary_file_is_rejected(client):
    png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + bytes(range(256))
    r = client.post("/api/analyze", files=[("files", ("cat.png", png, "image/png"))])
    assert r.status_code == 400 and "binary" in r.json()["detail"]


def test_t7_unknown_format_is_400_with_supported_formats(client):
    r = client.post("/api/analyze", files=[("files", ("x.txt", b"just some text\nnothing here\n", "text/plain"))])
    assert r.status_code == 400 and "Supported formats" in r.json()["detail"]


def test_unknown_ids_are_404(client):
    assert client.get("/api/analyses/nope/incidents").status_code == 404
    assert client.get("/api/analyses/nope/summary").status_code == 404


def test_bad_scenario_is_400(client):
    assert client.post("/api/simulate", json={"scenarios": ["S9"]}).status_code == 400


def test_t19_db_unreachable_returns_503(monkeypatch):
    monkeypatch.setattr(main, "store", PostgresStore("postgresql://nobody@127.0.0.1:1/none"))
    c = TestClient(main.app)
    r = c.post("/api/simulate", json={"scenarios": ["S1"], "seed": 42})
    assert r.status_code == 503 and r.json()["detail"] == "storage unavailable"
    assert c.get("/api/health").json()["db"] == "unavailable"
    assert c.get("/api/analyses").status_code == 503


# ─── PostgreSQL (T18, T19 no partial rows) ────────────────────────────────────

@needs_pg
def test_t18_reload_from_postgres_matches_memory(sim_result):
    pg = PostgresStore(TEST_DB)
    pg.ensure_schema()
    mem = MemoryStore()
    import uuid
    aid = str(uuid.uuid4())
    pg.save(aid, "simulation", sim_result)
    mem.save(aid, "simulation", sim_result)

    # A brand-new store object = a restarted backend.
    fresh = PostgresStore(TEST_DB)
    assert fresh.incidents(aid) == mem.incidents(aid)
    assert fresh.entities(aid) == mem.entities(aid)
    assert fresh.evaluation(aid) == mem.evaluation(aid)
    assert fresh.summary(aid) == mem.summary(aid)
    for inc in mem.incidents(aid):
        assert fresh.incident_detail(aid, inc["id"]) == mem.incident_detail(aid, inc["id"])
    assert any(a["id"] == aid for a in fresh.list_analyses())


@needs_pg
def test_t19_failed_save_leaves_no_partial_rows(sim_result):
    import uuid
    pg = PostgresStore(TEST_DB)
    pg.ensure_schema()
    aid = str(uuid.uuid4())
    bad = sim_result.__class__(**{**sim_result.__dict__})
    bad.entities = list(sim_result.entities) + [sim_result.entities[0]]  # duplicate PK → fails at the last COPY
    with pytest.raises(Exception):
        pg.save(aid, "simulation", bad)
    assert not pg.exists(aid)
    rows = pg._query("SELECT count(*) FROM events WHERE analysis_id = %s", (aid,))
    assert rows[0][0] == 0


@needs_pg
def test_api_against_postgres(monkeypatch):
    pg = PostgresStore(TEST_DB)
    pg.ensure_schema()
    monkeypatch.setattr(main, "store", pg)
    c = TestClient(main.app)
    assert c.get("/api/health").json() == {"status": "ok", "db": "ok"}
    aid = c.post("/api/simulate", json={"scenarios": ["S1", "S3"], "seed": 42}).json()["analysis_id"]
    data = _walk(c, aid)
    assert data["evaluation"]["scenarios_detected"] == 2
    assert data["details"][0]["evidence"]


def test_t6_log_with_corrupted_nul_lines_is_analysed_not_rejected(client):
    """A crash can leave NUL bytes / junk in a log; bad lines are skipped, the rest analysed."""
    good = "Oct  4 02:03:11 web01 sshd[1]: Failed password for root from 185.220.101.7 port 1 ssh2\n"
    junk = "\x00\x00\x01\x02 binary junk \xff\n".encode("latin-1")
    data = b"".join(good.encode() + (junk if k % 5 == 0 else b"") for k in range(40))
    r = client.post("/api/analyze", files=[("files", ("messy_auth.log", data, "text/plain"))])
    assert r.status_code == 200, r.text
    stats = r.json()["stats"]
    assert stats["parsed"] == 40 and stats["skipped"] == 8 and stats["incidents"] == 1


def test_real_binaries_still_rejected(client):
    for name, blob in [("a.png", b"\x89PNG\r\n\x1a\n" + b"x" * 50), ("a.zip", b"PK\x03\x04" + b"x" * 50),
                       ("a.gz", b"\x1f\x8b\x08" + b"x" * 50), ("raw.bin", bytes(range(32)) * 20)]:
        r = client.post("/api/analyze", files=[("files", (name, blob, "application/octet-stream"))])
        assert r.status_code == 400 and "binary" in r.json()["detail"], name
