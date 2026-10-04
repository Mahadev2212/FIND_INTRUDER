"""
ChainTrace – Evaluation Module.
Computes precision and recall against ground-truth labels.json from the simulator.
Headline metric: scenarios detected N/5.
Owner: Bhanu Prasad
"""

from typing import List, Dict, Any
from app.schemas import Incident, Entity


def evaluate(
    incidents: List[Incident],
    entities: List[Entity],
    labels: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Compute precision/recall against ground-truth labels.json.
    
    labels.json structure:
    {
        "malicious_ips": ["185.220.101.7", ...],
        "malicious_users": ["sysupdate", ...],
        "scenarios": {
            "S1": {"ips": [...], "users": [...], "stages": [...]},
            ...
        }
    }
    
    Returns EvaluationMetrics-compatible dict.
    """
    malicious_ips = set(labels.get("malicious_ips", []))
    malicious_users = set(labels.get("malicious_users", []))
    scenarios = labels.get("scenarios", {})

    # Entity-level precision/recall
    detected_ips = {e.value for e in entities if e.type == "ip" and e.risk_score >= 30}
    detected_users = {e.value for e in entities if e.type == "user" and e.risk_score >= 30}

    true_positives = len(detected_ips & malicious_ips) + len(detected_users & malicious_users)
    false_positives = len(detected_ips - malicious_ips) + len(detected_users - malicious_users)
    false_negatives = len(malicious_ips - detected_ips) + len(malicious_users - detected_users)

    precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
    recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0

    # Per-scenario detection
    per_scenario = []
    detected_count = 0
    for scenario_id, scenario_labels in scenarios.items():
        expected_ips = set(scenario_labels.get("ips", []))
        expected_users = set(scenario_labels.get("users", []))
        found_ips = expected_ips & detected_ips
        found_users = expected_users & detected_users
        detected = bool(found_ips or found_users)
        if detected:
            detected_count += 1
        per_scenario.append({
            "scenario_id": scenario_id,
            "detected": detected,
            "expected_entities": list(expected_ips | expected_users),
            "found_entities": list(found_ips | found_users),
        })

    # Critical false positives: high/critical risk entities that are benign
    critical_fps = sum(
        1 for e in entities
        if e.risk_score >= 60
        and e.value not in malicious_ips
        and e.value not in malicious_users
    )

    return {
        "scenarios_detected": detected_count,
        "scenarios_total": len(scenarios),
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "critical_false_positives": critical_fps,
        "per_scenario": per_scenario,
    }
