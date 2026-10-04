# ChainTrace 🔍

> **From thousands of log lines to one attack story.**

[![Hackathon](https://img.shields.io/badge/ALGOTHON'26-ALG--CYBER--01-blueviolet?style=for-the-badge)](https://github.com/Mahadev2212/FIND_INTRUDER)
[![Python](https://img.shields.io/badge/Python-3.11-blue?style=for-the-badge&logo=python)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org)

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Our Solution](#-our-solution)
- [What Makes It Innovative](#-what-makes-it-innovative)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Quick Start](#-quick-start)
- [Detection Rules](#-detection-rules)
- [Attack Scenarios](#-attack-scenarios)
- [API Reference](#-api-reference)
- [Testing](#-testing)
- [Team](#-team)
- [Known Limitations](#-known-limitations)
- [Disclosures](#-disclosures)

---

## 🔴 Problem Statement

**Official (ALG-CYBER-01):** Thousands of security events can hide an attacker among normal activity. Build a system that identifies suspicious behavior from logs, identifies suspicious users/IPs, connects related events and creates an incident timeline.

**The real problem:** Security analysts don't lack alerts — they drown in them. A server produces tens of thousands of log lines per day. Typical tools flag each suspicious line in isolation: "50 failed logins", "sudo used", "new user created". Each alert on its own looks minor, so analysts miss that these three are *one attacker* breaking in, escalating privileges, and leaving a backdoor.

### Three Specific Gaps We Target

| Gap | Problem |
|-----|---------|
| **Isolation** | Events are flagged one by one; nobody connects the brute force on an IP to the sudo command run later by a user account |
| **Quiet attacks** | Simple thresholds catch loud brute force but miss password spraying and low-and-slow attacks spread over hours and IPs |
| **No proof** | Alerts say "suspicious" without showing the exact raw log lines and the reason |

---

## 💡 Our Solution

ChainTrace is a web app. The analyst uploads server logs (or runs a built-in attack simulation). ChainTrace:

1. **Parses** every line (auth.log + access.log), auto-detecting format
2. **Normalizes** into a standard Event schema, merges and sorts by timestamp
3. **Detects** using 11 deterministic rules + per-user baseline
4. **Scores** each IP and user (points × kill-chain multiplier, capped at 100)
5. **Correlates** alerts into incidents via IP/user/subnet graph + IP→user pivot
6. **Explains** with plain-English attack stories mapped to MITRE ATT&CK
7. **Presents** via a polished dashboard with click-to-evidence

### Example Output (What Judges Will See)

> **Incident #1 — Critical (risk 94): SSH compromise with persistence**
>
> Between 02:03 and 02:41, IP 185.220.101.7 made 214 failed SSH logins against 3 accounts (Credential Access, T1110.001). At 02:41 it logged in successfully as `deploy` — the first login for this account from this IP and outside its normal 09:00–18:00 hours (Initial Access, T1078). Within 4 minutes `deploy` ran sudo as root (Privilege Escalation, T1548.003) and created a new account `sysupdate` (Persistence, T1136.001).
>
> **Assessment:** likely successful SSH compromise with a backdoor account.
> **Recommended:** disable `deploy` and `sysupdate`, block 185.220.101.7, rotate credentials.

---

## 🚀 What Makes It Innovative

| Innovation | Why It Matters | Typical Team |
|------------|----------------|--------------|
| **Attack stories, not alert lists** | Incidents written as chronological narrative mapped to kill-chain stages and MITRE ATT&CK, with assessment and recommended response | Shows a table of alerts |
| **IP→user pivot correlation** | A successful login from an attacking IP links that IP to everything the account does afterwards | Groups only by IP |
| **Catches quiet attacks** | Password spraying (one IP, many users, few tries each) and low-and-slow brute force over a /24 subnet over hours | Only catches loud brute force |
| **Built-in attack simulator with ground truth** | Generates realistic normal traffic and injects chosen attacks with labels; judges pick attacks live | Hand-made demo file, no metrics |
| **Evidence by design** | Every alert stores the raw line numbers that triggered it; click any story step → see exact log lines | "Suspicious" with no proof |
| **Deterministic and explainable** | No LLM guessing; same input always gives same output; every decision traces to a named rule | Black-box AI summary |
| **Risk accumulation** | Weak signals add up; incidents spanning more kill-chain stages get higher multiplier | Every alert is equal |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ChainTrace System                           │
│                                                                     │
│  ┌────────────────┐    ┌────────────────────────────────────────┐  │
│  │    Browser     │    │           FastAPI Backend              │  │
│  │                │    │                                        │  │
│  │  React + Vite  │◄──►│  POST /api/analyze                    │  │
│  │  Tailwind CSS  │    │  POST /api/simulate                    │  │
│  │  React Router  │    │  GET  /api/analyses/{id}/summary       │  │
│  │  Recharts      │    │  GET  /api/analyses/{id}/incidents     │  │
│  └────────────────┘    │  GET  /api/analyses/{id}/incidents/{i} │  │
│                         │  GET  /api/analyses/{id}/entities      │  │
│                         │  GET  /api/analyses/{id}/evaluation    │  │
│                         │  GET  /api/analyses                    │  │
│                         │                                        │  │
│                         │  ┌──────────────────────────────────┐ │  │
│                         │  │     Detection Engine (memory)    │ │  │
│                         │  │                                  │ │  │
│                         │  │  parsers.py  → auto-detect       │ │  │
│                         │  │  baseline.py → per-user profile  │ │  │
│                         │  │  rules.py    → R1–R11            │ │  │
│                         │  │  scoring.py  → risk 0–100        │ │  │
│                         │  │  correlate.py→ union-find graph  │ │  │
│                         │  │  story.py    → MITRE narrative   │ │  │
│                         │  └────────────────┬─────────────────┘ │  │
│                         │                   │ 1 transaction      │  │
│                         └───────────────────┼────────────────────┘  │
│                                             ▼                       │
│                         ┌────────────────────────────────┐         │
│                         │       PostgreSQL 15+            │         │
│                         │  analyses | events | alerts     │         │
│                         │  incidents | entities           │         │
│                         └────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

**Data flow:** raw logs → normalized events → alerts → scored incidents → attack story → UI

> **Key rule:** The engine runs entirely in memory. PostgreSQL only stores the finished result. Upload → parse → detect → correlate in Python → write everything in **one transaction** → API reads from Postgres. A database problem can never break detection.

---

## 🛠️ Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic | Typed contract; Bhanu already knows FastAPI |
| **Detection** | Plain Python (collections, re, datetime) | Fast, deterministic, no heavy dependencies |
| **Storage** | PostgreSQL 15+ via psycopg 3 (plain SQL, one schema.sql, JSONB) | Analyses survive restarts; JSONB keeps story/evidence simple |
| **Frontend** | React + Vite, Tailwind CSS, Recharts, React Router | Fast scaffold, ready-made charts |
| **Testing** | pytest (engine), manual UI checklist | Engine correctness is what judges probe |
| **Deploy** | One service on Render/Railway + managed Postgres (Neon/Supabase/Render) | One URL, no CORS issues |

---

## 📁 Repository Structure

```
FIND_INTRUDER/                          ← repository root
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app, routes, serves frontend build   (Bhanu)
│   │   ├── schemas.py         # Event, Alert, Incident, Entity models         (Bhanu, frozen H1)
│   │   └── db.py              # connection pool, save/load analysis, COPY     (Bhanu)
│   ├── db/
│   │   └── schema.sql         # all CREATE TABLE + indexes                    (Bhanu, H1)
│   ├── engine/
│   │   ├── parsers.py         # auth.log + access.log parsers, auto-detect    (Bhanu)
│   │   ├── rules.py           # R1–R11                                        (Bhanu)
│   │   ├── baseline.py        # per-user normal hours / known IPs             (Bhanu)
│   │   ├── scoring.py         # risk scoring                                  (Bhanu)
│   │   ├── correlate.py       # alert graph + union-find → incidents          (Bhanu)
│   │   ├── story.py           # attack story + MITRE + recommendations        (Bhanu)
│   │   └── evaluate.py        # precision / recall vs ground truth            (Bhanu)
│   ├── tests/
│   │   └── test_engine.py     # pytest                                        (Bhanu)
│   ├── config.yaml            # ALL thresholds in one place                   (Bhanu)
│   ├── requirements.txt
│   └── .env.example           # DATABASE_URL=postgresql://...                 (Bhanu)
├── simulator/
│   ├── baseline.py            # normal users + web traffic (3 days, seed 42)  (Mahadev)
│   └── attacks.py             # 5 attack scenarios + labels.json              (Bhanu)
├── frontend/
│   └── src/
│       ├── pages/             # Home, Overview, Incidents, IncidentDetail,
│       │                      # Entities, Evaluation                          (Mahadev)
│       ├── components/        # shared UI components                          (Mahadev)
│       ├── api/
│       │   └── api.js         # api client with USE_MOCKS flag                (Mahadev)
│       └── mocks/             # mock JSON for all endpoints                   (Mahadev)
├── docs/
│   ├── architecture.md        # architecture diagram                          (Mahadev)
│   └── demo_script.md         # 3-minute demo script                          (Mahadev)
└── README.md                                                                  (Mahadev)
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/Mahadev2212/FIND_INTRUDER.git
cd FIND_INTRUDER

# 2. Set up Python environment
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 3. Configure database
cp .env.example .env
# Edit .env and set your DATABASE_URL

# 4. Create database schema
psql $DATABASE_URL -f db/schema.sql

# 5. Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Generate Simulation Data

```bash
# Step 1: Generate baseline traffic (Mahadev's task)
cd simulator
python baseline.py

# Step 2: Inject attacks into baseline (Bhanu's task)
python attacks.py

# Output: combined_auth.log, combined_access.log, labels.json
```

### Run Tests

```bash
cd backend
pytest tests/ -v
```

---

## 🔎 Detection Rules

All thresholds live in `backend/config.yaml` and can be tuned without touching code.

| ID | Rule | Logic | Severity | Stage / MITRE | Priority |
|----|------|-------|----------|---------------|----------|
| R1 | SSH brute force | ≥10 failed logins from one IP within 5 min | High | Credential Access / T1110.001 | P0 |
| R2 | Password spraying | One IP fails for ≥5 distinct usernames within 10 min | High | Credential Access / T1110.003 | P0 |
| R3 | Low-and-slow brute force | ≥15 failures over 6h across one /24 subnet | Medium | Credential Access / T1110 | P1 |
| R4 | Login after failures | Successful login from IP with ≥5 failures in previous 60 min | **Critical** | Initial Access / T1078 | P0 |
| R5 | Off-hours login | Success outside user's learned hours (default 08–20) | Medium | Initial Access / T1078 | P1 |
| R6 | New source IP | Success for a user from an IP never seen in baseline | Low | Initial Access / T1078 | P1 |
| R7 | Privilege use after suspicious login | sudo/su by user within 60 min of R4/R5/R6 login | High | Privilege Escalation / T1548.003 | P0 |
| R8 | Account created / added to sudo | useradd, or usermod adding user to sudo/wheel | **Critical** | Persistence / T1136.001, T1098 | P0 |
| R9 | Web scanning | ≥30 HTTP 404s from one IP in 5 min, or scanner user-agent | Medium | Reconnaissance / T1595 | P0 |
| R10 | Web attack payload | URL-decoded path/query matches documented signature set | High | Initial Access / T1190 | P0 |
| R11 | Possible large data transfer | HTTP response bytes to one IP in 10 min > 50MB or > 20× median | High | Exfiltration / TA0010 | P1 |

### Risk Scoring

- **Points:** low=10, medium=20, high=35, critical=50
- **Chain multiplier:** 1 stage ×1.0 | 2 stages ×1.3 | 3+ stages ×1.6
- **Levels:** 0–29 low | 30–59 medium | 60–79 high | 80–100 critical

---

## 🎯 Attack Scenarios (Simulator)

| ID | Scenario | Injected Behaviour | Expected Stages |
|----|----------|--------------------|-----------------|
| S1 | SSH breach | Brute force from one IP → success as `deploy` → sudo → useradd `sysupdate` | Cred. Access, Initial Access, Priv. Esc., Persistence |
| S2 | Password spray | One IP tries 12 users × 2 attempts; one succeeds | Cred. Access, Initial Access |
| S3 | Web recon to exfil | gobuster 404 flood → SQLi attempts → 200 on /admin → 80 MB download | Recon, Initial Access, Exfiltration |
| S4 | Low and slow | 3 IPs in one /24, ~8 attempts each over 6h (24 total, ~1 every 15 min) | Cred. Access |
| S5 | Insider off-hours | Valid user logs in at 03:10 from new IP → sudo → large download | Initial Access, Priv. Esc., Exfiltration |

**Baseline traffic (Mahadev):** 25 users logging in 08:00–20:00 from 1–2 fixed IPs each, occasional single typo failures, ~200 web clients browsing normal pages with a few 404s, over 3 days, fixed random seed 42.

---

## 📡 API Reference

| Method + Path | Purpose | Returns |
|---------------|---------|---------|
| `POST /api/analyze` | Upload 1+ log files (multipart) | `{analysis_id, stats}` |
| `POST /api/simulate` | Body `{scenarios:[..], seed}`; generate & analyse | Same + `has_ground_truth: true` |
| `GET /api/analyses` | List previous analyses (newest first) | `[{id, created_at, source, stats}]` |
| `GET /api/analyses/{id}/summary` | Overview cards + histogram + top entities | Summary object |
| `GET /api/analyses/{id}/incidents` | Incident list sorted by risk | `Incident[]` (without story) |
| `GET /api/analyses/{id}/incidents/{iid}` | Full incident with story, alerts, evidence | `Incident + Alert[] + Event[]` |
| `GET /api/analyses/{id}/entities` | Risk-scored IPs and users | `Entity[]` |
| `GET /api/analyses/{id}/evaluation` | Precision/recall (simulated runs only) | Metrics object |
| `GET /api/health` | Liveness check incl. DB ping | `{status: ok, db: ok}` |

---

## 🧪 Testing

### Test Cases

| ID | Test | Expected Result | Owner |
|----|------|-----------------|-------|
| T1 | Baseline only (no attacks) | 0 critical incidents, at most 1 high | Bhanu |
| T2 | Each scenario S1–S5 separately | Exactly one incident with expected entities and stages | Bhanu |
| T3 | All 5 scenarios together | 5 separate incidents – not merged into one | Bhanu |
| T4 | Empty file | HTTP 400: "no parsable lines"; UI shows message | Both |
| T5 | Binary / image file | Rejected with clear error, no crash | Both |
| T6 | 20% malformed lines mixed in | Rest parsed; skipped count shown in UI | Bhanu |
| T7 | Unknown log format | Error lists supported formats | Bhanu |
| T8 | auth.log crossing 31 Dec → 1 Jan | Timeline order still correct | Bhanu |
| T9 | IPv6 addresses | Parsed and detected like IPv4 | Bhanu |
| T10 | 100,000 lines | Analysis completes in under 10 seconds | Bhanu |
| T11 | Same file uploaded twice | Identical results (deterministic) | Bhanu |
| T12 | Real-world Loghub OpenSSH sample | ≥95% of lines parsed | Bhanu |
| T13 | Evidence integrity | Every alert's line numbers point to correct raw lines | Bhanu |
| T14 | Backend down | UI shows error banner, not a blank screen | Mahadev |
| T15 | Full demo flow on deployed URL | Upload → overview → incident → evidence → evaluation | Both |
| T16 | URL-encoded SQLi | R10 fires because requests are decoded before matching | Bhanu |
| T17 | Same logs shuffled or split across two files | Identical incidents to sorted single-file run | Bhanu |
| T18 | Restart backend, open old analysis | Incidents, story and evidence load from PostgreSQL unchanged | Bhanu |
| T19 | Database unreachable during upload | Clear HTTP 503; no partial rows (single transaction); UI banner | Both |

### Success Targets

| Metric | Target |
|--------|--------|
| Scenarios detected | **5/5** |
| Precision (entity level) | ≥ 90% |
| Recall (entity level) | ≥ 90% |
| Critical false positives | 0 (baseline-only data) |
| 100k lines analysis time | < 10 seconds |

### Running Tests

```bash
cd backend
pytest tests/ -v --tb=short

# Example output:
# tests/test_engine.py::test_r1_detects_brute_force PASSED
# tests/test_engine.py::test_r4_detects_login_after_failures PASSED
# ...
```

---

## 👥 Team

| Team Member | Role | Owns |
|-------------|------|------|
| **Bhanu Prasad** | Lead / Detection Engineer | Parsers, detection rules, scoring, correlation, attack story, backend API, attack simulator, evaluation, integration, deployment |
| **Mahadev H** | Frontend + Data + Docs | React dashboard, all UI pages, baseline traffic generator, README, architecture diagram, slides, demo video |

**Guiding Principle:** A simple solution that works is better than a complex solution that doesn't. Every feature was chosen because it can be built, integrated, and tested inside 12 hours.

---

## ⚠️ Known Limitations

- **Supports two log formats** (Linux auth.log, Apache/Nginx access.log). Future: Windows Event Logs, firewall logs, JSON lines.
- **Batch analysis only** — future: streaming ingestion and live alerts.
- **Rule-based core** — rules can miss novel attacks; mitigated by per-user baseline and optional Isolation Forest (P2). Future: ML anomaly scoring.
- **No user accounts** — single-user web app; future: multi-user cases, analyst notes.
- **No threat-intel enrichment** — future: IP reputation and GeoIP for impossible-travel detection.
- **auth.log has no year or timezone** — handled with configurable defaults and a rollover test (T8).
- **Synthetic data** can look "rigged" — mitigated by also testing on the real Loghub OpenSSH sample and allowing judges to pick scenarios live.

---

## 📢 Disclosures

- **Datasets:** [Loghub OpenSSH sample](https://github.com/logpai/loghub) (public, used for real-world parser validation T12). All simulation data is synthetic.
- **External APIs:** None. ChainTrace runs entirely offline — no external API calls.
- **AI tools used during development:** Antigravity IDE (Google DeepMind) assisted with code scaffolding and README authoring. All detection logic, data contracts, and architecture decisions were made by the team.
- **No real systems attacked or scanned.** All logs are synthetic or from the public Loghub dataset.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

*Built in 12 hours for ALGOTHON'26 — ALG-CYBER-01 — Find The Intruder*