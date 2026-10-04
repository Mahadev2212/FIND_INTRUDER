"""
ChainTrace – Pydantic schemas (data contract).
Frozen in Hour 1 – never change without notifying the other person.
Owner: Bhanu Prasad
"""

from __future__ import annotations
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class EventType(str, Enum):
    SSH_FAIL = "ssh_fail"
    SSH_SUCCESS = "ssh_success"
    INVALID_USER = "invalid_user"
    SUDO = "sudo"
    USER_ADD = "user_add"
    GROUP_ADD = "group_add"
    HTTP_REQUEST = "http_request"


class EventSource(str, Enum):
    AUTH = "auth"
    WEB = "web"


class Severity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskLevel(str, Enum):
    LOW = "low"        # 0-29
    MEDIUM = "medium"  # 30-59
    HIGH = "high"      # 60-79
    CRITICAL = "critical"  # 80-100


class KillChainStage(str, Enum):
    RECONNAISSANCE = "Reconnaissance"
    CREDENTIAL_ACCESS = "Credential Access"
    INITIAL_ACCESS = "Initial Access"
    PRIVILEGE_ESCALATION = "Privilege Escalation"
    PERSISTENCE = "Persistence"
    EXFILTRATION = "Exfiltration"


# ─── HTTP fields sub-model ────────────────────────────────────────────────────

class HttpFields(BaseModel):
    method: Optional[str] = None
    path: Optional[str] = None
    status: Optional[int] = None
    bytes: Optional[int] = None
    ua: Optional[str] = None  # user-agent


# ─── Event ────────────────────────────────────────────────────────────────────

class Event(BaseModel):
    id: str
    ts: datetime                     # ISO-8601 UTC
    source: EventSource
    type: EventType
    src_ip: Optional[str] = None
    user: Optional[str] = None       # Note: stored as 'username' in DB
    host: Optional[str] = None
    http: Optional[HttpFields] = None
    file: str                        # original filename
    line_no: int
    raw: str                         # original log line


# ─── MITRE mapping ────────────────────────────────────────────────────────────

class MitreRef(BaseModel):
    tactic: str
    technique: str


# ─── Alert ────────────────────────────────────────────────────────────────────

class Alert(BaseModel):
    id: str
    rule_id: str                     # e.g. "R1", "R2"
    rule_name: str
    severity: Severity
    points: int                      # low=10, medium=20, high=35, critical=50
    stage: KillChainStage
    mitre: MitreRef
    entity: Dict[str, Optional[str]] # {"ip": "...", "user": "..."}
    first_seen: datetime
    last_seen: datetime
    count: int
    reason: str                      # human-readable explanation
    evidence_event_ids: List[str]    # IDs of Event records that triggered this


# ─── Story step ───────────────────────────────────────────────────────────────

class StoryStep(BaseModel):
    ts: datetime
    stage: KillChainStage
    text: str                        # sentence from template
    alert_id: str


# ─── Incident ─────────────────────────────────────────────────────────────────

class IncidentEntities(BaseModel):
    ips: List[str] = []
    users: List[str] = []


class Incident(BaseModel):
    id: str
    title: str
    risk_score: int                  # 0-100
    level: RiskLevel
    entities: IncidentEntities
    start: datetime
    end: datetime
    stages: List[KillChainStage]
    alert_ids: List[str]
    summary: str                     # plain-English assessment
    recommendation: str
    story: List[StoryStep]


# ─── Entity ───────────────────────────────────────────────────────────────────

class EntityType(str, Enum):
    IP = "ip"
    USER = "user"


class Entity(BaseModel):
    type: EntityType
    value: str
    risk_score: int
    level: RiskLevel
    alert_count: int
    first_seen: datetime
    last_seen: datetime


# ─── Analysis stats ───────────────────────────────────────────────────────────

class AnalysisStats(BaseModel):
    lines_total: int
    parsed: int
    skipped: int
    events: int
    alerts: int
    incidents: int


# ─── API request/response models ──────────────────────────────────────────────

class SimulateRequest(BaseModel):
    scenarios: List[str]  # e.g. ["S1", "S2"]
    seed: int = 42


class AnalysisResponse(BaseModel):
    analysis_id: str
    stats: AnalysisStats
    has_ground_truth: bool = False


class AnalysisSummary(BaseModel):
    id: str
    created_at: datetime
    source: str                      # "upload" or "simulation"
    stats: AnalysisStats


# ─── Evaluation metrics (simulation runs only) ────────────────────────────────

class ScenarioResult(BaseModel):
    scenario_id: str                 # e.g. "S1"
    detected: bool
    expected_entities: List[str]
    found_entities: List[str]


class EvaluationMetrics(BaseModel):
    scenarios_detected: int
    scenarios_total: int
    precision: float
    recall: float
    critical_false_positives: int
    per_scenario: List[ScenarioResult]
