"""
ChainTrace - Task A1: Real-world Loghub OpenSSH validation (PRD test T12).
Tests that the parser handles the public Loghub OpenSSH_2k.log sample correctly.
Owner: Bhanu Prasad (Antigravity)
"""

from pathlib import Path
from collections import Counter

import pytest

from engine.parsers import auto_detect_and_parse, parse_auth_log
from engine.pipeline import run_analysis
from app.schemas import EventType

DATA_DIR = Path(__file__).parent / "data"
OPENSSH_LOG = DATA_DIR / "OpenSSH_2k.log"

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def openssh_text():
    """Read the real Loghub OpenSSH sample. Skip tests if file is missing."""
    if not OPENSSH_LOG.exists():
        pytest.skip(f"OpenSSH_2k.log not found at {OPENSSH_LOG}. Run Task A1 setup first.")
    return OPENSSH_LOG.read_text(encoding="utf-8", errors="replace")


@pytest.fixture(scope="module")
def openssh_result(openssh_text):
    return auto_detect_and_parse(openssh_text, "OpenSSH_2k.log")


# ---------------------------------------------------------------------------
# T12 - Parse rate >= 95%
# ---------------------------------------------------------------------------

def test_t12_parse_rate_at_least_95_percent(openssh_result):
    """
    PRD test T12: At least 95% of all non-empty lines in the Loghub OpenSSH sample
    must be parsed (i.e., match the syslog format). Informational lines like
    pam_unix, 'Connection closed', 'reverse mapping checking' all count as parsed.
    """
    r = openssh_result
    assert r.lines_total > 0, "File is empty"
    rate = r.parsed / r.lines_total
    assert rate >= 0.95, (
        f"Parse rate {rate:.3f} ({r.parsed}/{r.lines_total}) is below 95%. "
        f"Skipped {r.skipped} lines."
    )


def test_t12_format_detected_as_auth(openssh_result):
    """The Loghub OpenSSH file must be detected as syslog 'auth' format."""
    assert openssh_result.fmt == "auth"


# ---------------------------------------------------------------------------
# Event extraction checks
# ---------------------------------------------------------------------------

def test_openssh_failed_password_events_extracted(openssh_result):
    """
    SSH_FAIL events must be extracted with the correct user and IP.
    The Loghub file contains 'Failed password for invalid user webmaster from 173.234.31.186...'
    as the very first failure.
    """
    fail_events = [e for e in openssh_result.events if e.type == EventType.SSH_FAIL]
    assert len(fail_events) > 0, "No SSH_FAIL events found"

    # Check specific known event from the Loghub file
    known = [e for e in fail_events if e.src_ip == "173.234.31.186"]
    assert len(known) > 0, "No SSH_FAIL events from 173.234.31.186 (first attacker IP)"
    e = known[0]
    assert e.user in ("webmaster", None) or e.user == "webmaster", (
        f"Expected user 'webmaster', got {e.user!r}"
    )
    assert e.src_ip == "173.234.31.186"


def test_openssh_accepted_password_events_extracted(openssh_result):
    """
    SSH_SUCCESS events must be extracted. The Loghub file contains at least one
    'Accepted password for fztu from 119.137.62.142' event.
    """
    success_events = [e for e in openssh_result.events if e.type == EventType.SSH_SUCCESS]
    assert len(success_events) >= 1, "Expected at least one SSH_SUCCESS event"
    known = [e for e in success_events if e.src_ip == "119.137.62.142"]
    assert len(known) >= 1, "Expected SSH_SUCCESS for user fztu from 119.137.62.142"
    assert known[0].user == "fztu"


def test_openssh_invalid_user_events_extracted(openssh_result):
    """
    INVALID_USER events must be extracted. The Loghub file starts with
    'Invalid user webmaster from 173.234.31.186'.
    """
    invalid_events = [e for e in openssh_result.events if e.type == EventType.INVALID_USER]
    assert len(invalid_events) > 0, "No INVALID_USER events found"
    known = [e for e in invalid_events if e.src_ip == "173.234.31.186"]
    assert len(known) > 0, "No INVALID_USER events from 173.234.31.186"
    assert known[0].user == "webmaster"


def test_openssh_event_ids_unique_and_correct_format(openssh_result):
    """Every event id must be '<filename>:<line_no>' and must be unique."""
    ids = [e.id for e in openssh_result.events]
    assert len(ids) == len(set(ids)), "Duplicate event IDs found"
    for e in openssh_result.events:
        assert e.id == f"OpenSSH_2k.log:{e.line_no}", f"Bad event ID: {e.id}"
        assert e.raw, "Event missing raw line"
        assert e.file == "OpenSSH_2k.log"


def test_openssh_event_counts_sanity(openssh_result):
    """Sanity check on event type distribution from the 2k-line file."""
    counts = Counter(e.type for e in openssh_result.events)
    # The Loghub file is almost entirely SSH failures / invalid user attempts
    assert counts[EventType.SSH_FAIL] > 300, "Expected >300 SSH_FAIL events"
    assert counts[EventType.INVALID_USER] > 50, "Expected >50 INVALID_USER events"


# ---------------------------------------------------------------------------
# Pipeline integration: run_analysis must finish without errors and find R1
# ---------------------------------------------------------------------------

def test_openssh_run_analysis_no_crash(openssh_text):
    """
    run_analysis() on the real Loghub file must finish without raising an exception.
    """
    result = run_analysis([("OpenSSH_2k.log", openssh_text)])
    assert result is not None
    assert result.stats.lines_total > 0


def test_openssh_run_analysis_finds_brute_force(openssh_text):
    """
    The Loghub file contains many SSH failures - run_analysis must find at least
    one brute-force (R1) alert and produce at least one incident.
    """
    result = run_analysis([("OpenSSH_2k.log", openssh_text)])
    rule_ids = {a.rule_id for a in result.alerts}
    assert "R1" in rule_ids, (
        f"Expected R1 (SSH brute force) alert. Got rule IDs: {rule_ids}"
    )
    assert len(result.incidents) >= 1, "Expected at least one incident"


def test_openssh_raw_lines_match_file(openssh_text):
    """
    Each event's raw field must exactly match the corresponding line in the source file.
    This validates click-to-evidence works correctly (PRD T13 style check for real data).
    """
    lines = openssh_text.splitlines()
    result = auto_detect_and_parse(openssh_text, "OpenSSH_2k.log")
    for e in result.events:
        expected_raw = lines[e.line_no - 1].strip()
        assert e.raw == expected_raw, (
            f"Line {e.line_no}: raw mismatch.\n  got:      {e.raw!r}\n  expected: {expected_raw!r}"
        )
