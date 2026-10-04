# ChainTrace API–Frontend Contract Report

**Task A4 — Round 2 | Author: Antigravity | Date: 2026-10-04**

This report compares every key in each frontend mock (under `frontend/src/mocks/`)
against the real API response produced by `POST /api/simulate { scenarios: [S1–S5], seed: 42 }`.

**Rule applied:** every key in the mock must exist in the real response with the same JSON type (recursively; for lists, the first element is compared). Extra keys in the real response are allowed. Values may differ.

**Test result:** all 10 contract tests pass (see `backend/tests/test_contract.py`).

---

## Endpoint: `POST /api/simulate`

**Mock file:** `analyze_response.json`

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `analysis_id` | `str` | `str` | ✅ Match | Format differs: mock uses `"mock-analysis-001"`, real uses UUID v4 e.g. `"58c4dd9c-8ebe-463a-..."`. Frontend must not hardcode or compare the ID value. |
| `stats` | `dict` | `dict` | ✅ Match | |
| `stats.lines_total` | `int` | `int` | ✅ Match | |
| `stats.parsed` | `int` | `int` | ✅ Match | |
| `stats.skipped` | `int` | `int` | ✅ Match | |
| `stats.events` | `int` | `int` | ✅ Match | |
| `stats.alerts` | `int` | `int` | ✅ Match | |
| `stats.incidents` | `int` | `int` | ✅ Match | |
| `has_ground_truth` | `bool` | `bool` | ✅ Match | |

**Extra keys in real response:** none.

**Value-format differences:**
- `analysis_id`: mock uses short human-readable ID; real returns UUID v4. Frontend must treat this as an opaque string.
- `stats.lines_total`: mock shows 52 341 (large simulated run); real shows 5 890 for S1–S5 seed 42 (no external baseline traffic in unit tests).

---

## Endpoint: `GET /api/analyses/{id}/summary`

**Mock file:** `summary.json`

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `id` | `str` | `str` | ✅ Match | Real value is UUID v4. |
| `lines_total` | `int` | `int` | ✅ Match | |
| `parsed` | `int` | `int` | ✅ Match | |
| `skipped` | `int` | `int` | ✅ Match | |
| `alerts` | `int` | `int` | ✅ Match | |
| `incidents` | `int` | `int` | ✅ Match | |
| `incidents_by_level` | `dict` | `dict` | ✅ Match | |
| `incidents_by_level.critical` | `int` | `int` | ✅ Match | |
| `incidents_by_level.high` | `int` | `int` | ✅ Match | |
| `incidents_by_level.medium` | `int` | `int` | ✅ Match | |
| `incidents_by_level.low` | `int` | `int` | ✅ Match | |
| `events_over_time` | `list` | `list` | ✅ Match | |
| `events_over_time[0].hour` | `str` | `str` | ✅ Match | Both use ISO-8601 with `Z` suffix (UTC). |
| `events_over_time[0].count` | `int` | `int` | ✅ Match | |
| `top_entities` | `list` | `list` | ✅ Match | |
| `top_entities[0].type` | `str` | `str` | ✅ Match | Values: `"ip"` or `"user"`. |
| `top_entities[0].value` | `str` | `str` | ✅ Match | |
| `top_entities[0].risk_score` | `int` | `int` | ✅ Match | |
| `top_entities[0].level` | `str` | `str` | ✅ Match | |
| `top_entities[0].alert_count` | `int` | `int` | ✅ Match | |

**Extra keys in real response:** none.

**Value-format differences:**
- `events_over_time`: real histogram spans the actual timestamps of log events; mock uses fixed 2026-10-02/03/04 dates. The hour granularity and `"Z"` suffix format are identical.

---

## Endpoint: `GET /api/analyses/{id}/incidents`

**Mock file:** `incidents.json`

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `[0].id` | `str` | `str` | ✅ Match | **Format differs**: mock uses `"inc-001"` (zero-padded 3 digits); real uses `"inc-1"` (no padding). See below. |
| `[0].title` | `str` | `str` | ✅ Match | |
| `[0].risk_score` | `int` | `int` | ✅ Match | |
| `[0].level` | `str` | `str` | ✅ Match | Values: `"critical"`, `"high"`, `"medium"`, `"low"`. |
| `[0].entities` | `dict` | `dict` | ✅ Match | |
| `[0].entities.ips` | `list` | `list` | ✅ Match | |
| `[0].entities.users` | `list` | `list` | ✅ Match | |
| `[0].start` | `str` | `str` | ✅ Match | ISO-8601 UTC with `Z`. |
| `[0].end` | `str` | `str` | ✅ Match | ISO-8601 UTC with `Z`. |
| `[0].stages` | `list` | `list` | ✅ Match | |
| `[0].alert_ids` | `list` | `list` | ✅ Match | |

**Extra keys in real response:** `summary` (str), `recommendation` (str).
- These are human-readable text fields the frontend can optionally display.

> [!IMPORTANT]
> **Incident ID format mismatch**: mock uses `"inc-001"`, `"inc-002"` (zero-padded); real API returns `"inc-1"`, `"inc-2"` (no padding).
> **Frontend action required**: Update any hardcoded ID comparisons or ID-based routing (e.g. `/incidents/inc-001` → `/incidents/inc-1`). Do **not** hardcode incident IDs; always use the `id` field from the API response.

---

## Endpoint: `GET /api/analyses/{id}/incidents/{iid}`

**Mock file:** `incident_detail.json`

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `id` | `str` | `str` | ✅ Match | Same format caveat as above (`inc-1` vs `inc-001`). |
| `title` | `str` | `str` | ✅ Match | |
| `risk_score` | `int` | `int` | ✅ Match | |
| `level` | `str` | `str` | ✅ Match | |
| `entities` | `dict` | `dict` | ✅ Match | |
| `start` | `str` | `str` | ✅ Match | |
| `end` | `str` | `str` | ✅ Match | |
| `stages` | `list` | `list` | ✅ Match | |
| `summary` | `str` | `str` | ✅ Match | |
| `recommendation` | `str` | `str` | ✅ Match | |
| `story` | `list` | `list` | ✅ Match | |
| `story[0].ts` | `str` | `str` | ✅ Match | ISO-8601 with `Z`. |
| `story[0].stage` | `str` | `str` | ✅ Match | |
| `story[0].text` | `str` | `str` | ✅ Match | |
| `story[0].alert_id` | `str` | `str` | ✅ Match | |
| `alerts` | `list` | `list` | ✅ Match | |
| `alerts[0].id` | `str` | `str` | ✅ Match | |
| `alerts[0].rule_id` | `str` | `str` | ✅ Match | e.g. `"R1"`, `"R4"`. |
| `alerts[0].rule_name` | `str` | `str` | ✅ Match | |
| `alerts[0].severity` | `str` | `str` | ✅ Match | |
| `alerts[0].points` | `int` | `int` | ✅ Match | |
| `alerts[0].stage` | `str` | `str` | ✅ Match | |
| `alerts[0].mitre` | `dict` | `dict` | ✅ Match | |
| `alerts[0].mitre.tactic` | `str` | `str` | ✅ Match | |
| `alerts[0].mitre.technique` | `str` | `str` | ✅ Match | |
| `alerts[0].entity` | `dict` | `dict` | ✅ Match | |
| `alerts[0].entity.ip` | `null` | `str\|null` | ✅ Match | Mock uses `null`; real uses IP string or `null`. Nullable → OK. |
| `alerts[0].entity.user` | `null` | `str\|null` | ✅ Match | Same. |
| `alerts[0].first_seen` | `str` | `str` | ✅ Match | |
| `alerts[0].last_seen` | `str` | `str` | ✅ Match | |
| `alerts[0].count` | `int` | `int` | ✅ Match | |
| `alerts[0].reason` | `str` | `str` | ✅ Match | |
| `alerts[0].evidence_event_ids` | `list` | `list` | ✅ Match | |
| `evidence` | `dict` | `dict` | ✅ Match | Dynamic keys — see below. |
| `evidence[key].file` | `str` | `str` | ✅ Match | |
| `evidence[key].line_no` | `int` | `int` | ✅ Match | |
| `evidence[key].raw` | `str` | `str` | ✅ Match | |

**Extra keys in real `evidence` values:** `ts` (ISO-8601 str), `type` (event type str), `src_ip` (str or null), `user` (str or null).

> [!IMPORTANT]
> **Evidence dict keys are dynamic**: mock uses literal event-ID keys `"auth.log:1"`, `"auth.log:215"`, etc. Real API uses keys like `"auth.log:506"` that depend on the actual log content. Frontend **must not** hardcode evidence keys — iterate over `Object.entries(evidence)` instead.

---

## Endpoint: `GET /api/analyses/{id}/entities`

**Mock file:** `entities.json`

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `[0].type` | `str` | `str` | ✅ Match | `"ip"` or `"user"`. |
| `[0].value` | `str` | `str` | ✅ Match | |
| `[0].risk_score` | `int` | `int` | ✅ Match | |
| `[0].level` | `str` | `str` | ✅ Match | |
| `[0].alert_count` | `int` | `int` | ✅ Match | |
| `[0].first_seen` | `str` | `str` | ✅ Match | ISO-8601 with `Z`. |
| `[0].last_seen` | `str` | `str` | ✅ Match | ISO-8601 with `Z`. |

**Extra keys in real response:** none.

---

## Endpoint: `GET /api/analyses/{id}/evaluation`

**Mock file:** `evaluation.json`

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| `scenarios_detected` | `int` | `int` | ✅ Match | |
| `scenarios_total` | `int` | `int` | ✅ Match | |
| `precision` | `float` | `float` | ✅ Match | |
| `recall` | `float` | `float` | ✅ Match | |
| `critical_false_positives` | `int` | `int` | ✅ Match | |
| `per_scenario` | `list` | `list` | ✅ Match | |
| `per_scenario[0].scenario_id` | `str` | `str` | ✅ Match | |
| `per_scenario[0].detected` | `bool` | `bool` | ✅ Match | |
| `per_scenario[0].expected_entities` | `list` | `list` | ✅ Match | |
| `per_scenario[0].found_entities` | `list` | `list` | ✅ Match | |

**Extra keys in real `per_scenario` items:** `incident_id` (str or null), `expected_stages` (list of str), `found_stages` (list of str).
- These bonus fields help cross-reference with the incidents list and with MITRE kill-chain stages. The frontend can optionally display them.

---

## Endpoint: `GET /api/analyses`

**Mock file:** `analyses_list.json` (content: `[]`)

| Key path | Mock type | Real type | Status | Notes |
|----------|-----------|-----------|--------|-------|
| (empty array) | `list` | `list` | ✅ Match | Mock is an empty list; real contains analysis entries. |
| `[0].id` | — | `str` (UUID) | Info | Not in mock (empty array). Real entries have `id`. |
| `[0].created_at` | — | `str` (ISO-8601) | Info | |
| `[0].source` | — | `str` | Info | `"simulation"` or `"upload"`. |
| `[0].files` | — | `list` of str | Info | Filenames uploaded/simulated. |
| `[0].stats` | — | `dict` | Info | Same shape as `POST /api/simulate stats`. |
| `[0].has_ground_truth` | — | `bool` | Info | |

**Frontend action for this endpoint:** Since mock is empty, the frontend mock does not exercise the list item shape. If the frontend renders an analyses history list, it must handle `id` as a UUID string.

---

## Summary for Mahadev

### Changes required in the frontend

| Priority | Change |
|----------|--------|
| 🔴 **Required** | **Incident ID format**: Update all code that references incident IDs to handle `"inc-1"` format (not zero-padded). Do not hardcode IDs. |
| 🔴 **Required** | **Evidence dict keys**: Do not hardcode evidence keys like `"auth.log:1"`. Use dynamic iteration (`Object.entries(evidence)`). |
| 🟡 **Optional** | Display the extra `summary` and `recommendation` fields from incident list items (currently in detail only per mock; real list includes them too). |
| 🟡 **Optional** | Use the bonus `incident_id`, `expected_stages`, `found_stages` from evaluation `per_scenario` to cross-link evaluation results to specific incidents. |
| ℹ️ **Informational** | `analysis_id` is a UUID v4 string — no change needed, frontend already treats it as opaque. |
| ℹ️ **Informational** | `events_over_time` span real log timestamps; mock dates are illustrative. Frontend chart must use dynamic x-axis. |
| ℹ️ **Informational** | Real `evidence` values have extra fields: `ts`, `type`, `src_ip`, `user`. These can be used to enrich the evidence panel. |

### No changes needed

All key names, types, and structural shapes match the mocks. The real API is a strict superset of the mock contract.
