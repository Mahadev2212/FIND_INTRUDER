"""
ChainTrace – Risk Scoring.
Entity score = sum(alert points) × chain multiplier, capped at 100.
Chain multiplier: 1 stage ×1.0 | 2 stages ×1.3 | 3+ stages ×1.6
Levels: 0–29 low | 30–59 medium | 60–79 high | 80–100 critical
Owner: Bhanu Prasad
"""

from collections import defaultdict
from typing import List, Dict
from app.schemas import Alert, Entity, EntityType, RiskLevel
from datetime import datetime


CHAIN_MULTIPLIER = {1: 1.0, 2: 1.3}
CHAIN_MULTIPLIER_3PLUS = 1.6


def _multiplier(stage_count: int) -> float:
    return CHAIN_MULTIPLIER.get(stage_count, CHAIN_MULTIPLIER_3PLUS)


def _level(score: int) -> RiskLevel:
    if score >= 80:
        return RiskLevel.CRITICAL
    elif score >= 60:
        return RiskLevel.HIGH
    elif score >= 30:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def score_entities(alerts: List[Alert]) -> List[Entity]:
    """
    Compute risk score for each IP and user entity.
    Returns a list of Entity objects sorted by risk_score descending.
    """
    # Accumulate points per entity
    entity_data: Dict[tuple, dict] = defaultdict(lambda: {
        "points": 0,
        "stages": set(),
        "alert_count": 0,
        "first_seen": None,
        "last_seen": None,
    })

    for alert in alerts:
        # IP entity
        if alert.entity.get("ip"):
            key = (EntityType.IP, alert.entity["ip"])
            d = entity_data[key]
            d["points"] += alert.points
            d["stages"].add(alert.stage)
            d["alert_count"] += 1
            d["first_seen"] = min(d["first_seen"], alert.first_seen) if d["first_seen"] else alert.first_seen
            d["last_seen"] = max(d["last_seen"], alert.last_seen) if d["last_seen"] else alert.last_seen

        # User entity
        if alert.entity.get("user"):
            key = (EntityType.USER, alert.entity["user"])
            d = entity_data[key]
            d["points"] += alert.points
            d["stages"].add(alert.stage)
            d["alert_count"] += 1
            d["first_seen"] = min(d["first_seen"], alert.first_seen) if d["first_seen"] else alert.first_seen
            d["last_seen"] = max(d["last_seen"], alert.last_seen) if d["last_seen"] else alert.last_seen

    entities = []
    for (etype, evalue), d in entity_data.items():
        raw_score = d["points"] * _multiplier(len(d["stages"]))
        score = min(100, int(raw_score))
        entities.append(Entity(
            type=etype,
            value=evalue,
            risk_score=score,
            level=_level(score),
            alert_count=d["alert_count"],
            first_seen=d["first_seen"],
            last_seen=d["last_seen"],
        ))

    return sorted(entities, key=lambda e: e.risk_score, reverse=True)
