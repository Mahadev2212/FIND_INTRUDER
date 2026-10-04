"""
ChainTrace – Demo Sample Log Generator (Task A5).
Writes demo log files into backend/samples/ for live-upload demos.

Usage:
    cd backend
    venv\\Scripts\\python scripts/make_samples.py

Files generated:
    samples/demo_auth.log          – S1–S5 combined auth (seed 42)
    samples/demo_access.log        – S1–S5 combined access (seed 42)
    samples/ssh_breach_only_auth.log – S1 only
    samples/messy_auth.log         – S1 with ~20% corrupted lines (PRD T6)
    samples/ipv6_bruteforce_auth.log – brute force + success from an IPv6 address
    samples/demo_events.jsonl      – SSH brute force + login + sudo in JSON-lines format
    samples/README.md              – description of each file
"""

import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# ── Path setup ────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent          # backend/scripts/
BACKEND_DIR = SCRIPT_DIR.parent                        # backend/
REPO_ROOT = BACKEND_DIR.parent                         # repo root
SAMPLES_DIR = BACKEND_DIR / "samples"

# Add repo root so 'simulator' package is importable
sys.path.insert(0, str(REPO_ROOT))
# Add backend so 'engine', 'app' are importable
sys.path.insert(0, str(BACKEND_DIR))

SAMPLES_DIR.mkdir(exist_ok=True)

# ── Import simulator ──────────────────────────────────────────────────────────

from simulator.attacks import generate, syslog_ts  # noqa: E402

# ── Helpers ───────────────────────────────────────────────────────────────────

HOSTNAME = "web01"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
          "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def _ts(dt: datetime) -> str:
    return dt.strftime("%b %e %H:%M:%S").replace("  ", " ")


def _write(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")
    kb = len(content.encode()) / 1024
    print(f"  wrote {path.name:40s}  ({kb:,.0f} KB, {content.count(chr(10))} lines)")


# ── File 1 & 2: demo_auth.log + demo_access.log (S1–S5, seed 42) ─────────────

def make_demo_full() -> None:
    print("Generating demo_auth.log + demo_access.log  (S1–S5, seed=42)…")
    auth_text, access_text, _ = generate(["S1", "S2", "S3", "S4", "S5"], seed=42)
    _write(SAMPLES_DIR / "demo_auth.log", auth_text)
    _write(SAMPLES_DIR / "demo_access.log", access_text)


# ── File 3: ssh_breach_only_auth.log (S1 only) ───────────────────────────────

def make_ssh_breach_only() -> None:
    print("Generating ssh_breach_only_auth.log  (S1 only, seed=42)…")
    auth_text, _, _ = generate(["S1"], seed=42)
    _write(SAMPLES_DIR / "ssh_breach_only_auth.log", auth_text)


# ── File 4: messy_auth.log (S1 + ~20% corrupted lines, PRD T6) ───────────────

def make_messy() -> None:
    print("Generating messy_auth.log  (S1 + ~20% corrupted lines)…")
    rng = random.Random(99)
    auth_text, _, _ = generate(["S1"], seed=42)
    lines = auth_text.splitlines()

    garbage_templates = [
        "KERNEL: page fault at 0x{:08x}",
        "======= CORRUPT SEGMENT 0x{:04x} =======",
        "�\x00\x01\x02 binary junk here ÿÿÿÿ",
        "   ",          # whitespace-only
        "",             # blank
        "not a log line at all",
        "2026-10-04 INVALID FORMAT no host no pid",
        "Oct 99 25:99:99 badhost sshd[0]: garbled message",
        "[ERR] random application log that is not syslog",
        "###########",
    ]

    output = []
    for line in lines:
        output.append(line)
        # Insert corrupted line with ~20% probability
        if rng.random() < 0.20:
            tmpl = rng.choice(garbage_templates)
            try:
                corrupt = tmpl.format(rng.randint(0, 0xFFFF))
            except (KeyError, IndexError):
                corrupt = tmpl
            output.append(corrupt)

    _write(SAMPLES_DIR / "messy_auth.log", "\n".join(output) + "\n")


# ── File 5: ipv6_bruteforce_auth.log (brute force + success from IPv6) ────────

def make_ipv6_bruteforce() -> None:
    print("Generating ipv6_bruteforce_auth.log  (IPv6 brute force + login)…")
    rng = random.Random(7)
    IPV6 = "2a01:4f8:c17:b8f::2"   # public Tor-like IPv6
    VICTIM = "admin"
    BASE = datetime(2026, 10, 4, 5, 0, 0, tzinfo=timezone.utc)

    lines = []
    t = BASE

    # 35 failed SSH logins from IPv6
    for i in range(35):
        t += timedelta(seconds=rng.randint(6, 14))
        pid = rng.randint(5000, 5500)
        user = rng.choice(["root", "admin", "ubuntu", "deploy"])
        lines.append(
            f"{_ts(t)} {HOSTNAME} sshd[{pid}]: "
            f"Failed password for invalid user {user} from {IPV6} port {rng.randint(49000,65000)} ssh2"
        )

    # Successful login
    t += timedelta(seconds=20)
    lines.append(
        f"{_ts(t)} {HOSTNAME} sshd[5600]: "
        f"Accepted password for {VICTIM} from {IPV6} port {rng.randint(49000,65000)} ssh2"
    )

    # Sudo escalation
    t += timedelta(minutes=2)
    lines.append(
        f"{_ts(t)} {HOSTNAME} sudo: {VICTIM} : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash"
    )

    _write(SAMPLES_DIR / "ipv6_bruteforce_auth.log", "\n".join(lines) + "\n")


# ── File 6: demo_events.jsonl (SSH brute force + login + sudo in JSON-lines) ──

def make_jsonl_demo() -> None:
    print("Generating demo_events.jsonl  (SSH brute force + login + sudo in JSONL)…")
    rng = random.Random(13)
    IP = "185.220.101.99"
    VICTIM = "developer"
    BASE = datetime(2026, 10, 4, 3, 0, 0, tzinfo=timezone.utc)

    records = []
    t = BASE

    # 30 SSH failures → triggers R1
    for _ in range(30):
        t += timedelta(seconds=rng.randint(5, 12))
        records.append({
            "timestamp": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "event": "ssh_fail",
            "src_ip": IP,
            "user": rng.choice(["root", "admin", "developer"]),
            "host": HOSTNAME,
        })

    # Successful SSH login → triggers R4 (login after failures)
    t += timedelta(seconds=15)
    records.append({
        "timestamp": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": "ssh_success",
        "src_ip": IP,
        "user": VICTIM,
        "host": HOSTNAME,
    })

    # Sudo → triggers R7
    t += timedelta(minutes=3)
    records.append({
        "timestamp": t.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "event": "sudo",
        "src_ip": IP,
        "user": VICTIM,
        "host": HOSTNAME,
    })

    lines = [json.dumps(r) for r in records]
    _write(SAMPLES_DIR / "demo_events.jsonl", "\n".join(lines) + "\n")


# ── File 7: README.md ─────────────────────────────────────────────────────────

README_CONTENT = """# ChainTrace Demo Sample Logs

These files are pre-generated for live-upload demos at ALGOTHON'26 (ALG-CYBER-01).

## Files

| File | Format | Scenarios | What ChainTrace should find |
|------|--------|-----------|----------------------------|
| `demo_auth.log` | Linux auth.log | S1–S5 (seed 42) | 5 incidents incl. SSH compromise, password spray, low-and-slow, insider threat |
| `demo_access.log` | Apache/Nginx access.log | S3, S5 web activity | Web reconnaissance + large download exfiltration |
| `ssh_breach_only_auth.log` | Linux auth.log | S1 only | 1 critical incident: SSH brute force → login as deploy → sudo → useradd sysupdate |
| `messy_auth.log` | Linux auth.log | S1 + ~20% corrupted lines | Skipped count > 0 AND still detects the S1 "SSH compromise with persistence" incident (PRD T6 resilience) |
| `ipv6_bruteforce_auth.log` | Linux auth.log | Custom IPv6 brute force | R1 (SSH brute force) + R4 (login after failures) from IPv6 address `2a01:4f8:c17:b8f::2` |
| `demo_events.jsonl` | JSON-lines | Custom JSON scenario | R1 (brute force) + R4 (login after failures) + R7 (sudo after suspicious login) |

## Upload Instructions

1. Go to **ChainTrace** → **Upload Logs**
2. Drag one or more files from this folder
3. Click **Analyse**

For the full demo: upload `demo_auth.log` **and** `demo_access.log` together (multi-file upload).

## Scenario Reference

| ID | Attack | Key entities |
|----|--------|-------------|
| S1 | SSH brute force + sudo + account creation | `185.220.101.7`, user `deploy`, user `sysupdate` |
| S2 | Password spray (12 users, 1 success) | `45.33.10.8`, user `user05` |
| S3 | Web recon (gobuster) → SQLi → large download | `45.33.10.9` |
| S4 | Low-and-slow brute force (3 IPs, 6 h) | `192.168.100.10/11/12` |
| S5 | Insider off-hours access → sudo → exfiltration | `172.16.5.20`, user `user15` |

Generated by `backend/scripts/make_samples.py` — do not edit by hand.
"""


def make_readme() -> None:
    _write(SAMPLES_DIR / "README.md", README_CONTENT)


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"Writing sample files to: {SAMPLES_DIR}\n")
    make_demo_full()
    make_ssh_breach_only()
    make_messy()
    make_ipv6_bruteforce()
    make_jsonl_demo()
    make_readme()
    print("\nDone.")
