-- Syndicate graph lab — SQLite schema (hackathon, NOT Neo4j)
-- Shop demo id: shop_demo_harbour / demo-football-merch

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS graph_edges (
  id            TEXT PRIMARY KEY,
  shop_id       TEXT NOT NULL,
  from_type     TEXT NOT NULL,
  from_id       TEXT NOT NULL,
  to_type       TEXT NOT NULL,
  to_id         TEXT NOT NULL,
  relation      TEXT NOT NULL,
  weight        REAL NOT NULL DEFAULT 1.0,
  provenance    TEXT NOT NULL,
  payload_json  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_edges_shop_rel ON graph_edges(shop_id, relation);
CREATE INDEX IF NOT EXISTS idx_edges_from ON graph_edges(from_type, from_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON graph_edges(to_type, to_id);

CREATE TABLE IF NOT EXISTS event_candidates (
  id                  TEXT PRIMARY KEY,
  shop_id             TEXT NOT NULL,
  catalogue_event_id  TEXT,
  name                TEXT NOT NULL,
  archetype           TEXT NOT NULL,
  time_start          TEXT NOT NULL,
  time_end            TEXT NOT NULL,
  venue_city          TEXT,
  venue_country       TEXT,
  driver_ids_json     TEXT,
  enrichment_source   TEXT NOT NULL,
  n_orders            INTEGER NOT NULL DEFAULT 0,
  window_label        TEXT,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ec_shop ON event_candidates(shop_id);

CREATE TABLE IF NOT EXISTS confidence_scores (
  id                     TEXT PRIMARY KEY,
  event_candidate_id     TEXT NOT NULL UNIQUE,
  value_pct              REAL NOT NULL,
  value                  REAL NOT NULL,
  Lt                     REAL NOT NULL,
  G                      REAL NOT NULL,
  A                      REAL NOT NULL,
  Y                      REAL NOT NULL,
  R                      REAL NOT NULL,
  baseline_pct           REAL NOT NULL,
  competing_json         TEXT NOT NULL,
  provenance_labels_json TEXT NOT NULL,
  n_orders               INTEGER NOT NULL,
  window_start           TEXT NOT NULL,
  window_end             TEXT NOT NULL,
  FOREIGN KEY (event_candidate_id) REFERENCES event_candidates(id) ON DELETE CASCADE
);

-- Lightweight node registry (optional reference; edges also stand alone)
CREATE TABLE IF NOT EXISTS nodes (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL,
  node_type  TEXT NOT NULL,
  label      TEXT,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(shop_id, node_type);
