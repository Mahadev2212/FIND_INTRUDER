"""
ChainTrace – end-to-end detection pipeline (runs entirely in memory, no database).
parse → normalize → sort by timestamp → baseline → rules → scoring → correlation → story

CLI (Checkpoint C1 – works without the API or Postgres):
    cd backend
    python -m engine.pipeline path/to/auth.log path/to/access.log
    python -m engine.pipeline --simulate S1 S2 S3 S4 S5
Owner: Bhanu Prasad
"""

import argparse
import os
import sys
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple

from app.schemas import Alert, AnalysisStats, Entity, Event, Incident
from engine.baseline import build_baseline
from engine.correlate import correlate_alerts
from engine.evaluate import evaluate
from engine.parsers import SUPPORTED_FORMATS, auto_detect_and_parse
from engine.rules import run_all_rules
from engine.scoring import score_entities
from engine.story import generate_stories

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class NoParsableLines(ValueError):
    pass


@dataclass
class AnalysisResult:
    files: List[str]
    stats: AnalysisStats
    events: List[Event]
    alerts: List[Alert]
    incidents: List[Incident]
    entities: List[Entity]
    file_formats: Dict[str, str] = field(default_factory=dict)
    evaluation: Optional[Dict[str, Any]] = None
    labels: Optional[Dict[str, Any]] = None


def _unique_names(names: List[str]) -> List[str]:
    """Two uploads called auth.log must not produce colliding event IDs."""
    seen: Dict[str, int] = {}
    out = []
    for n in names:
        base = os.path.basename(n or "upload.log")
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            root, ext = os.path.splitext(base)
            base = f"{root}_{seen[base]}{ext}"
        out.append(base)
    return out


def run_analysis(files: List[Tuple[str, str]], labels: Optional[Dict[str, Any]] = None) -> AnalysisResult:
    """
    files: [(filename, text_content)]. Raises ValueError (incl. NoParsableLines) on bad input.
    """
    names = _unique_names([f[0] for f in files])
    events: List[Event] = []
    lines_total = parsed = skipped = 0
    formats: Dict[str, str] = {}
    errors = []

    for name, (_, content) in zip(names, files):
        try:
            res = auto_detect_and_parse(content, name)
        except ValueError as exc:
            if not content.strip():
                errors.append(f"'{name}' is empty")
            else:
                errors.append(str(exc))
            lines_total += sum(1 for line in content.splitlines() if line.strip())
            skipped += sum(1 for line in content.splitlines() if line.strip())
            continue
        formats[name] = res.fmt
        events.extend(res.events)
        lines_total += res.lines_total
        parsed += res.parsed
        skipped += res.skipped

    if parsed == 0:
        detail = "; ".join(errors) if errors else "no parsable lines"
        raise NoParsableLines(f"No parsable lines: {detail}. Supported formats: {SUPPORTED_FORMATS}.")

    # Merge all files and sort by time; file + line number break ties so the order is deterministic.
    events.sort(key=lambda e: (e.ts, e.file, e.line_no))

    baseline = build_baseline(events)
    alerts = run_all_rules(events, baseline)
    incidents = generate_stories(correlate_alerts(alerts, events), alerts)
    entities = score_entities(alerts)

    stats = AnalysisStats(lines_total=lines_total, parsed=parsed, skipped=skipped,
                          events=len(events), alerts=len(alerts), incidents=len(incidents))
    result = AnalysisResult(files=names, stats=stats, events=events, alerts=alerts,
                            incidents=incidents, entities=entities, file_formats=formats, labels=labels)
    if labels is not None:
        result.evaluation = evaluate(incidents, labels)
    return result


def simulate(scenarios: List[str], seed: int = 42) -> AnalysisResult:
    """Generate baseline + chosen attacks (simulator/) and analyse them, with ground truth."""
    if REPO_ROOT not in sys.path:
        sys.path.insert(0, REPO_ROOT)
    from simulator.attacks import generate

    auth_text, access_text, labels = generate(scenarios, seed)
    return run_analysis([("auth.log", auth_text), ("access.log", access_text)], labels=labels)


def print_report(r: AnalysisResult) -> None:
    s = r.stats
    print(f"Lines {s.lines_total} | parsed {s.parsed} | skipped {s.skipped} | events {s.events} | "
          f"alerts {s.alerts} | incidents {s.incidents}\n")
    for inc in r.incidents:
        print(f"[{inc.id}] {inc.level.value.upper()} (risk {inc.risk_score}): {inc.title}")
        print(f"    IPs: {', '.join(inc.entities.ips) or '-'} | users: {', '.join(inc.entities.users) or '-'}")
        print(f"    Stages: {' → '.join(st.value for st in inc.stages)}")
        for step in inc.story:
            print(f"    • {step.text}")
        print(f"    {inc.summary}")
        print(f"    Recommended: {inc.recommendation}\n")
    if r.evaluation:
        ev = r.evaluation
        print(f"Scenarios detected {ev['scenarios_detected']}/{ev['scenarios_total']} | "
              f"precision {ev['precision']} | recall {ev['recall']} | "
              f"critical false positives {ev['critical_false_positives']}")
        for sc in ev["per_scenario"]:
            print(f"    {sc['scenario_id']}: {'✓' if sc['detected'] else '✗'} {sc['incident_id'] or ''} "
                  f"found {sc['found_entities']} of {sc['expected_entities']}")


def main() -> None:
    ap = argparse.ArgumentParser(description="ChainTrace detection engine CLI")
    ap.add_argument("files", nargs="*", help="log files to analyse")
    ap.add_argument("--simulate", nargs="*", metavar="S", help="run simulator with these scenarios (default all)")
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    t0 = time.perf_counter()
    if args.simulate is not None:
        result = simulate(args.simulate or ["S1", "S2", "S3", "S4", "S5"], args.seed)
    elif args.files:
        contents = []
        for path in args.files:
            with open(path, encoding="utf-8", errors="replace") as f:
                contents.append((path, f.read()))
        result = run_analysis(contents)
    else:
        ap.error("give log files or --simulate")
    print_report(result)
    print(f"\nAnalysis took {time.perf_counter() - t0:.2f}s")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
