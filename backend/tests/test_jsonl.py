"""
ChainTrace - Task A2: JSON-lines log format tests (PRD P2 feature).
Tests format detection, field mapping, malformed lines handling,
and SSH brute-force detection via run_analysis() producing R1 + R4 alerts.
Owner: Bhanu Prasad (Antigravity)
"""

import json
from datetime import datetime, timezone, timedelta

import pytest

from engine.parsers import (
    detect_format,
    auto_detect_and_parse,
    parse_jsonl_log,
    SUPPORTED_FORMATS,
)
from engine.pipeline import run_analysis
from app.schemas import EventType, EventSource


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_line(**kwargs) -> str:
    """Serialise a dict to a JSON-lines string."""
    return json.dumps(kwargs)


def _content(*lines: str) -> str:
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Format detection
# ---------------------------------------------------------------------------

class TestDetectFormat:
    """detect_format() must return 'jsonl' for valid JSON-lines content."""

    def test_pure_jsonl_is_detected(self):
        lines = [
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4", user="root"),
            _make_line(ts="2026-10-04T10:00:05Z", event="ssh_fail", ip="1.2.3.4", user="root"),
            _make_line(ts="2026-10-04T10:00:10Z", event="ssh_fail", ip="1.2.3.4", user="root"),
        ]
        assert detect_format(_content(*lines)) == "jsonl"

    def test_auth_log_not_detected_as_jsonl(self):
        content = (
            "Oct  4 02:03:11 web01 sshd[2211]: Failed password for root from 185.220.101.7 port 51122 ssh2\n"
            "Oct  4 02:03:21 web01 sshd[2212]: Failed password for root from 185.220.101.7 port 51123 ssh2\n"
        )
        assert detect_format(content) == "auth"

    def test_access_log_not_detected_as_jsonl(self):
        content = (
            '45.33.10.9 - - [04/Oct/2026:14:02:10 +0530] "GET /index.html HTTP/1.1" 200 512 "-" "Mozilla/5.0"\n'
            '45.33.10.9 - - [04/Oct/2026:14:02:15 +0530] "GET /login.php HTTP/1.1" 200 512 "-" "Mozilla/5.0"\n'
        )
        assert detect_format(content) == "access"

    def test_mixed_json_and_garbage_detected_as_jsonl_if_majority_valid(self):
        lines = [
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4"),
            _make_line(ts="2026-10-04T10:00:01Z", event="ssh_fail", ip="1.2.3.4"),
            "NOT JSON AT ALL",
            _make_line(ts="2026-10-04T10:00:02Z", event="ssh_fail", ip="1.2.3.4"),
        ]
        # 3/4 = 75% valid JSON - should still detect as jsonl
        assert detect_format(_content(*lines)) == "jsonl"

    def test_empty_content_returns_none(self):
        assert detect_format("") is None
        assert detect_format("   \n\n  ") is None

    def test_jsonl_in_supported_formats_string(self):
        assert "json" in SUPPORTED_FORMATS.lower()


# ---------------------------------------------------------------------------
# Field mapping
# ---------------------------------------------------------------------------

class TestFieldMapping:
    """Test that all supported key aliases map correctly."""

    def test_timestamp_alias_ts(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4", user="root")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.parsed == 1
        assert res.events[0].ts == datetime(2026, 10, 4, 10, 0, 0, tzinfo=timezone.utc)

    def test_timestamp_alias_time(self):
        line = _make_line(time="2026-10-04T10:00:00+00:00", event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.parsed == 1
        assert res.events[0].ts.tzinfo == timezone.utc

    def test_timestamp_alias_at_timestamp(self):
        obj = {"@timestamp": "2026-10-04T10:00:00Z", "event": "ssh_fail", "ip": "1.2.3.4"}
        line = json.dumps(obj)
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.parsed == 1

    def test_timestamp_epoch_seconds(self):
        epoch = 1759564800  # 2025-10-04 ~UTC
        line = _make_line(timestamp=epoch, event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.parsed == 1
        assert res.events[0].ts.tzinfo == timezone.utc

    def test_timestamp_epoch_milliseconds(self):
        epoch_ms = 1759564800 * 1000  # > 1e12, treated as ms
        line = _make_line(timestamp=epoch_ms, event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.parsed == 1

    def test_ip_alias_src_ip(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", src_ip="10.0.0.1", user="root")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].src_ip == "10.0.0.1"

    def test_ip_alias_client_ip(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", client_ip="10.0.0.2")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].src_ip == "10.0.0.2"

    def test_ip_alias_remote_addr(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", remote_addr="10.0.0.3")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].src_ip == "10.0.0.3"

    def test_user_alias_username(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4", username="alice")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].user == "alice"

    def test_event_type_ssh_fail(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.SSH_FAIL

    def test_event_type_ssh_success(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_success", ip="1.2.3.4", user="alice")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.SSH_SUCCESS

    def test_event_type_invalid_user(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="invalid_user", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.INVALID_USER

    def test_event_type_sudo(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="sudo", user="alice")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.SUDO

    def test_event_type_user_add(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="user_add", user="newuser")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.USER_ADD

    def test_event_type_group_add(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="group_add", user="newuser")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.GROUP_ADD

    def test_event_type_http_request_with_http_fields(self):
        line = _make_line(
            ts="2026-10-04T10:00:00Z", event="http_request",
            ip="1.2.3.4", method="GET", path="/index.html",
            status=200, bytes=1024, user_agent="Mozilla/5.0"
        )
        res = parse_jsonl_log(line, "test.jsonl")
        e = res.events[0]
        assert e.type == EventType.HTTP_REQUEST
        assert e.source == EventSource.WEB
        assert e.http is not None
        assert e.http.method == "GET"
        assert e.http.path == "/index.html"
        assert e.http.status == 200
        assert e.http.bytes == 1024
        assert e.http.ua == "Mozilla/5.0"

    def test_event_alias_type_key(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", type="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.SSH_FAIL

    def test_event_alias_action_key(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", action="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].type == EventType.SSH_FAIL

    def test_event_id_is_filename_colon_lineno(self):
        lines = [
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4"),
            _make_line(ts="2026-10-04T10:00:01Z", event="ssh_fail", ip="1.2.3.4"),
        ]
        res = parse_jsonl_log(_content(*lines), "mylog.jsonl")
        assert res.events[0].id == "mylog.jsonl:1"
        assert res.events[1].id == "mylog.jsonl:2"

    def test_raw_is_original_line(self):
        raw = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(raw, "test.jsonl")
        assert res.events[0].raw == raw

    def test_http_url_alias_for_path(self):
        line = _make_line(
            ts="2026-10-04T10:00:00Z", event="http_request",
            ip="1.2.3.4", method="POST", url="/api/login", status=401
        )
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].http.path == "/api/login"

    def test_ua_alias_for_user_agent(self):
        line = _make_line(
            ts="2026-10-04T10:00:00Z", event="http_request",
            ip="1.2.3.4", method="GET", path="/", status=200, ua="curl/7.8"
        )
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].http.ua == "curl/7.8"

    def test_invalid_ip_stored_as_none(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="not-an-ip")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.events[0].src_ip is None


# ---------------------------------------------------------------------------
# Malformed lines
# ---------------------------------------------------------------------------

class TestMalformedLines:
    """Bad lines are skipped and counted in skipped; parser never crashes."""

    def test_bad_json_is_skipped(self):
        lines = [
            "not json at all",
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4"),
            "{broken json",
        ]
        res = parse_jsonl_log(_content(*lines), "test.jsonl")
        assert res.parsed == 1
        assert res.skipped == 2

    def test_missing_timestamp_is_skipped(self):
        line = _make_line(event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.parsed == 0
        assert res.skipped == 1

    def test_bad_timestamp_is_skipped(self):
        line = _make_line(ts="not-a-timestamp", event="ssh_fail", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.skipped == 1

    def test_missing_event_type_is_skipped(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", ip="1.2.3.4", user="root")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.skipped == 1

    def test_unknown_event_type_is_skipped(self):
        line = _make_line(ts="2026-10-04T10:00:00Z", event="fly_to_moon", ip="1.2.3.4")
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.skipped == 1

    def test_json_array_is_skipped(self):
        line = json.dumps([1, 2, 3])
        res = parse_jsonl_log(line, "test.jsonl")
        assert res.skipped == 1

    def test_empty_lines_not_counted(self):
        lines = [
            "",
            "   ",
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4"),
            "",
        ]
        res = parse_jsonl_log(_content(*lines), "test.jsonl")
        assert res.lines_total == 1  # only non-empty lines
        assert res.parsed == 1

    def test_mixed_good_and_bad_counts_correctly(self):
        lines = [
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4"),
            "MALFORMED",
            _make_line(ts="2026-10-04T10:00:01Z", event="ssh_success", ip="1.2.3.4", user="alice"),
            "{bad json}",
            _make_line(ts="2026-10-04T10:00:02Z", event="sudo", user="alice"),
        ]
        res = parse_jsonl_log(_content(*lines), "test.jsonl")
        assert res.lines_total == 5
        assert res.parsed == 3
        assert res.skipped == 2

    def test_parser_never_raises_on_garbage_input(self):
        garbage = "\x00\xff" * 100 + "\nnot json\n" + "{'single': 'quotes'}\n"
        res = parse_jsonl_log(garbage, "garbage.jsonl")
        assert res is not None  # no exception


# ---------------------------------------------------------------------------
# Auto-detect and parse JSONL
# ---------------------------------------------------------------------------

class TestAutoDetectJsonl:
    """auto_detect_and_parse() must pick up jsonl format and parse it."""

    def test_auto_detect_parses_jsonl(self):
        lines = [
            _make_line(ts="2026-10-04T10:00:00Z", event="ssh_fail", ip="1.2.3.4", user="root"),
            _make_line(ts="2026-10-04T10:00:05Z", event="ssh_fail", ip="1.2.3.4", user="root"),
        ]
        res = auto_detect_and_parse(_content(*lines), "test.jsonl")
        assert res.fmt == "jsonl"
        assert res.parsed == 2


# ---------------------------------------------------------------------------
# SSH brute force scenario: R1 + R4 via run_analysis()
# ---------------------------------------------------------------------------

class TestBruteForceScenario:
    """
    Build a synthetic brute-force attack as JSON-lines:
    >=10 SSH failures in 5 minutes from one IP, followed by a success from the same IP.
    run_analysis() must produce R1 (SSH brute force) + R4 (Login after failures)
    alerts in at least one CRITICAL incident.
    """

    @pytest.fixture(scope="class")
    def brute_force_content(self):
        attacker_ip = "203.0.113.99"
        victim_user = "deploy"
        base_time = datetime(2026, 10, 4, 3, 0, 0, tzinfo=timezone.utc)

        lines = []
        # 12 failures within 4 minutes (well within R1 window)
        for k in range(12):
            ts = base_time + timedelta(seconds=20 * k)
            lines.append(_make_line(
                ts=ts.isoformat(),
                event="ssh_fail",
                src_ip=attacker_ip,
                user=victim_user,
            ))

        # 1 success from the same IP, 30 seconds after the last failure
        success_ts = base_time + timedelta(seconds=20 * 12 + 30)
        lines.append(_make_line(
            ts=success_ts.isoformat(),
            event="ssh_success",
            src_ip=attacker_ip,
            user=victim_user,
        ))

        return _content(*lines)

    def test_format_detected_as_jsonl(self, brute_force_content):
        fmt = detect_format(brute_force_content)
        assert fmt == "jsonl"

    def test_parse_result_has_correct_counts(self, brute_force_content):
        res = parse_jsonl_log(brute_force_content, "brute.jsonl")
        assert res.parsed == 13  # 12 failures + 1 success
        assert res.skipped == 0

    def test_run_analysis_no_crash(self, brute_force_content):
        result = run_analysis([("brute.jsonl", brute_force_content)])
        assert result is not None

    def test_r1_ssh_brute_force_alert_present(self, brute_force_content):
        result = run_analysis([("brute.jsonl", brute_force_content)])
        rule_ids = {a.rule_id for a in result.alerts}
        assert "R1" in rule_ids, f"R1 (SSH brute force) not found. Got: {rule_ids}"

    def test_r4_login_after_failures_alert_present(self, brute_force_content):
        result = run_analysis([("brute.jsonl", brute_force_content)])
        rule_ids = {a.rule_id for a in result.alerts}
        assert "R4" in rule_ids, f"R4 (Login after failures) not found. Got: {rule_ids}"

    def test_critical_incident_produced(self, brute_force_content):
        from app.schemas import RiskLevel
        result = run_analysis([("brute.jsonl", brute_force_content)])
        critical = [i for i in result.incidents if i.level == RiskLevel.CRITICAL]
        assert len(critical) >= 1, (
            f"Expected at least one CRITICAL incident. Got: "
            f"{[(i.title, i.level, i.risk_score) for i in result.incidents]}"
        )

    def test_incident_entities_include_attacker(self, brute_force_content):
        result = run_analysis([("brute.jsonl", brute_force_content)])
        # At least one incident must reference the attacker IP
        attacker_ip = "203.0.113.99"
        found = any(attacker_ip in i.entities.ips for i in result.incidents)
        assert found, f"Attacker IP {attacker_ip} not in any incident entities"

    def test_r1_r4_in_same_incident(self, brute_force_content):
        result = run_analysis([("brute.jsonl", brute_force_content)])
        attacker_ip = "203.0.113.99"
        incident = next(
            (i for i in result.incidents if attacker_ip in i.entities.ips),
            None
        )
        assert incident is not None, "No incident with attacker IP found"
        incident_alerts = [a for a in result.alerts if a.id in incident.alert_ids]
        alert_rule_ids = {a.rule_id for a in incident_alerts}
        assert "R1" in alert_rule_ids, "R1 not in incident alerts"
        assert "R4" in alert_rule_ids, "R4 not in incident alerts"

    def test_evidence_event_ids_reference_jsonl_events(self, brute_force_content):
        """
        Alert evidence_event_ids must reference event IDs in the format
        'brute.jsonl:<line_no>' — confirming click-to-evidence works for JSONL.
        """
        result = run_analysis([("brute.jsonl", brute_force_content)])
        event_ids = {e.id for e in result.events}
        for alert in result.alerts:
            for eid in alert.evidence_event_ids:
                assert eid in event_ids, f"Evidence event ID {eid!r} not in parsed events"
                assert eid.startswith("brute.jsonl:"), (
                    f"Evidence ID {eid!r} does not reference the JSONL file"
                )


def test_non_numeric_http_fields_do_not_drop_the_file():
    """One line with status/bytes '-' must not crash parsing or lose the other valid lines."""
    from engine.pipeline import run_analysis
    text = ('{"ts":"2026-10-04T02:00:00Z","event":"http","ip":"1.2.3.4","status":"-","bytes":"-"}\n'
            '{"ts":"2026-10-04T02:00:01Z","event":"http","ip":"1.2.3.4","status":200,"bytes":{"x":1}}\n')
    r = run_analysis([("x.jsonl", text)])
    assert r.stats.parsed == 2 and r.stats.skipped == 0
    assert r.events[0].http.status is None and r.events[1].http.status == 200
    assert r.events[1].http.bytes is None
