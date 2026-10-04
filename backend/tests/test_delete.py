"""
ChainTrace – C5: DELETE /api/analyses/{id}, retention (keep newest N) and invalid-id handling.
Postgres variants run only when TEST_DATABASE_URL is set.
Owner: Bhanu Prasad
"""

import os

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.db import MemoryStore, PostgresStore
from engine.config import CFG

TEST_DB = os.getenv("TEST_DATABASE_URL")
STORES = ["memory"] + (["postgres"] if TEST_DB else [])


def _store(kind):
    if kind == "memory":
        return MemoryStore()
    pg = PostgresStore(TEST_DB)
    pg.ensure_schema()
    return pg


@pytest.fixture(params=STORES)
def client(request, monkeypatch):
    monkeypatch.setattr(main, "store", _store(request.param))
    return TestClient(main.app)


def _upload(c):
    log = "Oct  4 02:03:11 web01 sshd[1]: Failed password for root from 185.220.101.7 port 1 ssh2\n" * 12
    r = c.post("/api/analyze", files=[("files", ("auth.log", log.encode(), "text/plain"))])
    assert r.status_code == 200
    return r.json()["analysis_id"]


def test_delete_removes_analysis_and_children(client):
    aid = _upload(client)
    assert client.get(f"/api/analyses/{aid}/incidents").status_code == 200
    assert client.delete(f"/api/analyses/{aid}").status_code == 204
    assert client.get(f"/api/analyses/{aid}/incidents").status_code == 404
    assert client.get(f"/api/analyses/{aid}/incidents/inc-1").status_code == 404
    assert all(a["id"] != aid for a in client.get("/api/analyses").json())
    assert client.delete(f"/api/analyses/{aid}").status_code == 404  # second delete


def test_invalid_ids_are_404_not_500(client):
    for path in ["/api/analyses/nope/summary", "/api/analyses/nope/incidents", "/api/analyses/nope/incidents/inc-1",
                 "/api/analyses/nope/incidents/inc-1/report", "/api/analyses/nope/entities",
                 "/api/analyses/nope/evaluation"]:
        assert client.get(path).status_code == 404, path
    assert client.delete("/api/analyses/nope").status_code == 404


def test_retention_keeps_only_newest(client, monkeypatch):
    monkeypatch.setitem(CFG, "storage", {"max_analyses": 2})
    ids = [_upload(client) for _ in range(3)]
    assert client.get(f"/api/analyses/{ids[0]}/summary").status_code == 404   # oldest pruned
    assert client.get(f"/api/analyses/{ids[1]}/summary").status_code == 200
    assert client.get(f"/api/analyses/{ids[2]}/summary").status_code == 200
    if isinstance(main.store, PostgresStore):  # cascade really removed the child rows
        rows = main.store._query("SELECT count(*) FROM events WHERE analysis_id = %s", (ids[0],))
        assert rows[0][0] == 0
