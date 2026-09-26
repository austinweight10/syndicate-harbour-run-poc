# Graph Lab visual explorer

Self-contained **occasion graph** viewer for Harbour Athletic (`shop_demo_harbour`). Builder / pitch aid — **not** the Shopify Admin Remix surface (epic 04 stays SQLite edges; no Neo4j UI in MVP).

## Open

From the lab root (recommended — serves `data/` + `viz/`):

```bash
cd syndicate-graph-lab
python3 -m http.server 8765
# → http://127.0.0.1:8765/viz/
```

Or from this folder (uses `./graph-viz.json` symlink):

```bash
cd syndicate-graph-lab/viz
python3 -m http.server 8765
# → http://127.0.0.1:8765/
```

Needs network once for the **vis-network** CDN. If the CDN is blocked, the page falls back to a minimal canvas force layout (see banner).

## Re-export data

```bash
cd syndicate-graph-lab
python3 export_graph_json.py
# → data/graph-viz.json + data/graph-viz-summary.json
```

If `data/graph.sqlite` is missing, the export script runs `build_and_score.py` first.

## What you can do

- Filter by node type, relation, provenance; search labels
- Presets: **Default** (orders off), **Match-day evidence path**, **Events only**, **Full graph**
- Click → inspector + 1-hop highlight; double-click EventCandidate → confidence (Lt G A Y R)
- Toggle physics / hierarchical layout; optional PNG export

## Shots

`shots/01-full.png`, `shots/02-matchday-path.png`.
