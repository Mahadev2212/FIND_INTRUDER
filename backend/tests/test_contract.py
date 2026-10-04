"""
ChainTrace – Frontend Contract Tests (A4).
Validates that every key present in the frontend mocks exists in the real API responses
with the same JSON type (recursively, comparing first element for lists).
Extra keys in the real response are allowed; missing keys are flagged.

Run:  cd backend && venv\\Scripts\\python -m pytest tests/test_contract.py -v
Owner: Antigravity (Round 2, Task A4)
"""

import json
import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure imports resolve from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.main as _main
from app.db import MemoryStore

# ── Paths ─────────────────────────────────────────────────────────────────────

MOCKS_DIR = (
    Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "mocks"
)


def _load_mock(name: str):
    return json.loads((MOCKS_DIR / name).read_text(encoding="utf-8"))


# ── Fixtures ──────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def client_and_aid():
    """
    Spin up a fresh in-memory client, POST /api/simulate, and return
    (TestClient, analysis_id) for all contract tests.
    """
    import app.main as main_mod
    # Replace the module-level store with a clean MemoryStore
    original_store = main_mod.store
    main_mod.store = MemoryStore()
    client = TestClient(main_mod.app)
    r = client.post(
        "/api/simulate",
        json={"scenarios": ["S1", "S2", "S3", "S4", "S5"], "seed": 42},
    )
    assert r.status_code == 200, f"POST /api/simulate failed: {r.text}"
    aid = r.json()["analysis_id"]
    yield client, aid
    main_mod.store = original_store


# ── Type-checking helpers ─────────────────────────────────────────────────────


def _type_name(v) -> str:
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, int):
        return "int"
    if isinstance(v, float):
        return "float"
    if isinstance(v, str):
        return "str"
    if isinstance(v, list):
        return "list"
    if isinstance(v, dict):
        return "dict"
    if v is None:
        return "null"
    return type(v).__name__


def _compatible_types(mock_val, real_val) -> bool:
    """
    Returns True if real_val is type-compatible with mock_val.
    None in mock means the field exists but is nullable → any type is fine.
    int and float are considered compatible with each other (both JSON numbers).
    bool is a subtype of int in Python, but we treat them separately.
    """
    if mock_val is None:
        return True  # nullable field: real can be anything
    mt, rt = _type_name(mock_val), _type_name(real_val)
    if mt == rt:
        return True
    # JSON numbers: int ↔ float are both "number"
    if mt in ("int", "float") and rt in ("int", "float"):
        return True
    return False


_DYNAMIC_KEY_FIELDS = {"evidence"}
"""
Fields whose dicts use dynamic keys (event-ID strings like 'auth.log:1') that
can't be matched literally against the real run. For these we only check that:
  (a) the real value is a dict, and
  (b) the value shape of the first real entry matches the first mock entry.
"""


def check_contract(mock, real, path: str = "", _field_name: str = "") -> list:
    """
    Recursively walk *mock* and verify every key exists in *real* with the
    same JSON type. For lists, compare the first element only (shape check).

    Special case – dynamic-keyed dicts (e.g. 'evidence'):
    The mock uses literal event-ID keys ('auth.log:1') that won't match the
    real run's IDs. For these we verify only the VALUE shape of one entry.
    Returns a list of issue strings (empty → contract satisfied).
    """
    issues = []

    if isinstance(mock, dict):
        if not isinstance(real, dict):
            issues.append(f"{path}: expected dict, got {_type_name(real)}")
            return issues

        # Dynamic-keyed dict: just check value shape of first entry
        if _field_name in _DYNAMIC_KEY_FIELDS:
            if mock and real:
                mock_sample = next(iter(mock.values()))
                real_sample = next(iter(real.values()))
                issues.extend(check_contract(mock_sample, real_sample,
                                             f"{path}[<any key>]"))
            return issues

        for key, mock_val in mock.items():
            p = f"{path}.{key}" if path else key
            if key not in real:
                issues.append(f"MISSING key '{p}'")
                continue
            real_val = real[key]
            if not _compatible_types(mock_val, real_val):
                issues.append(
                    f"TYPE MISMATCH '{p}': mock={_type_name(mock_val)}, "
                    f"real={_type_name(real_val)}"
                )
            elif isinstance(mock_val, (dict, list)) and real_val is not None:
                issues.extend(check_contract(mock_val, real_val, p,
                                             _field_name=key))

    elif isinstance(mock, list):
        if not isinstance(real, list):
            issues.append(f"{path}: expected list, got {_type_name(real)}")
            return issues
        if mock and real:
            issues.extend(check_contract(mock[0], real[0], f"{path}[0]"))

    return issues


# ── Contract tests ─────────────────────────────────────────────────────────────


def test_simulate_response_contract(client_and_aid):
    """POST /api/simulate → compare with analyze_response.json"""
    client, aid = client_and_aid
    r = client.post(
        "/api/simulate",
        json={"scenarios": ["S1", "S2", "S3", "S4", "S5"], "seed": 42},
    )
    assert r.status_code == 200
    real = r.json()
    mock = _load_mock("analyze_response.json")
    # The real response uses 'analysis_id' instead of mock's hypothetical key name
    # Map mock key 'analysis_id' → real key 'analysis_id'
    issues = check_contract(mock, real)
    assert not issues, (
        "POST /api/simulate contract failures:\n" + "\n".join(issues)
    )


def test_summary_contract(client_and_aid):
    """GET /api/analyses/{id}/summary → compare with summary.json"""
    client, aid = client_and_aid
    real = client.get(f"/api/analyses/{aid}/summary").json()
    mock = _load_mock("summary.json")
    issues = check_contract(mock, real)
    assert not issues, (
        "GET /summary contract failures:\n" + "\n".join(issues)
    )


def test_incidents_contract(client_and_aid):
    """GET /api/analyses/{id}/incidents → compare with incidents.json"""
    client, aid = client_and_aid
    real = client.get(f"/api/analyses/{aid}/incidents").json()
    mock = _load_mock("incidents.json")
    assert isinstance(real, list), f"Expected list, got {type(real)}"
    assert len(real) > 0, "No incidents returned"
    issues = check_contract(mock, real)
    assert not issues, (
        "GET /incidents contract failures:\n" + "\n".join(issues)
    )


def test_incident_detail_contract(client_and_aid):
    """GET /api/analyses/{id}/incidents/{iid} → compare with incident_detail.json"""
    client, aid = client_and_aid
    incidents = client.get(f"/api/analyses/{aid}/incidents").json()
    assert incidents, "No incidents to test"
    first_id = incidents[0]["id"]
    real = client.get(f"/api/analyses/{aid}/incidents/{first_id}").json()
    mock = _load_mock("incident_detail.json")
    issues = check_contract(mock, real)
    assert not issues, (
        "GET /incidents/{iid} contract failures:\n" + "\n".join(issues)
    )


def test_entities_contract(client_and_aid):
    """GET /api/analyses/{id}/entities → compare with entities.json"""
    client, aid = client_and_aid
    real = client.get(f"/api/analyses/{aid}/entities").json()
    mock = _load_mock("entities.json")
    assert isinstance(real, list), f"Expected list, got {type(real)}"
    assert len(real) > 0, "No entities returned"
    issues = check_contract(mock, real)
    assert not issues, (
        "GET /entities contract failures:\n" + "\n".join(issues)
    )


def test_evaluation_contract(client_and_aid):
    """GET /api/analyses/{id}/evaluation → compare with evaluation.json"""
    client, aid = client_and_aid
    real = client.get(f"/api/analyses/{aid}/evaluation").json()
    mock = _load_mock("evaluation.json")
    issues = check_contract(mock, real)
    assert not issues, (
        "GET /evaluation contract failures:\n" + "\n".join(issues)
    )


def test_analyses_list_contract(client_and_aid):
    """GET /api/analyses → compare with analyses_list.json"""
    client, aid = client_and_aid
    real = client.get("/api/analyses").json()
    mock = _load_mock("analyses_list.json")
    # Mock is an empty list []; the real response has entries.
    # Contract: real is a list. If mock is non-empty, check first element shape.
    assert isinstance(real, list), f"GET /api/analyses: expected list, got {type(real)}"
    # The mock is [] (empty), so no element shape to check – just verify it's a list.
    # We do a structural check on the real response to document its shape.
    if real:
        first = real[0]
        required_keys = {"id", "created_at", "source", "stats", "has_ground_truth"}
        missing = required_keys - set(first.keys())
        assert not missing, f"GET /api/analyses: missing keys in list element: {missing}"


# ── Extra: collect value-format observations (non-failing) ─────────────────────


def test_incident_id_format_observation(client_and_aid):
    """
    Document incident ID format difference:
    mock uses 'inc-001' (zero-padded 3 digits), real uses 'inc-1' (no padding).
    This test always passes – it's an observation for Mahadev.
    """
    client, aid = client_and_aid
    real_incidents = client.get(f"/api/analyses/{aid}/incidents").json()
    real_ids = [i["id"] for i in real_incidents]
    # Real format check: expect 'inc-N' pattern (not zero-padded)
    import re
    for iid in real_ids:
        assert re.match(r"^inc-\d+$", iid), (
            f"Incident ID '{iid}' doesn't match 'inc-N' pattern. "
            "If frontend hardcodes 'inc-001' format, it must be updated."
        )


def test_timestamp_format_observation(client_and_aid):
    """
    Document timestamp format: real API returns ISO-8601 with 'Z' suffix (UTC).
    Mock also uses Z-suffixed timestamps. This test verifies consistency.
    """
    client, aid = client_and_aid
    real = client.get(f"/api/analyses/{aid}/summary").json()
    import re
    ts_pattern = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$")
    for entry in real.get("events_over_time", []):
        assert ts_pattern.match(entry["hour"]), (
            f"Timestamp '{entry['hour']}' doesn't match ISO-8601/Z format."
        )


def test_evaluation_extra_keys_observation(client_and_aid):
    """
    Document that per_scenario items in the real response contain EXTRA keys
    vs the mock: 'incident_id', 'expected_stages', 'found_stages'.
    These are bonus data the frontend could use.
    This test always passes – it documents the difference.
    """
    client, aid = client_and_aid
    real = client.get(f"/api/analyses/{aid}/evaluation").json()
    mock = _load_mock("evaluation.json")
    if real.get("per_scenario") and mock.get("per_scenario"):
        real_keys = set(real["per_scenario"][0].keys())
        mock_keys = set(mock["per_scenario"][0].keys())
        extra_in_real = real_keys - mock_keys
        # Extra keys are fine – just document them
        # (assertion-free observation stored for the report)
        _ = extra_in_real  # keys like 'incident_id', 'expected_stages', 'found_stages'
