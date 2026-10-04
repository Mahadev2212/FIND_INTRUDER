# ChainTrace API reference

Base URL: `http://localhost:8000` locally, or the deployed URL. Interactive docs: `/docs`.
All timestamps are ISO-8601 **UTC** strings ending in `Z` (except `created_at`, which carries the server offset).
Errors always look like `{"detail": "message"}`. Owner: Bhanu. Written for Mahadev's `api.js` (set `USE_MOCKS = false`).

| Method | Path | Success | Errors |
|---|---|---|---|
| GET | `/api/health` | `{status, db}` | – |
| POST | `/api/analyze` | `AnalyzeResponse` | 400 bad file, 413 >50 MB, 503 DB down |
| POST | `/api/simulate` | `AnalyzeResponse` (`has_ground_truth: true`) | 400 unknown scenario, 503 |
| GET | `/api/analyses` | `AnalysisListItem[]`, newest first | 503 |
| DELETE | `/api/analyses/{id}` | 204 (no body) | 404, 503 |
| GET | `/api/analyses/{id}/summary` | `Summary` | 404, 503 |
| GET | `/api/analyses/{id}/incidents` | `Incident[]` (no `story`), risk desc | 404, 503 |
| GET | `/api/analyses/{id}/incidents/{iid}` | `IncidentDetail` | 404, 503 |
| GET | `/api/analyses/{id}/incidents/{iid}/report?format=md\|json` | file download | 404, 422 bad format |
| GET | `/api/analyses/{id}/entities` | `Entity[]`, risk desc | 404, 503 |
| GET | `/api/analyses/{id}/evaluation` | `Evaluation` | 404 (uploads have no ground truth), 503 |

`{id}` is a UUID; anything else returns 404. Incident IDs are `inc-1`, `inc-2`, … (rank by risk). Alert IDs are `a1`, `a2`, … (time order).

## Health
```json
{"status": "ok", "db": "ok"}          // db: "ok" | "memory" (no DATABASE_URL) | "unavailable"
```
Show the API-down banner when the request fails; show a storage warning when `db` is `"unavailable"`.

## POST /api/analyze
`multipart/form-data`, field name **`files`** (repeat for several files). Formats are auto-detected per file:
Linux auth.log (syslog), Apache/Nginx combined access.log, JSON-lines.
```json
{"analysis_id": "636c70dd-…", "has_ground_truth": false,
 "stats": {"lines_total": 5784, "parsed": 5784, "skipped": 0, "events": 5784, "alerts": 4, "incidents": 1}}
```
- `parsed` = lines in a recognised format; `skipped` = malformed lines (show "N lines skipped").
- `events` = security-relevant lines (logins, sudo, HTTP requests…); `events ≤ parsed`.
- 400 messages are user-readable, e.g. `"No parsable lines: 'empty.log' is empty. Supported formats: …"` or
  `"'cat.png' looks like a binary file. …"`. Show `detail` as-is.

## POST /api/simulate
Body: `{"scenarios": ["S1","S2","S3","S4","S5"], "seed": 42}`. `scenarios: []` = clean traffic only. Same shape as analyze.

| ID | Scenario |
|---|---|
| S1 | SSH breach: brute force → login as `deploy` → sudo → backdoor `sysupdate` |
| S2 | Password spray: 12 users × 2 tries, `user05` succeeds |
| S3 | Web recon → SQLi → 80 MB download |
| S4 | Low-and-slow brute force from one /24 |
| S5 | Off-hours login from a new IP → sudo → 75 MB download |

## GET /api/analyses
```json
[{"id": "636c…", "created_at": "2026-10-04T13:52:11.464270+05:30", "source": "simulation",
  "files": ["auth.log", "access.log"], "stats": {…same as above…}, "has_ground_truth": true}]
```
Only the newest 50 analyses are kept (`storage.max_analyses` in `config.yaml`).

## GET /api/analyses/{id}/summary
```json
{"id": "636c…", "lines_total": 5784, "parsed": 5784, "skipped": 0, "events": 5784, "alerts": 4, "incidents": 1,
 "incidents_by_level": {"critical": 1, "high": 0, "medium": 0, "low": 0},
 "events_over_time": [{"hour": "2026-10-01T18:00:00Z", "count": 28}, …],     // hourly buckets
 "top_entities": [{"type": "ip", "value": "185.220.101.7", "risk_score": 100, "level": "critical", "alert_count": 4}, …]}  // max 5
```

## Incident (list item)
```json
{"id": "inc-1", "title": "SSH compromise with persistence", "risk_score": 100, "level": "critical",
 "entities": {"ips": ["185.220.101.7"], "users": ["deploy", "sysupdate"]},
 "start": "2026-10-04T02:00:08Z", "end": "2026-10-04T02:45:02Z",
 "stages": ["Credential Access", "Initial Access", "Privilege Escalation", "Persistence"],
 "alert_ids": ["a1", "a2", "a3", "a4"],
 "summary": "Assessment: likely successful SSH compromise with a backdoor account. …",
 "recommendation": "Block 185.220.101.7 at the firewall. Disable deploy and rotate its credentials. …"}
```
- `level`: `low | medium | high | critical` (0–29 / 30–59 / 60–79 / 80–100).
- `stages` are already in kill-chain order: Reconnaissance → Credential Access → Initial Access →
  Privilege Escalation → Persistence → Exfiltration. Use them for the stage bar.
- `recommendation` is sentences separated by `. ` → split for a bullet list.

## GET /api/analyses/{id}/incidents/{iid}: incident detail
Incident fields **plus** `story`, `alerts`, `evidence`:
```json
{
 "story": [{"ts": "2026-10-04T02:41:09Z", "stage": "Initial Access", "alert_id": "a2",
            "text": "At 02:41, 185.220.101.7 logged in successfully as deploy right after 214 failed attempts – … (Initial Access, T1078)."}],
 "alerts": [{"id": "a2", "rule_id": "R4", "rule_name": "Login after failures", "severity": "critical", "points": 50,
             "stage": "Initial Access", "mitre": {"tactic": "Initial Access", "technique": "T1078"},
             "entity": {"ip": "185.220.101.7", "user": "deploy"},
             "first_seen": "2026-10-04T02:00:08Z", "last_seen": "2026-10-04T02:41:09Z", "count": 215,
             "reason": "Successful login as deploy from 185.220.101.7 after 214 failed logins …",
             "evidence_event_ids": ["auth.log:11", "auth.log:12", "…"]}],
 "evidence": {"auth.log:11": {"file": "auth.log", "line_no": 11, "raw": "Oct 4 02:00:08 web01 sshd[2105]: Failed password …",
                              "ts": "2026-10-04T02:00:08Z", "type": "ssh_fail", "src_ip": "185.220.101.7", "user": "admin"}}
}
```
**Click-to-evidence:** story step → `alert_id` → that alert's `evidence_event_ids` → look each up in `evidence`.
Show `file:line_no` + `raw` in monospace, and the alert's `reason` above it. Every id in
`evidence_event_ids` is present in `evidence`. Lists can be long (a brute force has 200+ lines), so paginate or collapse them.

## GET …/incidents/{iid}/report
`?format=md` (default) → `text/markdown` download `chaintrace-inc-1.md` (story, recommendations, alerts,
up to 20 evidence lines each). `?format=json` → the incident-detail JSON as a download.
For a button: `<a href={`${BASE_URL}/api/analyses/${id}/incidents/${iid}/report`} download>Export report</a>`.

## Entity
```json
{"type": "ip", "value": "185.220.101.7", "risk_score": 100, "level": "critical", "alert_count": 4,
 "first_seen": "2026-10-04T02:00:08Z", "last_seen": "2026-10-04T02:45:02Z"}     // type: "ip" | "user"
```

## Evaluation (simulated runs only)
```json
{"scenarios_detected": 5, "scenarios_total": 5, "precision": 1.0, "recall": 1.0,
 "critical_false_positives": 0,
 "critical_false_positives_source": "baseline_only",
 "critical_false_positives_in_attack_run": 0,
 "baseline_only": {"incidents": 0, "by_level": {"critical": 0, "high": 0, "medium": 0, "low": 0}},
 "per_scenario": [{"scenario_id": "S1", "detected": true, "incident_id": "inc-1",
                   "expected_entities": ["185.220.101.7", "deploy", "sysupdate"],
                   "found_entities": ["185.220.101.7", "deploy", "sysupdate"],
                   "expected_stages": ["Credential Access", "Initial Access", "Privilege Escalation", "Persistence"],
                   "found_stages": ["Credential Access", "Initial Access", "Privilege Escalation", "Persistence"]}]}
```
- Headline order (PRD): scenarios detected `5/5` → precision → recall → critical false positives.
- `critical_false_positives` is measured on the **same normal traffic without attacks** (PRD definition), so the
  label can read "0 critical false positives on clean traffic". `incident_id` lets each ✓ link to its incident.
- Uploads return 404 here: hide the Evaluation tab when `has_ground_truth` is false.

## Differences from the frontend mocks
| Mock | Real API |
|---|---|
| `inc-001`, alert ids `a1`… | `inc-1`, `a1`… (treat ids as opaque strings) |
| `events_over_time` 4-hour buckets | hourly buckets |
| evidence items `{file, line_no, raw}` | same + `ts`, `type`, `src_ip`, `user` |
| evaluation without extras | + `incident_id`, stages, `baseline_only`, `critical_false_positives_*` |
| no report / delete endpoints | `GET …/report`, `DELETE /api/analyses/{id}` |
All mock keys exist in the real responses with the same types, so the pages work unchanged; extra fields are optional to use.
