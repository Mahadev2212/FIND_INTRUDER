"""
ChainTrace – Detection Rules R1–R11.
All thresholds are loaded from config.yaml.
Severity points: low=10, medium=20, high=35, critical=50.
Every alert carries the IDs of the exact events (file:line) that triggered it.
Rules are deterministic: same input → same alerts, same IDs.
Owner: Bhanu Prasad
"""

import bisect
import ipaddress
import re
import statistics
import urllib.parse
from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Sequence

from app.schemas import Alert, Event, EventType, KillChainStage, MitreRef, Severity
from engine.baseline import normal_hours
from engine.config import T

SEVERITY_POINTS = {"low": 10, "medium": 20, "high": 35, "critical": 50}

# rule_id → (name, severity, stage, tactic, technique)
RULES = {
    "R1": ("SSH brute force", Severity.HIGH, KillChainStage.CREDENTIAL_ACCESS, "Credential Access", "T1110.001"),
    "R2": ("Password spraying", Severity.HIGH, KillChainStage.CREDENTIAL_ACCESS, "Credential Access", "T1110.003"),
    "R3": ("Low-and-slow brute force", Severity.MEDIUM, KillChainStage.CREDENTIAL_ACCESS, "Credential Access", "T1110"),
    "R4": ("Login after failures", Severity.CRITICAL, KillChainStage.INITIAL_ACCESS, "Initial Access", "T1078"),
    "R5": ("Off-hours login", Severity.MEDIUM, KillChainStage.INITIAL_ACCESS, "Initial Access", "T1078"),
    "R6": ("New source IP", Severity.LOW, KillChainStage.INITIAL_ACCESS, "Initial Access", "T1078"),
    "R7": ("Privilege use after suspicious login", Severity.HIGH, KillChainStage.PRIVILEGE_ESCALATION, "Privilege Escalation", "T1548.003"),
    "R8": ("Account created / added to sudo", Severity.CRITICAL, KillChainStage.PERSISTENCE, "Persistence", "T1136.001"),
    "R9": ("Web scanning", Severity.MEDIUM, KillChainStage.RECONNAISSANCE, "Reconnaissance", "T1595"),
    "R10": ("Web attack payload", Severity.HIGH, KillChainStage.INITIAL_ACCESS, "Initial Access", "T1190"),
    "R11": ("Possible large data transfer", Severity.HIGH, KillChainStage.EXFILTRATION, "Exfiltration", "TA0010"),
}
RULE_ORDER = {rid: i for i, rid in enumerate(RULES)}


def _alert(rule_id: str, evidence: Sequence[Event], reason: str, ip: Optional[str] = None,
           user: Optional[str] = None, first_seen: Optional[datetime] = None,
           last_seen: Optional[datetime] = None, count: Optional[int] = None,
           technique: Optional[str] = None) -> Alert:
    name, sev, stage, tactic, tech = RULES[rule_id]
    return Alert(
        id="",  # assigned deterministically in run_all_rules
        rule_id=rule_id, rule_name=name, severity=sev, points=SEVERITY_POINTS[sev.value],
        stage=stage, mitre=MitreRef(tactic=tactic, technique=technique or tech),
        entity={"ip": ip, "user": user},
        first_seen=first_seen or evidence[0].ts, last_seen=last_seen or evidence[-1].ts,
        count=count if count is not None else len(evidence),
        reason=reason, evidence_event_ids=[e.id for e in evidence],
    )


def _minutes(a: datetime, b: datetime) -> int:
    return max(1, round((b - a).total_seconds() / 60))


def _bursts(evts: List[Event], window: timedelta, threshold: int) -> List[List[Event]]:
    """
    Find bursts: as soon as `threshold` events fall inside `window`, open a burst and keep
    extending it while consecutive events are no more than `window` apart.
    So a 38-minute brute force gives ONE alert with all 214 lines, not one per 5-minute slice.
    """
    out, i, j, n = [], 0, 0, len(evts)
    while j < n:
        while evts[j].ts - evts[i].ts > window:
            i += 1
        if j - i + 1 >= threshold:
            end = j
            while end + 1 < n and evts[end + 1].ts - evts[end].ts <= window:
                end += 1
            out.append(evts[i:end + 1])
            j = i = end + 1
            continue
        j += 1
    return out


def _failures_by_ip(events: List[Event]) -> Dict[str, List[Event]]:
    by_ip: Dict[str, List[Event]] = defaultdict(list)
    for e in events:
        if e.type == EventType.SSH_FAIL and e.src_ip:
            by_ip[e.src_ip].append(e)
    return by_ip


def subnet_of(ip: Optional[str]) -> Optional[str]:
    """/24 for IPv4, /64 for IPv6."""
    if not ip:
        return None
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return None
    prefix = 24 if addr.version == 4 else 64
    return str(ipaddress.ip_network(f"{ip}/{prefix}", strict=False))


# ─── R1: SSH Brute Force ──────────────────────────────────────────────────────
def r1_ssh_brute_force(events: List[Event]) -> List[Alert]:
    """>=10 failed logins from one IP within 5 minutes."""
    alerts = []
    window = timedelta(minutes=T["r1_window_minutes"])
    for ip, evts in _failures_by_ip(events).items():
        for burst in _bursts(evts, window, T["r1_threshold"]):
            users = sorted({e.user for e in burst if e.user})
            alerts.append(_alert(
                "R1", burst, ip=ip,
                reason=(f"{len(burst)} failed SSH logins from {ip} against {len(users)} account(s) "
                        f"in {_minutes(burst[0].ts, burst[-1].ts)} min "
                        f"(threshold: {T['r1_threshold']} in {T['r1_window_minutes']} min)"),
            ))
    return alerts


# ─── R2: Password Spraying ────────────────────────────────────────────────────
def r2_password_spraying(events: List[Event]) -> List[Alert]:
    """One IP fails for >=5 distinct usernames within 10 minutes."""
    alerts = []
    window = timedelta(minutes=T["r2_window_minutes"])
    threshold = T["r2_distinct_users"]
    for ip, evts in _failures_by_ip(events).items():
        users: Counter = Counter()
        i = j = 0
        n = len(evts)
        while j < n:
            users[evts[j].user] += 1
            while evts[j].ts - evts[i].ts > window:
                users[evts[i].user] -= 1
                if users[evts[i].user] == 0:
                    del users[evts[i].user]
                i += 1
            if len(users) >= threshold:
                end = j
                while end + 1 < n and evts[end + 1].ts - evts[end].ts <= window:
                    end += 1
                burst = evts[i:end + 1]
                distinct = sorted({e.user for e in burst if e.user})
                alerts.append(_alert(
                    "R2", burst, ip=ip,
                    reason=(f"{ip} failed logins for {len(distinct)} distinct usernames "
                            f"({', '.join(distinct[:8])}{'…' if len(distinct) > 8 else ''}) "
                            f"with {len(burst)} attempts in {_minutes(burst[0].ts, burst[-1].ts)} min"),
                ))
                users.clear()
                j = i = end + 1
                continue
            j += 1
    return alerts


# ─── R3: Low-and-Slow Brute Force ─────────────────────────────────────────────
def r3_low_and_slow(events: List[Event], r1_ips: set) -> List[Alert]:
    """
    >=15 failures over 6h counted across one /24 subnet (or from one IP), where no single IP
    triggered R1. A failure followed by a successful login for the same user from the same IP
    within a few minutes is a typo, not an attack, and is not counted.
    One alert per contributing IP, so each attacker IP is named; they correlate via the subnet.
    """
    typo_window = timedelta(minutes=T["r3_ignore_typo_minutes"])
    successes: Dict[tuple, List[datetime]] = defaultdict(list)
    for e in events:
        if e.type == EventType.SSH_SUCCESS and e.src_ip:
            successes[(e.src_ip, e.user)].append(e.ts)

    def is_typo(f: Event) -> bool:
        ts_list = successes.get((f.src_ip, f.user), [])
        k = bisect.bisect_left(ts_list, f.ts)
        return k < len(ts_list) and ts_list[k] - f.ts <= typo_window

    by_subnet: Dict[str, List[Event]] = defaultdict(list)
    for e in events:
        if e.type == EventType.SSH_FAIL and e.src_ip and e.src_ip not in r1_ips and not is_typo(e):
            by_subnet[subnet_of(e.src_ip)].append(e)

    alerts = []
    window = timedelta(hours=T["r3_window_hours"])
    for subnet, evts in by_subnet.items():
        for burst in _bursts(evts, window, T["r3_threshold"]):
            per_ip: Dict[str, List[Event]] = defaultdict(list)
            for e in burst:
                per_ip[e.src_ip].append(e)
            span_h = (burst[-1].ts - burst[0].ts).total_seconds() / 3600
            for ip in sorted(per_ip):
                alerts.append(_alert(
                    "R3", per_ip[ip], ip=ip,
                    reason=(f"{ip} is one of {len(per_ip)} IP(s) in {subnet} that together made "
                            f"{len(burst)} failed SSH logins over {span_h:.1f} h "
                            f"({len(per_ip[ip])} from this IP) – below the per-IP brute-force threshold"),
                ))
    return alerts


# ─── R4: Login After Failures ─────────────────────────────────────────────────
def r4_login_after_failures(events: List[Event]) -> List[Alert]:
    """Successful login from an IP with >=5 failures in the previous 60 min."""
    alerts = []
    fails = _failures_by_ip(events)
    fail_ts = {ip: [f.ts for f in evts] for ip, evts in fails.items()}
    window = timedelta(minutes=T["r4_lookback_minutes"])

    for e in events:
        if e.type != EventType.SSH_SUCCESS or not e.src_ip or e.src_ip not in fails:
            continue
        ts_list = fail_ts[e.src_ip]
        lo = bisect.bisect_left(ts_list, e.ts - window)
        hi = bisect.bisect_right(ts_list, e.ts)
        prior = fails[e.src_ip][lo:hi]
        if len(prior) >= T["r4_fail_threshold"]:
            alerts.append(_alert(
                "R4", prior + [e], ip=e.src_ip, user=e.user, count=len(prior) + 1,
                reason=(f"Successful login as {e.user} from {e.src_ip} after {len(prior)} failed "
                        f"logins from that IP in the previous {T['r4_lookback_minutes']} min"),
            ))
    return alerts


# ─── R5: Off-Hours Login ──────────────────────────────────────────────────────
def r5_off_hours_login(events: List[Event], baseline: Dict) -> List[Alert]:
    """Success outside the user's learned hours (default 08–20)."""
    alerts = []
    cutoff = baseline.get("cutoff")
    for e in events:
        if e.type != EventType.SSH_SUCCESS or not e.user or (cutoff and e.ts <= cutoff):
            continue
        ub = baseline["users"].get(e.user)
        if not ub or ub["login_count"] < T["baseline_min_logins"]:
            continue
        hours = normal_hours(ub)
        if e.ts.hour not in hours:
            lo, hi = min(hours), max(hours) + 1
            alerts.append(_alert(
                "R5", [e], ip=e.src_ip, user=e.user,
                reason=(f"{e.user} logged in at {e.ts:%H:%M} UTC, outside their normal hours "
                        f"({lo:02d}:00–{hi:02d}:00, learned from {ub['login_count']} baseline logins)"),
            ))
    return alerts


# ─── R6: New Source IP ────────────────────────────────────────────────────────
def r6_new_source_ip(events: List[Event], baseline: Dict) -> List[Alert]:
    """Success for a user from an IP never seen for that user in the baseline window."""
    alerts = []
    cutoff = baseline.get("cutoff")
    for e in events:
        if e.type != EventType.SSH_SUCCESS or not e.user or not e.src_ip or (cutoff and e.ts <= cutoff):
            continue
        ub = baseline["users"].get(e.user)
        if not ub or ub["login_count"] < T["baseline_min_logins"]:
            continue
        if e.src_ip not in ub["ips"]:
            known = ", ".join(sorted(ub["ips"])) or "none"
            alerts.append(_alert(
                "R6", [e], ip=e.src_ip, user=e.user,
                reason=f"{e.user} logged in from {e.src_ip}, never seen for this user in the baseline (known: {known})",
            ))
    return alerts


# ─── R7: Privilege Use After Suspicious Login ─────────────────────────────────
def r7_priv_after_login(events: List[Event], suspicious_logins: List[Alert]) -> List[Alert]:
    """sudo/su by a user within 60 min of an R4/R5/R6 login. One alert per suspicious login session."""
    window = timedelta(minutes=T["r7_window_minutes"])
    # De-duplicate sessions: R4, R5 and R6 can all fire on the same login line.
    sessions: Dict[str, tuple] = {}
    for a in suspicious_logins:
        login_id = a.evidence_event_ids[-1]
        if a.entity.get("user") and login_id not in sessions:
            sessions[login_id] = (a.entity["user"], a.last_seen, a.entity.get("ip"))

    sudo_by_user: Dict[str, List[Event]] = defaultdict(list)
    for e in events:
        if e.type == EventType.SUDO and e.user:
            sudo_by_user[e.user].append(e)

    alerts = []
    for login_id, (user, login_ts, ip) in sorted(sessions.items(), key=lambda kv: kv[1][1]):
        used = [s for s in sudo_by_user.get(user, []) if timedelta(0) <= s.ts - login_ts <= window]
        if used:
            alerts.append(_alert(
                "R7", used, ip=ip, user=user, first_seen=used[0].ts,
                reason=(f"{user} used sudo/su {len(used)} time(s), first {_minutes(login_ts, used[0].ts)} min "
                        f"after a suspicious login from {ip or 'unknown IP'}"),
            ))
    return alerts


# ─── R8: Account Created / Added to Sudo ─────────────────────────────────────
def r8_account_created(events: List[Event], r7_alerts: List[Alert]) -> List[Alert]:
    """
    useradd, or usermod adding a user to sudo/wheel.
    useradd lines don't say who ran them; if it happens during a suspicious privileged session
    (an R7 alert in the last hour), the alert is attributed to that session's IP so it correlates.
    """
    window = timedelta(minutes=T["r7_window_minutes"])
    alerts = []
    for e in events:
        if e.type not in (EventType.USER_ADD, EventType.GROUP_ADD):
            continue
        session = None
        for r7 in r7_alerts:
            if timedelta(0) <= e.ts - r7.first_seen <= window:
                session = r7  # keep the latest matching session
        what = "New account created" if e.type == EventType.USER_ADD else "Account added to sudo/wheel group"
        reason = f"{what}: {e.user}"
        if session:
            reason += (f", {_minutes(session.first_seen, e.ts)} min after {session.entity['user']} "
                       f"gained root from {session.entity.get('ip') or 'unknown IP'}")
        alerts.append(_alert(
            "R8", [e], ip=session.entity.get("ip") if session else None, user=e.user, reason=reason,
            technique="T1136.001" if e.type == EventType.USER_ADD else "T1098",
        ))
    return alerts


# ─── R9: Web Scanning ────────────────────────────────────────────────────────
SCANNER_UA_RE = re.compile(r"sqlmap|nikto|gobuster|dirbuster|nmap", re.IGNORECASE)


def r9_web_scanning(events: List[Event]) -> List[Alert]:
    """>=30 HTTP 404s from one IP in 5 min, or scanner user-agent. One alert per IP."""
    window = timedelta(minutes=T["r9_window_minutes"])
    notfound: Dict[str, List[Event]] = defaultdict(list)
    scanner: Dict[str, List[Event]] = defaultdict(list)
    for e in events:
        if e.type == EventType.HTTP_REQUEST and e.http and e.src_ip:
            if e.http.status == 404:
                notfound[e.src_ip].append(e)
            if e.http.ua and SCANNER_UA_RE.search(e.http.ua):
                scanner[e.src_ip].append(e)

    alerts = []
    for ip in sorted(set(notfound) | set(scanner)):
        flood = [e for b in _bursts(notfound.get(ip, []), window, T["r9_404_threshold"]) for e in b]
        tools = sorted({SCANNER_UA_RE.search(e.http.ua).group(0).lower() for e in scanner.get(ip, [])})
        if not flood and not tools:
            continue
        evidence = sorted({e.id: e for e in flood + scanner.get(ip, [])}.values(), key=lambda e: (e.ts, e.id))
        parts = []
        if flood:
            parts.append(f"{len(flood)} HTTP 404 responses in {_minutes(flood[0].ts, flood[-1].ts)} min")
        if tools:
            parts.append(f"scanner user-agent ({', '.join(tools)}) on {len(scanner[ip])} request(s)")
        alerts.append(_alert("R9", evidence, ip=ip, reason=f"{ip}: " + "; ".join(parts)))
    return alerts


# ─── R10: Web Attack Payload ──────────────────────────────────────────────────
SIGNATURES = {
    "SQL injection pattern": [r"'\s*or\s*'", r"union\s+select", r"select\s.+\sfrom", r"sleep\(", r"--\s*(?:&|$)"],
    "XSS pattern": [r"<script", r"javascript:", r"onerror\s*=", r"onload\s*="],
    "path traversal pattern": [r"\.\./", r"\.\.\\", r"/etc/passwd"],
    "command injection pattern": [r";\s*cat\s", r"\|\s*cat\s", r"&&", r"\$\(", r"`"],
}
_COMPILED_SIGNATURES = {label: [re.compile(p, re.IGNORECASE) for p in pats] for label, pats in SIGNATURES.items()}


def match_signature(path: str) -> Optional[tuple]:
    """Return (label, decoded_request) for the first matching signature, after URL-decoding once."""
    decoded = urllib.parse.unquote_plus(path)
    for label, patterns in _COMPILED_SIGNATURES.items():
        if any(p.search(decoded) for p in patterns):
            return label, decoded
    return None


def r10_web_attack_payload(events: List[Event]) -> List[Alert]:
    """URL-decoded path/query matches documented signature set. One alert per IP + category."""
    groups: Dict[tuple, List[tuple]] = defaultdict(list)
    for e in events:
        if e.type == EventType.HTTP_REQUEST and e.http and e.http.path:
            hit = match_signature(e.http.path)
            if hit:
                groups[(e.src_ip, hit[0])].append((e, hit[1]))

    alerts = []
    for (ip, label), hits in sorted(groups.items(), key=lambda kv: (kv[1][0][0].ts, kv[0])):
        evts = [h[0] for h in hits]
        alerts.append(_alert(
            "R10", evts, ip=ip,
            reason=(f"Matched signature: {label} in {len(evts)} request(s) from {ip}; "
                    f"e.g. decoded request: {hits[0][1][:200]}"),
        ))
    return alerts


# ─── R11: Possible Large Data Transfer ───────────────────────────────────────
def r11_large_transfer(events: List[Event]) -> List[Alert]:
    """Sum of HTTP response bytes to one IP in 10 min > 50 MB or > 20× median per-IP volume."""
    by_ip: Dict[str, List[Event]] = defaultdict(list)
    for e in events:
        if e.type == EventType.HTTP_REQUEST and e.http and e.http.bytes and e.src_ip:
            by_ip[e.src_ip].append(e)
    if not by_ip:
        return []

    median = statistics.median(sum(e.http.bytes for e in evts) for evts in by_ip.values())
    rel_threshold = max(T["r11_median_multiplier"] * median, T["r11_min_bytes"])
    threshold = min(T["r11_abs_bytes"], rel_threshold)
    window = timedelta(minutes=T["r11_window_minutes"])

    alerts = []
    for ip, evts in by_ip.items():
        i, total, j, n = 0, 0, 0, len(evts)
        while j < n:
            total += evts[j].http.bytes
            while evts[j].ts - evts[i].ts > window:
                total -= evts[i].http.bytes
                i += 1
            if total > threshold:
                # Trim from the left so evidence is only the responses that make up the volume.
                while i < j and total - evts[i].http.bytes > threshold:
                    total -= evts[i].http.bytes
                    i += 1
                end = j
                while end + 1 < n and evts[end + 1].ts - evts[i].ts <= window:
                    end += 1
                    total += evts[end].http.bytes
                burst = evts[i:end + 1]
                alerts.append(_alert(
                    "R11", burst, ip=ip,
                    reason=(f"Possible data exfiltration indicated by unusually large HTTP response volume: "
                            f"{total / 1_000_000:.1f} MB sent to {ip} in {len(burst)} response(s) within "
                            f"{T['r11_window_minutes']} min (median per-IP total: {median / 1_000_000:.2f} MB)"),
                ))
                i = j = end + 1
                total = 0
                continue
            j += 1
    return alerts


# ─── Main runner ──────────────────────────────────────────────────────────────
def run_all_rules(events: List[Event], baseline: Dict) -> List[Alert]:
    """
    Run all P0 and P1 rules. Events must already be sorted by timestamp and the baseline built.
    Alerts are returned sorted by time with stable IDs a1, a2, … (deterministic, T11).
    """
    r1 = r1_ssh_brute_force(events)
    r4 = r4_login_after_failures(events)
    r5 = r5_off_hours_login(events, baseline)
    r6 = r6_new_source_ip(events, baseline)
    r7 = r7_priv_after_login(events, r4 + r5 + r6)
    r8 = r8_account_created(events, r7)

    alerts = (r1 + r2_password_spraying(events) + r3_low_and_slow(events, {a.entity["ip"] for a in r1})
              + r4 + r5 + r6 + r7 + r8
              + r9_web_scanning(events) + r10_web_attack_payload(events) + r11_large_transfer(events))

    alerts.sort(key=lambda a: (a.first_seen, RULE_ORDER[a.rule_id], a.entity.get("ip") or "",
                               a.entity.get("user") or "", a.evidence_event_ids[0]))
    for n, a in enumerate(alerts, start=1):
        a.id = f"a{n}"
    return alerts
