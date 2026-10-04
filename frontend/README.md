# ChainTrace Frontend

This directory contains the React + Vite + Tailwind CSS frontend.

## Setup

```bash
cd frontend
npm install
npm run dev
```

## Pages
- `/` — Home / Upload: drag-drop log files or run attack simulation
- `/overview/:id` — Overview dashboard: stat cards, events-over-time chart, top risky entities
- `/incidents/:id` — Incident list sorted by risk score
- `/incidents/:id/:iid` — Incident detail (story, timeline, evidence drawer)
- `/entities/:id` — Entity table with search and level filter
- `/evaluation/:id` — Evaluation metrics (simulation runs only)

## Mock mode
Set `USE_MOCKS = true` in `src/api/api.js` to develop against mock JSON (default).
Flip to `false` at H7 integration to connect to real backend.

## Owner: Mahadev H
