"""
ChainTrace – Attack Story Generator.
Sorts incident alerts by time and maps to kill-chain stages.
Generates plain-English narrative with MITRE ATT&CK mapping and recommended responses.
Owner: Bhanu Prasad
"""

from typing import List, Dict
from app.schemas import Alert, Incident, StoryStep, KillChainStage

# Kill-chain stage order for sorting
STAGE_ORDER = [
    KillChainStage.RECONNAISSANCE,
    KillChainStage.CREDENTIAL_ACCESS,
    KillChainStage.INITIAL_ACCESS,
    KillChainStage.PRIVILEGE_ESCALATION,
    KillChainStage.PERSISTENCE,
    KillChainStage.EXFILTRATION,
]

# Title templates keyed by frozenset of stages present
TITLE_TEMPLATES = {
    frozenset([KillChainStage.CREDENTIAL_ACCESS, KillChainStage.INITIAL_ACCESS,
               KillChainStage.PRIVILEGE_ESCALATION, KillChainStage.PERSISTENCE]):
        "SSH compromise with persistence",
    frozenset([KillChainStage.CREDENTIAL_ACCESS, KillChainStage.INITIAL_ACCESS]):
        "Successful credential attack",
    frozenset([KillChainStage.RECONNAISSANCE, KillChainStage.INITIAL_ACCESS,
               KillChainStage.EXFILTRATION]):
        "Web reconnaissance to possible exfiltration",
    frozenset([KillChainStage.CREDENTIAL_ACCESS]):
        "Credential attack",
    frozenset([KillChainStage.INITIAL_ACCESS, KillChainStage.PRIVILEGE_ESCALATION,
               KillChainStage.EXFILTRATION]):
        "Insider threat – off-hours access with possible exfiltration",
}

# Rule-level sentence templates
RULE_SENTENCES = {
    "R1": "IP {ip} made {count} failed SSH logins in {duration} minutes "
          "(Credential Access, T1110.001).",
    "R2": "IP {ip} attempted logins for {count} different usernames in {duration} minutes "
          "(Credential Access, T1110.003 – password spraying).",
    "R3": "The /24 subnet {ip} accumulated {count} failed logins over {duration} hours "
          "(Credential Access, T1110 – low-and-slow brute force).",
    "R4": "IP {ip} successfully logged in as {user} after prior failures "
          "(Initial Access, T1078 – valid accounts).",
    "R5": "User {user} logged in outside normal hours "
          "(Initial Access, T1078 – off-hours access).",
    "R6": "User {user} logged in from a previously unseen IP {ip} "
          "(Initial Access, T1078 – new source IP).",
    "R7": "User {user} ran privileged commands (sudo) within minutes of a suspicious login "
          "(Privilege Escalation, T1548.003).",
    "R8": "A new account was created: {user} "
          "(Persistence, T1136.001 – local account creation).",
    "R9": "{ip} performed web reconnaissance ({count} requests in {duration} minutes) "
          "(Reconnaissance, T1595).",
    "R10": "Possible web attack payload detected from {ip}: {reason} "
           "(Initial Access, T1190 – exploit public-facing application).",
    "R11": "Possible data exfiltration indicated by unusually large HTTP response volume from {ip} "
           "(Exfiltration, TA0010).",
}

RECOMMENDATIONS = {
    "R1": "Block IP {ip} at the firewall; check for lateral movement.",
    "R2": "Block IP {ip}; enforce multi-factor authentication.",
    "R3": "Block /24 subnet {ip}; review firewall rules.",
    "R4": "Disable account {user}; block IP {ip}; rotate credentials.",
    "R5": "Verify {user} intended this login; enforce MFA for off-hours access.",
    "R6": "Verify {user} intended this login; check for compromised credentials.",
    "R7": "Immediately audit actions by {user} as root; disable account if unauthorized.",
    "R8": "Disable and remove account {user}; audit all recent sudo usage.",
    "R9": "Block IP {ip}; review web server for exploited vulnerabilities.",
    "R10": "Review requests from {ip} for successful exploitation; patch vulnerable endpoints.",
    "R11": "Investigate what {ip} downloaded; check for data staging.",
}


def _duration_str(alert: Alert) -> str:
    delta = (alert.last_seen - alert.first_seen).total_seconds()
    if delta < 120:
        return f"{int(delta)}"
    return f"{int(delta / 60)}"


def _fill_template(template: str, alert: Alert) -> str:
    return template.format(
        ip=alert.entity.get("ip") or "unknown",
        user=alert.entity.get("user") or "unknown",
        count=alert.count,
        duration=_duration_str(alert),
        reason=alert.reason[:150],
    )


def _choose_title(stages: List[KillChainStage]) -> str:
    stage_set = frozenset(stages)
    # Exact match first
    if stage_set in TITLE_TEMPLATES:
        return TITLE_TEMPLATES[stage_set]
    # Subset match
    for template_stages, title in TITLE_TEMPLATES.items():
        if template_stages.issubset(stage_set):
            return title
    # Fallback: join stage names
    return " + ".join(s.value for s in stages[:3])


def generate_stories(incidents: List[Incident], alerts: List[Alert]) -> List[Incident]:
    """
    Fill in title, summary, recommendation, and story for each incident.
    Modifies incidents in-place and returns them.
    """
    alert_by_id: Dict[str, Alert] = {a.id: a for a in alerts}

    for incident in incidents:
        inc_alerts = [alert_by_id[aid] for aid in incident.alert_ids if aid in alert_by_id]
        inc_alerts.sort(key=lambda a: (STAGE_ORDER.index(a.stage) if a.stage in STAGE_ORDER else 99, a.first_seen))

        # Build story steps
        story_steps = []
        prev_rule = None
        for alert in inc_alerts:
            template = RULE_SENTENCES.get(alert.rule_id, "{reason}")
            text = _fill_template(template, alert)
            if alert.rule_id != prev_rule:  # merge consecutive same-rule alerts
                story_steps.append(StoryStep(
                    ts=alert.first_seen,
                    stage=alert.stage,
                    text=text,
                    alert_id=alert.id,
                ))
                prev_rule = alert.rule_id

        # Build recommendation
        recs = []
        seen_recs = set()
        for alert in inc_alerts:
            rec_template = RECOMMENDATIONS.get(alert.rule_id)
            if rec_template:
                rec = _fill_template(rec_template, alert)
                if rec not in seen_recs:
                    recs.append(rec)
                    seen_recs.add(rec)

        stages = list(dict.fromkeys(a.stage for a in inc_alerts))
        incident.title = _choose_title(stages)
        incident.story = story_steps
        incident.summary = f"Assessment: likely {incident.title.lower()}."
        incident.recommendation = " ".join(recs) or "Investigate and respond accordingly."
        incident.stages = stages

    return incidents
