"""
ChainTrace – Attack Scenario Injector.
Appends 5 attack scenarios (S1–S5) to baseline logs and writes labels.json.
Owner: Bhanu Prasad
"""

import json
import os
import random
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

SEED = 42
random.seed(SEED)

HOSTNAME = "web01"
ATTACKER_IPS = {
    "S1": "185.220.101.7",
    "S2": "45.33.10.8",
    "S3": "45.33.10.9",
    "S4_IPS": ["192.168.100.10", "192.168.100.11", "192.168.100.12"],  # same /24
    "S5": "172.16.5.20",
}
BASE_TIME = datetime(2026, 10, 4, 2, 0, 0, tzinfo=timezone.utc)


def syslog_ts(dt: datetime) -> str:
    return dt.strftime("%b %e %H:%M:%S").replace("  ", " ")


IST = timezone(timedelta(hours=5, minutes=30))


def access_ts(dt: datetime) -> str:
    # Convert the UTC instant to the web server's local time (+0530) so auth and web events line up.
    return dt.astimezone(IST).strftime("%d/%b/%Y:%H:%M:%S %z")


def s1_ssh_breach(auth_lines: List[str], labels: dict) -> List[str]:
    """S1: Brute force → success as deploy → sudo → useradd sysupdate"""
    ip = ATTACKER_IPS["S1"]
    t = BASE_TIME  # 02:03

    # 214 failed logins over ~38 min
    for i in range(214):
        t += timedelta(seconds=random.randint(8, 12))
        user = random.choice(["admin", "root", "deploy", "ubuntu"])
        pid = random.randint(2000, 2200)
        auth_lines.append(
            f"{syslog_ts(t)} {HOSTNAME} sshd[{pid}]: "
            f"Failed password for invalid user {user} from {ip} port {random.randint(49000,65000)} ssh2"
        )

    # Successful login as deploy at 02:41
    t = BASE_TIME.replace(hour=2, minute=41, second=9)
    auth_lines.append(
        f"{syslog_ts(t)} {HOSTNAME} sshd[2290]: "
        f"Accepted password for deploy from {ip} port 51877 ssh2"
    )

    # sudo at 02:43
    t = t.replace(minute=43, second=30)
    auth_lines.append(
        f"{syslog_ts(t)} {HOSTNAME} sudo: deploy : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash"
    )

    # useradd at 02:45
    t = t.replace(minute=45, second=2)
    auth_lines.append(
        f"{syslog_ts(t)} {HOSTNAME} useradd[2331]: new user: name=sysupdate, UID=1005, GID=1005"
    )

    labels["malicious_ips"].append(ip)
    labels["malicious_users"].extend(["deploy", "sysupdate"])
    labels["scenarios"]["S1"] = {
        "ips": [ip], "users": ["deploy", "sysupdate"],
        "stages": ["Credential Access", "Initial Access", "Privilege Escalation", "Persistence"]
    }
    return auth_lines


def s2_password_spray(auth_lines: List[str], labels: dict) -> List[str]:
    """S2: One IP tries 12 users × 2 attempts; one succeeds"""
    ip = ATTACKER_IPS["S2"]
    victims = [f"user{i:02d}" for i in range(1, 13)]
    t = BASE_TIME.replace(hour=3, minute=0)

    for victim in victims:
        for attempt in range(2):
            t += timedelta(seconds=random.randint(20, 40))
            auth_lines.append(
                f"{syslog_ts(t)} {HOSTNAME} sshd[{random.randint(3000,3500)}]: "
                f"Failed password for {victim} from {ip} port {random.randint(49000,65000)} ssh2"
            )

    # Successful login for user05
    t += timedelta(seconds=30)
    auth_lines.append(
        f"{syslog_ts(t)} {HOSTNAME} sshd[3600]: "
        f"Accepted password for user05 from {ip} port {random.randint(49000,65000)} ssh2"
    )

    labels["malicious_ips"].append(ip)
    labels["malicious_users"].append("user05")
    labels["scenarios"]["S2"] = {
        "ips": [ip], "users": ["user05"],
        "stages": ["Credential Access", "Initial Access"]
    }
    return auth_lines


def s3_web_recon_exfil(access_lines: List[str], labels: dict) -> List[str]:
    """S3: gobuster 404 flood → SQLi on /login → 200 on /admin → 80MB download"""
    ip = ATTACKER_IPS["S3"]
    t = BASE_TIME.replace(hour=14, minute=0)

    # gobuster 404 flood (50 requests)
    paths = [p for i in range(10) for p in (f"/wp-admin/{i}", f"/.git/config{i}", f"/backup{i}.zip",
                                             f"/admin{i}", f"/phpinfo{i}.php")]
    for path in paths[:50]:
        t += timedelta(seconds=random.randint(1, 3))
        access_lines.append(
            f'{ip} - - [{access_ts(t)}] "GET {path} HTTP/1.1" 404 512 "-" "gobuster/3.6"'
        )

    # SQLi attempts
    t += timedelta(seconds=10)
    sqli_payloads = [
        "/login.php?id=1' OR '1'='1",
        "/login.php?id=1 UNION SELECT username,password FROM users--",
        "/login.php?user=admin'--",
    ]
    for payload in sqli_payloads:
        t += timedelta(seconds=5)
        access_lines.append(
            f'{ip} - - [{access_ts(t)}] "GET {payload} HTTP/1.1" 200 512 "-" "sqlmap/1.8"'
        )

    # Successful access to /admin
    t += timedelta(seconds=30)
    access_lines.append(
        f'{ip} - - [{access_ts(t)}] "GET /admin HTTP/1.1" 200 81920000 "-" "curl/7.88.1"'
    )

    labels["malicious_ips"].append(ip)
    labels["scenarios"]["S3"] = {
        "ips": [ip], "users": [],
        "stages": ["Reconnaissance", "Initial Access", "Exfiltration"]
    }
    return access_lines


def s4_low_and_slow(auth_lines: List[str], labels: dict) -> List[str]:
    """S4: 3 IPs in one /24, ~8 attempts each over 6h (24 total, ~1 every 15 min)"""
    ips = ATTACKER_IPS["S4_IPS"]
    t = BASE_TIME.replace(hour=0, minute=0)

    for attempt in range(24):
        ip = ips[attempt % 3]
        t += timedelta(minutes=random.randint(12, 18))  # ~15 min apart
        auth_lines.append(
            f"{syslog_ts(t)} {HOSTNAME} sshd[{random.randint(4000,4500)}]: "
            f"Failed password for invalid user admin from {ip} port {random.randint(49000,65000)} ssh2"
        )

    labels["malicious_ips"].extend(ips)
    labels["scenarios"]["S4"] = {
        "ips": ips, "users": [],
        "stages": ["Credential Access"]
    }
    return auth_lines


def s5_insider_off_hours(auth_lines: List[str], access_lines: List[str], labels: dict):
    """S5: Valid user logs in at 03:10 from new IP → sudo → large download"""
    ip = ATTACKER_IPS["S5"]
    t = BASE_TIME.replace(hour=3, minute=10)

    # Login
    auth_lines.append(
        f"{syslog_ts(t)} {HOSTNAME} sshd[5100]: "
        f"Accepted password for user15 from {ip} port {random.randint(49000,65000)} ssh2"
    )
    # sudo
    t += timedelta(minutes=5)
    auth_lines.append(
        f"{syslog_ts(t)} {HOSTNAME} sudo: user15 : TTY=pts/1 ; USER=root ; COMMAND=/bin/bash"
    )
    # Large download via web
    t += timedelta(minutes=10)
    access_lines.append(
        f'{ip} - - [{access_ts(t)}] "GET /data/export.csv HTTP/1.1" 200 75000000 "-" "curl/7.88.1"'
    )

    labels["malicious_ips"].append(ip)
    labels["malicious_users"].append("user15")
    labels["scenarios"]["S5"] = {
        "ips": [ip], "users": ["user15"],
        "stages": ["Initial Access", "Privilege Escalation", "Exfiltration"]
    }


ALL_SCENARIOS = ["S1", "S2", "S3", "S4", "S5"]


def _inject(auth_lines: List[str], access_lines: List[str], scenarios: List[str], seed: int) -> dict:
    random.seed(seed + 1)  # attack randomness independent of the baseline generator
    labels = {"malicious_ips": [], "malicious_users": [], "scenarios": {}}
    if "S1" in scenarios:
        s1_ssh_breach(auth_lines, labels)
    if "S2" in scenarios:
        s2_password_spray(auth_lines, labels)
    if "S3" in scenarios:
        s3_web_recon_exfil(access_lines, labels)
    if "S4" in scenarios:
        s4_low_and_slow(auth_lines, labels)
    if "S5" in scenarios:
        s5_insider_off_hours(auth_lines, access_lines, labels)
    auth_lines.sort()
    access_lines.sort()
    return labels


def generate(scenarios: Optional[List[str]] = None, seed: int = SEED) -> Tuple[str, str, dict]:
    """
    Build baseline traffic (Mahadev's generator) + inject the chosen scenarios, fully in memory
    for POST /api/simulate. Returns (auth_log_text, access_log_text, labels).
    Same scenarios + seed → byte-identical logs.
    """
    scenarios = ALL_SCENARIOS if scenarios is None else scenarios
    unknown = sorted(set(scenarios) - set(ALL_SCENARIOS))
    if unknown:
        raise ValueError(f"Unknown scenario(s) {unknown}; choose from {ALL_SCENARIOS}")

    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import baseline  # simulator/baseline.py (Mahadev)

    random.seed(seed)
    baseline.random.seed(seed)
    with tempfile.TemporaryDirectory() as tmp:
        auth_path, access_path = os.path.join(tmp, "auth.log"), os.path.join(tmp, "access.log")
        _stdout, sys.stdout = sys.stdout, open(os.devnull, "w")
        try:
            baseline.gen_auth_log(auth_path)
            baseline.gen_access_log(access_path)
        finally:
            sys.stdout.close()
            sys.stdout = _stdout
        with open(auth_path) as f:
            auth_lines = f.read().splitlines()
        with open(access_path) as f:
            access_lines = f.read().splitlines()

    labels = _inject(auth_lines, access_lines, list(scenarios), seed)
    return "\n".join(auth_lines) + "\n", "\n".join(access_lines) + "\n", labels


def inject_attacks(
    auth_input="simulator/baseline_auth.log",
    access_input="simulator/baseline_access.log",
    auth_output="simulator/combined_auth.log",
    access_output="simulator/combined_access.log",
    labels_output="simulator/labels.json",
    scenarios=None,
):
    """
    Read baseline logs, inject chosen attack scenarios, write combined logs + labels.json.
    scenarios: list of scenario IDs to inject (default: all S1-S5).
    """
    if scenarios is None:
        scenarios = ["S1", "S2", "S3", "S4", "S5"]

    with open(auth_input) as f:
        auth_lines = f.read().splitlines()
    with open(access_input) as f:
        access_lines = f.read().splitlines()

    labels = _inject(auth_lines, access_lines, scenarios, SEED)

    with open(auth_output, "w") as f:
        f.write("\n".join(auth_lines) + "\n")
    with open(access_output, "w") as f:
        f.write("\n".join(access_lines) + "\n")
    with open(labels_output, "w") as f:
        json.dump(labels, f, indent=2)

    print(f"[attacks] auth: {len(auth_lines)} lines, access: {len(access_lines)} lines")
    print(f"[attacks] labels.json: {labels_output}")
    print(f"[attacks] Injected: {list(labels['scenarios'].keys())}")


if __name__ == "__main__":
    inject_attacks()
