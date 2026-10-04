# Bhanu's remaining work: split between two AIs

Base: branch `bhanu` (engine, API, Postgres and 46 tests already done).
Each AI works in **its own clone**, on **its own branch**, and edits **only the files it owns**.
No file is owned by both, so the two branches merge into `bhanu` without conflicts.

| | Claude (Claude Code) | Antigravity |
|---|---|---|
| Folder | `algohack/FIND_INTRUDER_claude` | `algohack/FIND_INTRUDER_antigravity` |
| Branch | `bhanu-claude` | `bhanu-antigravity` |
| Push to | `origin bhanu-claude` only | `origin bhanu-antigravity` only |

## Claude: 3 tasks

| # | Task | PRD ref |
|---|------|---------|
| C1 | Multi-seed robustness and threshold tuning: run S1–S5 and baseline-only over many seeds; fix any missed scenario or false positive | B9, T1–T3 |
| C2 | Incident report export (P2): `GET /api/analyses/{id}/incidents/{iid}/report?format=md\|json`, downloadable | P2 "export incident report" |
| C3 | Deployment (one service + Postgres): Dockerfile, `render.yaml`, start script, frontend-build serving, deploy guide | B10 |

**Files Claude owns (only Claude edits these):**
`backend/engine/rules.py`, `backend/engine/baseline.py`, `backend/engine/scoring.py`,
`backend/engine/correlate.py`, `backend/engine/story.py`, `backend/engine/evaluate.py`,
`backend/engine/pipeline.py`, `backend/engine/report.py` (new), `backend/app/main.py`,
`backend/app/db.py`, `backend/config.yaml`, `backend/requirements.txt`,
`backend/tests/test_robustness.py` (new), `backend/tests/test_report.py` (new),
`Dockerfile`, `.dockerignore`, `render.yaml`, `backend/start.sh`, `docs/deployment.md` (new).

## Antigravity: 3 tasks

| # | Task | PRD ref |
|---|------|---------|
| A1 | Real-world Loghub OpenSSH validation (T12): add the public `OpenSSH_2k.log` sample to `backend/tests/data/`, test that ≥95% of lines parse, and harden `parsers.py` if needed | B2, T12 |
| A2 | Generic JSON-lines log format (P2): auto-detect and parse one-JSON-object-per-line logs into the existing Event schema | P2 |
| A3 | Testing evidence and known limitations: `docs/testing.md` (T1–T19 results table + real pytest output) and `docs/known_limitations.md` | Submission checklist |

**Files Antigravity owns (only Antigravity edits these):**
`backend/engine/parsers.py`, `backend/tests/test_parsers_real.py` (new),
`backend/tests/test_jsonl.py` (new), `backend/tests/data/` (new folder),
`docs/testing.md` (new), `docs/known_limitations.md` (new).

## Rules for both
1. Do not edit a file the other AI owns. If you need a change there, write it under "Requests" at the bottom of this file in **your own branch's** commit message instead.
2. Never edit `backend/app/schemas.py` (frozen contract), or Mahadev's files (`frontend/`, `simulator/baseline.py`, `README.md`).
3. Before pushing: `cd backend && pytest tests -q` must pass.
4. Push only to your own branch. Bhanu merges both into `bhanu`.

## Prompt to paste into Antigravity

```
You are working on ChainTrace (ALGOTHON'26, ALG-CYBER-01). Read docs/BHANU_WORK_SPLIT.md and the PRD
(ChainTrace_PRD_ALG-CYBER-01_v1.2.pdf). You do ONLY the Antigravity tasks A1, A2, A3.

Setup:
  cd "C:\Users\Bhanu Prasad\OneDrive\Desktop\algohack"
  git clone -b bhanu https://github.com/Mahadev2212/FIND_INTRUDER.git FIND_INTRUDER_antigravity
  cd FIND_INTRUDER_antigravity && git checkout -b bhanu-antigravity
  cd backend && python -m venv venv && venv\Scripts\pip install -r requirements.txt

Edit ONLY these files: backend/engine/parsers.py, backend/tests/test_parsers_real.py,
backend/tests/test_jsonl.py, backend/tests/data/*, docs/testing.md, docs/known_limitations.md.
Do NOT touch any other file (another AI owns them); do not edit schemas.py.

A1: Download the public Loghub OpenSSH sample
    https://raw.githubusercontent.com/logpai/loghub/master/OpenSSH/OpenSSH_2k.log
    to backend/tests/data/OpenSSH_2k.log. The existing test_t12_loghub_style_lines_parse in
    test_engine.py picks it up automatically. Add test_parsers_real.py checking: >=95% of lines
    parsed, Failed/Accepted/Invalid user events extracted, and that run_analysis() on it produces
    brute-force incidents without crashing. Harden parsers.py if any common sshd line is skipped.
A2: In parsers.py add a JSON-lines format: each line is a JSON object with keys like
    timestamp/ts/time, src_ip/ip/client_ip, user/username, event/type/action, and optional HTTP keys
    (method, path/url, status, bytes, user_agent). Map to the existing EventType values only.
    Extend detect_format() / auto_detect_and_parse() so "jsonl" is detected, and add it to
    SUPPORTED_FORMATS. Malformed lines are skipped and counted. Tests in test_jsonl.py (include an
    SSH brute force in JSON lines that triggers R1 + R4 via run_analysis).
A3: Run `pytest tests -v` and write docs/testing.md: a table of T1-T19 (ID, test, expected, result,
    test function name) plus the real pytest summary. Write docs/known_limitations.md from PRD
    section 14 plus anything found while testing.

Before pushing: cd backend && venv\Scripts\python -m pytest tests -q (all must pass).
Commit and push ONLY to your branch: git push -u origin bhanu-antigravity
```
