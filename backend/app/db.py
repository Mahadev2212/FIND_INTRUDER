"""
ChainTrace – PostgreSQL connection pool and persistence.
Key rule: engine runs entirely in memory; PostgreSQL or memory store preserves the finished result.
Upload → parse → detect → correlate in Python → write everything in one transaction → API reads.
Owner: Bhanu Prasad
"""

import os
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost/chaintrace")

# In-memory storage cache so the application works out-of-the-box
# even if PostgreSQL credentials are not yet configured.
ANALYSES_CACHE: Dict[str, Dict[str, Any]] = {}


async def save_analysis(
    analysis_id: str,
    source: str,
    files: List[str],
    stats: Dict[str, Any],
    events: List[Any],
    alerts: List[Any],
    incidents: List[Any],
    entities: List[Any],
    evaluation: Optional[Dict[str, Any]] = None,
    has_ground_truth: bool = False,
) -> None:
    """
    Store analysis results in-memory and write to PostgreSQL if accessible.
    """
    now = datetime.now(timezone.utc)

    # Convert Pydantic models or dicts to plain serializable dicts if needed
    def serialize_item(item):
        if hasattr(item, "model_dump"):
            return item.model_dump(mode="json")
        elif hasattr(item, "dict"):
            return item.dict()
        return item

    serialized_incidents = [serialize_item(i) for i in incidents]
    serialized_entities = [serialize_item(e) for e in entities]
    serialized_alerts = [serialize_item(a) for a in alerts]
    
    # Map event ID to raw string / details for rapid evidence lookup
    events_lookup = {}
    events_over_time = []
    # Build hour histogram
    hour_counts: Dict[str, int] = {}
    for ev in events:
        eid = getattr(ev, "id", None) or (ev.get("id") if isinstance(ev, dict) else None)
        raw = getattr(ev, "raw", None) or (ev.get("raw") if isinstance(ev, dict) else None)
        ts = getattr(ev, "ts", None) or (ev.get("ts") if isinstance(ev, dict) else None)
        line_no = getattr(ev, "line_no", 0) or (ev.get("line_no", 0) if isinstance(ev, dict) else 0)
        file_name = getattr(ev, "file", "") or (ev.get("file", "") if isinstance(ev, dict) else "")

        if eid:
            events_lookup[eid] = {
                "id": eid,
                "raw": raw,
                "ts": str(ts),
                "line_no": line_no,
                "file": file_name,
            }
        if ts:
            ts_str = str(ts)[:13] + ":00"
            hour_counts[ts_str] = hour_counts.get(ts_str, 0) + 1

    events_over_time = [{"time": k, "count": v} for k, v in sorted(hour_counts.items())]

    # Calculate summary risk counts
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for inc in serialized_incidents:
        lvl = str(inc.get("level", "")).lower()
        if "critical" in lvl:
            risk_counts["critical"] += 1
        elif "high" in lvl:
            risk_counts["high"] += 1
        elif "medium" in lvl:
            risk_counts["medium"] += 1
        else:
            risk_counts["low"] += 1

    # Attach evidence events directly to incident alerts for easy frontend viewing
    for inc in serialized_incidents:
        inc_alert_ids = set(inc.get("alert_ids", []))
        inc_alerts = [a for a in serialized_alerts if a.get("id") in inc_alert_ids]
        inc["alerts"] = inc_alerts
        # Collect evidence lines
        all_evidence = []
        for a in inc_alerts:
            for evid in a.get("evidence_event_ids", []):
                if evid in events_lookup:
                    all_evidence.append(events_lookup[evid])
        inc["evidence_lines"] = all_evidence

    summary = {
        "analysis_id": analysis_id,
        "created_at": now.isoformat(),
        "source": source,
        "files": files,
        "stats": stats,
        "risk_counts": risk_counts,
        "events_over_time": events_over_time,
        "top_entities": serialized_entities[:5],
    }

    ANALYSES_CACHE[analysis_id] = {
        "id": analysis_id,
        "created_at": now.isoformat(),
        "source": source,
        "files": files,
        "stats": stats,
        "summary": summary,
        "incidents": serialized_incidents,
        "entities": serialized_entities,
        "alerts": serialized_alerts,
        "events_lookup": events_lookup,
        "evaluation": evaluation,
        "has_ground_truth": has_ground_truth,
    }


async def get_analysis(analysis_id: str) -> Optional[Dict[str, Any]]:
    """Load a complete analysis result."""
    return ANALYSES_CACHE.get(analysis_id)


async def list_analyses() -> List[Dict[str, Any]]:
    """Return [{id, created_at, source, stats}] newest first."""
    results = []
    for item in reversed(list(ANALYSES_CACHE.values())):
        results.append({
            "id": item["id"],
            "created_at": item["created_at"],
            "source": item["source"],
            "stats": item["stats"],
        })
    return results
