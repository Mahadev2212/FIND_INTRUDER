"""
ChainTrace – Risk Scoring.
Entity score = sum(alert points) × chain multiplier, capped at 100.
Chain multiplier: 1 stage ×1.0 | 2 stages ×1.3 | 3+ stages ×1.6
Levels: 0–29 low | 30–59 medium | 60–79 high | 80–100 critical
Incident score uses the same formula over all its alerts.
Repeats of the same rule count at most `rule_repeat_cap` times (config), so different weak signals
add up but one signal repeated 50 times (e.g. a night-shift user's off-hours logins) can't reach critical.
Owner: Bhanu Prasad
"""

from collections import Counter
from typing import Dict, Iterable, List, Tuple

from app.schemas import Alert, Entity, EntityType, RiskLevel
from engine.config import T


def multiplier(stage_count: int) -> float:
    if stage_count >= 3:
        return 1.6
    if stage_count == 2:
        return 1.3
    return 1.0


def level(score: int) -> RiskLevel:
    if score >= 80:
        return RiskLevel.CRITICAL
    if score >= 60:
        return RiskLevel.HIGH
    if score >= 30:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def risk_score(alerts: Iterable[Alert]) -> int:
    alerts = list(alerts)
    seen: Counter = Counter()
    points = 0
    for a in alerts:
        seen[a.rule_id] += 1
        if seen[a.rule_id] <= T["rule_repeat_cap"]:
            points += a.points
    return min(100, int(round(points * multiplier(len({a.stage for a in alerts})))))


def score_entities(alerts: List[Alert]) -> List[Entity]:
    """Risk score for each IP and user. Sorted by risk desc, then type/value for determinism."""
    by_entity: Dict[Tuple[EntityType, str], List[Alert]] = {}
    for a in alerts:
        if a.entity.get("ip"):
            by_entity.setdefault((EntityType.IP, a.entity["ip"]), []).append(a)
        if a.entity.get("user"):
            by_entity.setdefault((EntityType.USER, a.entity["user"]), []).append(a)

    entities = []
    for (etype, value), ents in by_entity.items():
        score = risk_score(ents)
        entities.append(Entity(
            type=etype, value=value, risk_score=score, level=level(score), alert_count=len(ents),
            first_seen=min(a.first_seen for a in ents), last_seen=max(a.last_seen for a in ents),
        ))
    return sorted(entities, key=lambda e: (-e.risk_score, e.type.value, e.value))
