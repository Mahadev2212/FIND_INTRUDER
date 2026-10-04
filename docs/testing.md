# ChainTrace – Testing Evidence (PRD T1–T19)

**Project**: ChainTrace (ALGOTHON'26, ALG-CYBER-01)
**Branch**: `bhanu-antigravity`
**Run date**: 2026-10-04
**Test command**: `cd backend && venv\Scripts\python -m pytest tests -v`

---

## PRD Test Coverage Table (T1–T19)

| ID  | Test Description | Expected Result | Status | pytest function(s) |
|-----|-----------------|-----------------|--------|--------------------|
| T1  | Baseline-only (no attacks) produces no false alarms | 0 CRITICAL incidents; at most 1 HIGH | ✅ PASS | `test_t1_baseline_only_has_no_false_alarms` |
| T2  | Each scenario detected when run alone (S1–S5 × 1) | Exactly 1 matching incident per scenario; correct entities and kill-chain stages | ✅ PASS | `test_t2_each_scenario_alone[S1..S5]` |
| T3  | All 5 scenarios simultaneously separated into 5 distinct incidents | 5 distinct incidents; precision ≥ 0.9; recall ≥ 0.9; 0 critical false positives | ✅ PASS | `test_t3_all_scenarios_stay_separate` |
| T4  | Empty file raises an error gracefully | HTTP 400 "no parsable lines" (API); `NoParsableLines` exception (pipeline) | ✅ PASS | `test_t4_empty_file` (engine), `test_t4_empty_file_is_400` (API) |
| T5  | Binary file is rejected | HTTP 400 "binary file" error | ✅ PASS | `test_t5_binary_file_is_rejected` |
| T6  | Malformed lines skipped and counted, valid lines still processed | `stats.skipped` = 10, `stats.parsed` = 40; R1 alert still fired | ✅ PASS | `test_t6_malformed_lines_are_skipped_and_counted` |
| T7  | Unknown log format reports supported formats | ValueError / HTTP 400 mentioning "Supported formats" | ✅ PASS | `test_t7_unknown_format_lists_supported_formats` (engine), `test_t7_unknown_format_is_400_with_supported_formats` (API) |
| T8  | Year rollover (Dec → Jan) timestamps kept in order | Dec event year = N, Jan event year = N+1; Dec < Jan | ✅ PASS | `test_t8_year_rollover_keeps_order` |
| T9  | IPv6 brute force detected | R1 alert with entity ip = "2001:db8::bad:1" | ✅ PASS | `test_t9_ipv6_brute_force_detected` |
| T10 | 100k lines parsed + analysed in < 10 seconds | `elapsed < 10s` | ✅ PASS | `test_t10_100k_lines_under_10_seconds` |
| T11 | Same input always produces identical output (deterministic) | Incident and alert model dumps match exactly across two runs | ✅ PASS | `test_t11_deterministic` |
| T12 | Real-world Loghub OpenSSH_2k.log: ≥ 95% of lines parsed | `parsed / lines_total >= 0.95` | ✅ PASS | `test_t12_loghub_style_lines_parse` (engine), `test_t12_parse_rate_at_least_95_percent`, `test_t12_format_detected_as_auth` (test_parsers_real.py) |
| T13 | Evidence event IDs point to the correct raw lines in source files | For every alert, `event.raw == source_file_lines[event.line_no - 1].strip()`; checked > 300 times | ✅ PASS | `test_t13_evidence_points_to_the_right_raw_lines`, `test_openssh_raw_lines_match_file` |
| T14 | S1 story text matches PRD narrative | Specific narrative phrases and MITRE IDs in story text | ✅ PASS | `test_s1_story_reads_like_the_prd` |
| T15 | R11 alert uses "Possible" wording (not "Confirmed") | `alert.reason.startswith("Possible data exfiltration…")` | ✅ PASS | `test_r11_wording_is_possible_not_confirmed` |
| T16 | URL-encoded SQL injection still detected | `match_signature` and `run_analysis` fire R10 | ✅ PASS | `test_t16_url_encoded_sqli`, `test_r10_signatures[*]` |
| T17 | Shuffled or split files produce identical incidents | Incident fingerprints match between normal, shuffled, and split runs | ✅ PASS | `test_t17_shuffled_or_split_files_give_identical_incidents` |
| T18 | Reload from PostgreSQL matches in-memory result | All incident/entity/evaluation data survives DB round-trip | ⏭ SKIP | `test_t18_reload_from_postgres_matches_memory` *(needs TEST_DATABASE_URL)* |
| T19 | Failed DB save leaves no partial rows | Partial save rolls back; 0 rows for that analysis_id | ⏭ SKIP | `test_t19_failed_save_leaves_no_partial_rows` *(needs TEST_DATABASE_URL)*, `test_t19_db_unreachable_returns_503` ✅ |

> **Note**: T18 and T19 Postgres tests are skipped in this environment (no `TEST_DATABASE_URL`). The in-memory equivalents and `test_t19_db_unreachable_returns_503` pass.

---

## Real pytest summary line

Merged `bhanu` branch (engine + Claude C1–C3 + Antigravity A1–A3), with a Postgres test database:

```
TEST_DATABASE_URL=postgresql://... pytest tests -q
136 passed in 37.63s
```

Without `TEST_DATABASE_URL`: `133 passed, 3 skipped` (the 3 skipped are the Postgres T18/T19 tests).

*(43 original engine/API tests + 26 robustness + 5 report + 10 Loghub + 49 JSON-lines, plus 3 Postgres)*

---

## Success Targets (from `venv\Scripts\python -m engine.pipeline --simulate`)

| Metric | Target (PRD) | Actual |
|--------|-------------|--------|
| Scenarios detected | 5/5 | **5/5** ✅ |
| Precision | ≥ 0.90 | **1.0** ✅ |
| Recall | ≥ 0.90 | **1.0** ✅ |
| Critical false positives | 0 | **0** ✅ |
| 100k lines processing time | < 10 s | **~7.5 s** ✅ |
| 5-scenario simulation time | — | **0.21 s** |

### Scenario detection summary (from `--simulate`)

```
Scenarios detected 5/5 | precision 1.0 | recall 1.0 | critical false positives 0
    S1: ✓ inc-1 found ['185.220.101.7', 'deploy', 'sysupdate'] of ['185.220.101.7', 'deploy', 'sysupdate']
    S2: ✓ inc-2 found ['45.33.10.8', 'user05'] of ['45.33.10.8', 'user05']
    S3: ✓ inc-4 found ['45.33.10.9'] of ['45.33.10.9']
    S4: ✓ inc-5 found ['192.168.100.10', '192.168.100.11', '192.168.100.12'] of [...]
    S5: ✓ inc-3 found ['172.16.5.20', 'user15'] of ['172.16.5.20', 'user15']

Analysis took 0.21s
```

---

## New Tests Added (Tasks A1 & A2)

### `backend/tests/test_parsers_real.py` (Task A1 – 10 tests)

| Function | What it checks |
|----------|---------------|
| `test_t12_parse_rate_at_least_95_percent` | Loghub OpenSSH_2k.log: parsed/lines_total ≥ 0.95 (actual: 100%) |
| `test_t12_format_detected_as_auth` | File auto-detected as syslog 'auth' format |
| `test_openssh_failed_password_events_extracted` | SSH_FAIL events extracted with correct user + IP |
| `test_openssh_accepted_password_events_extracted` | SSH_SUCCESS event: user=fztu, ip=119.137.62.142 |
| `test_openssh_invalid_user_events_extracted` | INVALID_USER: user=webmaster, ip=173.234.31.186 |
| `test_openssh_event_ids_unique_and_correct_format` | IDs are unique, format is `filename:lineno` |
| `test_openssh_event_counts_sanity` | >300 SSH_FAIL events, >50 INVALID_USER events |
| `test_openssh_run_analysis_no_crash` | `run_analysis()` completes without exception |
| `test_openssh_run_analysis_finds_brute_force` | R1 alert present, ≥1 incident |
| `test_openssh_raw_lines_match_file` | Every `event.raw` matches the actual source line |

### `backend/tests/test_jsonl.py` (Task A2 – 48 tests)

| Class | What it checks |
|-------|---------------|
| `TestDetectFormat` (6 tests) | JSONL detection, auth/access not mis-detected, empty→None, `SUPPORTED_FORMATS` string updated |
| `TestFieldMapping` (22 tests) | All timestamp aliases, all IP aliases, user aliases, all event type mappings, event ID format, raw preservation, HTTP fields (path, ua aliases), invalid IP→None |
| `TestMalformedLines` (9 tests) | Bad JSON skipped+counted, missing timestamp, bad timestamp, missing event type, unknown event type, JSON array skipped, empty lines not counted, never raises |
| `TestAutoDetectJsonl` (1 test) | `auto_detect_and_parse()` routes to jsonl parser |
| `TestBruteForceScenario` (10 tests) | SSH brute force in JSON-lines produces R1+R4 alerts in a CRITICAL incident; attacker IP in entities; evidence IDs reference JSONL file |
