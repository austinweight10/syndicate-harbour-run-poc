# Graph visual — merchants vs builders

**Date:** 26 Sep 2026 · Europe/London (BST)  
**Related:** [ADMIN_GRAPH_VIEW.md](./ADMIN_GRAPH_VIEW.md) · [WEEKEND_BUILD_SPEC.md](./WEEKEND_BUILD_SPEC.md) · [FLOWS.md](./FLOWS.md) · lab [`/workspace/syndicate-graph-lab/viz/`](../../syndicate-graph-lab/viz/)  
**Decision:** [D34](./RISKS_AND_DECISIONS.md) — Admin Graph view in weekend PoC (Austin ask 26 Sep)

## What merchants see (Admin — weekend PoC)

Merchants **do** get a Graph page/panel in the Remix Shopify Admin app:

- Route **`/app/graph`** · nav label **Graph** (between Insights and Agent runs)
- Optional Overview teaser card linking to `/app/graph`
- Force-style canvas driven by Prisma **`GraphEdge`** + related node labels (Order / SKU / Geo / CatalogueEvent / Driver / Weather / Social / EventCandidate / Persona)
- Default preset: **Race-day evidence path** (Harbour Run)
- Caps, filters, provenance legend, soft empty state — full SoT: [`ADMIN_GRAPH_VIEW.md`](./ADMIN_GRAPH_VIEW.md)

**Never** Python lab sqlite · **never** Vite-only as Admin data. Layout reference remains `ui/graph.html` (visual SoT only).

Epic **04** stores evidence as Prisma/SQLite `GraphEdge` + `EventCandidate` + `ConfidenceScore` — not Neo4j. The Admin Graph dashboard **reads the same Prisma edges** written by `graph_seed` / `score_link` (see [`FLOWS.md`](./FLOWS.md) diagrams A, B, D and [`TOP_LEVEL_FLOW.md`](./TOP_LEVEL_FLOW.md)).

## What builders / pitch see (this lab)

- Self-contained HTML explorer under `syndicate-graph-lab/viz/`
- Full (or filtered) occasion graph for scope walkthroughs and agent debugging
- Lab presets (e.g. Match-day evidence path) remain a **builder aid** — Admin ships the merchant **Race-day evidence path** preset against Prisma
- Re-export anytime: `python3 export_graph_json.py`

Use the lab viz for weekend demos of the *full* lab graph and debugging. Do **not** treat the lab as the merchant Admin surface, and do **not** wire Admin loaders to lab sqlite or Vite JSON.
