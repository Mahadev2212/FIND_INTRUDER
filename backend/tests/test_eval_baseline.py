"""
ChainTrace – C4: critical false positives measured on baseline-only data (PRD definition).
Owner: Bhanu Prasad
"""

from app.schemas import IncidentEntities, Incident, RiskLevel
from engine.evaluate import evaluate
from engine.pipeline import simulate


def test_simulation_reports_baseline_only_false_positives():
    ev = simulate(["S1", "S2", "S3", "S4", "S5"], 42).evaluation
    assert ev["critical_false_positives_source"] == "baseline_only"
    assert ev["critical_false_positives"] == 0
    assert ev["baseline_only"]["by_level"]["critical"] == 0
    assert ev["baseline_only"]["by_level"]["high"] <= 1
    assert ev["scenarios_detected"] == 5  # running the clean pass doesn't change detection


def test_baseline_only_simulation_still_works():
    r = simulate([], 42)
    assert r.evaluation["scenarios_total"] == 0
    assert r.evaluation["critical_false_positives"] == 0


def _inc(level, ips):
    from datetime import datetime, timezone
    t = datetime(2026, 10, 4, tzinfo=timezone.utc)
    return Incident(id="inc-1", title="x", risk_score=90, level=level, entities=IncidentEntities(ips=ips),
                    start=t, end=t, stages=[], alert_ids=["a1"], summary="", recommendation="", story=[])


def test_critical_on_clean_data_counts_as_false_positive():
    labels = {"malicious_ips": ["6.6.6.6"], "malicious_users": [], "scenarios": {}}
    ev = evaluate([_inc(RiskLevel.CRITICAL, ["6.6.6.6"])], labels,
                  baseline_incidents=[_inc(RiskLevel.CRITICAL, ["10.0.1.5"])])
    assert ev["critical_false_positives"] == 1 and ev["critical_false_positives_in_attack_run"] == 0


def test_without_baseline_falls_back_to_attack_run():
    labels = {"malicious_ips": ["6.6.6.6"], "malicious_users": [], "scenarios": {}}
    ev = evaluate([_inc(RiskLevel.CRITICAL, ["10.0.1.5"])], labels)
    assert ev["critical_false_positives_source"] == "attack_run" and ev["critical_false_positives"] == 1
    assert ev["baseline_only"] is None
