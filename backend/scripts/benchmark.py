"""
ChainTrace – Performance Benchmark (Task A6).
PRD target: 100k lines analysed in < 10 s.

Generates realistic auth + access logs at 10k, 50k, 100k, and 200k lines
(with attack events mixed in), times run_analysis() 3× each, and prints a table.

Usage:
    cd backend
    venv\\Scripts\\python scripts/benchmark.py
"""

import os
import random
import sys
import time
from datetime import datetime, timedelta, timezone
from typing import List, Tuple

# ── Path setup ────────────────────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))    # backend/scripts/
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)                  # backend/
REPO_ROOT = os.path.dirname(BACKEND_DIR)                   # repo root

sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, REPO_ROOT)

from engine.pipeline import run_analysis  # noqa: E402

# ── Log generators ────────────────────────────────────────────────────────────

HOSTNAME = "web01"
USERS = [f"user{i:02d}" for i in range(1, 26)]
USER_IPS = {u: [f"10.0.1.{i + 2}"] for i, u in enumerate(USERS)}
NORMAL_WEB_IPS = [f"203.0.113.{i}" for i in range(1, 201)]
NORMAL_PAGES = ["/", "/index.html", "/about", "/products", "/contact", "/login", "/api/status"]

ATTACKER_SSH_IP = "185.220.101.7"
ATTACKER_WEB_IP = "45.33.10.9"

START_TIME = datetime(2026, 10, 2, 8, 0, 0, tzinfo=timezone.utc)
DURATION_DAYS = 3


def _syslog_ts(dt: datetime) -> str:
    return dt.strftime("%b %e %H:%M:%S").replace("  ", " ")


def _access_ts(dt: datetime) -> str:
    return dt.strftime("%d/%b/%Y:%H:%M:%S +0530")


def _gen_auth_lines(n: int, seed: int = 42) -> List[str]:
    """
    Generate `n` realistic auth.log lines modeled on simulator/baseline.py.
    Most events are normal user logins during business hours (08-19) from known IPs,
    with S1 SSH brute force + success + sudo injected.
    """
    rng = random.Random(seed)
    lines = []

    # Inject S1 attack events
    t_atk = START_TIME + timedelta(days=2, hours=2)  # off hours attack
    # 30 failed SSH logins (triggers R1)
    for _ in range(30):
        t_atk += timedelta(seconds=rng.randint(6, 12))
        pid = rng.randint(2000, 3000)
        u = rng.choice(["root", "admin", "deploy"])
        port = rng.randint(49152, 65535)
        lines.append(
            f"{_syslog_ts(t_atk)} {HOSTNAME} sshd[{pid}]: "
            f"Failed password for invalid user {u} from {ATTACKER_SSH_IP} port {port} ssh2"
        )

    # Login success as deploy (triggers R4)
    t_atk += timedelta(seconds=15)
    lines.append(
        f"{_syslog_ts(t_atk)} {HOSTNAME} sshd[3001]: "
        f"Accepted password for deploy from {ATTACKER_SSH_IP} port 51877 ssh2"
    )

    # Sudo (triggers R7)
    t_atk += timedelta(minutes=2)
    lines.append(
        f"{_syslog_ts(t_atk)} {HOSTNAME} sudo: deploy : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash"
    )

    # useradd (triggers R8)
    t_atk += timedelta(minutes=2)
    lines.append(
        f"{_syslog_ts(t_atk)} {HOSTNAME} useradd[3050]: new user: name=sysupdate, UID=1005, GID=1005"
    )

    # Generate remaining as normal baseline traffic
    remaining = max(0, n - len(lines))
    for _ in range(remaining):
        user = rng.choice(USERS)
        ip = USER_IPS[user][0]
        day_offset = timedelta(days=rng.randint(0, DURATION_DAYS - 1))
        hour = rng.randint(8, 19)
        dt = START_TIME.replace(hour=hour, minute=rng.randint(0, 59), second=rng.randint(0, 59)) + day_offset
        pid = rng.randint(1000, 9999)
        port = rng.randint(49152, 65535)

        # Occasional 1-off typo failure (normal background noise, <0.1%)
        if rng.random() < 0.001:
            lines.append(
                f"{_syslog_ts(dt)} {HOSTNAME} sshd[{pid}]: "
                f"Failed password for {user} from {ip} port {port} ssh2"
            )
            dt += timedelta(seconds=rng.randint(3, 10))
            pid += 1

        lines.append(
            f"{_syslog_ts(dt)} {HOSTNAME} sshd[{pid}]: "
            f"Accepted password for {user} from {ip} port {port} ssh2"
        )

    lines.sort()
    return lines[:n]


def _gen_access_lines(n: int, seed: int = 42) -> List[str]:
    """
    Generate `n` realistic access.log lines.
    Most events are normal web requests, with S3 web recon + exfil injected.
    """
    rng = random.Random(seed + 1000)
    lines = []

    # Inject S3 attack: 50 404 scans + SQLi + 80MB exfil
    t_atk = START_TIME + timedelta(days=2, hours=14)
    paths = [f"/admin{i}" for i in range(10)] + [f"/backup{i}.zip" for i in range(10)] + [f"/wp-admin/{i}" for i in range(10)]
    for p in paths:
        t_atk += timedelta(seconds=rng.randint(1, 2))
        lines.append(
            f'{ATTACKER_WEB_IP} - - [{_access_ts(t_atk)}] "GET {p} HTTP/1.1" 404 512 "-" "gobuster/3.6"'
        )

    t_atk += timedelta(seconds=5)
    lines.append(
        f'{ATTACKER_WEB_IP} - - [{_access_ts(t_atk)}] "GET /login.php?id=1\'%20OR%20\'1\'=\'1 HTTP/1.1" 200 512 "-" "sqlmap/1.8"'
    )

    t_atk += timedelta(seconds=20)
    lines.append(
        f'{ATTACKER_WEB_IP} - - [{_access_ts(t_atk)}] "GET /admin HTTP/1.1" 200 81920000 "-" "curl/7.88.1"'
    )

    # Remaining normal traffic
    remaining = max(0, n - len(lines))
    for _ in range(remaining):
        ip = rng.choice(NORMAL_WEB_IPS)
        day_offset = timedelta(days=rng.randint(0, DURATION_DAYS - 1))
        hour = rng.randint(0, 23)
        dt = START_TIME.replace(hour=hour, minute=rng.randint(0, 59), second=rng.randint(0, 59)) + day_offset
        page = rng.choice(NORMAL_PAGES)
        status = 200 if rng.random() > 0.05 else 404
        size = rng.randint(500, 15000) if status == 200 else rng.randint(100, 500)
        lines.append(
            f'{ip} - - [{_access_ts(dt)}] "GET {page} HTTP/1.1" {status} {size} "-" "Mozilla/5.0"'
        )

    lines.sort()
    return lines[:n]


def _gen_logs(target_lines: int, seed: int = 42) -> Tuple[str, str]:
    """
    Split target_lines roughly 60/40 between auth and access.
    Returns (auth_text, access_text).
    """
    auth_n = int(target_lines * 0.6)
    access_n = target_lines - auth_n
    auth_lines = _gen_auth_lines(auth_n, seed)
    access_lines = _gen_access_lines(access_n, seed)
    return "\n".join(auth_lines) + "\n", "\n".join(access_lines) + "\n"


# ── Benchmark runner ──────────────────────────────────────────────────────────

def _benchmark_one(files: list, target_lines: int, repeats: int = 3) -> dict:
    """
    Time run_analysis() on pre-generated log content.
    Logs are generated once outside this function so generation overhead
    is excluded from the benchmark.
    """
    times = []
    result = None
    for _ in range(repeats):
        t0 = time.perf_counter()
        result = run_analysis(files)
        times.append(time.perf_counter() - t0)

    best = min(times)
    return {
        "target_lines": target_lines,
        "actual_lines": result.stats.lines_total,
        "seconds": best,
        "lines_per_sec": result.stats.lines_total / best,
        "alerts": result.stats.alerts,
        "incidents": result.stats.incidents,
    }


# ── Table printer ─────────────────────────────────────────────────────────────

def _print_table(rows: list, target_sec: float = 10.0) -> None:
    print()
    header = (
        f"{'Lines':>9}  {'Time (s)':>8}  {'Lines/s':>10}  "
        f"{'Alerts':>7}  {'Incidents':>9}  {'vs target':>10}"
    )
    sep = "-" * len(header)
    print(sep)
    print(header)
    print(sep)
    for r in rows:
        pct = r["seconds"] / target_sec * 100
        flag = " ✓" if pct <= 100 else " ✗"
        print(
            f"{r['actual_lines']:>9,}  {r['seconds']:>8.2f}  {r['lines_per_sec']:>10,.0f}  "
            f"{r['alerts']:>7}  {r['incidents']:>9}  {pct:>9.0f}%{flag}"
        )
    print(sep)


# ── Main ──────────────────────────────────────────────────────────────────────

SIZES = [10_000, 50_000, 100_000, 200_000]
TARGET_LINES = 100_000
TARGET_SEC = 10.0
REPEATS = 3


def main() -> None:
    import platform
    print(f"Python {sys.version}")
    print(f"Platform: {platform.platform()}")
    print(f"PRD target: {TARGET_LINES:,} lines < {TARGET_SEC} s")
    print(f"Repeating each size {REPEATS}× and taking best time.\n")
    print("Pre-generating log content (excluded from benchmark timing)…")

    # Pre-generate all log sizes once (generation is not being measured)
    pregenerated = {}
    for n in SIZES:
        auth_text, access_text = _gen_logs(n)
        pregenerated[n] = [("auth.log", auth_text), ("access.log", access_text)]
        actual_lines = auth_text.count("\n") + access_text.count("\n")
        print(f"  {n:>7,} requested → {actual_lines:>7,} actual lines generated")

    print()
    rows = []
    for n in SIZES:
        print(f"  Benchmarking {n:>7,} lines …", end="", flush=True)
        r = _benchmark_one(pregenerated[n], n, repeats=REPEATS)
        rows.append(r)
        print(f"  {r['seconds']:.2f}s  ({r['lines_per_sec']:,.0f} lines/s)")

    _print_table(rows, TARGET_SEC)

    # Find the 100k row
    row_100k = next(r for r in rows if r["target_lines"] == TARGET_LINES)
    if row_100k["seconds"] < TARGET_SEC:
        conclusion = (
            f"✓ PASS – {TARGET_LINES:,} lines analysed in "
            f"{row_100k['seconds']:.2f}s (target: < {TARGET_SEC}s)"
        )
    else:
        conclusion = (
            f"✗ FAIL – {TARGET_LINES:,} lines took {row_100k['seconds']:.2f}s "
            f"(target: < {TARGET_SEC}s)"
        )
    print(f"\nConclusion: {conclusion}\n")
    return rows, row_100k, conclusion


if __name__ == "__main__":
    main()
