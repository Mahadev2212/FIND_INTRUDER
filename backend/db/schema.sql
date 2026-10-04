-- ChainTrace – PostgreSQL schema
-- Run once: psql $DATABASE_URL -f db/schema.sql
-- No ORM migrations (no Alembic). One schema.sql.
-- Note: column 'username' avoids reserved word 'user'; API still returns it as 'user'.
-- Owner: Bhanu Prasad

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── analyses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analyses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at      TIMESTAMPTZ DEFAULT now(),
    source          TEXT CHECK (source IN ('upload', 'simulation')),
    files           TEXT[],
    stats           JSONB,
    has_ground_truth BOOLEAN DEFAULT false,
    evaluation      JSONB
);

-- ─── events ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    analysis_id     UUID REFERENCES analyses(id) ON DELETE CASCADE,
    id              TEXT,
    ts              TIMESTAMPTZ,
    source          TEXT,
    type            TEXT,
    src_ip          INET,
    username        TEXT,
    host            TEXT,
    http            JSONB,
    file            TEXT,
    line_no         INT,
    raw             TEXT,
    PRIMARY KEY (analysis_id, id)
);

-- ─── alerts ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
    analysis_id         UUID REFERENCES analyses(id) ON DELETE CASCADE,
    id                  TEXT,
    rule_id             TEXT,
    rule_name           TEXT,
    severity            TEXT,
    points              INT,
    stage               TEXT,
    mitre               JSONB,
    src_ip              INET,
    username            TEXT,
    first_seen          TIMESTAMPTZ,
    last_seen           TIMESTAMPTZ,
    count               INT,
    reason              TEXT,
    evidence_event_ids  TEXT[],
    PRIMARY KEY (analysis_id, id)
);

-- ─── incidents ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
    analysis_id     UUID REFERENCES analyses(id) ON DELETE CASCADE,
    id              TEXT,
    title           TEXT,
    risk_score      INT,
    level           TEXT,
    entities        JSONB,
    start_ts        TIMESTAMPTZ,
    end_ts          TIMESTAMPTZ,
    stages          TEXT[],
    alert_ids       TEXT[],
    summary         TEXT,
    recommendation  TEXT,
    story           JSONB,
    PRIMARY KEY (analysis_id, id)
);

-- ─── entities ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS entities (
    analysis_id     UUID REFERENCES analyses(id) ON DELETE CASCADE,
    type            TEXT,
    value           TEXT,
    risk_score      INT,
    level           TEXT,
    alert_count     INT,
    first_seen      TIMESTAMPTZ,
    last_seen       TIMESTAMPTZ,
    PRIMARY KEY (analysis_id, type, value)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_analysis_ts       ON events   (analysis_id, ts);
CREATE INDEX IF NOT EXISTS idx_alerts_analysis_ip       ON alerts   (analysis_id, src_ip);
CREATE INDEX IF NOT EXISTS idx_incidents_analysis_risk  ON incidents (analysis_id, risk_score DESC);
