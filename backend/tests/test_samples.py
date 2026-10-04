"""
ChainTrace – Demo Sample Log Tests (Task A5).
Runs engine.pipeline.run_analysis on each sample file and asserts
the expected detection results.

Run:  cd backend && venv\\Scripts\\python -m pytest tests/test_samples.py -v
Owner: Antigravity (Round 2, Task A5)
"""

import os
import sys
from pathlib import Path

import pytest

# Ensure imports resolve correctly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine.pipeline import run_analysis  # noqa: E402

SAMPLES_DIR = Path(__file__).resolve().parent.parent / "samples"


def _read(filename: str) -> tuple:
    """Return (filename, text_content) for a sample file."""
    path = SAMPLES_DIR / filename
    if not path.exists():
        pytest.skip(f"Sample file not found: {path}. Run scripts/make_samples.py first.")
    return (filename, path.read_text(encoding="utf-8"))


# ── demo_auth.log + demo_access.log (S1–S5, seed 42) ─────────────────────────


class TestDemoFull:
    """Both demo files together should yield exactly 5 incidents (S1–S5)."""

    @pytest.fixture(scope="class")
    def result(self):
        auth = _read("demo_auth.log")
        access = _read("demo_access.log")
        return run_analysis([auth, access])

    def test_five_incidents(self, result):
        """S1–S5 all detected → 5 incidents."""
        assert result.stats.incidents == 5, (
            f"Expected 5 incidents, got {result.stats.incidents}"
        )

    def test_all_incidents_risk_at_least_30(self, result):
        """All incidents meet the minimum evaluation risk threshold (≥30)."""
        low = [i for i in result.incidents if i.risk_score < 30]
        assert not low, (
            f"Incidents with risk_score < 30: {[(i.id, i.risk_score) for i in low]}"
        )

    def test_has_critical_incident(self, result):
        """S1 (SSH compromise) should produce a critical incident."""
        crits = [i for i in result.incidents if i.level.value == "critical"]
        assert crits, "No critical incident found; S1 should produce one"

    def test_s1_entities_detected(self, result):
        """S1 attacker IP 185.220.101.7 and user 'deploy' should appear."""
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        all_users = {u for i in result.incidents for u in i.entities.users}
        assert "185.220.101.7" in all_ips, "S1 attacker IP not found"
        assert "deploy" in all_users, "S1 victim user 'deploy' not found"

    def test_s3_web_ip_detected(self, result):
        """S3 attacker IP 45.33.10.9 (web recon) should appear."""
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        assert "45.33.10.9" in all_ips, "S3 attacker IP not found"

    def test_s5_insider_ip_detected(self, result):
        """S5 insider IP 172.16.5.20 should appear."""
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        assert "172.16.5.20" in all_ips, "S5 insider IP not found"

    def test_parsed_greater_than_zero(self, result):
        assert result.stats.parsed > 0

    def test_incidents_sorted_by_risk(self, result):
        """API contract: incidents are ordered by descending risk_score."""
        scores = [i.risk_score for i in result.incidents]
        assert scores == sorted(scores, reverse=True), (
            f"Incidents not sorted by risk_score descending: {scores}"
        )


# ── ssh_breach_only_auth.log (S1 only) ───────────────────────────────────────


class TestSshBreachOnly:
    """S1-only file: at least 1 incident containing the S1 entities."""

    @pytest.fixture(scope="class")
    def result(self):
        return run_analysis([_read("ssh_breach_only_auth.log")])

    def test_has_incidents(self, result):
        assert result.stats.incidents >= 1, "Expected at least 1 incident for S1"

    def test_s1_attacker_ip(self, result):
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        assert "185.220.101.7" in all_ips, "S1 attacker IP 185.220.101.7 not found"

    def test_s1_deploy_user(self, result):
        all_users = {u for i in result.incidents for u in i.entities.users}
        assert "deploy" in all_users, "S1 user 'deploy' not found"

    def test_s1_critical(self, result):
        crits = [i for i in result.incidents if i.level.value == "critical"]
        assert crits, "Expected at least one critical incident for S1"


# ── messy_auth.log (S1 + ~20% corrupted lines, PRD T6) ───────────────────────


class TestMessyLog:
    """Corrupted lines are skipped; S1 is still detected."""

    @pytest.fixture(scope="class")
    def result(self):
        return run_analysis([_read("messy_auth.log")])

    def test_skipped_count_positive(self, result):
        """Corrupted lines must be counted in skipped, not crash the parser."""
        assert result.stats.skipped > 0, (
            "Expected some skipped lines from corrupted content"
        )

    def test_still_has_incidents(self, result):
        assert result.stats.incidents >= 1, (
            "Expected at least 1 incident even with corrupted lines"
        )

    def test_critical_ssh_compromise(self, result):
        """S1 (SSH compromise with persistence) must still be detected."""
        crits = [i for i in result.incidents if i.level.value == "critical"]
        assert crits, "Critical 'SSH compromise with persistence' incident not found"

    def test_s1_attacker_ip_still_found(self, result):
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        assert "185.220.101.7" in all_ips, (
            "S1 attacker IP missing even though only ~20% of lines are corrupted"
        )


# ── ipv6_bruteforce_auth.log ──────────────────────────────────────────────────


class TestIpv6Bruteforce:
    """IPv6 brute force should trigger R1 (brute force) and R4 (login after failures)."""

    IPV6 = "2a01:4f8:c17:b8f::2"

    @pytest.fixture(scope="class")
    def result(self):
        return run_analysis([_read("ipv6_bruteforce_auth.log")])

    def test_has_alerts(self, result):
        assert result.stats.alerts >= 1, "Expected at least 1 alert"

    def test_r1_brute_force_triggered(self, result):
        """R1 (SSH brute force) must fire for the IPv6 attacker."""
        r1_alerts = [a for a in result.alerts if a.rule_id == "R1"]
        assert r1_alerts, "R1 (SSH brute force) not triggered"
        r1_ips = {a.entity.get("ip") for a in r1_alerts}
        assert self.IPV6 in r1_ips, (
            f"R1 alert exists but not for IPv6 {self.IPV6}; found: {r1_ips}"
        )

    def test_r4_login_after_failures_triggered(self, result):
        """R4 (login after failures) must fire for the IPv6 attacker."""
        r4_alerts = [a for a in result.alerts if a.rule_id == "R4"]
        assert r4_alerts, "R4 (login after failures) not triggered"
        r4_ips = {a.entity.get("ip") for a in r4_alerts}
        assert self.IPV6 in r4_ips, (
            f"R4 alert exists but not for IPv6 {self.IPV6}; found: {r4_ips}"
        )

    def test_ipv6_in_incident_entities(self, result):
        """The IPv6 address should surface in at least one incident."""
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        assert self.IPV6 in all_ips, (
            f"IPv6 {self.IPV6} not found in any incident entities"
        )


# ── demo_events.jsonl (SSH brute force + login + sudo in JSON-lines) ──────────


class TestJsonlDemo:
    """JSON-lines demo: R1, R4, and R7 must all fire."""

    @pytest.fixture(scope="class")
    def result(self):
        return run_analysis([_read("demo_events.jsonl")])

    def test_parsed_as_jsonl(self, result):
        """At least some lines must parse successfully."""
        assert result.stats.parsed > 0, "No lines parsed from JSONL file"

    def test_r1_brute_force(self, result):
        """R1: 30 failed SSH logins should trigger SSH brute-force."""
        r1 = [a for a in result.alerts if a.rule_id == "R1"]
        assert r1, "R1 (SSH brute force) not found in JSONL analysis"

    def test_r4_login_after_failures(self, result):
        """R4: successful login after failures must be detected."""
        r4 = [a for a in result.alerts if a.rule_id == "R4"]
        assert r4, "R4 (login after failures) not found in JSONL analysis"

    def test_r7_sudo_after_suspicious_login(self, result):
        """R7: sudo command after suspicious login must be detected."""
        r7 = [a for a in result.alerts if a.rule_id == "R7"]
        assert r7, "R7 (privilege use after suspicious login) not found in JSONL analysis"

    def test_has_incident(self, result):
        assert result.stats.incidents >= 1, "Expected at least 1 incident from JSONL file"

    def test_attacker_ip_in_entities(self, result):
        all_ips = {ip for i in result.incidents for ip in i.entities.ips}
        assert "185.220.101.99" in all_ips, (
            "JSONL attacker IP 185.220.101.99 not found in incident entities"
        )
