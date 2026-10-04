"""
ChainTrace – Baseline Traffic Generator.
Generates realistic normal auth.log and access.log traffic for 3 days.
Output is in the exact real log formats so the parser accepts it.
Fixed random seed for reproducible demos.
Owner: Mahadev H
"""

import random
import sys
from datetime import datetime, timedelta, timezone

SEED = 42
random.seed(SEED)

# ─── Config ───────────────────────────────────────────────────────────────────
USERS = [f"user{i:02d}" for i in range(1, 26)]  # user01 … user25
USER_IPS = {user: [f"10.0.1.{random.randint(2, 200)}" for _ in range(random.randint(1, 2))]
            for user in USERS}
WEB_IPS = [f"203.0.113.{i}" for i in range(1, 201)]
HOSTNAME = "web01"
NORMAL_PAGES = ["/", "/index.html", "/about", "/products", "/contact", "/login", "/api/status"]
START_TIME = datetime(2026, 10, 2, 8, 0, 0, tzinfo=timezone.utc)
DURATION_DAYS = 3


def syslog_ts(dt: datetime) -> str:
    return dt.strftime("%b %e %H:%M:%S").replace("  ", " ")


def access_ts(dt: datetime) -> str:
    return dt.strftime("%d/%b/%Y:%H:%M:%S +0530")


def gen_auth_log(output_file="simulator/baseline_auth.log"):
    lines = []
    current = START_TIME

    for _ in range(DURATION_DAYS * 24 * 10):  # ~720 events over 3 days
        # Pick a random user and one of their known IPs
        user = random.choice(USERS)
        ip = random.choice(USER_IPS[user])

        # Only log in during normal hours (08–20)
        hour = random.randint(8, 19)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        day_offset = timedelta(days=random.randint(0, DURATION_DAYS - 1))
        dt = START_TIME.replace(hour=hour, minute=minute, second=second) + day_offset
        pid = random.randint(1000, 9999)
        port = random.randint(49152, 65535)

        # Occasional single typo failure followed by success
        if random.random() < 0.08:
            lines.append(
                f"{syslog_ts(dt)} {HOSTNAME} sshd[{pid}]: "
                f"Failed password for {user} from {ip} port {port} ssh2"
            )
            dt += timedelta(seconds=random.randint(3, 15))
            pid += 1

        lines.append(
            f"{syslog_ts(dt)} {HOSTNAME} sshd[{pid}]: "
            f"Accepted password for {user} from {ip} port {port} ssh2"
        )

    lines.sort()  # approximate chronological order
    with open(output_file, "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"[baseline] auth.log written: {len(lines)} lines -> {output_file}")


def gen_access_log(output_file="simulator/baseline_access.log"):
    lines = []

    for _ in range(DURATION_DAYS * 24 * 200 // 3):  # ~200 requests/hr
        ip = random.choice(WEB_IPS)
        day_offset = timedelta(days=random.randint(0, DURATION_DAYS - 1))
        hour = random.randint(0, 23)
        dt = START_TIME.replace(hour=hour,
                                 minute=random.randint(0, 59),
                                 second=random.randint(0, 59)) + day_offset
        page = random.choice(NORMAL_PAGES)
        status = 200 if random.random() > 0.05 else 404  # 5% 404s
        size = random.randint(500, 15000) if status == 200 else random.randint(100, 500)
        ua = random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15",
            "Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/128.0",
        ])
        lines.append(
            f'{ip} - - [{access_ts(dt)}] "GET {page} HTTP/1.1" {status} {size} "-" "{ua}"'
        )

    lines.sort()
    with open(output_file, "w") as f:
        f.write("\n".join(lines) + "\n")

    print(f"[baseline] access.log written: {len(lines)} lines -> {output_file}")


if __name__ == "__main__":
    gen_auth_log()
    gen_access_log()
    print("[baseline] Done. Hand both files to Bhanu's attacks.py for injection.")
