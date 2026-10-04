"""
ChainTrace – engine tests (parsers, rules, correlation, story, evaluation; PRD tests T1–T17).
Owner: Bhanu Prasad
Run: cd backend && pytest tests/ -v
"""

import random
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.schemas import EventType, KillChainStage as KC, RiskLevel
from engine.parsers import auto_detect_and_parse, parse_access_log, parse_auth_log
from engine.pipeline import NoParsableLines, run_analysis, simulate
from engine.rules import match_signature

AUTH_SAMPLE = """Oct  4 02:03:11 web01 sshd[2211]: Failed password for invalid user admin from 185.220.101.7 port 51122 ssh2
Oct  4 02:03:21 web01 sshd[2212]: Failed password for invalid user root from 185.220.101.7 port 51123 ssh2
Oct  4 02:03:31 web01 sshd[2213]: Failed password for deploy from 185.220.101.7 port 51124 ssh2
Oct  4 02:03:41 web01 sshd[2214]: Failed password for deploy from 185.220.101.7 port 51125 ssh2
Oct  4 02:03:51 web01 sshd[2215]: Failed password for deploy from 185.220.101.7 port 51126 ssh2
Oct  4 02:04:01 web01 sshd[2216]: Failed password for deploy from 185.220.101.7 port 51127 ssh2
Oct  4 02:04:11 web01 sshd[2217]: Failed password for deploy from 185.220.101.7 port 51128 ssh2
Oct  4 02:04:21 web01 sshd[2218]: Failed password for deploy from 185.220.101.7 port 51129 ssh2
Oct  4 02:04:31 web01 sshd[2219]: Failed password for deploy from 185.220.101.7 port 51130 ssh2
Oct  4 02:04:41 web01 sshd[2220]: Failed password for deploy from 185.220.101.7 port 51131 ssh2
Oct  4 02:41:09 web01 sshd[2290]: Accepted password for deploy from 185.220.101.7 port 51877 ssh2
Oct  4 02:43:30 web01 sudo: deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/bin/bash
Oct  4 02:45:02 web01 useradd[2331]: new user: name=sysupdate, UID=1005, GID=1005
MALFORMED LINE THAT SHOULD BE SKIPPED
"""

ACCESS_SAMPLE = """45.33.10.9 - - [04/Oct/2026:14:02:10 +0530] "GET /login.php?id=1' OR '1'='1 HTTP/1.1" 200 512 "-" "sqlmap/1.8"
45.33.10.9 - - [04/Oct/2026:14:02:15 +0530] "GET /wp-admin/index.php HTTP/1.1" 404 200 "-" "gobuster/3.6"
203.0.113.1 - - [04/Oct/2026:10:00:00 +0530] "GET /index.html HTTP/1.1" 200 5000 "-" "Mozilla/5.0"
MALFORMED ACCESS LINE
"""


def _sig(result):
    """Comparable fingerprint of incidents (ignores evidence file names, which differ when files are split)."""
    return [(i.title, i.risk_score, i.level, i.entities.ips, i.entities.users, i.stages,
             [s.text for s in i.story]) for i in result.incidents]


def _ssh_lines(start, ip, n, gap_s, user="root", host="web01"):
    t = start
    out = []
    for k in range(n):
        out.append(f"{t:%b} {t.day:2d} {t:%H:%M:%S} {host} sshd[{1000 + k}]: "
                   f"Failed password for {user} from {ip} port {40000 + k} ssh2")
        t += timedelta(seconds=gap_s)
    return out, t


@pytest.fixture(scope="module")
def all_scenarios():
    return simulate(["S1", "S2", "S3", "S4", "S5"], seed=42)


# ─── Parsers ──────────────────────────────────────────────────────────────────

def test_auth_parser_event_types():
    res = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    types = [e.type for e in res.events]
    assert types.count(EventType.SSH_FAIL) == 10
    assert types.count(EventType.SSH_SUCCESS) == 1
    sudo = [e for e in res.events if e.type == EventType.SUDO]
    assert len(sudo) == 1 and sudo[0].user == "deploy"  # real sudo lines include PWD=
    add = [e for e in res.events if e.type == EventType.USER_ADD]
    assert len(add) == 1 and add[0].user == "sysupdate"
    assert res.skipped == 1 and res.parsed == 13


def test_usermod_group_add_and_su():
    text = ("Oct  4 02:46:00 web01 usermod[2400]: add 'sysupdate' to group 'sudo'\n"
            "Oct  4 02:47:00 web01 su: pam_unix(su:session): session opened for user root by deploy(uid=1000)\n")
    res = parse_auth_log(text, "auth.log")
    assert [(e.type, e.user) for e in res.events] == [(EventType.GROUP_ADD, "sysupdate"), (EventType.SUDO, "deploy")]


def test_access_parser_basic():
    res = parse_access_log(ACCESS_SAMPLE, "access.log")
    assert len(res.events) == 3 and res.skipped == 1
    e = res.events[0]
    assert e.http.status == 200 and e.http.ua == "sqlmap/1.8"
    assert e.ts == datetime(2026, 10, 4, 8, 32, 10, tzinfo=timezone.utc)  # +0530 → UTC
    assert e.http.path == "/login.php?id=1' OR '1'='1"  # path with spaces kept intact


def test_auto_detect():
    assert auto_detect_and_parse(AUTH_SAMPLE, "a.log").fmt == "auth"
    assert auto_detect_and_parse(ACCESS_SAMPLE, "b.log").fmt == "access"
    # A malformed first line must not break detection.
    assert auto_detect_and_parse("garbage\n" + AUTH_SAMPLE, "c.log").fmt == "auth"


def test_t4_empty_file():
    with pytest.raises(NoParsableLines, match="No parsable lines"):
        run_analysis([("empty.log", "")])


def test_t6_malformed_lines_are_skipped_and_counted():
    clean, _ = _ssh_lines(datetime(2026, 10, 4, 2, 0), "185.220.101.7", 40, 5)
    lines = []
    for k, line in enumerate(clean):
        lines.append(line)
        if k % 4 == 0:
            lines.append(f"%%% corrupted line {k} \x01\x02")
    r = run_analysis([("auth.log", "\n".join(lines))])
    assert r.stats.skipped == 10 and r.stats.parsed == 40
    assert any(a.rule_id == "R1" for a in r.alerts)


def test_t7_unknown_format_lists_supported_formats():
    with pytest.raises(ValueError, match="Supported formats"):
        run_analysis([("weird.txt", "hello world\nthis is not a log\n")])


def test_t8_year_rollover_keeps_order():
    text = ("Dec 31 23:59:50 web01 sshd[1]: Accepted password for alice from 10.0.0.1 port 1 ssh2\n"
            "Jan  1 00:00:05 web01 sshd[2]: Accepted password for bob from 10.0.0.2 port 2 ssh2\n")
    res = parse_auth_log(text, "auth.log", year=2026)
    assert res.events[0].ts.year == 2026 and res.events[1].ts.year == 2027
    assert res.events[0].ts < res.events[1].ts


def test_t9_ipv6_brute_force_detected():
    lines, _ = _ssh_lines(datetime(2026, 10, 4, 2, 0), "2001:db8::bad:1", 15, 5)
    r = run_analysis([("auth.log", "\n".join(lines))])
    r1 = [a for a in r.alerts if a.rule_id == "R1"]
    assert r1 and r1[0].entity["ip"] == "2001:db8::bad:1"


def test_t12_loghub_style_lines_parse():
    """Real OpenSSH logs (Loghub) contain many informational sshd lines; they are valid, not skipped."""
    sample = Path(__file__).parent / "data" / "OpenSSH_2k.log"
    if sample.exists():
        text = sample.read_text(encoding="utf-8", errors="replace")
    else:
        text = "\n".join([
            "Dec 10 06:55:46 LabSZ sshd[24200]: reverse mapping checking getaddrinfo for ns.marryaldkfaczcz.com [173.234.31.186] failed - POSSIBLE BREAK-IN ATTEMPT!",
            "Dec 10 06:55:46 LabSZ sshd[24200]: Invalid user webmaster from 173.234.31.186",
            "Dec 10 06:55:46 LabSZ sshd[24200]: input_userauth_request: invalid user webmaster [preauth]",
            "Dec 10 06:55:46 LabSZ sshd[24200]: pam_unix(sshd:auth): check pass; user unknown",
            "Dec 10 06:55:46 LabSZ sshd[24200]: pam_unix(sshd:auth): authentication failure; logname= uid=0 euid=0 tty=ssh ruser= rhost=173.234.31.186",
            "Dec 10 06:55:48 LabSZ sshd[24200]: Failed password for invalid user webmaster from 173.234.31.186 port 38926 ssh2",
            "Dec 10 06:55:48 LabSZ sshd[24200]: Connection closed by 173.234.31.186 [preauth]",
            "Dec 10 07:02:47 LabSZ sshd[24203]: Connection closed by 212.47.254.145 [preauth]",
            "Dec 10 07:07:38 LabSZ sshd[24206]: Invalid user test9 from 52.80.34.196",
            "Dec 10 07:08:28 LabSZ sshd[24208]: Received disconnect from 52.80.34.196: 11: Bye Bye [preauth]",
            "Dec 10 09:12:35 LabSZ sshd[24492]: Accepted password for fztu from 119.137.62.142 port 49116 ssh2",
            "Dec 10 09:12:35 LabSZ sshd[24492]: pam_unix(sshd:session): session opened for user fztu by (uid=0)",
        ])
    res = auto_detect_and_parse(text, "OpenSSH.log")
    assert res.parsed / res.lines_total >= 0.95


# ─── Rules ────────────────────────────────────────────────────────────────────

def test_s1_story_from_sample():
    r = run_analysis([("auth.log", AUTH_SAMPLE)])
    assert {a.rule_id for a in r.alerts} == {"R1", "R4", "R7", "R8"}
    assert len(r.incidents) == 1
    inc = r.incidents[0]
    assert inc.title == "SSH compromise with persistence"
    assert inc.level == RiskLevel.CRITICAL
    assert inc.entities.users == ["deploy", "sysupdate"]
    assert inc.stages == [KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION, KC.PERSISTENCE]


def test_brute_force_is_one_alert_not_one_per_window():
    lines, _ = _ssh_lines(datetime(2026, 10, 4, 2, 0), "185.220.101.7", 200, 10)
    r = run_analysis([("auth.log", "\n".join(lines))])
    r1 = [a for a in r.alerts if a.rule_id == "R1"]
    assert len(r1) == 1 and r1[0].count == 200


def test_r2_password_spray():
    t = datetime(2026, 10, 4, 3, 0)
    lines = [f"{t + timedelta(seconds=30 * k):%b %d %H:%M:%S} web01 sshd[1]: Failed password for user{k:02d} "
             f"from 45.33.10.8 port 1 ssh2" for k in range(6)]
    r = run_analysis([("auth.log", "\n".join(lines))])
    assert [a.rule_id for a in r.alerts] == ["R2"]


def test_r3_needs_subnet_aggregation():
    """3 IPs × 8 failures over 6 h: no single IP reaches R1 or 15 failures, the /24 does."""
    t = datetime(2026, 10, 4, 0, 0)
    lines = []
    for k in range(24):
        ts = t + timedelta(minutes=15 * k)
        lines.append(f"{ts:%b %d %H:%M:%S} web01 sshd[1]: Failed password for admin from 192.168.100.{10 + k % 3} port 1 ssh2")
    r = run_analysis([("auth.log", "\n".join(lines))])
    assert {a.rule_id for a in r.alerts} == {"R3"}
    assert len(r.incidents) == 1 and len(r.incidents[0].entities.ips) == 3
    assert r.incidents[0].title == "Low-and-slow brute force"


def test_t16_url_encoded_sqli():
    assert match_signature("/login.php?id=%27%20OR%20%271%27%3D%271")[0] == "SQL injection pattern"
    line = '45.33.10.9 - - [04/Oct/2026:14:02:10 +0530] "GET /login.php?id=%27%20OR%20%271%27%3D%271 HTTP/1.1" 200 512 "-" "curl/8"'
    r = run_analysis([("access.log", line)])
    assert [a.rule_id for a in r.alerts] == ["R10"]
    assert "Matched signature: SQL injection pattern" in r.alerts[0].reason


@pytest.mark.parametrize("path,label", [
    ("/search?q=<script>alert(1)</script>", "XSS pattern"),
    ("/download?f=../../etc/passwd", "path traversal pattern"),
    ("/ping?host=1.1.1.1;cat /etc/shadow", "command injection pattern"),
    ("/ping?host=1.1.1.1%3Bcat%20x", "command injection pattern"),
    ("/products?id=1 UNION SELECT password FROM users", "SQL injection pattern"),
])
def test_r10_signatures(path, label):
    assert match_signature(path)[0] == label


def test_r10_ignores_normal_requests():
    for path in ["/", "/products?id=12&sort=asc", "/about-us", "/api/status?x=1"]:
        assert match_signature(path) is None


# ─── Scenarios (T1–T3) ────────────────────────────────────────────────────────

EXPECTED = {
    "S1": ({"185.220.101.7", "deploy", "sysupdate"},
           {KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION, KC.PERSISTENCE}),
    "S2": ({"45.33.10.8", "user05"}, {KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS}),
    "S3": ({"45.33.10.9"}, {KC.RECONNAISSANCE, KC.INITIAL_ACCESS, KC.EXFILTRATION}),
    "S4": ({"192.168.100.10", "192.168.100.11", "192.168.100.12"}, {KC.CREDENTIAL_ACCESS}),
    "S5": ({"172.16.5.20", "user15"}, {KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION, KC.EXFILTRATION}),
}


def _ents(inc):
    return set(inc.entities.ips) | set(inc.entities.users)


def test_t1_baseline_only_has_no_false_alarms():
    r = simulate([], seed=42)
    levels = [i.level for i in r.incidents]
    assert levels.count(RiskLevel.CRITICAL) == 0
    assert levels.count(RiskLevel.HIGH) <= 1


@pytest.mark.parametrize("scenario", sorted(EXPECTED))
def test_t2_each_scenario_alone(scenario):
    r = simulate([scenario], seed=42)
    entities, stages = EXPECTED[scenario]
    matching = [i for i in r.incidents if _ents(i) & entities]
    assert len(matching) == 1, [i.title for i in r.incidents]
    assert _ents(matching[0]) == entities
    assert set(matching[0].stages) == stages
    assert r.evaluation["scenarios_detected"] == 1
    # no other noteworthy incidents
    assert all(i.risk_score < 30 for i in r.incidents if i is not matching[0])


def test_t3_all_scenarios_stay_separate(all_scenarios):
    r = all_scenarios
    ids = set()
    for sid, (entities, stages) in EXPECTED.items():
        matching = [i for i in r.incidents if _ents(i) & entities]
        assert len(matching) == 1, sid
        assert _ents(matching[0]) == entities, sid
        assert set(matching[0].stages) == stages, sid
        ids.add(matching[0].id)
    assert len(ids) == 5
    ev = r.evaluation
    assert ev["scenarios_detected"] == 5
    assert ev["precision"] >= 0.9 and ev["recall"] >= 0.9
    assert ev["critical_false_positives"] == 0


def test_s1_story_reads_like_the_prd(all_scenarios):
    inc = next(i for i in all_scenarios.incidents if "deploy" in i.entities.users)
    text = " ".join(s.text for s in inc.story)
    assert "214 failed SSH logins" in text and "T1110.001" in text
    assert "logged in successfully as deploy" in text and "T1078" in text
    assert "sudo" in text and "T1548.003" in text
    assert "sysupdate" in text and "T1136.001" in text
    assert "Disable deploy" in inc.recommendation and "185.220.101.7" in inc.recommendation


def test_r11_wording_is_possible_not_confirmed(all_scenarios):
    for a in all_scenarios.alerts:
        if a.rule_id == "R11":
            assert a.reason.startswith("Possible data exfiltration indicated by unusually large HTTP response volume")


# ─── Reliability (T10, T11, T13, T17) ─────────────────────────────────────────

def test_t10_100k_lines_under_10_seconds():
    rng = random.Random(7)
    start = datetime(2026, 10, 2, 0, 0, tzinfo=timezone.utc)
    access, auth = [], []
    for k in range(90_000):
        t = start + timedelta(seconds=k * 2)
        access.append(f'203.0.113.{rng.randint(1, 250)} - - [{t:%d/%b/%Y:%H:%M:%S} +0000] '
                      f'"GET /page{rng.randint(1, 50)} HTTP/1.1" {rng.choice([200] * 19 + [404])} {rng.randint(200, 9000)} "-" "Mozilla/5.0"')
    for k in range(10_000):
        t = start + timedelta(seconds=k * 18)
        auth.append(f"{t:%b %d %H:%M:%S} web01 sshd[1]: Accepted password for user{k % 25:02d} "
                    f"from 10.0.1.{k % 25 + 2} port 1 ssh2")
    t0 = time.perf_counter()
    r = run_analysis([("access.log", "\n".join(access)), ("auth.log", "\n".join(auth))])
    elapsed = time.perf_counter() - t0
    assert r.stats.lines_total == 100_000
    assert elapsed < 10, f"took {elapsed:.1f}s"


def test_t11_deterministic(all_scenarios):
    again = simulate(["S1", "S2", "S3", "S4", "S5"], seed=42)
    assert [i.model_dump() for i in again.incidents] == [i.model_dump() for i in all_scenarios.incidents]
    assert [a.model_dump() for a in again.alerts] == [a.model_dump() for a in all_scenarios.alerts]


def test_t13_evidence_points_to_the_right_raw_lines():
    import sys
    from engine.pipeline import REPO_ROOT
    sys.path.insert(0, REPO_ROOT)
    from simulator.attacks import generate
    auth, access, labels = generate(["S1", "S2", "S3", "S4", "S5"], 42)
    files = {"auth.log": auth.splitlines(), "access.log": access.splitlines()}
    r = run_analysis([("auth.log", auth), ("access.log", access)], labels)
    by_id = {e.id: e for e in r.events}
    checked = 0
    for a in r.alerts:
        assert a.evidence_event_ids
        for eid in a.evidence_event_ids:
            e = by_id[eid]
            assert files[e.file][e.line_no - 1].strip() == e.raw
            checked += 1
    assert checked > 300


def test_t17_shuffled_or_split_files_give_identical_incidents(all_scenarios):
    import sys
    from engine.pipeline import REPO_ROOT
    sys.path.insert(0, REPO_ROOT)
    from simulator.attacks import generate
    auth, access, labels = generate(["S1", "S2", "S3", "S4", "S5"], 42)
    base = run_analysis([("auth.log", auth), ("access.log", access)], labels)

    rng = random.Random(1)
    a_lines, w_lines = auth.splitlines(), access.splitlines()
    rng.shuffle(a_lines)
    rng.shuffle(w_lines)
    shuffled = run_analysis([("auth.log", "\n".join(a_lines)), ("access.log", "\n".join(w_lines))], labels)
    half = len(a_lines) // 2
    split = run_analysis([("auth1.log", "\n".join(a_lines[:half])), ("auth2.log", "\n".join(a_lines[half:])),
                          ("access.log", "\n".join(w_lines))], labels)
    assert _sig(shuffled) == _sig(base)
    assert _sig(split) == _sig(base)
