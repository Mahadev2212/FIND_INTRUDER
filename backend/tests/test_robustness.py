"""
ChainTrace – robustness / threshold-tuning tests (B9).
The demo uses seed 42, but judges may pick any seed: detection must not depend on lucky randomness.
Owner: Bhanu Prasad
"""

from collections import Counter
from datetime import datetime, timedelta

import pytest

from app.schemas import RiskLevel
from engine.pipeline import run_analysis, simulate

ALL = ["S1", "S2", "S3", "S4", "S5"]


@pytest.mark.parametrize("seed", [1, 7, 13, 99, 2026])
def test_all_scenarios_detected_for_any_seed(seed):
    ev = simulate(ALL, seed).evaluation
    assert ev["scenarios_detected"] == 5, ev["per_scenario"]
    assert ev["precision"] >= 0.9 and ev["recall"] >= 0.9
    assert ev["critical_false_positives"] == 0


@pytest.mark.parametrize("seed", range(1, 11))
def test_baseline_only_is_quiet_for_any_seed(seed):
    levels = Counter(i.level for i in simulate([], seed).incidents)
    assert levels[RiskLevel.CRITICAL] == 0
    assert levels[RiskLevel.HIGH] <= 1


@pytest.mark.parametrize("seed", [3, 77])
@pytest.mark.parametrize("scenario", ALL)
def test_each_scenario_alone_for_other_seeds(scenario, seed):
    r = simulate([scenario], seed)
    assert r.evaluation["scenarios_detected"] == 1
    assert len([i for i in r.incidents if i.risk_score >= 30]) == 1


def _syslog(t: datetime, msg: str) -> str:
    return f"{t:%b} {t.day:2d} {t:%H:%M:%S} web01 {msg}"


def _access(ip: str, t: datetime, path: str, status: int, size: int, ua: str = "Mozilla/5.0") -> str:
    return f'{ip} - - [{t:%d/%b/%Y:%H:%M:%S} +0000] "GET {path} HTTP/1.1" {status} {size} "-" "{ua}"'


def test_tricky_benign_traffic_raises_no_high_incidents():
    """Things that look a bit odd but are normal must stay below 'high'."""
    start = datetime(2026, 10, 2, 9, 0)
    auth, web = [], []
    # 20 users, each logging in daily for 3 days from a fixed IP; some mistype their password 3 times first.
    for day in range(3):
        for u in range(20):
            t = start + timedelta(days=day, minutes=20 * u)
            ip = f"10.0.1.{u + 2}"
            if u % 5 == 0:
                for k in range(3):
                    auth.append(_syslog(t - timedelta(seconds=30 - 5 * k),
                                        f"sshd[1]: Failed password for user{u:02d} from {ip} port 1 ssh2"))
            auth.append(_syslog(t, f"sshd[2]: Accepted password for user{u:02d} from {ip} port 2 ssh2"))
            # an admin doing routine sudo after a normal login
            if u == 1:
                auth.append(_syslog(t + timedelta(minutes=2),
                                    "sudo: user01 : TTY=pts/0 ; PWD=/home/user01 ; USER=root ; COMMAND=/usr/bin/apt update"))
    # A polite crawler: 20 404s per 5 minutes (under the 30 threshold), all day.
    for k in range(400):
        web.append(_access("66.249.66.1", start + timedelta(seconds=15 * k), f"/old-page-{k}", 404, 300, "Googlebot/2.1"))
    # 200 normal visitors and one 10 MB legitimate download.
    for k in range(2000):
        web.append(_access(f"203.0.113.{k % 200 + 1}", start + timedelta(seconds=40 * k), "/products", 200, 8000))
    web.append(_access("203.0.113.50", start + timedelta(hours=5), "/files/brochure.pdf", 200, 10_000_000))

    r = run_analysis([("auth.log", "\n".join(auth)), ("access.log", "\n".join(web))])
    worst = max((i.risk_score for i in r.incidents), default=0)
    assert worst < 60, [(i.title, i.risk_score, i.entities) for i in r.incidents]
