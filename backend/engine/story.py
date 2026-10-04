"""
ChainTrace – Attack Story Generator.
Sorts incident alerts by time and maps them to kill-chain stages.
Each rule has a sentence template filled with real values (IP, user, count, time span);
consecutive alerts of the same rule are merged into one sentence.
Title and assessment are chosen from the stages present; each rule contributes a recommended action.
Deterministic templates only – no LLM.
Owner: Bhanu Prasad
"""

import re
from typing import Callable, Dict, List

from app.schemas import Alert, Incident, KillChainStage as KC, StoryStep
from engine.rules import subnet_of

STAGE_ORDER = [KC.RECONNAISSANCE, KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS,
               KC.PRIVILEGE_ESCALATION, KC.PERSISTENCE, KC.EXFILTRATION]


def _t(ts) -> str:
    return ts.strftime("%H:%M")


def _span(first, last) -> str:
    if _t(first) == _t(last):
        return f"At {_t(first)}"
    return f"Between {_t(first)} and {_t(last)}"


def _join(items: List[str]) -> str:
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def _ips(alerts: List[Alert]) -> str:
    ips = sorted({a.entity["ip"] for a in alerts if a.entity.get("ip")})
    return _join(ips) or "an unknown IP"


def _users(alerts: List[Alert]) -> str:
    return _join(sorted({a.entity["user"] for a in alerts if a.entity.get("user")}))


def _count(alerts: List[Alert]) -> int:
    return sum(a.count for a in alerts)


def _mitre(a: Alert) -> str:
    return f"({a.stage.value}, {a.mitre.technique})"


# Sentence per rule: receives the group of consecutive same-rule alerts.
_ACCOUNTS_RE = r"against (\d+) account"
_DISTINCT_RE = r"for (\d+) distinct"
_FIRST_MIN_RE = r"first (\d+) min"


def _num(reason: str, pattern: str) -> str:
    m = re.search(pattern, reason)
    return m.group(1) if m else "several"


SENTENCES: Dict[str, Callable[[List[Alert]], str]] = {
    "R1": lambda g: (f"{_span(g[0].first_seen, g[-1].last_seen)}, IP {_ips(g)} made {_count(g)} failed SSH "
                     f"logins against {_num(g[0].reason, _ACCOUNTS_RE)} account(s) {_mitre(g[0])}."),
    "R2": lambda g: (f"{_span(g[0].first_seen, g[-1].last_seen)}, IP {_ips(g)} tried {_count(g)} logins across "
                     f"{_num(g[0].reason, _DISTINCT_RE)} different accounts – a password-spraying pattern "
                     f"that stays under per-account lockouts {_mitre(g[0])}."),
    "R3": lambda g: (f"{_span(g[0].first_seen, g[-1].last_seen)}, {len(g)} IP(s) in {subnet_of(g[0].entity['ip'])} "
                     f"({_ips(g)}) made {_count(g)} failed SSH logins slowly enough that no single IP crosses the "
                     f"brute-force threshold – a low-and-slow attack {_mitre(g[0])}."),
    "R4": lambda g: (f"At {_t(g[0].last_seen)}, {_ips(g)} logged in successfully as {_users(g)} right after "
                     f"{_count(g) - len(g)} failed attempts – the password was likely guessed {_mitre(g[0])}."),
    "R5": lambda g: f"{g[0].reason} {_mitre(g[0])}.",
    "R6": lambda g: (f"At {_t(g[0].last_seen)}, {_users(g)} logged in from {_ips(g)}, an address never seen for "
                     f"this account in the baseline {_mitre(g[0])}."),
    "R7": lambda g: (f"At {_t(g[0].first_seen)}, {_users(g)} ran sudo/su as root "
                     f"{_num(g[0].reason, _FIRST_MIN_RE)} min after the suspicious login {_mitre(g[0])}."),
    "R8": lambda g: (f"At {_t(g[0].first_seen)}, " + _join([a.reason[0].lower() + a.reason[1:] for a in g])
                     + f" – a likely backdoor for persistence {_mitre(g[0])}."),
    "R9": lambda g: (f"{_span(g[0].first_seen, g[-1].last_seen)}, {_ips(g)} probed the web server for hidden "
                     f"pages: " + "; ".join(a.reason.split(': ', 1)[-1] for a in g) + f" {_mitre(g[0])}."),
    "R10": lambda g: (f"{_span(g[0].first_seen, g[-1].last_seen)}, {_ips(g)} sent requests containing attack "
                      f"payloads {_mitre(g[0])}. " + " ".join(a.reason + "." for a in g)
                      + " This is a matched signature, not a confirmed exploit."),
    "R11": lambda g: (f"{_span(g[0].first_seen, g[-1].last_seen)}, possible data exfiltration indicated by "
                      f"unusually large HTTP response volume: {g[0].reason.split(': ', 1)[-1]} "
                      f"(Exfiltration (possible), {g[0].mitre.technique})."),
}

RECOMMENDATIONS: Dict[str, Callable[[Alert], str]] = {
    "R1": lambda a: f"Block {a.entity['ip']} at the firewall",
    "R2": lambda a: f"Block {a.entity['ip']} and enforce MFA / account lockout for SSH",
    "R3": lambda a: f"Block {subnet_of(a.entity['ip'])} and alert on slow, distributed failures",
    "R4": lambda a: f"Disable {a.entity['user']} and rotate its credentials",
    "R5": lambda a: f"Confirm with {a.entity['user']} whether the off-hours login was theirs",
    "R6": lambda a: f"Verify the new source IP {a.entity['ip']} for {a.entity['user']}",
    "R7": lambda a: f"Audit every command {a.entity['user']} ran as root",
    "R8": lambda a: f"Disable and investigate account {a.entity['user']}",
    "R9": lambda a: f"Block {a.entity['ip']} at the web firewall",
    "R10": lambda a: f"Review application logs for requests from {a.entity['ip']} and patch the targeted endpoint",
    "R11": lambda a: f"Find out what {a.entity['ip']} downloaded and whether it contained sensitive data",
}

# (required stages, title, assessment) – the most specific match (largest stage set) wins.
TITLES = [
    ({KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION, KC.PERSISTENCE},
     "SSH compromise with persistence", "likely successful SSH compromise with a backdoor account"),
    ({KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION, KC.PERSISTENCE},
     "Account takeover with persistence", "a compromised account gained root and created a backdoor"),
    ({KC.RECONNAISSANCE, KC.INITIAL_ACCESS, KC.EXFILTRATION},
     "Web reconnaissance to possible exfiltration",
     "web attack chain: scanning, exploit attempts and an unusually large download"),
    ({KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION, KC.EXFILTRATION},
     "Suspicious off-hours access with possible exfiltration",
     "an account was used at an unusual time or place, escalated to root and moved a large amount of data"),
    ({KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION},
     "SSH compromise with privilege escalation", "likely successful SSH compromise followed by root access"),
    ({KC.INITIAL_ACCESS, KC.PRIVILEGE_ESCALATION},
     "Suspicious login with privilege escalation", "an unusual login was immediately followed by root access"),
    ({KC.CREDENTIAL_ACCESS, KC.INITIAL_ACCESS},
     "Successful credential attack", "an attacker guessed a valid password and logged in"),
    ({KC.RECONNAISSANCE, KC.INITIAL_ACCESS},
     "Web reconnaissance with attack payloads", "web scanning followed by exploit attempts (not confirmed)"),
    ({KC.PERSISTENCE}, "Account created / added to sudo", "a new or newly privileged account needs verification"),
    ({KC.EXFILTRATION}, "Possible large data transfer", "unusually large HTTP response volume to one client"),
    ({KC.RECONNAISSANCE}, "Web scanning", "automated scanning of the web server"),
    ({KC.INITIAL_ACCESS}, "Suspicious login", "a login that does not match the account's normal behaviour"),
    ({KC.CREDENTIAL_ACCESS}, "Credential attack", "repeated failed logins without a confirmed success"),
]
RULE_TITLES = {  # sharper titles when a characteristic rule is present
    ("Successful credential attack", "R2"): ("Password spray with successful login",
                                              "a password-spraying attack found a valid account and logged in"),
    ("Credential attack", "R3"): ("Low-and-slow brute force", "a distributed, slow brute force from one subnet"),
    ("Credential attack", "R2"): ("Password spraying", "one IP tried a few passwords across many accounts"),
    ("Credential attack", "R1"): ("SSH brute force", "a loud brute-force attack with no successful login"),
}


def _choose_title(stages: set, rule_ids: set) -> tuple:
    best = max((t for t in TITLES if t[0] <= stages), key=lambda t: len(t[0]), default=None)
    if best is None:
        return "Suspicious activity", "suspicious activity"
    _, title, assessment = best
    for rid in ("R2", "R3", "R1"):
        if (title, rid) in RULE_TITLES and rid in rule_ids:
            return RULE_TITLES[(title, rid)]
    return title, assessment


def generate_stories(incidents: List[Incident], alerts: List[Alert]) -> List[Incident]:
    """Fill in title, summary, recommendation and story for each incident (in place)."""
    by_id = {a.id: a for a in alerts}

    for inc in incidents:
        inc_alerts = sorted((by_id[i] for i in inc.alert_ids if i in by_id),
                            key=lambda a: (a.first_seen, STAGE_ORDER.index(a.stage)))

        # Merge consecutive same-rule alerts into one sentence.
        groups: List[List[Alert]] = []
        for a in inc_alerts:
            if groups and groups[-1][0].rule_id == a.rule_id:
                groups[-1].append(a)
            else:
                groups.append([a])
        inc.story = [StoryStep(ts=g[0].first_seen, stage=g[0].stage, text=SENTENCES[g[0].rule_id](g),
                               alert_id=g[0].id) for g in groups]

        title, assessment = _choose_title({a.stage for a in inc_alerts}, {a.rule_id for a in inc_alerts})
        inc.title = title
        who = _join([f"IP(s) {', '.join(inc.entities.ips)}" if inc.entities.ips else "",
                     f"account(s) {', '.join(inc.entities.users)}" if inc.entities.users else ""])
        inc.summary = (f"Assessment: {assessment}. {len(inc_alerts)} alert(s) across "
                       f"{len(inc.stages)} kill-chain stage(s) involving {who}.")

        recs: List[str] = []
        for a in inc_alerts:
            r = RECOMMENDATIONS[a.rule_id](a)
            if r not in recs:
                recs.append(r)
        inc.recommendation = ". ".join(recs) + "."

    return incidents
