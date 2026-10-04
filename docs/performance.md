# ChainTrace Detection Engine Performance Benchmark

**Task A6 — Round 2 | PRD Target: 100,000 lines in < 10.0 s**

## Environment
- **Python Version**: Python 3.13.7 (`tags/v3.13.7:bcee1c3, Aug 14 2025, 14:15:11 [MSC v.1944 64 bit (AMD64)]`)
- **Operating System / Platform**: Windows-11-10.0.26300-SP0 (AMD64)
- **Measurement Method**: In-memory parsing, baseline building, rule execution, correlation, entity scoring, and story generation via `engine.pipeline.run_analysis()`. Pre-generated log inputs (generation overhead excluded). Best time out of 3 runs.

## Benchmark Results

| Lines | Time (s) | Throughput (lines/s) | Alerts | Incidents | % of PRD 10 s Target | Status |
|------:|---------:|---------------------:|-------:|----------:|---------------------:|:------:|
| 10,000 | 0.22 | 46,378 | 7 | 2 | 2.2% | ✓ PASS |
| 50,000 | 1.23 | 40,521 | 7 | 2 | 12.3% | ✓ PASS |
| **100,000** | **2.73** | **36,618** | **7** | **2** | **27.3%** | **✓ PASS** |
| 200,000 | 7.12 | 28,093 | 7 | 2 | 71.2% | ✓ PASS |

## Raw Benchmark Output
```
Python 3.13.7 (tags/v3.13.7:bcee1c3, Aug 14 2025, 14:15:11) [MSC v.1944 64 bit (AMD64)]
Platform: Windows-11-10.0.26300-SP0
PRD target: 100,000 lines < 10.0 s
Repeating each size 3× and taking best time.

Pre-generating log content (excluded from benchmark timing)…
   10,000 requested →  10,000 actual lines generated
   50,000 requested →  50,000 actual lines generated
  100,000 requested → 100,000 actual lines generated
  200,000 requested → 200,000 actual lines generated

  Benchmarking  10,000 lines …  0.22s  (46,378 lines/s)
  Benchmarking  50,000 lines …  1.23s  (40,521 lines/s)
  Benchmarking 100,000 lines …  2.73s  (36,618 lines/s)
  Benchmarking 200,000 lines …  7.12s  (28,093 lines/s)

---------------------------------------------------------------
    Lines  Time (s)     Lines/s   Alerts  Incidents   vs target
---------------------------------------------------------------
   10,000      0.22      46,378        7          2          2% ✓
   50,000      1.23      40,521        7          2         12% ✓
  100,000      2.73      36,618        7          2         27% ✓
  200,000      7.12      28,093        7          2         71% ✓
---------------------------------------------------------------

Conclusion: ✓ PASS – 100,000 lines analysed in 2.73s (target: < 10.0s)
```

## Conclusion
> **PASS — 100,000 lines analysed in 2.73 s, exceeding the PRD target of < 10.0 s by 3.66× (36,618 lines/s); even 200,000 lines finishes in 7.12 s.**
