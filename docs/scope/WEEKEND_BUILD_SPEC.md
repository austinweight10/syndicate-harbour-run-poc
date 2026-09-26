# WEEKEND_BUILD_SPEC — Sat–Sun builder brief

**Date:** 26 Sep 2026 · Europe/London  
**Audience:** Weekend coding agents + Austin (Hackathon lead)  
**Status:** **BUILD GREENLIT** — implement epics on Origin per AGENT_KICKOFF / BUILD_ORDER  
**Entry:** [AGENT_KICKOFF.md](./AGENT_KICKOFF.md) · [BUILD_ORDER.md](./BUILD_ORDER.md) · [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md) · [RUN_AGENTS_UI_CONTRACT.md](./RUN_AGENTS_UI_CONTRACT.md) · [AI_CALL_CONTRACT.md](./AI_CALL_CONTRACT.md) · [LIVE_DEMO_GATE.md](./LIVE_DEMO_GATE.md) · [`../live-demo-store/`](../live-demo-store/)

---


## PoC DoD — REAL runtime only (26 Sep)

**Fully wired working PoC** (Austin bar): no fake UI, no mocks as acceptance.

1. Remix Admin loaders → **Prisma only** (LIVE_DATA_WIRE).  
2. **Run agents** → real `AgentRun` + headed Playwright (RUN_AGENTS_UI_CONTRACT).  
3. Agent-found Insights cite **that session’s** real AgentRun id.  
4. **Forbidden for PoC:** Vite as Admin; route `import demo.json`; localStorage fakes; unbadged MOCK; MCP Todo; Cloud Agents as shoppers; `demo-completed-run.json` as happy path.  
5. Labelled MOCK = emergency/dev only. UI↔DB without real AgentRun (bc-18dcc6ca pattern) = **NOT PoC-complete**.  
6. Dual UI: Vite `ui/` = layout SoT only; shipping Admin = `shopify-app/` only.  
7. Worker: in-process job runner OK; stages must not stay `pending` forever.

Gate checklist: [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md) · holes log: [`HOLES_PLUGGED.md`](./HOLES_PLUGGED.md).

## Goal for Sat–Sun

Ship a demoable Syndicate path on **live Harbour Run** (seed pack in `live-demo-store/`) with fixtures as **DB seed** fallback: install → ingest → catalogue → score → personas (derived from live or seeded orders) → capped Playwright shoppers on Dawn (stop before pay) → Insights + recommendation cards **from Prisma / that run** — provenance honesty and **templates-first** AI (optional thin LLM polish only).

**Catalogue signal P0 (D33):** weather + race PROXY + social watchlist — [`WEEKEND_SIGNAL_P0.md`](./WEEKEND_SIGNAL_P0.md). Soft-degrade: webHarvest/virtual/activity/football.

**P0 weekend gate — UI↔DB wire:** Overview KPIs + Events list + Insights | Frictions board **must** populate from SQLite via Prisma loaders after `db:seed` + `pipeline:demo` (or live pipeline). See **[LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md)**. Fixture JSON is seed input only — not imported in routes for the primary board.

**P0 weekend gate — Run agents:** Admin **Run agents** must spawn real Playwright shoppers and show Prisma `AgentRun` progress in UI — **[RUN_AGENTS_UI_CONTRACT.md](./RUN_AGENTS_UI_CONTRACT.md)**. Not Vite theatre, not MCP Todo, not Cloud Agents as shoppers.

**Not the goal:** invent LangGraph, LLM browsers, Neo4j, write scopes, unofficial X scrapes, treat Cloud Agents as merchant runtime, or ship a mockup-only Admin UI.

---

## In / Out

| In | Out |
|----|-----|
| Remix Shopify app, SQLite/Prisma, in-process jobs | Neo4j, Redis, multi-tenant scale |
| Scopes `read_orders,read_products,read_customers` | `write_*`, theme auto-edit, email send |
| **Weekend hard P0 (D33):** race PROXY + Open-Meteo + social watchlist/MOCK | Unofficial X/Twitter HTML scrape; parkrun live scrape |
| Soft-degrade: webHarvest / virtual / activity / football (schema kept · D31) | Private Strava athlete scrape; treating soft jobs as DoD |
| Scripted Playwright ≤3, concurrency 1, Pause toggle (D26) | LLM decide-next-click; payment complete |
| Deterministic `recommendations.build` + optional LLM polish | LangGraph orchestrator; embeddings/RAG; vision |
| Provenance OBSERVED \| AGGREGATE_PROXY \| MODEL_HYPOTHESIS \| MOCK | Wealth/SES inference |
| Cursor Cloud Agents **build** code (D28) — **greenlit** | Cloud Agent as `PipelineRun` executor |
| Epic 08 loaders → Prisma only (LIVE_DATA_WIRE) | `import demo.json` in Insights/Events routes; static HTML as Admin |
| Real Run agents → AgentRun in UI ([RUN_AGENTS_UI_CONTRACT](./RUN_AGENTS_UI_CONTRACT.md)) | localStorage fake progress; MCP Todo / Cloud Agent as shopper |
| **PoC:** Insights cite real AgentRun from that session | MOCK/`demo-completed-run.json` as PoC acceptance; Vite as Admin |

---

## Pipeline stages 1–7 (live install narrative)

Aligned with AUTO_PIPELINE / SEQUENCE docs (lettered a→f in those files):

| # | Stage | What lands |
|---|-------|------------|
| 1 | OAuth / shell | Connected shop; scopes exact |
| 2 | Store makeup + ingest | ≤60d / ~500 orders; products; PCD-minimised geo |
| 3 | Catalogue | **Hard P0 (D33):** race PROXY + weather + hashtagTrends. Soft: webHarvest/virtual/activity/PL |
| 4 | Graph seed + score | Edges + EventCandidates + confidence breakdown **→ SQLite** |
| 5 | Personas | ≥2 Ready/Draft + fashion stub (A6) **→ SQLite** |
| 6 | Agents queue | ≤3 Playwright runs or skipped if Pause; stop-before-pay |
| 7 | Recommendations / Insights | ≥3 cards in DB; Insights \| Frictions board **reads Prisma**; Hyp only if LLM polish used |

---

## AI call summary

**Runtime AI = optional thin naming/blurb/polish only.** Full table, env vars, fallbacks, and forbidden call sites: **[AI_CALL_CONTRACT.md](./AI_CALL_CONTRACT.md)**.

- Primary: OpenAI `gpt-4o-mini` · Fallback: Anthropic `claude-haiku-4-5` (Claude Haiku class) · Else **templates only**.  
- Caps: ≤5 calls/batch · ≤$5 weekend · A8 default templates.  
- Cloud Agents build ≠ runtime LLM.

---

## Merge gates (condensed from BUILD_ORDER)

| Phase | Gate |
|-------|------|
| **P0** | Prisma + fixtures **seed into DB**; no Partner store required; **UI↔DB wire smoke** planned |
| P1 | Epic 01 shell boots; scopes exact; fixture session OK |
| P2 | 02 ∥ 03 green; no twitter.com fetch hard-dep; PCD city/sector only |
| P3 | 04 → 05: golden score bands; ≥2 personas + stub; **Events listable from DB** |
| P4 | 06 ∥ 07: checkout_started + deny-list; ≥3 rec cards **in DB**; templates path first |
| **Vertical slice** | After `db:seed` + `pipeline:demo`: Overview + Events + Insights from SQLite — **UI cannot merge fixture-only Insights** ([LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md)) |
| P5 | 08 → 09 + DEMO_SCRIPT 5–7 min dry-run; loaders Prisma-verified |

---

## Demo path

1. **Primary DoD (live):** **Harbour Run** Dawn store from [`../live-demo-store/`](../live-demo-store/) — create Partner store → import seed → headed Playwright (`path-harbour-run-dawn.json`) → Insights from **that** AgentRun (Prisma). Gate: [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md).  
2. **Scaffold / CI (no Partner):** `DEMO_FIXTURE_SHOP=1` → `db:seed` + `pipeline:demo` → **same** UI loaders read SQLite. Football merch fixtures remain valid as **labelled MOCK/legacy** seed only (`demo-football-merch`); not the primary pitch.  
3. **Narrative optional:** London-runner weather / signals colour — `/workspace/london-runner-demo/`. Do **not** block MVP DoD on live London storefront.  
4. Backup: MOCK agent replay **labelled**; LLM off still narratable; Pause auto agents until headed green.

---

## UI polish

| Doc | Role |
|-----|------|
| [`UI_INTERACTION_CONTRACT.md`](./UI_INTERACTION_CONTRACT.md) | Weekend builder bible — component states, toast/banner catalogues, per-route empty/loading/error, a11y, motion |
| [`../epics/UI_POLISH_CHECKLIST.md`](../epics/UI_POLISH_CHECKLIST.md) | Printable QA; **Phase 5 / epics 08–09 DoD** includes this checklist |
| [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md) | **Hard DoD** — Prisma-only loaders; anti-patterns |
| [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md) | **P0** — Run agents → real Playwright + Agent runs poll |
| Visual SoT | `../ui/*.html` + `styles.css` + refine-v3 shots (**layout only** — not runtime data) |

**Phase note:** P5 gate (08 → 09 + DEMO_SCRIPT) is not green until Interaction Contract rows are implemented, `UI_POLISH_CHECKLIST.md` is ticked, **and** LIVE_DATA_WIRE vertical slice passes. Agents must not invent hover/toast/banner copy.

---

## Graph lab visual

Builder / pitch aid only (not Remix Admin MVP UI): interactive occasion-graph explorer at [`/workspace/syndicate-graph-lab/viz/`](../../syndicate-graph-lab/viz/) — force map over lab SQLite edges (`export_graph_json.py` → `data/graph-viz.json`). Epic 04 remains app Prisma/SQLite; **no Neo4j**. Lab does **not** feed Admin loaders — see [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md) · [GRAPH_VISUAL.md](./GRAPH_VISUAL.md).

## Build status

> **GREENLIT (25 Sep 2026).** Scaffold Remix and implement epic feature code per `AGENT_KICKOFF.md` → `BUILD_ORDER.md` Phase 0 → `epics/PROMPTS/01.md`. Live-data wire ([LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md)) is a **P0 weekend gate**, not a post-demo nice-to-have.
