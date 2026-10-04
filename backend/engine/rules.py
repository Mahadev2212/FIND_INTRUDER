"""
ChainTrace – Detection Rules R1–R11.
All thresholds are loaded from config.yaml.
Severity points: low=10, medium=20, high=35, critical=50.
Owner: Bhanu Prasad
"""

from collections import defaultdict
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import re
import urllib.parse
import yaml
import uuid

from app.schemas import (
    Alert, Severity, KillChainStage, MitreRef, EventType
)

# Load config
with open("config.yaml") as f:
    CFG = yaml.safe_load(f)

T = CFG["thresholds"]
SEVERITY_POINTS = {"low": 10, "medium": 20, "high": 35, "critical": 50}


def _alert_id() -> str:
    return str(uuid.uuid4())[:8]


def _ts_range(events):
    return events[0].ts if events else None, events[-1].ts if events else None


# ─── R1: SSH Brute Force ──────────────────────────────────────────────────────
def r1_ssh_brute_force(events) -> List[Alert]:
    """>=10 failed logins from one IP within 5 minutes."""
    alerts = []
    fails_by_ip: Dict[str, list] = defaultdict(list)

    for e in events:
        if e.type in (EventType.SSH_FAIL, EventType.INVALID_USER):
            fails_by_ip[e.src_ip].append(e)

    window = timedelta(minutes=T["r1_window_minutes"])
    threshold = T["r1_threshold"]

    for ip, evts in fails_by_ip.items():
        evts.sort(key=lambda x: x.ts)
        for i, start_evt in enumerate(evts):
            window_evts = [e for e in evts[i:] if e.ts - start_evt.ts <= window]
            if len(window_evts) >= threshold:
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R1", rule_name="SSH brute force",
                    severity=Severity.HIGH, points=SEVERITY_POINTS["high"],
                    stage=KillChainStage.CREDENTIAL_ACCESS,
                    mitre=MitreRef(tactic="Credential Access", technique="T1110.001"),
                    entity={"ip": ip, "user": None},
                    first_seen=window_evts[0].ts, last_seen=window_evts[-1].ts,
                    count=len(window_evts),
                    reason=f"{len(window_evts)} failed SSH logins from {ip} in {T['r1_window_minutes']} min",
                    evidence_event_ids=[e.id for e in window_evts],
                ))
                break  # one alert per IP

    return alerts


# ─── R2: Password Spraying ────────────────────────────────────────────────────
def r2_password_spraying(events) -> List[Alert]:
    """One IP fails for >=5 distinct usernames within 10 minutes."""
    alerts = []
    # group SSH failures by IP
    fails_by_ip: Dict[str, list] = defaultdict(list)
    for e in events:
        if e.type in (EventType.SSH_FAIL, EventType.INVALID_USER) and e.src_ip:
            fails_by_ip[e.src_ip].append(e)

    window = timedelta(minutes=T["r2_window_minutes"])
    threshold = T["r2_distinct_users"]

    for ip, evts in fails_by_ip.items():
        evts.sort(key=lambda x: x.ts)
        for i, start_evt in enumerate(evts):
            window_evts = [e for e in evts[i:] if e.ts - start_evt.ts <= window]
            distinct_users = {e.user for e in window_evts if e.user}
            if len(distinct_users) >= threshold:
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R2", rule_name="Password spraying",
                    severity=Severity.HIGH, points=SEVERITY_POINTS["high"],
                    stage=KillChainStage.CREDENTIAL_ACCESS,
                    mitre=MitreRef(tactic="Credential Access", technique="T1110.003"),
                    entity={"ip": ip, "user": None},
                    first_seen=window_evts[0].ts, last_seen=window_evts[-1].ts,
                    count=len(window_evts),
                    reason=f"{ip} failed for {len(distinct_users)} distinct users in {T['r2_window_minutes']} min",
                    evidence_event_ids=[e.id for e in window_evts],
                ))
                break

    return alerts


# ─── R3: Low-and-Slow Brute Force ─────────────────────────────────────────────
def r3_low_and_slow(events, r1_ips: set) -> List[Alert]:
    """>=15 failures over 6h combined across one /24 subnet (only if no single IP triggered R1)."""
    alerts = []
    subnet_fails: Dict[str, list] = defaultdict(list)

    for e in events:
        if e.type in (EventType.SSH_FAIL, EventType.INVALID_USER) and e.src_ip:
            # skip IPs already caught by R1
            if e.src_ip in r1_ips:
                continue
            subnet = ".".join(e.src_ip.split(".")[:3])
            subnet_fails[subnet].append(e)

    window = timedelta(hours=T["r3_window_hours"])
    threshold = T["r3_threshold"]

    for subnet, evts in subnet_fails.items():
        evts.sort(key=lambda x: x.ts)
        if evts[-1].ts - evts[0].ts <= window and len(evts) >= threshold:
            alerts.append(Alert(
                id=_alert_id(),
                rule_id="R3", rule_name="Low-and-slow brute force",
                severity=Severity.MEDIUM, points=SEVERITY_POINTS["medium"],
                stage=KillChainStage.CREDENTIAL_ACCESS,
                mitre=MitreRef(tactic="Credential Access", technique="T1110"),
                entity={"ip": f"{subnet}.0/24", "user": None},
                first_seen=evts[0].ts, last_seen=evts[-1].ts,
                count=len(evts),
                reason=f"{len(evts)} failures from /24 subnet {subnet}.0/24 over {T['r3_window_hours']}h",
                evidence_event_ids=[e.id for e in evts],
            ))

    return alerts


# ─── R4: Login After Failures ─────────────────────────────────────────────────
def r4_login_after_failures(events) -> List[Alert]:
    """Successful login from an IP with >=5 failures in the previous 60 min."""
    alerts = []
    fails_by_ip: Dict[str, list] = defaultdict(list)

    for e in events:
        if e.type in (EventType.SSH_FAIL, EventType.INVALID_USER) and e.src_ip:
            fails_by_ip[e.src_ip].append(e)

    window = timedelta(minutes=T["r4_lookback_minutes"])
    threshold = T["r4_fail_threshold"]

    for e in events:
        if e.type == EventType.SSH_SUCCESS and e.src_ip:
            prior_fails = [
                f for f in fails_by_ip.get(e.src_ip, [])
                if timedelta(0) <= e.ts - f.ts <= window
            ]
            if len(prior_fails) >= threshold:
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R4", rule_name="Login after failures",
                    severity=Severity.CRITICAL, points=SEVERITY_POINTS["critical"],
                    stage=KillChainStage.INITIAL_ACCESS,
                    mitre=MitreRef(tactic="Initial Access", technique="T1078"),
                    entity={"ip": e.src_ip, "user": e.user},
                    first_seen=prior_fails[0].ts, last_seen=e.ts,
                    count=len(prior_fails) + 1,
                    reason=f"{e.src_ip} had {len(prior_fails)} failures before success as {e.user}",
                    evidence_event_ids=[f.id for f in prior_fails] + [e.id],
                ))

    return alerts


# ─── R5: Off-Hours Login ──────────────────────────────────────────────────────
def r5_off_hours_login(events, baseline) -> List[Alert]:
    """Success outside the user's learned hours (default 08–20)."""
    alerts = []
    for e in events:
        if e.type == EventType.SSH_SUCCESS and e.user:
            user_baseline = baseline.get(e.user, {})
            if user_baseline.get("login_count", 0) < T["baseline_min_logins"]:
                continue  # not enough baseline data
            normal_hours = user_baseline.get("hours", set(range(8, 21)))
            hour = e.ts.hour
            if hour not in normal_hours:
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R5", rule_name="Off-hours login",
                    severity=Severity.MEDIUM, points=SEVERITY_POINTS["medium"],
                    stage=KillChainStage.INITIAL_ACCESS,
                    mitre=MitreRef(tactic="Initial Access", technique="T1078"),
                    entity={"ip": e.src_ip, "user": e.user},
                    first_seen=e.ts, last_seen=e.ts, count=1,
                    reason=f"{e.user} logged in at hour {hour} (normal: {sorted(normal_hours)})",
                    evidence_event_ids=[e.id],
                ))
    return alerts


# ─── R6: New Source IP ────────────────────────────────────────────────────────
def r6_new_source_ip(events, baseline) -> List[Alert]:
    """Success for a user from an IP never seen for that user in the baseline window."""
    alerts = []
    for e in events:
        if e.type == EventType.SSH_SUCCESS and e.user and e.src_ip:
            user_baseline = baseline.get(e.user, {})
            if user_baseline.get("login_count", 0) < T["baseline_min_logins"]:
                continue
            known_ips = user_baseline.get("ips", set())
            if e.src_ip not in known_ips:
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R6", rule_name="New source IP",
                    severity=Severity.LOW, points=SEVERITY_POINTS["low"],
                    stage=KillChainStage.INITIAL_ACCESS,
                    mitre=MitreRef(tactic="Initial Access", technique="T1078"),
                    entity={"ip": e.src_ip, "user": e.user},
                    first_seen=e.ts, last_seen=e.ts, count=1,
                    reason=f"{e.user} logged in from new IP {e.src_ip} (known: {known_ips})",
                    evidence_event_ids=[e.id],
                ))
    return alerts


# ─── R7: Privilege Use After Suspicious Login ─────────────────────────────────
def r7_priv_after_login(events, suspicious_logins: List) -> List[Alert]:
    """sudo/su by a user within 60 min of an R4/R5/R6 login."""
    alerts = []
    window = timedelta(minutes=T["r7_window_minutes"])
    suspicious_by_user: Dict[str, list] = defaultdict(list)

    for alert in suspicious_logins:
        user = alert.entity.get("user")
        if user:
            suspicious_by_user[user].append(alert)

    for e in events:
        if e.type == EventType.SUDO and e.user:
            for susp_alert in suspicious_by_user.get(e.user, []):
                if timedelta(0) <= e.ts - susp_alert.last_seen <= window:
                    alerts.append(Alert(
                        id=_alert_id(),
                        rule_id="R7", rule_name="Privilege use after suspicious login",
                        severity=Severity.HIGH, points=SEVERITY_POINTS["high"],
                        stage=KillChainStage.PRIVILEGE_ESCALATION,
                        mitre=MitreRef(tactic="Privilege Escalation", technique="T1548.003"),
                        entity={"ip": e.src_ip, "user": e.user},
                        first_seen=susp_alert.last_seen, last_seen=e.ts, count=1,
                        reason=f"{e.user} ran sudo within {T['r7_window_minutes']} min of suspicious login",
                        evidence_event_ids=[e.id],
                    ))
                    break

    return alerts


# ─── R8: Account Created / Added to Sudo ─────────────────────────────────────
def r8_account_created(events) -> List[Alert]:
    """useradd, or usermod adding a user to sudo/wheel."""
    alerts = []
    for e in events:
        if e.type in (EventType.USER_ADD, EventType.GROUP_ADD):
            alerts.append(Alert(
                id=_alert_id(),
                rule_id="R8", rule_name="Account created / added to sudo",
                severity=Severity.CRITICAL, points=SEVERITY_POINTS["critical"],
                stage=KillChainStage.PERSISTENCE,
                mitre=MitreRef(tactic="Persistence", technique="T1136.001"),
                entity={"ip": None, "user": e.user},
                first_seen=e.ts, last_seen=e.ts, count=1,
                reason=f"New account or sudo membership: {e.user}",
                evidence_event_ids=[e.id],
            ))
    return alerts


# ─── R9: Web Scanning ────────────────────────────────────────────────────────
SCANNER_UA_RE = re.compile(
    r'sqlmap|nikto|gobuster|dirbuster|nmap', re.IGNORECASE
)

def r9_web_scanning(events) -> List[Alert]:
    """>=30 HTTP 404s from one IP in 5 min, or scanner user-agent."""
    alerts = []
    notfounds_by_ip: Dict[str, list] = defaultdict(list)

    for e in events:
        if e.type == EventType.HTTP_REQUEST and e.http:
            if e.http.status == 404:
                notfounds_by_ip[e.src_ip].append(e)
            elif e.http.ua and SCANNER_UA_RE.search(e.http.ua):
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R9", rule_name="Web scanning",
                    severity=Severity.MEDIUM, points=SEVERITY_POINTS["medium"],
                    stage=KillChainStage.RECONNAISSANCE,
                    mitre=MitreRef(tactic="Reconnaissance", technique="T1595"),
                    entity={"ip": e.src_ip, "user": None},
                    first_seen=e.ts, last_seen=e.ts, count=1,
                    reason=f"Scanner user-agent detected: {e.http.ua}",
                    evidence_event_ids=[e.id],
                ))

    window = timedelta(minutes=T["r9_window_minutes"])
    threshold = T["r9_404_threshold"]

    for ip, evts in notfounds_by_ip.items():
        evts.sort(key=lambda x: x.ts)
        for i, start_evt in enumerate(evts):
            window_evts = [e for e in evts[i:] if e.ts - start_evt.ts <= window]
            if len(window_evts) >= threshold:
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R9", rule_name="Web scanning",
                    severity=Severity.MEDIUM, points=SEVERITY_POINTS["medium"],
                    stage=KillChainStage.RECONNAISSANCE,
                    mitre=MitreRef(tactic="Reconnaissance", technique="T1595"),
                    entity={"ip": ip, "user": None},
                    first_seen=window_evts[0].ts, last_seen=window_evts[-1].ts,
                    count=len(window_evts),
                    reason=f"{len(window_evts)} HTTP 404s from {ip} in {T['r9_window_minutes']} min",
                    evidence_event_ids=[e.id for e in window_evts],
                ))
                break

    return alerts


# ─── R10: Web Attack Payload ──────────────────────────────────────────────────
SIGNATURES = {
    "SQL injection pattern": [
        r"' or '", r"union select", r"select .* from", r"sleep\(", r"--\s*$"
    ],
    "XSS pattern": [
        r"<script", r"javascript:", r"onerror=", r"onload="
    ],
    "path traversal pattern": [
        r"\.\./", r"\.\.\\", r"/etc/passwd"
    ],
    "command injection pattern": [
        r";cat ", r"\|cat ", r"&&", r"\$\(", r"`"
    ],
}

def r10_web_attack_payload(events) -> List[Alert]:
    """URL-decoded path/query matches documented signature set."""
    alerts = []
    for e in events:
        if e.type == EventType.HTTP_REQUEST and e.http and e.http.path:
            decoded = urllib.parse.unquote(e.http.path)
            for label, patterns in SIGNATURES.items():
                for pattern in patterns:
                    if re.search(pattern, decoded, re.IGNORECASE):
                        alerts.append(Alert(
                            id=_alert_id(),
                            rule_id="R10", rule_name="Web attack payload",
                            severity=Severity.HIGH, points=SEVERITY_POINTS["high"],
                            stage=KillChainStage.INITIAL_ACCESS,
                            mitre=MitreRef(tactic="Initial Access", technique="T1190"),
                            entity={"ip": e.src_ip, "user": None},
                            first_seen=e.ts, last_seen=e.ts, count=1,
                            reason=f"Matched signature: {label} in decoded request: {decoded[:200]}",
                            evidence_event_ids=[e.id],
                        ))
                        break
                else:
                    continue
                break

    return alerts


# ─── R11: Possible Large Data Transfer ───────────────────────────────────────
def r11_large_transfer(events) -> List[Alert]:
    """Sum of HTTP response bytes to one IP in 10 min > 50MB or > 20x median per-IP volume."""
    alerts = []
    bytes_by_ip: Dict[str, list] = defaultdict(list)

    for e in events:
        if e.type == EventType.HTTP_REQUEST and e.http and e.http.bytes:
            bytes_by_ip[e.src_ip].append(e)

    window = timedelta(minutes=T["r11_window_minutes"])
    abs_threshold = T["r11_abs_bytes"]  # 50 MB
    multiplier = T["r11_median_multiplier"]

    # compute per-IP totals for median
    ip_totals = {ip: sum(e.http.bytes for e in evts) for ip, evts in bytes_by_ip.items()}
    if ip_totals:
        sorted_totals = sorted(ip_totals.values())
        median = sorted_totals[len(sorted_totals) // 2]
    else:
        median = 0

    for ip, evts in bytes_by_ip.items():
        evts.sort(key=lambda x: x.ts)
        for i, start_evt in enumerate(evts):
            window_evts = [e for e in evts[i:] if e.ts - start_evt.ts <= window]
            total_bytes = sum(e.http.bytes for e in window_evts)
            if total_bytes > abs_threshold or (median > 0 and total_bytes > multiplier * median):
                alerts.append(Alert(
                    id=_alert_id(),
                    rule_id="R11", rule_name="Possible large data transfer",
                    severity=Severity.HIGH, points=SEVERITY_POINTS["high"],
                    stage=KillChainStage.EXFILTRATION,
                    mitre=MitreRef(tactic="Exfiltration", technique="TA0010"),
                    entity={"ip": ip, "user": None},
                    first_seen=window_evts[0].ts, last_seen=window_evts[-1].ts,
                    count=len(window_evts),
                    reason=(
                        f"Possible data exfiltration indicated by unusually large HTTP response volume: "
                        f"{total_bytes / 1_000_000:.1f} MB to {ip} in {T['r11_window_minutes']} min"
                    ),
                    evidence_event_ids=[e.id for e in window_evts],
                ))
                break

    return alerts


# ─── Main runner ──────────────────────────────────────────────────────────────
def run_all_rules(events, baseline) -> List[Alert]:
    """
    Run all P0 and P1 rules in the correct order.
    Pipeline: events must already be sorted by timestamp and baseline must be built.
    """
    alerts = []

    # P0 rules
    r1_alerts = r1_ssh_brute_force(events)
    alerts.extend(r1_alerts)
    r1_ips = {a.entity["ip"] for a in r1_alerts if a.entity.get("ip")}

    alerts.extend(r2_password_spraying(events))
    alerts.extend(r4_login_after_failures(events))
    alerts.extend(r7_priv_after_login(events, [a for a in alerts if a.rule_id in ("R4", "R5", "R6")]))
    alerts.extend(r8_account_created(events))
    alerts.extend(r9_web_scanning(events))
    alerts.extend(r10_web_attack_payload(events))

    # P1 rules
    alerts.extend(r3_low_and_slow(events, r1_ips))
    alerts.extend(r5_off_hours_login(events, baseline))
    alerts.extend(r6_new_source_ip(events, baseline))
    alerts.extend(r11_large_transfer(events))

    return alerts
