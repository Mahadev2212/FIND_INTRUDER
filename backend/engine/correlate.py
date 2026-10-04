"""
ChainTrace – Correlation Engine.
Alerts become graph nodes. Linked if they share IP, user, or /24 subnet within 2 hours.
IP→user pivot: a successful login links the attacking IP to everything that account does next.
Union-find over the links; each connected component is one incident.
Owner: Bhanu Prasad
"""

from collections import defaultdict
from datetime import timedelta
from typing import List, Dict, Optional, Set
from app.schemas import Alert, Incident, IncidentEntities, RiskLevel, KillChainStage
import uuid


CORRELATION_WINDOW = timedelta(hours=2)
CHAIN_MULTIPLIER = {1: 1.0, 2: 1.3}
CHAIN_MULTIPLIER_3PLUS = 1.6


# ─── Union-Find ───────────────────────────────────────────────────────────────
class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))
        self.rank = [0] * n

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x: int, y: int) -> None:
        px, py = self.find(x), self.find(y)
        if px == py:
            return
        if self.rank[px] < self.rank[py]:
            px, py = py, px
        self.parent[py] = px
        if self.rank[px] == self.rank[py]:
            self.rank[px] += 1


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


def _subnet24(ip: Optional[str]) -> Optional[str]:
    if not ip:
        return None
    parts = ip.split(".")
    if len(parts) == 4:
        return ".".join(parts[:3])
    return None


def correlate_alerts(alerts: List[Alert], events) -> List[Incident]:
    """
    Build incidents from alerts using union-find correlation.
    Returns a list of Incident objects sorted by risk_score descending.
    """
    if not alerts:
        return []

    n = len(alerts)
    uf = UnionFind(n)

    # Build IP→user pivot from SSH success events
    # { src_ip: [(login_ts, username)] }
    ip_user_pivot: Dict[str, List] = defaultdict(list)
    from app.schemas import EventType
    for e in events:
        if e.type == EventType.SSH_SUCCESS and e.src_ip and e.user:
            ip_user_pivot[e.src_ip].append((e.ts, e.user))

    def alerts_share_entity(a: Alert, b: Alert) -> bool:
        # same IP
        if a.entity.get("ip") and a.entity["ip"] == b.entity.get("ip"):
            return True
        # same user
        if a.entity.get("user") and a.entity["user"] == b.entity.get("user"):
            return True
        # same /24 subnet (for R3)
        if (_subnet24(a.entity.get("ip")) and
                _subnet24(a.entity.get("ip")) == _subnet24(b.entity.get("ip"))):
            return True
        return False

    def within_window(a: Alert, b: Alert) -> bool:
        overlap = abs((a.first_seen - b.first_seen).total_seconds())
        return timedelta(seconds=overlap) <= CORRELATION_WINDOW

    def alerts_linked_via_pivot(a: Alert, b: Alert) -> bool:
        """
        IP→user pivot: if IP X attacked and then user U logged in from X,
        link alerts on U to X's alerts.
        """
        ip = a.entity.get("ip")
        user_b = b.entity.get("user")
        if ip and user_b and ip in ip_user_pivot:
            for login_ts, username in ip_user_pivot[ip]:
                if username == user_b and b.first_seen >= login_ts:
                    return True
        ip = b.entity.get("ip")
        user_a = a.entity.get("user")
        if ip and user_a and ip in ip_user_pivot:
            for login_ts, username in ip_user_pivot[ip]:
                if username == user_a and a.first_seen >= login_ts:
                    return True
        return False

    # Link alerts
    for i in range(n):
        for j in range(i + 1, n):
            if within_window(alerts[i], alerts[j]):
                if alerts_share_entity(alerts[i], alerts[j]) or \
                        alerts_linked_via_pivot(alerts[i], alerts[j]):
                    uf.union(i, j)

    # Group into components
    components: Dict[int, List[int]] = defaultdict(list)
    for i in range(n):
        components[uf.find(i)].append(i)

    incidents = []
    for component_alerts_idx in components.values():
        component_alerts = [alerts[i] for i in component_alerts_idx]
        component_alerts.sort(key=lambda a: a.first_seen)

        ips = sorted({a.entity["ip"] for a in component_alerts if a.entity.get("ip")})
        users = sorted({a.entity["user"] for a in component_alerts if a.entity.get("user")})
        stages = list(dict.fromkeys(  # preserve order, deduplicate
            a.stage for a in component_alerts
        ))

        total_points = sum(a.points for a in component_alerts)
        raw_score = total_points * _multiplier(len(set(stages)))
        risk_score = min(100, int(raw_score))
        level = _level(risk_score)

        incidents.append(Incident(
            id=str(uuid.uuid4())[:8],
            title="",  # filled by story generator
            risk_score=risk_score,
            level=level,
            entities=IncidentEntities(ips=ips, users=users),
            start=component_alerts[0].first_seen,
            end=component_alerts[-1].last_seen,
            stages=stages,
            alert_ids=[a.id for a in component_alerts],
            summary="",        # filled by story generator
            recommendation="", # filled by story generator
            story=[],          # filled by story generator
        ))

    return sorted(incidents, key=lambda i: i.risk_score, reverse=True)
