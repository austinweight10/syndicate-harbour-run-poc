# Admin Graph view — merchant dashboard (weekend PoC)

**Date:** 26 Sep 2026 · Europe/London (BST)  
**Locale:** British English  
**Vertical:** Running / Harbour Run  
**Decision:** [D34](./RISKS_AND_DECISIONS.md) — Admin Graph view in PoC (Austin ask 26 Sep)  
**Companions:** [GRAPH_VISUAL.md](./GRAPH_VISUAL.md) · [FLOWS.md](./FLOWS.md) · [TOP_LEVEL_FLOW.md](./TOP_LEVEL_FLOW.md) · [`epics/UI_SCREEN_SPECS.md`](../epics/UI_SCREEN_SPECS.md) · visual stub [`ui/graph.html`](../ui/graph.html)

Overrides the earlier “no Admin force graph for MVP” line in GRAPH_VISUAL for the **weekend PoC only**. Ship a merchant Graph page in Remix Admin; lab viz stays a builder aid.

---

## Route & chrome

| Field | Spec |
|-------|------|
| **Route** | `/app/graph` |
| **Nav label** | **Graph** |
| **Nav order** | Overview · Events · Personas · Insights · **Graph** · Agent runs · Settings |
| **Prototype** | `ui/graph.html` (layout / visual SoT only — **not** a dual Admin) |
| **Also** | Optional Overview teaser card → `/app/graph` (“Occasion graph · Race-day evidence path”) |

**Chrome (match Admin):** cream canvas `#f3f0eb` · white surfaces · charcoal top bar · kit-stripe monogram · provenance chips Obs / Agg / Hyp / Mock · British English copy.

---

## Purpose

Show merchants a readable **occasion evidence graph** for the Harbour Run weekend story — Order → Geo ← race PROXY + weather Driver edges + EventCandidate — without dumping the full lab graph or leaving Shopify Admin.

---

## Data (hard locks)

| Source | Rule |
|--------|------|
| **Prisma `GraphEdge`** | Sole edge feed for the canvas |
| **Node labels** | Resolve from related Prisma rows: **Order**, **SKU** (product/line), **Geo**, **CatalogueEvent**, **Driver**, **Weather** (WeatherForecast / weather Driver), **Social** (SocialTrend / HashtagWatch), **EventCandidate**, **Persona** |
| **Same write path** | Edges produced by Epic 04 `graph_seed` + `score_link` — Graph dashboard reads the **same** Prisma edges Insights/Events use |
| **Forbidden** | Python `syndicate-graph-lab` sqlite · Vite `ui/*.html` / fixture JSON as loader · Neo4j · inventing edges in the browser |

Loader sketch (illustrative):

```ts
// GraphLoader — Prisma only
{
  nodes: { id: string; type: NodeType; label: string; provenance?: string }[];
  edges: { id: string; fromId: string; toId: string; relation: string; weight: number; provenance: string }[];
  preset: "race_day_evidence";
  capped: boolean;          // true when truncated to Admin caps
  totals: { nodes: number; edges: number }; // pre-cap counts for “showing top…” note
  emptyReason?: "no_edges_after_pipeline" | "pipeline_incomplete";
}
```

---

## Default preset — Race-day evidence path

Focus the subgraph that narrates the Harbour Run pitch:

1. **Order** nodes (OBSERVED) with CONTAINS / SHIPPED_TO → **SKU** / **Geo**
2. **Geo** ← race calendar **CatalogueEvent** (PROXY / MOCK as labelled)
3. **Weather** / wet–dry **Driver** edges into Geo or EventCandidate (forecast payload OBSERVED; spike Driver usually AGGREGATE_PROXY)
4. Scored **EventCandidate** (e.g. Race-day home kit / taper rush) linked via GEO_OVERLAP / AFFINITY / TEMPORAL_LIFT-style relations
5. Optional **Persona** / **Social** nodes if present and within cap — do not displace the Order→Geo←race+weather core

Preset id: `race_day_evidence`. Lab “Match-day evidence path” is the builder analogue; Admin copy uses **Race-day**.

---

## Filters & controls

| Control | Behaviour |
|---------|-----------|
| **Node type chips** | Toggle Order · SKU · Geo · CatalogueEvent · Driver · Weather · Social · EventCandidate · Persona |
| **Search** | Filter by node label / id substring (client-side on loaded subgraph) |
| **Fit** | Zoom/pan to fit current subgraph |
| **Physics on/off** | Toggle force simulation; default **on** for PoC |

Toolbar sits above the canvas; active chips use Admin filter-pill styles.

---

## Caps (Admin)

| Cap | Value |
|-----|-------|
| Max nodes | **~150** |
| Max edges | **~300** |

When truncated, show a muted note under the H1 / above the canvas:

> Showing top occasion subgraph · Race-day evidence path

Prefer highest-weight / Race-day-preset edges first; drop peripheral Social/Activity colour if over cap.

---

## Provenance legend

Always visible (footer of canvas card or side legend):

| Chip | Full (tooltip / aria-label) |
|------|------------------------------|
| **Obs** | Observed |
| **Agg** | Aggregate proxy |
| **Hyp** | Model hypothesis |
| **Mock** | Mock |

Edge and node colour/stroke should reflect edge `provenance` where practical; never claim OBSERVED demand from social alone.

---

## Soft-degrade & empty

| State | Copy / CTA |
|-------|------------|
| **No edges after pipeline** | Empty state: “No graph edges yet — complete store makeup and score, or refresh the store.” CTA → Settings / Refresh store |
| **Pipeline still running** | Skeleton canvas + “Graph builds after score_link.” |
| **Loader error** | Banner (B09-class) + Retry; do not fall back to lab/Vite data |
| **Partial catalogue** | Still render Order/Geo/EventCandidate core; note soft catalogue jobs off DoD if relevant |

---

## Layout zones (ASCII)

```
┌──────── charcoal top bar: SY | Syndicate          shop · Connected ┐
├──────── nav ────────┬───────────────────────────────────────────────┤
│ Overview            │ H1 Graph                    [Labels]          │
│ Events              │ Showing top occasion subgraph · Race-day…     │
│ Personas            │ [Order][SKU][Geo][Event]…  Search  Fit  Physics│
│ Insights            │ ┌──────────── force canvas ─────────────────┐ │
│ Graph *             │ │  Order → Geo ← race PROXY + Wx Driver     │ │
│ Agent runs          │ │  + EventCandidate · provenance strokes    │ │
│ ─────               │ └───────────────────────────────────────────┘ │
│ Settings            │ Legend: Obs · Agg · Hyp · Mock                │
└─────────────────────┴───────────────────────────────────────────────┘
```

---

## Components / Polaris

`Page`, `Card`, `InlineStack` / `BlockStack`, `Text`, `TextField` (search), `Button` (Fit), `Checkbox` or toggle (Physics), custom `FilterPill` chips, custom `GraphCanvas` (client force layout — e.g. lightweight force-graph / d3-force; no Neo4j Browser), `Badge` provenance, `EmptyState`, `Banner`, EnrichmentLegendModal entry via Labels.

---

## Interactions

- Nav **Graph** → `/app/graph`
- Overview teaser → `/app/graph` with preset applied
- Node click → optional side panel (label, type, provenance, deep link to Event / Persona when id resolves) — nice-to-have for PoC; not required if time-boxed
- Physics off freezes positions; Fit recentres
- Labels → EnrichmentLegendModal (M01)

---

## Visual notes

- Cream canvas page; white card around graph; kit-red accent sparingly (e.g. EventCandidate highlight), primary green **only** on CTAs elsewhere — not on graph chrome
- Serif H1; body system-ui 13.5px
- Canvas min-height ~420px so the Race-day path is demo-readable above the fold

---

## Acceptance (build)

- [ ] `/app/graph` in nav as **Graph**; opens inside embedded Admin
- [ ] Loader reads Prisma `GraphEdge` + node labels only (no lab sqlite, no Vite JSON)
- [ ] Default **Race-day evidence path** shows Order → Geo ← race PROXY + weather Driver + EventCandidate when seeded
- [ ] Caps ~150 / ~300 with “showing top occasion subgraph” note when truncated
- [ ] Node-type chips, search, Fit, Physics on/off work on the loaded subgraph
- [ ] Provenance legend Obs/Agg/Hyp/Mock visible; empty state if no edges after pipeline
- [ ] British English; cream / kit-stripe styles match Admin
- [ ] Optional Overview teaser card links to Graph

---

## Explicit non-goals

- Not Neo4j · not full lab graph dump · not dual Admin via Vite · not agent-driven live graph mutation · not Python sqlite bridge
