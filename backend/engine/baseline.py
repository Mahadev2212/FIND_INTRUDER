"""
ChainTrace – Per-user baseline builder (for R5: off-hours, R6: new IP).
Pipeline order: parse → normalize → sort by timestamp → baseline → rules → correlation.
Baseline window = first 25% of the time range (not first 25% of lines).
Skip R5/R6 for users with fewer than 5 logins in the baseline (avoids false positives on rare users).
Owner: Bhanu Prasad
"""

from collections import defaultdict
from typing import List, Dict, Any
from app.schemas import EventType


def build_baseline(events) -> Dict[str, Any]:
    """
    Build per-user baseline from the first 25% of the time range.
    Returns:
        {
            username: {
                "hours": set of hour ints when user normally logs in,
                "ips": set of source IPs seen in baseline,
                "login_count": int
            }
        }
    """
    if not events:
        return {}

    # First 25% of the total time range
    first_ts = events[0].ts
    last_ts = events[-1].ts
    total_range = (last_ts - first_ts).total_seconds()
    baseline_cutoff = first_ts.timestamp() + total_range * 0.25

    baseline: Dict[str, Any] = defaultdict(lambda: {
        "hours": set(),
        "ips": set(),
        "login_count": 0,
    })

    for e in events:
        if e.ts.timestamp() > baseline_cutoff:
            break  # events are sorted; stop as soon as we're past the window
        if e.type == EventType.SSH_SUCCESS and e.user:
            baseline[e.user]["hours"].add(e.ts.hour)
            baseline[e.user]["login_count"] += 1
            if e.src_ip:
                baseline[e.user]["ips"].add(e.src_ip)

    return dict(baseline)
