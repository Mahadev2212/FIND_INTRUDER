"""
ChainTrace – Evaluation Module.
Computes precision and recall against ground-truth labels.json from the simulator.
Headline metric: scenarios detected N/5.
An entity counts as "flagged" when it appears in an incident with risk >= evaluation_min_incident_risk.
Critical false positives follow the PRD definition: critical incidents on baseline-only data (the same
normal traffic, same seed, no attacks injected). If no baseline run is given, it falls back to critical
incidents in this run that involve no malicious entity.
Owner: Bhanu Prasad
"""

from typing import Any, Dict, List, Optional

from collections import Counter

from app.schemas import Incident, RiskLevel
from engine.config import T


def evaluate(incidents: List[Incident], labels: Dict[str, Any],
             baseline_incidents: Optional[List[Incident]] = None) -> Dict[str, Any]:
    """
    labels.json structure:
    {
        "malicious_ips": [...], "malicious_users": [...],
        "scenarios": {"S1": {"ips": [...], "users": [...], "stages": [...]}, ...}
    }
    Returns an EvaluationMetrics-compatible dict.
    """
    malicious = set(labels.get("malicious_ips", [])) | set(labels.get("malicious_users", []))
    reported = [i for i in incidents if i.risk_score >= T["evaluation_min_incident_risk"]]
    flagged = {v for i in reported for v in i.entities.ips + i.entities.users}

    tp = len(flagged & malicious)
    fp = len(flagged - malicious)
    fn = len(malicious - flagged)
    precision = tp / (tp + fp) if tp + fp else (1.0 if not malicious else 0.0)
    recall = tp / (tp + fn) if tp + fn else 1.0

    per_scenario = []
    for sid, sc in sorted(labels.get("scenarios", {}).items()):
        expected = set(sc.get("ips", [])) | set(sc.get("users", []))
        best = max(reported, key=lambda i: len(expected & set(i.entities.ips + i.entities.users)), default=None)
        found = expected & set(best.entities.ips + best.entities.users) if best else set()
        per_scenario.append({
            "scenario_id": sid,
            "detected": bool(found),
            "expected_entities": sorted(expected),
            "found_entities": sorted(found),
            "incident_id": best.id if found else None,
            "expected_stages": sc.get("stages", []),
            "found_stages": [s.value for s in best.stages] if found else [],
        })

    in_run_fps = sum(
        1 for i in incidents
        if i.level == RiskLevel.CRITICAL and not (set(i.entities.ips + i.entities.users) & malicious)
    )
    baseline = None
    if baseline_incidents is not None:
        levels = Counter(i.level.value for i in baseline_incidents)
        baseline = {"incidents": len(baseline_incidents),
                    "by_level": {lvl: levels.get(lvl, 0) for lvl in ("critical", "high", "medium", "low")}}

    return {
        "scenarios_detected": sum(1 for s in per_scenario if s["detected"]),
        "scenarios_total": len(per_scenario),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "critical_false_positives": baseline["by_level"]["critical"] if baseline else in_run_fps,
        "critical_false_positives_source": "baseline_only" if baseline else "attack_run",
        "critical_false_positives_in_attack_run": in_run_fps,
        "baseline_only": baseline,
        "per_scenario": per_scenario,
    }
