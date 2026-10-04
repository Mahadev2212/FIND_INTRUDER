# 3-Minute Demo Script

## ChainTrace Demo — ALGOTHON'26

| Time | What We Show | What We Say |
|------|-------------|-------------|
| 0:00 | Title slide | "One attacker is hiding in 50,000 log lines. Traditional alerting can leave analysts with hundreds of individual events. ChainTrace turns them into one attack story." |
| 0:20 | Simulation panel — judge picks scenarios | "Pick any attacks — we'll hide them in three days of normal traffic." |
| 0:40 | Overview | "50,000 lines → 5 incidents. Bad lines skipped and counted, not crashed on." |
| 1:00 | Critical incident detail | Read the attack story: brute force → login → sudo → backdoor, with MITRE stages. |
| 1:40 | Click a step → evidence drawer | "Every sentence is backed by the exact raw log lines." |
| 2:00 | Password-spray / low-and-slow incident | "A fixed per-IP threshold misses these. Subnet and multi-user aggregation catches them." |
| 2:20 | Evaluation page | "5 of 5 injected attacks detected, with precision, recall and zero critical false positives on clean traffic." |
| 2:40 | Architecture slide | "Simple, explainable, measurable — built to work, not just to look good." |

## Judge Q&A Prep

| Likely Question | Our Answer |
|-----------------|------------|
| "Where is the AI?" | We deliberately kept detection deterministic because security decisions must be explainable. Every detection traces to a specific rule, threshold and raw log line. |
| "How do you know this is exfiltration?" | We don't claim it is. We flag a possible large data transfer based on HTTP response volume in the access log, and say so in the story. |
| "Isn't your data rigged?" | You pick the attacks live, the baseline uses a fixed seed, and we also parse a real-world Loghub OpenSSH sample. |
| "Is that SQL injection confirmed?" | No — it is a matched signature on the decoded request. Confirmation would need application-side evidence. |
| "What happens with messy logs?" | Bad lines are skipped and counted, never crash the run; events are time-sorted, so unordered or split files give the same result. |

## Owner: Mahadev H
