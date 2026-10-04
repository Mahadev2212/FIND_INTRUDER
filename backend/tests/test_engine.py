"""
ChainTrace – pytest tests.
Owner: Bhanu Prasad
Run: cd backend && pytest tests/ -v
"""

import pytest
from datetime import datetime, timezone
from engine.parsers import parse_auth_log, parse_access_log, auto_detect_and_parse
from engine.rules import r1_ssh_brute_force, r2_password_spraying, r4_login_after_failures
from engine.baseline import build_baseline
from engine.scoring import score_entities
from engine.correlate import correlate_alerts
from app.schemas import Event, EventType, EventSource


# ─── Sample log lines ──────────────────────────────────────────────────────────

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
Oct  4 02:43:30 web01 sudo: deploy : TTY=pts/0 ; USER=root ; COMMAND=/bin/bash
Oct  4 02:45:02 web01 useradd[2331]: new user: name=sysupdate, UID=1005, GID=1005
MALFORMED LINE THAT SHOULD BE SKIPPED
"""

ACCESS_SAMPLE = """45.33.10.9 - - [04/Oct/2026:14:02:10 +0530] "GET /login.php?id=1' OR '1'='1 HTTP/1.1" 200 512 "-" "sqlmap/1.8"
45.33.10.9 - - [04/Oct/2026:14:02:15 +0530] "GET /wp-admin/index.php HTTP/1.1" 404 200 "-" "gobuster/3.6"
203.0.113.1 - - [04/Oct/2026:10:00:00 +0530] "GET /index.html HTTP/1.1" 200 5000 "-" "Mozilla/5.0"
MALFORMED ACCESS LINE
"""


# ─── T1: Parser tests ─────────────────────────────────────────────────────────

def test_auth_log_parser_basic():
    events, skipped = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    assert len(events) > 0
    assert skipped >= 1  # malformed line


def test_auth_log_ssh_fail_detected():
    events, _ = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    fail_events = [e for e in events if e.type == EventType.SSH_FAIL]
    assert len(fail_events) >= 10


def test_auth_log_ssh_success_detected():
    events, _ = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    success_events = [e for e in events if e.type == EventType.SSH_SUCCESS]
    assert len(success_events) == 1
    assert success_events[0].user == "deploy"


def test_auth_log_sudo_detected():
    events, _ = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    sudo_events = [e for e in events if e.type == EventType.SUDO]
    assert len(sudo_events) == 1
    assert sudo_events[0].user == "deploy"


def test_auth_log_useradd_detected():
    events, _ = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    add_events = [e for e in events if e.type == EventType.USER_ADD]
    assert len(add_events) == 1
    assert add_events[0].user == "sysupdate"


def test_access_log_parser_basic():
    events, skipped = parse_access_log(ACCESS_SAMPLE, "access.log")
    assert len(events) > 0
    assert skipped >= 1  # malformed line


def test_auto_detect_auth():
    _, _, fmt = auto_detect_and_parse(AUTH_SAMPLE, "auth.log")
    assert fmt == "auth"


def test_auto_detect_access():
    _, _, fmt = auto_detect_and_parse(ACCESS_SAMPLE, "access.log")
    assert fmt == "access"


def test_auto_detect_unknown_raises():
    with pytest.raises(ValueError, match="Unrecognised"):
        auto_detect_and_parse("this is not a log\n", "unknown.txt")


# ─── T4: Edge cases ───────────────────────────────────────────────────────────

def test_empty_file_returns_no_events():
    events, skipped = parse_auth_log("", "empty.log")
    assert events == []
    assert skipped == 0


def test_all_malformed_lines():
    bad_content = "\n".join(["GARBAGE"] * 100)
    events, skipped = parse_auth_log(bad_content, "bad.log")
    assert len(events) == 0
    assert skipped == 100


# ─── T5: Detection rule tests ─────────────────────────────────────────────────

def test_r1_detects_brute_force():
    events, _ = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    events.sort(key=lambda e: e.ts)
    alerts = r1_ssh_brute_force(events)
    r1_alerts = [a for a in alerts if a.rule_id == "R1"]
    assert len(r1_alerts) >= 1
    assert any(a.entity["ip"] == "185.220.101.7" for a in r1_alerts)


def test_r4_detects_login_after_failures():
    events, _ = parse_auth_log(AUTH_SAMPLE, "auth.log", year=2026)
    events.sort(key=lambda e: e.ts)
    alerts = r4_login_after_failures(events)
    assert any(a.rule_id == "R4" and a.entity.get("user") == "deploy" for a in alerts)


# ─── T18/T19: PostgreSQL persistence stubs ────────────────────────────────────

def test_t18_analysis_persistence_stub():
    """Stub: Restart the backend, then open an old analysis – should load from PostgreSQL."""
    # Bhanu implements full test once db.py is wired
    pass


def test_t19_db_unreachable_returns_503():
    """Stub: Database unreachable during upload → HTTP 503, no partial rows."""
    pass
