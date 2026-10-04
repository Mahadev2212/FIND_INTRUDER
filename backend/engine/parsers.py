"""
ChainTrace – Log Parsers
Supports: Linux auth.log (syslog format) + Apache/Nginx combined access.log.
Format is auto-detected. Malformed lines are skipped and counted, never crash.
Events from all files are merged and sorted by timestamp.
Owner: Bhanu Prasad
"""

import ipaddress
import re
from functools import lru_cache
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple

from app.schemas import Event, EventType, EventSource, HttpFields
from engine.config import CFG

SUPPORTED_FORMATS = "Linux auth.log (syslog: 'Oct  4 02:03:11 host sshd[123]: ...') and Apache/Nginx combined access.log"

# ─── Auth.log parser ──────────────────────────────────────────────────────────

# Syslog format: Oct  4 02:03:11 hostname process[pid]: message
AUTH_SYSLOG_RE = re.compile(
    r'^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}):(\d{2}):(\d{2})\s+'  # timestamp (no year)
    r'(\S+)\s+'                                                   # hostname
    r'([^\s:\[]+)(?:\[\d+\])?:\s?'                                # process[pid]
    r'(.*)$'                                                      # message
)
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], start=1)}

SSH_FAIL_RE = re.compile(r'Failed (?:password|publickey|keyboard-interactive/pam) for (?:invalid user )?(\S*) from (\S+) port \d+')
SSH_SUCCESS_RE = re.compile(r'Accepted \S+ for (\S+) from (\S+) port \d+')
INVALID_USER_RE = re.compile(r'Invalid user (\S*) from (\S+)')
SUDO_RE = re.compile(r'^\s*(\S+)\s*:.*?USER=(\S+)\s*;.*?COMMAND=(.*)$')
SU_RE = re.compile(r'session opened for user (\S+?)(?:\(uid=\d+\))? by (\S+?)(?:\(uid=\d+\))?\s*$')
USERADD_RE = re.compile(r'new user: name=([^,\s]+)')
GROUP_ADD_RE = re.compile(r"add(?:ing)? (?:user )?'?([^'\s]+)'? to (?:shadow )?group '?(sudo|wheel|admin)'?", re.IGNORECASE)

# ─── Access.log (combined format) parser ──────────────────────────────────────

ACCESS_COMBINED_RE = re.compile(
    r'^(\S+)\s+\S+\s+\S+'                   # IP, ident, user
    r'\s+\[([^\]]+)\]'                      # [datetime]
    r'\s+"(\S+)\s+(.+?)(?:\s+(HTTP/[\d.]+))?"'  # "METHOD path HTTP/ver" (path may contain spaces)
    r'\s+(\d{3})'                           # status
    r'\s+(\d+|-)'                           # bytes
    r'(?:\s+"(?:[^"\\]|\\.)*")?'            # referer (optional)
    r'(?:\s+"((?:[^"\\]|\\.)*)")?'          # user-agent (optional)
)


@dataclass
class ParseResult:
    events: List[Event] = field(default_factory=list)
    lines_total: int = 0
    parsed: int = 0          # lines that matched the format (even if not security-relevant)
    skipped: int = 0         # malformed lines
    fmt: str = ""


@lru_cache(maxsize=65536)
def _clean_ip(value: Optional[str]) -> Optional[str]:
    """Return a normalised IP string, or None if not a valid IPv4/IPv6 address."""
    if not value:
        return None
    try:
        return str(ipaddress.ip_address(value.strip("[]")))
    except ValueError:
        return None


def parse_auth_log(content: str, filename: str, year: Optional[int] = None) -> ParseResult:
    """
    Parse auth.log content. Syslog has no year: start at `year` (config default) and
    bump the year whenever time jumps backwards by more than 180 days (Dec → Jan rollover).
    Timestamps are interpreted in the configured timezone offset and converted to UTC.
    """
    year = year or CFG["parsing"]["default_year"]
    tz = timezone(timedelta(minutes=CFG["parsing"]["auth_utc_offset_minutes"]))
    res = ParseResult(fmt="auth")
    prev: Optional[datetime] = None

    for lineno, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        res.lines_total += 1

        m = AUTH_SYSLOG_RE.match(line)
        if not m or m.group(1) not in MONTHS:
            res.skipped += 1
            continue
        mon, day, hh, mm, ss, host, proc, msg = m.groups()
        try:
            ts = datetime(year, MONTHS[mon], int(day), int(hh), int(mm), int(ss), tzinfo=tz)
            if prev is not None and (prev - ts).days > 180:
                year += 1
                ts = ts.replace(year=year)
        except ValueError:
            res.skipped += 1
            continue
        prev = ts
        res.parsed += 1

        base = dict(id=f"{filename}:{lineno}", ts=ts.astimezone(timezone.utc), source=EventSource.AUTH,
                    host=host, file=filename, line_no=lineno, raw=line)
        proc_l = proc.lower()
        event = None

        if proc_l.startswith("sshd"):
            if (mf := SSH_FAIL_RE.search(msg)):
                event = Event(**base, type=EventType.SSH_FAIL, user=mf.group(1) or None, src_ip=_clean_ip(mf.group(2)))
            elif (ms := SSH_SUCCESS_RE.search(msg)):
                event = Event(**base, type=EventType.SSH_SUCCESS, user=ms.group(1), src_ip=_clean_ip(ms.group(2)))
            elif (mi := INVALID_USER_RE.search(msg)):
                event = Event(**base, type=EventType.INVALID_USER, user=mi.group(1) or None, src_ip=_clean_ip(mi.group(2)))
        elif proc_l == "sudo":
            if (msu := SUDO_RE.search(msg)):
                event = Event(**base, type=EventType.SUDO, user=msu.group(1))
        elif proc_l == "su":
            if (msu := SU_RE.search(msg)):
                event = Event(**base, type=EventType.SUDO, user=msu.group(2))
        elif proc_l == "useradd":
            if (mua := USERADD_RE.search(msg)):
                event = Event(**base, type=EventType.USER_ADD, user=mua.group(1))
        elif proc_l in ("usermod", "gpasswd"):
            if (mg := GROUP_ADD_RE.search(msg)):
                event = Event(**base, type=EventType.GROUP_ADD, user=mg.group(1))

        if event is not None:
            res.events.append(event)

    return res


@lru_cache(maxsize=64)
def _tz(offset: str) -> timezone:
    sign = -1 if offset[0] == "-" else 1
    if offset[0] not in "+-" or len(offset) != 5:
        raise ValueError(offset)
    return timezone(sign * timedelta(hours=int(offset[1:3]), minutes=int(offset[3:5])))


def _access_ts(s: str) -> datetime:
    """Fast parse of '04/Oct/2026:14:02:10 +0530' (strptime is the bottleneck on 100k lines)."""
    date, offset = s.split(" ")
    return datetime(int(date[7:11]), MONTHS[date[3:6]], int(date[0:2]), int(date[12:14]), int(date[15:17]),
                    int(date[18:20]), tzinfo=_tz(offset)).astimezone(timezone.utc)


def parse_access_log(content: str, filename: str) -> ParseResult:
    """Parse Apache/Nginx combined access.log content."""
    res = ParseResult(fmt="access")

    for lineno, raw_line in enumerate(content.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        res.lines_total += 1

        m = ACCESS_COMBINED_RE.match(line)
        ip = _clean_ip(m.group(1)) if m else None
        if not m or ip is None:
            res.skipped += 1
            continue
        _, ts_str, method, path, _ver, status, bytes_str, ua = m.groups()
        try:
            ts = _access_ts(ts_str)
        except (ValueError, KeyError, IndexError):
            res.skipped += 1
            continue
        res.parsed += 1

        res.events.append(Event(
            id=f"{filename}:{lineno}", ts=ts, source=EventSource.WEB, type=EventType.HTTP_REQUEST,
            src_ip=ip, file=filename, line_no=lineno, raw=line,
            http=HttpFields(method=method, path=path, status=int(status),
                            bytes=int(bytes_str) if bytes_str != "-" else 0, ua=ua),
        ))

    return res


def detect_format(content: str, sample_size: int = 50) -> Optional[str]:
    """Vote over the first non-empty lines so a few malformed lines at the top don't break detection."""
    auth = access = 0
    seen = 0
    for line in content.splitlines():
        line = line.strip()
        if not line:
            continue
        seen += 1
        if AUTH_SYSLOG_RE.match(line):
            auth += 1
        elif ACCESS_COMBINED_RE.match(line):
            access += 1
        if seen >= sample_size:
            break
    if auth == 0 and access == 0:
        return None
    return "auth" if auth >= access else "access"


def decode_upload(data: bytes, filename: str) -> str:
    """Decode an uploaded file; reject binary content with a clear error."""
    if b"\x00" in data[:8192]:
        raise ValueError(f"'{filename}' looks like a binary file. Supported formats: {SUPPORTED_FORMATS}.")
    return data.decode("utf-8", errors="replace")


def auto_detect_and_parse(content: str, filename: str) -> ParseResult:
    """
    Auto-detect format (auth.log vs access.log) and parse.
    Raises ValueError listing supported formats if unrecognised.
    """
    fmt = detect_format(content)
    if fmt == "auth":
        return parse_auth_log(content, filename)
    if fmt == "access":
        return parse_access_log(content, filename)
    raise ValueError(f"Unrecognised log format in '{filename}'. Supported formats: {SUPPORTED_FORMATS}.")
