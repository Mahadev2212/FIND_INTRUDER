"""
ChainTrace – Log Parsers
Supports: Linux auth.log (syslog format) + Apache/Nginx combined access.log.
Format is auto-detected. Malformed lines are skipped and counted, never crash.
Events from all files are merged and sorted by timestamp.
Owner: Bhanu Prasad
"""

import re
from datetime import datetime, timezone
from typing import List, Tuple, Optional
from app.schemas import Event, EventType, EventSource, HttpFields

# ─── Auth.log parser ──────────────────────────────────────────────────────────

# Syslog format: Oct  4 02:03:11 hostname process[pid]: message
AUTH_SYSLOG_RE = re.compile(
    r'^(\w+\s+\d+\s+\d+:\d+:\d+)\s+'   # timestamp (no year)
    r'(\S+)\s+'                          # hostname
    r'(\S+?)(?:\[\d+\])?: '             # process[pid]
    r'(.*)$'                             # message
)

# SSH failure
SSH_FAIL_RE = re.compile(
    r'Failed password for (?:invalid user )?(\S+) from (\S+) port \d+'
)
# SSH success
SSH_SUCCESS_RE = re.compile(
    r'Accepted \w+ for (\S+) from (\S+) port \d+'
)
# Invalid user
INVALID_USER_RE = re.compile(
    r'Invalid user (\S+) from (\S+)'
)
# sudo
SUDO_RE = re.compile(
    r'(\S+)\s*:\s*TTY=\S+\s*;\s*USER=(\S+)\s*;\s*COMMAND=(.*)'
)
# useradd
USERADD_RE = re.compile(
    r'new user: name=([^,\s]+)'
)
# usermod (adding to sudo/wheel group)
USERMOD_SUDO_RE = re.compile(
    r'add.*?(\S+).*?to.*?(sudo|wheel)', re.IGNORECASE
)

# ─── Access.log (combined format) parser ──────────────────────────────────────

# Combined log format: IP - - [datetime] "METHOD path HTTP/ver" status bytes "referer" "ua"
ACCESS_COMBINED_RE = re.compile(
    r'^(\S+)'                                # IP
    r'\s+\S+\s+\S+'                         # ident, user
    r'\s+\[(.+?)\]'                         # [datetime]
    r'\s+"([A-Za-z]+)\s+(.+?)(?:\s+HTTP/[^\s"]+)?"'  # "METHOD path HTTP/ver"
    r'\s+(\d+)'                             # status
    r'\s+(\d+|-)'                           # bytes
    r'(?:\s+".*?")?'                        # referer (optional)
    r'(?:\s+"(.*?)")?'                      # user-agent (optional)
)


def _parse_syslog_ts(ts_str: str, year: int) -> datetime:
    """Parse syslog timestamp (no year). Handles Dec→Jan rollover."""
    dt = datetime.strptime(f"{ts_str} {year}", "%b %d %H:%M:%S %Y")
    return dt.replace(tzinfo=timezone.utc)


def parse_auth_log(content: str, filename: str, year: int = 2026) -> Tuple[List[Event], int]:
    """
    Parse auth.log content.
    Returns (events, skipped_count).
    """
    events: List[Event] = []
    skipped = 0

    for lineno, line in enumerate(content.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue

        m = AUTH_SYSLOG_RE.match(line)
        if not m:
            skipped += 1
            continue

        ts_str, host, proc, msg = m.groups()

        try:
            ts = _parse_syslog_ts(ts_str, year)
        except ValueError:
            skipped += 1
            continue

        event_id = f"{filename}:{lineno}"
        base = dict(id=event_id, ts=ts, source=EventSource.AUTH,
                    host=host, file=filename, line_no=lineno, raw=line)

        # SSH failure
        mf = SSH_FAIL_RE.search(msg)
        if mf:
            events.append(Event(**base, type=EventType.SSH_FAIL,
                                user=mf.group(1), src_ip=mf.group(2)))
            continue

        # SSH success
        ms = SSH_SUCCESS_RE.search(msg)
        if ms:
            events.append(Event(**base, type=EventType.SSH_SUCCESS,
                                user=ms.group(1), src_ip=ms.group(2)))
            continue

        # Invalid user
        mi = INVALID_USER_RE.search(msg)
        if mi:
            events.append(Event(**base, type=EventType.INVALID_USER,
                                user=mi.group(1), src_ip=mi.group(2)))
            continue

        # sudo
        msu = SUDO_RE.search(msg)
        if msu and 'sudo' in proc.lower():
            events.append(Event(**base, type=EventType.SUDO,
                                user=msu.group(1)))
            continue

        # useradd
        mua = USERADD_RE.search(msg)
        if mua:
            events.append(Event(**base, type=EventType.USER_ADD,
                                user=mua.group(1)))
            continue

        # usermod to sudo/wheel
        mum = USERMOD_SUDO_RE.search(msg)
        if mum:
            events.append(Event(**base, type=EventType.GROUP_ADD,
                                user=mum.group(1)))
            continue

        skipped += 1

    return events, skipped


def parse_access_log(content: str, filename: str) -> Tuple[List[Event], int]:
    """
    Parse Apache/Nginx combined access.log content.
    Returns (events, skipped_count).
    """
    events: List[Event] = []
    skipped = 0

    for lineno, line in enumerate(content.splitlines(), start=1):
        line = line.strip()
        if not line:
            continue

        m = ACCESS_COMBINED_RE.match(line)
        if not m:
            skipped += 1
            continue

        ip, ts_str, method, path, status, bytes_str, ua = m.groups()

        try:
            # Combined format datetime: 04/Oct/2026:14:02:10 +0530
            ts = datetime.strptime(ts_str, "%d/%b/%Y:%H:%M:%S %z")
            ts = ts.astimezone(timezone.utc)
        except ValueError:
            skipped += 1
            continue

        http = HttpFields(
            method=method,
            path=path,
            status=int(status),
            bytes=int(bytes_str) if bytes_str != '-' else 0,
            ua=ua,
        )

        events.append(Event(
            id=f"{filename}:{lineno}",
            ts=ts,
            source=EventSource.WEB,
            type=EventType.HTTP_REQUEST,
            src_ip=ip,
            http=http,
            file=filename,
            line_no=lineno,
            raw=line,
        ))

    return events, skipped


def auto_detect_and_parse(content: str, filename: str) -> Tuple[List[Event], int, str]:
    """
    Auto-detect format (auth.log vs access.log) and parse.
    Returns (events, skipped, detected_format).
    Raises ValueError if format is unrecognised.
    """
    checked = 0
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        checked += 1
        if AUTH_SYSLOG_RE.match(line):
            evts, skipped = parse_auth_log(content, filename)
            return evts, skipped, "auth"
        if ACCESS_COMBINED_RE.match(line):
            evts, skipped = parse_access_log(content, filename)
            return evts, skipped, "access"
        if checked >= 20:
            break

    raise ValueError(
        f"Unrecognised log format in '{filename}'. "
        "Supported formats: Linux auth.log (syslog) and Apache/Nginx combined access.log."
    )
