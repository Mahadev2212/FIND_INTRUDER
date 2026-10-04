# Architecture Diagram Placeholder

This file will be replaced with the actual architecture diagram PNG.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     ChainTrace System                           │
│                                                                 │
│  ┌─────────────┐    ┌──────────────────────────────────────┐   │
│  │   Browser   │    │         FastAPI Backend              │   │
│  │             │    │                                      │   │
│  │  React App  │◄──►│  POST /api/analyze                  │   │
│  │  (Vite +    │    │  POST /api/simulate                  │   │
│  │  Tailwind)  │    │  GET  /api/analyses/{id}/...         │   │
│  └─────────────┘    │                                      │   │
│                     │  ┌────────────────────────────────┐  │   │
│                     │  │     Detection Engine           │  │   │
│                     │  │  (runs entirely in memory)     │  │   │
│                     │  │                                │  │   │
│                     │  │  Parsers → Normalize → Sort    │  │   │
│                     │  │  → Baseline → Rules R1-R11     │  │   │
│                     │  │  → Score → Correlate → Story   │  │   │
│                     │  └────────────┬───────────────────┘  │   │
│                     │               │ write (1 transaction) │   │
│                     └───────────────┼──────────────────────┘   │
│                                     ▼                           │
│                     ┌──────────────────────────┐               │
│                     │      PostgreSQL 15+       │               │
│                     │  analyses | events        │               │
│                     │  alerts   | incidents     │               │
│                     │  entities                 │               │
│                     └──────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow
raw logs → normalized events → alerts → scored incidents → attack story → UI

## Owner: Mahadev H (replace with architecture.png by H11)
