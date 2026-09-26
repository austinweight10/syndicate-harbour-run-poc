# Syndicate graph lab

Standalone **SQLite** entity–evidence graph prototype for the Syndicate sports/athleisure Shopify Admin hackathon design.

- **Not** Neo4j / Memgraph  
- **Not** a Remix / Shopify app scaffold  
- Local lab only — reads fixtures from `docs/fixtures/` (Harbour Run seed; football fixture paths are deprecated)

Shop demo id comes from `docs/fixtures/session/demo-shop.json` (Harbour Run: `shop_harbour_run_demo`).

## What it builds

| Table | Role |
|-------|------|
| `nodes` | Optional registry (Order, SKU, Geo, Event, …) |
| `graph_edges` | GraphEdge fields from `scope/CONTRACTS.md` |
| `event_candidates` | Scored occasions (match-day, race, virtual, …) |
| `confidence_scores` | Lt, G, A, Y, R + provenance labels |

Edges include `CONTAINS`, `SHIPPED_TO`, `VENUE_IN`, `AFFINITY`, `TRENDING_IN`, `TEMPORAL_LIFT`, `GEO_OVERLAP`, `GOALS_INCLUDE`, `PERSONA_OF`, `AMPLIFIES`, `DRIVEN_BY`.

Confidence (Epic 04):

\[
C(E)=\mathrm{clip}_{0,1}(0.30 L_t + 0.25 G + 0.25 A + 0.10 Y + 0.10 R)
\]

- \(Y = 0.5\) when no prior-year data  
- Cap display at **0.40** if \(n_\text{orders} < 5\)  
- Social / activity buzz alone is **never** labelled OBSERVED demand  

Weather: no weather fixture is present — `FORECAST_FOR` is skipped; a synthetic MOCK wet-weekend Driver is seeded for demo scoring only (see notes in the demo report).

## Quick start

```bash
cd syndicate-graph-lab
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # pytest; sqlite3 is stdlib
.venv/bin/python build_and_score.py                   # seed + score → data/graph.sqlite
.venv/bin/python demo.py                              # British English summary → out/demo-report.txt
.venv/bin/python -m pytest -q                         # assertions
```

Outputs:

- `data/graph.sqlite` — working database  
- `out/demo-report.txt` — printed demo summary  
- `RESULTS.md` — numbers + sample queries from the last run  
- `data/graph-viz.json` — export for the visual explorer  
- `viz/` — interactive HTML graph explorer  

## Project layout

```
syndicate-graph-lab/
  schema.sql
  build_and_score.py
  demo.py
  export_graph_json.py   # → data/graph-viz.json
  src/
    db.py affinity.py ids.py seed.py score.py queries.py
  tests/test_graph.py
  viz/                   # interactive HTML explorer
  data/  out/
```

## Visual explorer

Interactive force-directed map of the occasion graph (vis-network, Admin colour system).

```bash
cd syndicate-graph-lab
python3 export_graph_json.py          # → data/graph-viz.json (+ summary)
python3 -m http.server 8765           # open http://127.0.0.1:8765/viz/
```

Details: [viz/README.md](./viz/README.md). Screenshots: `viz/shots/`.

This is a **lab / pitch** aid only — not a Remix Admin page; epic 04 remains SQLite (no Neo4j UI).

## Re-run after fixture edits

```bash
.venv/bin/python build_and_score.py && .venv/bin/python demo.py && .venv/bin/python -m pytest -q
```

Fixtures SoT: `docs/` — especially `docs/epics/04-graph-and-confidence.md` and `docs/fixtures/graph/expected-scores.json`.
