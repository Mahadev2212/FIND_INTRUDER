"""
ChainTrace – Correlation Engine.
Alerts become graph nodes. Linked if they share an IP, a user or (for R3) a /24 subnet
and are within 2 hours of each other.
IP→user pivot: if IP X has an alert and user U logged in successfully from X, alerts on U
after that login are linked to X's alerts.
Union-find over the links; each connected component is one incident. Only alerts are nodes,
so normal events never merge incidents.
Owner: Bhanu Prasad
"""

from collections import defaultdict
from datetime import timedelta
from typing import Dict, List

from app.schemas import Alert, Event, EventType, Incident, IncidentEntities
from engine.config import T
from engine.rules import subnet_of
from engine.scoring import level, risk_score
from engine.story import STAGE_ORDER


class UnionFind:
    def __init__(self, n: int):
        self.parent = list(range(n))

    def find(self, x: int) -> int:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]
            x = self.parent[x]
        return x

    def union(self, x: int, y: int) -> None:
        px, py = self.find(x), self.find(y)
        if px != py:
            self.parent[max(px, py)] = min(px, py)


def _gap(a: Alert, b: Alert) -> timedelta:
    """Time between two alerts' intervals (0 if they overlap)."""
    return max(timedelta(0), b.first_seen - a.last_seen, a.first_seen - b.last_seen)


def correlate_alerts(alerts: List[Alert], events: List[Event]) -> List[Incident]:
    """Group alerts into incidents. Returns incidents sorted by risk (desc) with IDs inc-1, inc-2, …"""
    if not alerts:
        return []
    window = timedelta(hours=T["correlation_window_hours"])

    n = len(alerts)
    uf = UnionFind(n)

    # 1) Shared IP / user / subnet (R3 ↔ R3 only) within the window. For each key, sort its alerts by start time
    #    and sweep: an alert joins the running cluster if it starts within `window` of the cluster's
    #    latest end. O(n log n) instead of comparing every pair.
    groups: Dict[tuple, List[int]] = defaultdict(list)
    for idx, a in enumerate(alerts):
        if a.entity.get("ip"):
            groups[("ip", a.entity["ip"])].append(idx)
            if a.rule_id == "R3":
                groups[("subnet", subnet_of(a.entity["ip"]))].append(idx)
        if a.entity.get("user"):
            groups[("user", a.entity["user"])].append(idx)

    for members in groups.values():
        members.sort(key=lambda k: alerts[k].first_seen)
        head, cluster_end = members[0], alerts[members[0]].last_seen
        for k in members[1:]:
            a = alerts[k]
            if a.first_seen - cluster_end <= window:
                uf.union(head, k)
                cluster_end = max(cluster_end, a.last_seen)
            else:
                head, cluster_end = k, a.last_seen

    # 2) IP→user pivot: user U logged in successfully from IP X (which has alerts) → alerts on U
    #    starting after that login are linked to X's alerts (within the window).
    by_ip: Dict[str, List[int]] = defaultdict(list)
    by_user: Dict[str, List[int]] = defaultdict(list)
    for idx, a in enumerate(alerts):
        if a.entity.get("ip"):
            by_ip[a.entity["ip"]].append(idx)
        if a.entity.get("user"):
            by_user[a.entity["user"]].append(idx)
    first_login: Dict[tuple, object] = {}  # (ip, user) → earliest successful login
    for e in events:
        if e.type == EventType.SSH_SUCCESS and e.src_ip in by_ip and e.user in by_user:
            first_login.setdefault((e.src_ip, e.user), e.ts)
    for (ip, user), login_ts in first_login.items():
        for u in by_user[user]:
            if alerts[u].first_seen < login_ts:
                continue
            for x in by_ip[ip]:
                if _gap(alerts[x], alerts[u]) <= window:
                    uf.union(x, u)

    components: Dict[int, List[Alert]] = defaultdict(list)
    for i, a in enumerate(alerts):
        components[uf.find(i)].append(a)

    incidents = []
    for comp in components.values():
        comp.sort(key=lambda a: a.first_seen)
        score = risk_score(comp)
        present = {a.stage for a in comp}
        incidents.append(Incident(
            id="",
            title="", summary="", recommendation="", story=[],  # filled by story generator
            risk_score=score,
            level=level(score),
            entities=IncidentEntities(
                ips=sorted({a.entity["ip"] for a in comp if a.entity.get("ip")}),
                users=sorted({a.entity["user"] for a in comp if a.entity.get("user")}),
            ),
            start=comp[0].first_seen,
            end=max(a.last_seen for a in comp),
            stages=[s for s in STAGE_ORDER if s in present],
            alert_ids=[a.id for a in comp],
        ))

    incidents.sort(key=lambda i: (-i.risk_score, i.start, i.alert_ids[0]))
    for k, inc in enumerate(incidents, start=1):
        inc.id = f"inc-{k}"
    return incidents
