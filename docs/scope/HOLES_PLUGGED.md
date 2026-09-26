# HOLES_PLUGGED — plan lock delta (Harbour Run PoC)

**Date:** 26 Sep 2026 · Europe/London  
**Product:** Syndicate · vertical **Harbour Run / running** (football = optional secondary only)  
**Related:** [`PLAN_HOLES_DELTA.md`](./PLAN_HOLES_DELTA.md) · [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md) · [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md) · [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md) · [`CONTRACTS.md`](./CONTRACTS.md) · [`DEEP_GAP_AUDIT.md`](./DEEP_GAP_AUDIT.md)

**PoC bar (Austin 26 Sep):** fully wired **REAL runtime** only — Prisma Admin, real headed Playwright `AgentRun`, Insights cite that run id. Vite / route-import fixtures / localStorage / unbadged MOCK / MCP Todo / Cloud Agents as shoppers / `demo-completed-run.json` as happy path = **NOT PoC**. Labelled MOCK = emergency/dev only. **bc-18dcc6ca** UI↔DB landed with mock AgentRun → **NOT PoC-complete**.

---

## Newly plugged (spec locks — 26 Sep 2026)

| Hole | Lock | Where |
|------|------|--------|
| Football leftovers as primary | SUPERSEDED banners; Harbour Run SoT; football = optional secondary | epics 01/07 · root MVP/DEEP/SPORTS · FIXTURES_MANIFEST |
| Graph idempotent replace | **delete-all-then-rewrite** shop EventCandidate+scores+occasion edges (D25) | CONTRACTS §2 · epic 04 |
| EventCandidate vs CatalogueEvent route ids | `/app/events/:id` = **EventCandidate.id** only | CONTRACTS §2b · epic 04 |
| POST Run agents body + timeline | Thickened `CreateRunsActionInput/Result` + `TimelineStep` + `stopped_before_payment` | CONTRACTS §5.5 · epic 06 · RUN_AGENTS_UI_CONTRACT |
| Deny-list strings SoT | Enumerated text / URL / selector lists | CONTRACTS § Agent deny-list · epic 06 |
| Storefront URL discovery | `SHOP_STOREFRONT_URL` **overrides** `Shop.storefrontUrl`; missing → **B06** | CONTRACTS · LIVE_DEMO_GATE · RUN_AGENTS · epic 06 |
| expected-scores golden | Weekend SoT = `fixtures/graph/expected-scores-running.json`; football file SUPERSEDED | FIXTURES_MANIFEST · epic 04 · fixtures |
| Weekend catalogue P0 (D33) | Hard = weather + race PROXY + hashtagTrends; soft = webHarvest/virtual/activity/football | WEEKEND_SIGNAL_P0 · SIGNAL_SOURCES · epic 03 |
| Path fixtures | `path-harbour-run-dawn.json` weekend SoT; football + athletic paths SUPERSEDED | FIXTURES_MANIFEST · epic 06 |
| recommendations/demo.json without runId | Gate: seed→Prisma; PoC agent cards need real AgentRun id **or** MOCK badge (≠ PoC) | epic 07 · fixture `_meta.demoGate` |
| Worker vs Remix | **In-process job runner OK**; must not leave stages `pending` forever | CONTRACTS §2c · epic 06 · WEEKEND_BUILD_SPEC |
| Dual UI | Vite `ui/` = layout SoT only; shipping Admin = `shopify-app/` Remix only | CONTRACTS §2d · AGENT_KICKOFF · WEEKEND_BUILD_SPEC |
| A7 judge metric | **Default locked:** ≥1 agent-attributed Insight with real AgentRun id + ≥2 Ready personas; Austin may override | RISKS_AND_DECISIONS · PLAN_COMPLETENESS |
| PoC vs theatre | REAL runtime DoD explicit; MOCK ≠ acceptance; bc-18dcc6ca called out | LIVE_DEMO_GATE · WEEKEND_BUILD_SPEC · AGENT_KICKOFF · this file |
| Prior (24–25 Sep, still in force) | LIVE_DATA_WIRE · RUN_AGENTS_UI_CONTRACT · LIVE_DEMO_GATE · Harbour seed pack · Pause until headed green | scope/* · live-demo-store/ |

---

## Still open (Austin click — we cannot “plug”)

| Item | Owner | Notes |
|------|-------|-------|
| **A1** Create Partner store `harbour-run-demo` | Austin | Partners UI |
| **A3** Paste final `SHOP_STOREFRONT_URL` (+ password off Dawn) | Austin | Env overrides Shop field |
| **A4** PCD Level 2 Address on Syndicate app | Austin | Or honest PCD_REDACTED banner |
| Seed orders with write-scoped seed-app token | Austin | Seed app ≠ Syndicate |
| Origin durable repo / Create repo / secrets / `shopify.app.toml` / tunnel | Austin | P0-9 / P0-10 |
| A7 override (optional) | Austin | Default already locked for build |
| A2 football-data token | Austin | Optional / secondary only |

---

## Still open (build)

| Item | Notes |
|------|-------|
| **PoC real Playwright runner** | Spawn headed shoppers; drain queued → `stopped_before_payment`; deny-list tested |
| **PoC Insights ← that AgentRun** | No mock AgentRun happy path (bc-18dcc6ca pattern must be replaced) |
| Pipeline workers advance stages | In-process OK — must not stay `pending` after enqueue (P0-4) |
| Epic 08 Prisma loaders vertical slice | After `db:seed` + `pipeline:demo` boards non-empty without Partner |
| LIVE_DEMO_GATE sign-off | Unsigned until headed green + Insights cite that run |
| Hybrid A5 live vs fixture labelling | Spec locked; implementation |
| Concurrency=1 / cap≤3 enforcement in runner | Spec locked; wire in code |

---

## Still deliberately deferred

| Item | Why |
|------|-----|
| Nightly refresh (A13) | Locked skip |
| Neo4j / Redis / write scopes | Out of MVP |
| LLM Playwright / LangGraph (D32) | Forbidden |
| Official X/Reddit APIs (A15 P2) | Optional |
| Strava OAuth private athlete (A16) | Curated/MOCK default |
| Multi-theme durable selectors | Dawn-only weekend |
| Embed live browser in Admin iframe | P2 stretch |
| Football as primary vertical | Pivoted; optional secondary catalogue only |
| Labelled MOCK replay as pitch backup | Allowed emergency **with badge** — never PoC DoD |

---

## Prior ledger (24 Sep) — still true on process

Harbour Run seed pack, Dawn path contract, LIVE_DEMO_GATE theatre bans, persona derivation fixtures-as-expected-outputs — **file-side plugged**. Partner clicks and Remix PoC runtime remain the critical path.

---

## Pointer

Treat adversarial A1/A3/A4/Playwright theatre as **process-mitigated** only when `LIVE_DEMO_GATE` is **signed** with a real headed run id. Until then, pitch as hybrid/fixture-backed in the first 20 seconds — and **never** claim PoC-complete on mock AgentRun UI.
