# DEEP_GAP_AUDIT — Syndicate end-to-end (Harbour Run)

**Date:** 25 Sep 2026 · Europe/London  
**Auditor:** Grok Bot (executor) — **spec + box inventory only**; no app code written; no Origin push  
**Class of problem:** same family as “UI not wired to graph/Insights” (`LIVE_DATA_WIRE.md`)  
**Terminology:** Syndicate **agents / synthetic shoppers** = **Playwright** runs (Epic 06). They are **not** Cursor Task / Cloud Agent subagents. Austin’s “subagents” = those Playwright shoppers.

**Naming SoT:** Epic + `LIVE_DATA_WIRE` — `EventCandidate`, `ConfidenceScore`, `GraphEdge`, `AgentRun`, `AffordanceScore`, `InsightScore`, `Recommendation`; PipelineRun stages `store_makeup` → `graph_seed` → `catalogue_refresh` → `score_link` → `personas` → `agents_queue`; D26 `agentsAutoRun`. Python `syndicate-graph-lab` ≠ app Prisma. Vite `ui/*.html` = layout SoT only.

---

## Box inventory (this machine)

| Artifact | Status on `/workspace` |
|----------|------------------------|
| Spec pack `cursor-commerce-hackathon/` (scope, epics, fixtures, ui HTML, live-demo-store) | **Present** |
| `syndicate-graph-lab/` Python lab + RESULTS + FIXTURE_MISMATCHES | **Present** (lab ≠ production) |
| Vite / static Admin prototype `ui/*.html` + `ui/app.js` | **Present** (layout SoT; agent theatre via `localStorage`) |
| Remix / React Router app (`shopify-app/` on Origin Phase 01) | **Absent on this box** |
| Origin Cloud Agent transcript Phase 0 + Epic 01 | **Present** — shell built on Origin agent VM; pipeline workers **not** built; PR blocked on **Create repo** |
| Vertical-slice CloudAgent (02–08 / LIVE_DATA_WIRE) | **Do not assume done** |

---

## 1. Executive answer (Austin’s four questions)

1. **More gaps like the fixture/UI disconnect?** **Yes — many.** `LIVE_DATA_WIRE` already bans `import demo.json` / static HTML as Admin. Same class: agent-attributed Insights without a completed `AgentRun` id; Vite `ui/` theatre vs Remix Prisma loaders; Python graph-lab SQLite vs app Prisma; football leftovers after the running pivot; hybrid A5 live/fixture switch; catalogue MOCK vs live jobs; CONTRACTS/DATA_DICTIONARY naming drift vs epics.

2. **Does the graph actually get updated with agents?** **No (by design).** Epic 04 / stages `graph_seed` + `score_link` write `GraphEdge` / `EventCandidate` / `ConfidenceScore` from **orders + catalogue + makeup**. Epic 06 writes `AgentRun` + `AffordanceScore` / `InsightScore` only. Epic 07 may add recommendation / support edges. **Agent runs do not recompute EventCandidate confidence or rewrite the occasion graph.** After stage 4 (score), the occasion graph is **static** until recompute / Refresh store. Lab RESULTS are **not** the Admin write path.

3. **Do Playwright shoppers actually get spawned with correct personas?** **SPEC-LOCKED yes; IMPLEMENTATION on this box = fixtures only.** Spec: PipelineRun stage `agents_queue` (if `agentsAutoRun`) **or** Settings/Overview “Run agents”; persona → `path-harbour-run-dawn.json` + storefront URL; cap ≤3; concurrency 1; stop-before-pay deny-list; D26 default ON + Pause until headed green; headed OK for pitch / headless CI. **On box:** path JSON + `demo-completed-run.json` (MOCK) exist; **no** runner/worker. Origin Phase 01 leaves stages **`pending`**. Treat real spawn as **NOT BUILT** until proven.

4. **Are those reflected in the UI?** **SPEC yes; runtime mostly no.** Spec: runs page polls ~2s; Insights \| Frictions from Prisma; agent-attributed cards **require** completed `AgentRun` id (`LIVE_DEMO_GATE`); persona detail shows linked runs; Overview KPIs from DB. **Vite `ui/`** hard-codes Insights/Frictions and fakes runs via `localStorage` — classic disconnect. Remix Prisma loaders **SPEC-LOCKED**, **mostly NOT BUILT**. Fixture recommendations set `agentRunIdRequired: true` but have **no live runId** — DEMO RISK if pitched as agent-found.

**Bottom line:** Spec is strong and honest about theatre. **Saturday live wow is blocked** by (a) missing app write+read path, (b) Austin Partner clicks A1/A3/A4, (c) no headed green Playwright, (d) dual UI/lab surfaces that look finished while DB is empty or pending.

---

## 2. End-to-end hop table

Modes: **DEMO_FIXTURE_SHOP** (`DEMO_FIXTURE_SHOP=1` / seed + `pipeline:demo`) vs **live Partner** (`harbour-run-demo`).

| # | Hop | Spec | DEMO_FIXTURE_SHOP | Live Partner | Classification |
|---|-----|------|-------------------|--------------|----------------|
| 0 | Pack / Origin | Docs SoT; Origin `hugeinc/tmp-493181d83584bec6` | N/A | N/A | SPEC-LOCKED · **Create repo** still open (**DEMO RISK**) |
| 1 | OAuth / shell (01) | Exact read scopes; Connected; enqueue PipelineRun on live | Fixture session; **no** live PipelineRun | OAuth → Shop+Session → PipelineRun `install` | SPEC-LOCKED · Origin Phase 01 **IMPLEMENTED** (agent VM) · **NOT on this box** · secrets/toml/tunnel **Austin** |
| 2a | Ingest / makeup (02 / a) | ≤60d / ~500; PCD city/sector; StoreMakeupSnapshot | Seed orders/products → Prisma | Admin GraphQL; hybrid A5 (≥20 → live) | SPEC-LOCKED · **NOT BUILT** here · A4 PCD **Austin** |
| 2b | Catalogue (03 / c) | **D33 hard P0:** race PROXY + Open-Meteo + hashtagTrends; soft: webHarvest/virtual/activity/FD; **no parkrun scrape** | Fixture catalogue → DB | weather OBSERVED; race PROXY; watchlist/MOCK; soft jobs labelled | SPEC-LOCKED (D33) · jobs **NOT BUILT** · soft jobs ≠ DoD |
| 3 | Graph seed + score (04 / b+d) | GraphEdge + EventCandidate + ConfidenceScore → **app SQLite** | Golden bands / seed | Same scorer on live rows | SPEC-LOCKED · app TS **NOT BUILT** · Python lab **IMPLEMENTED** (≠ prod) · **DEMO RISK** |
| 4 | Personas (05 / e) | ≥2 Ready/Draft + fashion stub from store graph | Seed `fixtures/personas/demo.json` | Derive per `PERSONA_DERIVATION.md` | SPEC-LOCKED · **NOT BUILT** · fixtures = expected outputs |
| 5 | Agents queue + Playwright (06 / f) | Cap ≤3; concurrency 1; stop-before-pay; path↔persona↔URL; Pause | **Must not** auto live Playwright; MOCK replay labelled | Auto if D26 ON; else manual Run | SPEC-LOCKED · spawn **NOT BUILT** · path + MOCK fixtures **IMPLEMENTED** · **DEMO RISK** |
| 6 | Recommendations (07) | Templates first; optional LLM polish; `runId` on agent cards | Seed recs into DB; same loaders | `recommendations.build` after run + `fromLift` | SPEC-LOCKED · **NOT BUILT** · `agentRunIdRequired` without runId = **DEMO RISK** |
| 7 | Admin UI loaders (08) | Prisma-only Overview / Events / Insights / Runs | Same loaders after seed | Same | SPEC-LOCKED · Vite HTML **IMPLEMENTED** (wrong surface) · Remix boards **NOT BUILT** · **P0 DEMO RISK** |
| 8 | Settings / Pause / strip (09) | Pipeline strip; Pause agents; Refresh store | Demo indicator | Live vs Demo chip | SPEC-LOCKED · **NOT BUILT** · Pause unenforceable without worker |
| 9 | Pitch / gate | `LIVE_DEMO_GATE` + `DEMO_SCRIPT` | Hybrid honesty in first 20s | Headed green + Insights from **that** run | Gate **unsigned** · A1/A3/A4 open |

**Invariant (`LIVE_DATA_WIRE`):** fixtures enter **only** via seed/pipeline write. Loaders never `import demo.json` for the primary board.

---

## 3. Explicit answers A–C

### A. Graph ← agents?

| Question | Answer |
|----------|--------|
| Do AgentRuns write GraphEdges / update EventCandidate confidence? | **No.** Epic 04 out-of-scope includes Playwright. Graph from orders/catalogue/makeup only. |
| What do agents write? | `AgentRun`, `AffordanceScore`, `InsightScore` (Epic 06). |
| What do recommendations write? | `Recommendation` (+ optional support edges). May use graph lift **without** agents via `fromLift`. |
| Is graph static after stage 4? | **Yes**, until recompute / Refresh store PipelineRun. |
| Lab RESULTS? | Builder/pitch aid only — **not** Remix runtime. |

### B. Spawn Playwright with correct personas?

| Topic | Spec lock | Build status |
|-------|-----------|--------------|
| Who spawns | Pipeline stage `agents_queue` **or** POST Run agents | **NOT BUILT** (no runner/worker on box) |
| Cap / concurrency / stop-before-pay | ≤3 Ready; concurrency 1; deny-list Pay / Buy it now / Shop Pay; guest only | Locked D26 / AUTO_PIPELINE — **no enforcement test shipped** |
| Persona → path → URL | Persona id ↔ `path-harbour-run-dawn.json` ↔ storefront URL | Path JSON **IMPLEMENTED**; binding code **NOT BUILT** |
| Default ON vs Pause (D26/A14) | Default **ON** capped; Pause → stage `skipped`; LIVE_DEMO_GATE: Pause until headed green | Spec locked · UI/worker wire **NOT BUILT** |
| Headed vs headless | Headless CI; **headed** for demo projection | No green headed run on record |
| Real spawn vs fixtures | Runner + worker required; `demo-completed-run.json` = emergency **MOCK** | Fixtures only on box |

### C. UI reflection?

| Surface | Spec | Reality on box |
|---------|------|----------------|
| Agent runs poll | ~2s while running | Vite fakes via `localStorage`; Remix poll **NOT BUILT** |
| Insights board | Prisma; agent cards need `AgentRun` id | HTML hard-coded cards; fixture recs require runId but lack it |
| Persona detail linked runs | Prior runs list | Prototype only |
| Overview KPIs | From DB aggregates | Prototype static / theatre |

---

## 4. Gap list (P0 / P1 / P2)

Owner tags: **fix spec** · **fix build** · **Austin click**

### P0 — Saturday dies or lies without these

| ID | Gap | Class | Owner |
|----|-----|-------|-------|
| P0-1 | **UI↔DB wire missing** — Overview / Events / Insights not proven on Prisma after `db:seed` + `pipeline:demo` | LIVE_DATA_WIRE twin | **fix build** |
| P0-2 | **Playwright runner absent** — no real spawn; only path JSON + MOCK completed run. **UI contract now locked:** [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md) | Agents + Admin UI | **fix build** |
| P0-3 | **Agent-attributed Insights without AgentRun** — fixture/HTML cards speakable as “agent found” | Theatre | **fix build** + pitch |
| P0-4 | **Pipeline stages stuck `pending` after Epic 01** — enqueue without workers | Auto pipeline | **fix build** |
| P0-5 | **A1 Partner store** `harbour-run-demo` | Live demo | **Austin click** |
| P0-6 | **A3 storefront URL** + password-off Dawn | Live demo | **Austin click** |
| P0-7 | **A4 PCD L2 Address** (or honest `PCD_REDACTED` banner) | Geo / confidence | **Austin click** |
| P0-8 | **Headed path green** once; Pause ON until then | LIVE_DEMO_GATE | **fix build** + **Austin click** |
| P0-9 | **Origin durable repo / Create repo** — Cloud Agent could not open PR; app not on this box | Process | **Austin click** + sync |
| P0-10 | **Env secrets + `shopify.app.toml` client_id + tunnel** for OAuth | Install | **Austin click** |
| P0-11 | **Stop-before-pay deny-list untested** in CI | Safety / optics | **fix build** |
| P0-12 | **Vertical slice CloudAgent incomplete** — do not assume 02–08 done | Process | Assume **NOT BUILT** |

### P1 — credibility / flaky wow

| ID | Gap | Owner |
|----|-----|-------|
| P1-1 | Hybrid A5 live vs fixture switch not implemented / labelled | **fix build** |
| P1-2 | Persona derivation from live orders vs seed-only | **fix build** |
| P1-3 | Dawn theme fragility (selectors, cookie banner, apps) | **fix build** + **Austin click** (freeze theme) |
| P1-4 | Order SKU mismatches (FIXTURE_MISMATCHES — orphan line SKUs, dual schema, London-only geo) | **fix spec** / optional fixture fix |
| P1-5 | Football leftovers in catalogue/social fixtures after running pivot | **fix spec** / seed hygiene |
| P1-6 | Catalogue jobs still MOCK (parkrun forbidden; FD optional; webHarvest soft) — honesty banners | **fix build** |
| P1-7 | Concurrency / caps / Pause not wired to worker | **fix build** |
| P1-8 | Insights without agents (event-only / fromLift) vs agent frictions — labelling | **fix build** + copy |
| P1-9 | Vite `ui/` prototype vs `shopify-app/` dual UI — judges open wrong surface | **fix build** / pitch |
| P1-10 | Graph lab Python vs app TS dual score SoT | **fix build** (port golden bands; don’t read lab DB) |
| P1-11 | Cloud Agents (D28) confused with merchant agents in pitch | Pitch · D28 already clear in docs |
| P1-12 | Kids Youth tee size-guide bait + Race Kits without shell — store prep | **Austin click** / seed |

### P2 — polish / defer

| ID | Gap | Owner |
|----|-----|-------|
| P2-1 | Recommendations LLM polish (templates default A8/D32) | **fix build** optional |
| P2-2 | Export brief honest empty | Already locked |
| P2-3 | Campaign P2 card | Optional |
| P2-4 | Nightly refresh | Locked skip (A13) |
| P2-5 | Official X/Reddit APIs | P2 only (A15) |
| P2-6 | Strava OAuth aggregates | Optional (A16) |
| P2-7 | Full UI_INTERACTION_CONTRACT polish matrix | After vertical slice |
| P2-8 | CI smoke holes beyond deny-list + parkrun grep | **fix build** |
| P2-9 | Screenshot capture on agent runs | Nice-if-time |
| P2-10 | CONTRACTS naming drift across docs | **fix spec** align |

---

## 5. Recommended build order to close P0s before Saturday

Aligned with `BUILD_ORDER.md` + `LIVE_DATA_WIRE` — cut scope ruthlessly.

```
0. Austin: Create repo (if still temp) · Partner harbour-run-demo · PCD L2 · paste storefront URL
   · freeze Dawn · seed ≥20–40 orders · Pause agents ON

1. Sync Origin shopify-app (Phase 0–01) onto a durable branch / this box

2. Phase 0 harden: prisma seed loads ALL Harbour Run fixtures into SQLite
   (orders, products, catalogue MOCK, personas, agent MOCK labelled, recommendations)

3. Minimal write path (thin vertical, not nine perfect epics):
   a. 02 fixture ingest path (USE_ORDER_FIXTURES / seed) + StoreMakeupSnapshot stub
   b. 03 hard P0: race PROXY seed + weather + hashtagTrends (skip FD/webHarvest/virtual/activity for DoD — D33)
   c. 04 graph.buildAndScore TS port from lab golden bands (running, not football)
   d. 05 personas.derive OR seed upsert (≥2 + stub)
   e. 06 ONE scripted Playwright path (headed) + deny-list unit test
        + MOCK replay badge path
   f. 07 recommendations.build templates (≥3 cards; agent cards require runId)

4. ★ Vertical slice wire (HARD GATE):
   Epic 08 loaders Prisma-only for Overview + Events + Insights
   Smoke: db:seed && pipeline:demo → boards non-empty WITHOUT Partner
   Ban route import demo.json; EmptyState if tables empty

5. Wire Pause + pipeline strip (09 lite) · Run agents CTA · 2s poll on run detail

6. LIVE_DEMO_GATE: one headed checkout_started · Insights from THAT run id · sign gate

7. Only then: live OAuth against Partner · hybrid A5 · optional weather/FD
```

**Do not:** polish Vite HTML as the Admin app; read graph-lab SQLite in Remix; claim Cloud Agents as shoppers; auto-unpause agents before headed green; pitch football kit as primary.

---

## 6. Ruthless extras (requested checklist)

| Topic | Finding |
|-------|---------|
| Partner A1/A3/A4 | Still **Austin-owned**; seed pack mitigates files only |
| PCD geo on orders | Spec city/sector; null → Banner; enable L2 |
| Catalogue vs MOCK | **D33:** hard = weather + race PROXY + watchlist; parkrun live **forbidden**; football/webHarvest/virtual/activity soft→MOCK |
| Hybrid A5 | Locked ≥20 live else fixtures — **implementation absent** |
| Recs rules vs LLM | Templates default; polish optional MODEL_HYPOTHESIS |
| Graph lab vs app TS | Dual SoT risk — lab RESULTS ≠ production |
| Vite ui vs shopify-app | Dual UI — prototype looks “done”; app missing on box |
| Origin agent_temp / Create repo | Cloud Agent: PR blocked; treat remote as fragile |
| Env / toml / tunnel | client_id empty until Partner app; `shopify app dev` tunnel |
| Playwright Dawn fragility | Path contract exists; theme freeze + headed pre-warm required |
| Order SKU mismatches | Documented in graph-lab FIXTURE_MISMATCHES — orphan SKUs, schema dual |
| Auto pipeline pending after 01 | **Confirmed pattern** — enqueue without workers → pending forever |
| Cloud Agents ≠ merchant agents | D28 locked; pitch risk remains |
| Insights without agents | Allowed if labelled event/lift; agent-attributed requires run id |
| Caps/Pause unwired | Spec only until worker + Settings |
| No payment stop test | Deny-list unit test specified; **not shipped** |
| CI/smoke holes | Spec: parkrun grep, deny-list, fixture validate; incomplete without app |
| Vertical slice in flight | **Do not assume done** |

---

## 7. Sources read

`scope/LIVE_DATA_WIRE.md`, `LIVE_DEMO_GATE.md`, `RUN_AGENTS_UI_CONTRACT.md`, `WEEKEND_BUILD_SPEC.md`, `AUTO_PIPELINE_ON_INSTALL.md`, `SEQUENCE_INSTALL_TO_RECOMMENDATION.md`, `CONTRACTS.md`, `RISKS_AND_DECISIONS.md`, `ADVERSARIAL_REVIEW.md`, `AGENT_KICKOFF.md`, `BUILD_ORDER.md`, `AI_CALL_CONTRACT.md`, `HOLES_PLUGGED.md`, `FIXTURES_MANIFEST.md`, `CURSOR_TOOLING.md`, `NON_FUNCTIONALS.md`, `DATA_DICTIONARY.md`, `DEMO_SCRIPT.md`, `GRAPH_VISUAL.md`, epics **01–09**, `fixtures/agents/*`, `fixtures/recommendations/demo.json`, `fixtures/personas/demo.json`, `live-demo-store/PERSONA_DERIVATION.md`, `playwright/PATH_DAWN_HARBOUR.md`, `ui/*.html` + `ui/app.js`, `syndicate-graph-lab/RESULTS.md` + `FIXTURE_MISMATCHES.md`, Cloud Agent transcript Phase 0/01.

---


---

## 7b. Note — P0-2 dedicated UI contract (25 Sep 2026)

**P0-2** (Playwright spawn + reflection in Admin) now has a dedicated mandatory spec: **[`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md)**.

It locks: Admin **Run agents** → real Prisma `AgentRun` + app-server Playwright (headed default for manual demo); Agent runs ~2s poll; Insights cite that run id; graph **not** recomputed by agents; bans Vite localStorage theatre, MCP Todo, and Cloud Agents as shopper runtime.

Implementation status on this box is **unchanged** by the contract alone (runner still **NOT BUILT** until proven) — the gap is now **spec-closed** so builders cannot “fix” it with fake UI.

## 8. Sign-off

This audit is **docs + inventory**. It does **not** implement app code or push Origin. Re-run a short delta audit after vertical-slice PR merges and `LIVE_DEMO_GATE` is signed.
