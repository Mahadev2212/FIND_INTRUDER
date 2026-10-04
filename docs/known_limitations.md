# ChainTrace – Known Limitations and Future Improvements

**Project**: ChainTrace (ALGOTHON'26, ALG-CYBER-01)
**Version**: PRD v1.2 / Branch `bhanu-antigravity`
**Last updated**: 2026-10-04

This document combines the limitations listed in PRD section 14 with findings from real-world testing (Tasks A1 and A2).

---

## From PRD Section 14 — Known Limitations

### 14.1 Parser coverage (auth.log / access.log)

- **Only two syslog formats** are fully supported out-of-the-box: Linux `auth.log` (syslog) and Apache/Nginx combined `access.log`. Other daemon logs (PAM, kernel audit, `journald` JSON, Windows Event Log, cloud trail, etc.) are not parsed.
- **No year in syslog timestamps**: the parser infers the year from a configurable default (`config.yaml → parsing.default_year`) and bumps the year on Dec→Jan rollovers. Logs spanning more than one year with missing timestamps will still be wrong if the rollover heuristic (180-day gap) is too aggressive.
- **Timezone assumption**: `auth.log` timestamps are converted using the single configured offset (`auth_utc_offset_minutes`). Multi-host setups where hosts run in different timezones will produce incorrect UTC timestamps.

### 14.2 Detection rules

- **Thresholds are fixed**: all thresholds (e.g., R1 requires ≥ 10 failures in 5 minutes) are loaded from `config.yaml`. They are not adaptive per-environment; a legitimate CI/CD system doing many SSH logins may produce false positives.
- **R11 (large data transfer) is probabilistic**: the exfiltration alert fires when a single IP's response volume is far above the median, not when absolute volume exceeds a threshold. On a low-traffic server this fires easily; on a high-traffic CDN it may not.
- **No encrypted-traffic awareness**: all analysis is purely log-based. Exfiltration over HTTPS bodies or out-of-band channels (DNS tunnelling, ICMP) is invisible.
- **No lateral movement detection**: once an attacker is inside, inter-host movement is not tracked. The system only knows about the log files it receives.
- **No privilege-escalation chaining beyond sudo/su**: kernel exploits, SUID binaries, container breakouts and similar escalations produce no logs in the formats currently parsed.

### 14.3 Correlation and story

- **Entity de-duplication is heuristic**: two IPs from the same /24 are grouped under R3 (low-and-slow), but an attacker using random IPs from different /24s will not be correlated.
- **User de-duplication requires exact string match**: `root` and `ROOT` are treated as different users if they appear in different log lines.
- **Stories are template-driven**: narrative text is assembled from fixed templates keyed on rule ID. Complex multi-stage attacks may produce grammatically awkward stories if events interleave in unexpected ways.

### 14.4 Performance and scale

- **Single-process, in-memory**: the entire analysis runs in one Python process. Very large log archives (> ~1 GB) may exhaust memory.
- **No incremental analysis**: the system re-processes the complete set of uploaded files on each call to `run_analysis()`. There is no streaming or incremental mode.
- **LRU cache on `_clean_ip`**: the `@lru_cache(maxsize=65536)` on IP normalization is global. Under heavy concurrent API usage, cache eviction could add overhead (though in practice the IP space is small).

### 14.5 Storage and API

- **PostgreSQL is optional but not highly available**: the fallback `MemoryStore` loses all data on restart. In production, Postgres needs proper replication and backups.
- **No authentication on the API**: the `/api/analyze` and `/api/simulate` endpoints accept requests from any client. This is appropriate for a hackathon demo but not for production.
- **File size limit not enforced server-side**: very large uploads are accepted and may cause timeouts before the 10-second analysis budget is exhausted.

### 14.6 Evaluation and ground truth

- **Ground truth is only available for simulated runs**: real uploaded logs produce no evaluation metrics (precision/recall). Operators must manually assess whether alerts are true positives.
- **The 5 built-in scenarios are not exhaustive**: the simulator covers S1–S5 (brute force, spray, web recon, low-and-slow, insider). Real-world attacks can be far more varied.

---

## Findings from Task A1: Real-World Loghub OpenSSH Validation

### What worked perfectly

- The existing `parse_auth_log()` already handled 100% (2000/2000) of Loghub `OpenSSH_2k.log` lines. All "informational" sshd lines (PAM messages, `Connection closed`, `reverse mapping checking`, `input_userauth_request`, `Received disconnect`) match the syslog regex and are counted as *parsed* even though they do not produce security events — exactly as the PRD requires (parsed = matched format, not necessarily security-relevant).
- `run_analysis()` on the real file found **R1** (SSH brute force) correctly from naturally occurring attack patterns in the log.
- All `Failed password`, `Accepted password`, and `Invalid user` events were extracted with correct user and IP.

### Minor observations

- The Loghub file uses the hostname **`LabSZ`** (not a typical production hostname). This had no effect on parsing.
- Timestamps in the file use `Dec 10` without a year. The default year (`config.yaml → parsing.default_year`) is used. If the configured year is wrong by one year, the UTC timestamps will be off by exactly one year (no event ordering issues, but clock-synchronisation alerts in a monitoring system could fire).
- The file contains only one `Accepted password` event (user `fztu` from `119.137.62.142`), so no R4 (Login after failures) alert fires because there are no prior failures from that IP. This is expected and correct.

---

## Findings from Task A2: JSON-Lines Format

### Design decisions and trade-offs

- **Event type mapping via string lookup**: the JSONL parser maps raw string values (e.g., `"failed"`, `"accepted"`) to `EventType` enum values. Strings not in the map are silently skipped. This is intentional (the PRD says "map to existing EventType values only"), but it means a new log source that uses, say, `"authentication_failure"` will be skipped until that alias is added to `_JSONL_EVENT_MAP`.
- **Timestamp required**: unlike syslog (where the timestamp format is part of the line syntax), JSONL lines without a recognisable timestamp key are skipped. This is intentional — a security event without a timestamp is unusable.
- **HTTP fields are best-effort**: for `http_request` events, the parser extracts method, path/url, status, bytes, and user_agent if present. Missing HTTP fields result in `None` values in `HttpFields`, which is safe but means R9/R10/R11 rules may not fire for incomplete records.
- **Source field**: JSONL `http_request` events get `source=WEB`; all others get `source=AUTH`. This is a simplification — future formats may need more granular source classification.

### Limitations of the JSONL format

- **No streaming parser**: the full file is loaded into memory and split on newlines. Files with very long lines (e.g., embedded base64 payloads) may be slow or memory-intensive.
- **No nested JSON support**: the parser only looks at top-level keys. Nested structures (e.g., `{"network": {"src_ip": "1.2.3.4"}}`) are not flattened.
- **No schema validation**: the parser silently skips unrecognised event types. A typo in the `event` field (e.g., `"shh_fail"` instead of `"ssh_fail"`) will cause lines to be silently dropped.
- **Epoch milliseconds heuristic**: the parser treats numeric timestamps > 1e12 as milliseconds. This heuristic breaks for any epoch-second timestamp after year 33658 (safely far in the future) but could theoretically conflict with non-standard epoch formats.

---

## Future Improvements (PRD Section 14 + Findings)

| Priority | Improvement |
|----------|-------------|
| P1 | Support `journald` JSON export (`journalctl -o json`) natively |
| P1 | Add Windows Event Log XML parser |
| P1 | API authentication (OAuth2 / API key) |
| P2 | Adaptive thresholds: learn per-environment baseline failure rates |
| P2 | Nested JSON field support (dot-notation paths in config) |
| P2 | Streaming / incremental log analysis for continuous ingestion |
| P2 | Lateral movement detection (SSH between internal hosts) |
| P2 | Incident report export (GET /api/analyses/{id}/incidents/{iid}/report?format=md|json) |
| P3 | Multi-language log format support (Windows IIS, AWS CloudTrail, GCP Cloud Logging) |
| P3 | Per-user and per-IP normal-hour learning with longer baselines |
| P3 | High-availability Postgres with automatic failover |
| P3 | JSONL schema registry so unknown event types are flagged rather than silently dropped |
