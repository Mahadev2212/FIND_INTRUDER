"""
ChainTrace – Per-user baseline builder (for R5: off-hours, R6: new IP).
Pipeline order: parse → normalize → sort by timestamp → baseline → rules → correlation.
Baseline window = first 25% of the time range (not first 25% of lines), measured over
successful-login events, since those are what the baseline learns from.
Skip R5/R6 for users with fewer than 5 logins in the baseline (avoids false positives on rare users).
Owner: Bhanu Prasad
"""

from typing import Any, Dict, List

from app.schemas import Event, EventType
from engine.config import T


def build_baseline(events: List[Event]) -> Dict[str, Any]:
    """
    Returns:
        {
            "cutoff": datetime | None,        # end of the baseline window
            "users": {
                username: {"hours": set[int], "ips": set[str], "login_count": int}
            }
        }
    """
    logins = [e for e in events if e.type == EventType.SSH_SUCCESS and e.user]
    if not logins:
        return {"cutoff": None, "users": {}}

    first, last = logins[0].ts, logins[-1].ts
    cutoff = first + (last - first) * T["baseline_fraction"]

    users: Dict[str, Dict[str, Any]] = {}
    for e in logins:
        if e.ts > cutoff:
            break  # events are sorted
        u = users.setdefault(e.user, {"hours": set(), "ips": set(), "login_count": 0})
        u["hours"].add(e.ts.hour)
        u["login_count"] += 1
        if e.src_ip:
            u["ips"].add(e.src_ip)

    return {"cutoff": cutoff, "users": users}


def normal_hours(user_baseline: Dict[str, Any]) -> set:
    """
    Learned hours = default working window (08–20) plus the observed login range ±1h.
    Using a range rather than the exact set of observed hours avoids flagging a user who
    simply hasn't logged in at, say, 15:00 during the short baseline window.
    """
    hours = set(range(T["off_hours_default_start"], T["off_hours_default_end"]))
    observed = user_baseline.get("hours") or set()
    if observed:
        lo, hi = min(observed) - 1, max(observed) + 1
        hours |= {h % 24 for h in range(lo, hi + 1)}
    return hours
