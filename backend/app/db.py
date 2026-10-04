"""
ChainTrace – PostgreSQL persistence.
Key rule: engine runs entirely in memory; PostgreSQL only stores the finished result.
Upload → parse → detect → correlate in Python → write everything in ONE transaction → API reads from Postgres.

If DATABASE_URL is not set at all, an in-memory store is used (local dev / CLI demo; results are
lost on restart). If DATABASE_URL is set but Postgres is unreachable, StorageUnavailable is raised
and the API answers HTTP 503 – we never silently fall back, so a broken DB is visible.
Owner: Bhanu Prasad
"""

import os
import uuid
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.schemas import Alert, Entity, Event, Incident
from engine.config import CFG

BACKEND_DIR = Path(__file__).resolve().parent.parent
SCHEMA_SQL = BACKEND_DIR / "db" / "schema.sql"


def _load_dotenv() -> None:
    """Minimal .env reader (KEY=VALUE lines) so we don't need another dependency."""
    env = BACKEND_DIR / ".env"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


class StorageUnavailable(RuntimeError):
    pass


def max_analyses() -> int:
    """Retention: keep the newest N analyses (0 = unlimited)."""
    return int((CFG.get("storage") or {}).get("max_analyses", 0) or 0)


# ─── API shapes (shared by both stores so responses are identical) ────────────

def incident_dict(inc: Incident, with_story: bool = True) -> Dict[str, Any]:
    d = inc.model_dump(mode="json")
    if not with_story:
        d.pop("story", None)
    return d


def alert_dict(a: Alert) -> Dict[str, Any]:
    return a.model_dump(mode="json")


def evidence_dict(e: Event) -> Dict[str, Any]:
    return {"file": e.file, "line_no": e.line_no, "raw": e.raw, "ts": e.ts.isoformat().replace("+00:00", "Z"),
            "type": e.type.value, "src_ip": e.src_ip, "user": e.user}


def entity_dict(e: Entity) -> Dict[str, Any]:
    return e.model_dump(mode="json")


def _iso(ts: datetime) -> str:
    return ts.isoformat().replace("+00:00", "Z")


def build_summary(analysis_id: str, stats: Dict, incidents: List[Dict], hours: List[tuple],
                  top_entities: List[Dict]) -> Dict[str, Any]:
    levels = Counter(i["level"] for i in incidents)
    return {
        "id": analysis_id,
        **stats,
        "incidents_by_level": {lvl: levels.get(lvl, 0) for lvl in ("critical", "high", "medium", "low")},
        "events_over_time": [{"hour": _iso(h), "count": c} for h, c in hours],
        "top_entities": [{k: e[k] for k in ("type", "value", "risk_score", "level", "alert_count")}
                         for e in top_entities[:5]],
    }


# ─── In-memory store ──────────────────────────────────────────────────────────

class MemoryStore:
    kind = "memory"

    def __init__(self):
        self._data: Dict[str, Dict[str, Any]] = {}

    def ping(self) -> str:
        return "memory"

    def save(self, analysis_id: str, source: str, result) -> None:
        self._data[analysis_id] = {"created_at": datetime.now().astimezone(), "source": source, "result": result}
        keep = max_analyses()
        if keep and len(self._data) > keep:
            oldest = sorted(self._data, key=lambda k: self._data[k]["created_at"])[:len(self._data) - keep]
            for k in oldest:
                del self._data[k]

    def delete(self, analysis_id: str) -> bool:
        return self._data.pop(analysis_id, None) is not None

    def _get(self, analysis_id: str):
        return self._data.get(analysis_id)

    def list_analyses(self) -> List[Dict[str, Any]]:
        rows = sorted(self._data.items(), key=lambda kv: kv[1]["created_at"], reverse=True)
        return [{"id": aid, "created_at": d["created_at"], "source": d["source"], "files": d["result"].files,
                 "stats": d["result"].stats.model_dump(), "has_ground_truth": d["result"].evaluation is not None}
                for aid, d in rows]

    def exists(self, analysis_id: str) -> bool:
        return analysis_id in self._data

    def summary(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        d = self._get(analysis_id)
        if not d:
            return None
        r = d["result"]
        hours = Counter(e.ts.replace(minute=0, second=0, microsecond=0) for e in r.events)
        return build_summary(analysis_id, r.stats.model_dump(), [incident_dict(i, False) for i in r.incidents],
                             sorted(hours.items()), [entity_dict(e) for e in r.entities])

    def incidents(self, analysis_id: str) -> Optional[List[Dict[str, Any]]]:
        d = self._get(analysis_id)
        return [incident_dict(i, with_story=False) for i in d["result"].incidents] if d else None

    def incident_detail(self, analysis_id: str, incident_id: str) -> Optional[Dict[str, Any]]:
        d = self._get(analysis_id)
        if not d:
            return None
        r = d["result"]
        inc = next((i for i in r.incidents if i.id == incident_id), None)
        if not inc:
            return None
        by_id = {a.id: a for a in r.alerts}
        alerts = [by_id[i] for i in inc.alert_ids if i in by_id]
        ev_ids = {eid for a in alerts for eid in a.evidence_event_ids}
        return {**incident_dict(inc), "alerts": [alert_dict(a) for a in alerts],
                "evidence": {e.id: evidence_dict(e) for e in r.events if e.id in ev_ids}}

    def entities(self, analysis_id: str) -> Optional[List[Dict[str, Any]]]:
        d = self._get(analysis_id)
        return [entity_dict(e) for e in d["result"].entities] if d else None

    def evaluation(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        d = self._get(analysis_id)
        return d["result"].evaluation if d else None


# ─── PostgreSQL store ─────────────────────────────────────────────────────────

class PostgresStore:
    kind = "postgres"

    def __init__(self, url: str):
        import psycopg  # imported lazily so the engine/tests never need it
        from psycopg.types.json import Jsonb
        self._psycopg, self._Jsonb, self.url = psycopg, Jsonb, url

    def _connect(self):
        try:
            return self._psycopg.connect(self.url, connect_timeout=5, options="-c timezone=UTC")
        except self._psycopg.OperationalError as exc:
            raise StorageUnavailable("storage unavailable") from exc

    def _query(self, sql: str, params=()) -> List[tuple]:
        try:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchall()
        except self._psycopg.OperationalError as exc:
            raise StorageUnavailable("storage unavailable") from exc

    def ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(SCHEMA_SQL.read_text(encoding="utf-8"))

    def ping(self) -> str:
        self._query("SELECT 1")
        return "ok"

    def save(self, analysis_id: str, source: str, result) -> None:
        """Everything in one transaction; COPY for bulk rows. Any failure rolls back – no partial analysis."""
        J = self._Jsonb
        aid = uuid.UUID(analysis_id)
        try:
            with self._connect() as conn:  # commits on success, rolls back on exception
                with conn.cursor() as cur:
                    cur.execute(
                        "INSERT INTO analyses (id, source, files, stats, has_ground_truth, evaluation) "
                        "VALUES (%s, %s, %s, %s, %s, %s)",
                        (aid, source, result.files, J(result.stats.model_dump()),
                         result.evaluation is not None, J(result.evaluation) if result.evaluation else None))

                    with cur.copy("COPY events (analysis_id, id, ts, source, type, src_ip, username, host, http, "
                                  "file, line_no, raw) FROM STDIN") as cp:
                        cp.set_types(["uuid", "text", "timestamptz", "text", "text", "inet", "text", "text",
                                      "jsonb", "text", "int4", "text"])
                        for e in result.events:
                            cp.write_row((aid, e.id, e.ts, e.source.value, e.type.value, e.src_ip, e.user,
                                          e.host, J(e.http.model_dump()) if e.http else None, e.file, e.line_no,
                                          e.raw.replace("\x00", "")))

                    with cur.copy("COPY alerts (analysis_id, id, rule_id, rule_name, severity, points, stage, mitre, "
                                  "src_ip, username, first_seen, last_seen, count, reason, evidence_event_ids) "
                                  "FROM STDIN") as cp:
                        cp.set_types(["uuid", "text", "text", "text", "text", "int4", "text", "jsonb", "inet", "text",
                                      "timestamptz", "timestamptz", "int4", "text", "text[]"])
                        for a in result.alerts:
                            cp.write_row((aid, a.id, a.rule_id, a.rule_name, a.severity.value, a.points,
                                          a.stage.value, J(a.mitre.model_dump()), a.entity.get("ip"),
                                          a.entity.get("user"), a.first_seen, a.last_seen, a.count, a.reason,
                                          a.evidence_event_ids))

                    with cur.copy("COPY incidents (analysis_id, id, title, risk_score, level, entities, start_ts, "
                                  "end_ts, stages, alert_ids, summary, recommendation, story) FROM STDIN") as cp:
                        cp.set_types(["uuid", "text", "text", "int4", "text", "jsonb", "timestamptz", "timestamptz",
                                      "text[]", "text[]", "text", "text", "jsonb"])
                        for i in result.incidents:
                            cp.write_row((aid, i.id, i.title, i.risk_score, i.level.value,
                                          J(i.entities.model_dump()), i.start, i.end, [s.value for s in i.stages],
                                          i.alert_ids, i.summary, i.recommendation,
                                          J([s.model_dump(mode="json") for s in i.story])))

                    with cur.copy("COPY entities (analysis_id, type, value, risk_score, level, alert_count, "
                                  "first_seen, last_seen) FROM STDIN") as cp:
                        cp.set_types(["uuid", "text", "text", "int4", "text", "int4", "timestamptz", "timestamptz"])
                        for e in result.entities:
                            cp.write_row((aid, e.type.value, e.value, e.risk_score, e.level.value,
                                          e.alert_count, e.first_seen, e.last_seen))

                    keep = max_analyses()
                    if keep:  # retention; ON DELETE CASCADE removes the old analyses' rows
                        cur.execute("DELETE FROM analyses WHERE id IN (SELECT id FROM analyses "
                                    "ORDER BY created_at DESC, id OFFSET %s)", (keep,))
        except self._psycopg.OperationalError as exc:
            raise StorageUnavailable("storage unavailable") from exc

    def list_analyses(self) -> List[Dict[str, Any]]:
        rows = self._query("SELECT id::text, created_at, source, files, stats, has_ground_truth FROM analyses "
                           "ORDER BY created_at DESC LIMIT 100")
        return [{"id": r[0], "created_at": r[1], "source": r[2], "files": r[3], "stats": r[4],
                 "has_ground_truth": r[5]} for r in rows]

    def exists(self, analysis_id: str) -> bool:
        return bool(self._query("SELECT 1 FROM analyses WHERE id = %s", (analysis_id,)))

    def delete(self, analysis_id: str) -> bool:
        """Delete one analysis; events/alerts/incidents/entities go with it (ON DELETE CASCADE)."""
        try:
            with self._connect() as conn, conn.cursor() as cur:
                cur.execute("DELETE FROM analyses WHERE id = %s RETURNING id", (analysis_id,))
                return cur.fetchone() is not None
        except self._psycopg.OperationalError as exc:
            raise StorageUnavailable("storage unavailable") from exc

    _INC_COLS = "id, title, risk_score, level, entities, start_ts, end_ts, stages, alert_ids, summary, recommendation"

    @staticmethod
    def _inc_row(r) -> Dict[str, Any]:
        return {"id": r[0], "title": r[1], "risk_score": r[2], "level": r[3], "entities": r[4],
                "start": _iso(r[5]), "end": _iso(r[6]), "stages": r[7], "alert_ids": r[8],
                "summary": r[9], "recommendation": r[10]}

    def summary(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        stats = self._query("SELECT stats FROM analyses WHERE id = %s", (analysis_id,))
        if not stats:
            return None
        incidents = [{"level": r[0]} for r in self._query(
            "SELECT level FROM incidents WHERE analysis_id = %s", (analysis_id,))]
        hours = self._query("SELECT date_trunc('hour', ts) AS h, count(*) FROM events WHERE analysis_id = %s "
                            "GROUP BY h ORDER BY h", (analysis_id,))
        top = self.entities(analysis_id, limit=5) or []
        return build_summary(analysis_id, stats[0][0], incidents, hours, top)

    def incidents(self, analysis_id: str) -> Optional[List[Dict[str, Any]]]:
        if not self.exists(analysis_id):
            return None
        rows = self._query(f"SELECT {self._INC_COLS} FROM incidents WHERE analysis_id = %s "
                           "ORDER BY risk_score DESC, start_ts, id", (analysis_id,))
        return [self._inc_row(r) for r in rows]

    def incident_detail(self, analysis_id: str, incident_id: str) -> Optional[Dict[str, Any]]:
        rows = self._query(f"SELECT {self._INC_COLS}, story FROM incidents WHERE analysis_id = %s AND id = %s",
                           (analysis_id, incident_id))
        if not rows:
            return None
        inc = {**self._inc_row(rows[0]), "story": rows[0][11]}
        alert_rows = self._query(
            "SELECT id, rule_id, rule_name, severity, points, stage, mitre, host(src_ip), username, first_seen, "
            "last_seen, count, reason, evidence_event_ids FROM alerts WHERE analysis_id = %s AND id = ANY(%s) "
            "ORDER BY array_position(%s::text[], id)", (analysis_id, inc["alert_ids"], inc["alert_ids"]))
        alerts = [{"id": r[0], "rule_id": r[1], "rule_name": r[2], "severity": r[3], "points": r[4], "stage": r[5],
                   "mitre": r[6], "entity": {"ip": r[7], "user": r[8]}, "first_seen": _iso(r[9]),
                   "last_seen": _iso(r[10]), "count": r[11], "reason": r[12], "evidence_event_ids": r[13]}
                  for r in alert_rows]
        ev_ids = sorted({eid for a in alerts for eid in a["evidence_event_ids"]})
        ev_rows = self._query(
            "SELECT id, file, line_no, raw, ts, type, host(src_ip), username FROM events "
            "WHERE analysis_id = %s AND id = ANY(%s) ORDER BY ts, file, line_no", (analysis_id, ev_ids))
        evidence = {r[0]: {"file": r[1], "line_no": r[2], "raw": r[3], "ts": _iso(r[4]), "type": r[5],
                           "src_ip": r[6], "user": r[7]} for r in ev_rows}
        return {**inc, "alerts": alerts, "evidence": evidence}

    def entities(self, analysis_id: str, limit: Optional[int] = None) -> Optional[List[Dict[str, Any]]]:
        if not self.exists(analysis_id):
            return None
        rows = self._query(
            "SELECT type, value, risk_score, level, alert_count, first_seen, last_seen FROM entities "
            "WHERE analysis_id = %s ORDER BY risk_score DESC, type, value" + (f" LIMIT {int(limit)}" if limit else ""),
            (analysis_id,))
        return [{"type": r[0], "value": r[1], "risk_score": r[2], "level": r[3], "alert_count": r[4],
                 "first_seen": _iso(r[5]), "last_seen": _iso(r[6])} for r in rows]

    def evaluation(self, analysis_id: str) -> Optional[Dict[str, Any]]:
        rows = self._query("SELECT evaluation FROM analyses WHERE id = %s", (analysis_id,))
        return rows[0][0] if rows else None


def make_store():
    return PostgresStore(DATABASE_URL) if DATABASE_URL else MemoryStore()
