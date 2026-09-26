# LIVE_DATA_WIRE — Admin UI ↔ SQLite graph ↔ Events/Insights (hard DoD)

**Date:** 26 Sep 2026 · Europe/London  
**Status:** **MANDATORY** hackathon Definition of Done — not optional polish  
**Vertical:** **Harbour Run / running** (primary)  
**Companions:** [LIVE_DEMO_GATE.md](./LIVE_DEMO_GATE.md) · [RUN_AGENTS_UI_CONTRACT.md](./RUN_AGENTS_UI_CONTRACT.md) · [SEQUENCE_INSTALL_TO_RECOMMENDATION.md](./SEQUENCE_INSTALL_TO_RECOMMENDATION.md) · [BUILD_ORDER.md](./BUILD_ORDER.md) · `epics/08-admin-ui.md`

---

## Why this exists

The HTML prototype (`ui/*.html`) and fixture JSON packs were ambiguous: agents could ship a pretty Admin shell that **imports `demo.json` in the route** or serves static HTML and still claim “Insights.” That is **not** the product. The weekend vertical slice must prove:

**Pipeline writes SQLite → Remix loaders read Prisma → Overview / Events / Insights populate.**

Static HTML is visual SoT only. Fixture JSON is seed **input**, never the primary board’s runtime data source.

**PoC DoD (26 Sep):** Prisma Admin + real AgentRun (not mock) + Insights cite that run — see LIVE_DEMO_GATE. UI↔DB with mock AgentRun (bc-18dcc6ca) is **NOT PoC-complete**.

---

## 1. Single write path

```
Pipeline stages (TS jobs, Epic 02–07)
  → Prisma models in SQLite
  → EventCandidate · GraphEdge · Persona · AgentRun · Recommendation / Artifacts
```

| Writer | Role |
|--------|------|
| **TS pipeline jobs** (Epic 04 `graph.buildAndScore`, 05 personas, 06 agents, 07 `recommendations.build`) | **Production scores** — only path Admin UI may treat as live |
| **Python graph lab** (`/workspace/syndicate-graph-lab/`) | **Builder / pitch aid only** — explores edges, golden bands, viz; **not** Remix runtime; does not replace Epic 04 |

Architecture locks unchanged: **D26–D32**, **A5** hybrid, stop-before-pay, social never OBSERVED demand alone, **SQLite** (not Neo4j).

---

## 2. Single read path

Epic **08** loaders and actions query **Prisma only**:

| UI surface | Prisma sources (min) |
|------------|----------------------|
| Overview KPIs / hero | `EventCandidate` + `ConfidenceScore` · `Persona` · Recommendation / Insight aggregates |
| **Events** | Ranked `EventCandidate` (+ confidence) — Harbour Run / running occasions |
| Event detail | Candidate + edges / signals from DB |
| Personas | `Persona` (+ edges) |
| Agent runs | `AgentRun` (+ timeline JSON, persona name, path) — **no localStorage**; see [RUN_AGENTS_UI_CONTRACT.md](./RUN_AGENTS_UI_CONTRACT.md) |
| **Insights \| Frictions** | `Recommendation` / Artifacts rows (+ Affordance/Insight scores); agent-attributed cards need `AgentRun` id (see LIVE_DEMO_GATE) |

**Forbidden in route modules for the primary board:** `import demo.json`, `import fixtures/recommendations/...`, reading static HTML as data, hard-coded card arrays that bypass Prisma.

---

## 3. `DEMO_FIXTURE_SHOP=1` — same loaders

Demo mode still uses the **same** Remix loaders. Flow:

1. Seed fixtures **into** SQLite (`npm run db:seed` or equivalent).  
2. Run pipeline against that shop (`npm run pipeline:demo` or stages a→f on fixture shop).  
3. UI loaders read DB — identically to live.

| Allowed | Forbidden |
|---------|-----------|
| Seed JSON → Prisma, then load | `import demo.json` inside Insights / Events / Overview route for the **primary** board |
| MOCK-labelled hydrate of an AgentRun for emergency pitch | Silent fixture board pitched as agent-found |
| HTML prototype for visual QA | Shipping static `ui/*.html` as the Admin app |

---

## 4. Events page

**Events** = ranked **EventCandidates** from DB for the connected (or fixture) shop — Harbour Run / running occasions (race-day taper, wet-weather training, club social, etc.). Football kit “match-day shirt” is **not** the primary demo story.

---

## 5. Insights | Frictions

- Rows come from **recommendations / artifacts tables** (and related Affordance/Insight scores), not from a route-local JSON import.  
- **Live pitch:** agent-attributed cards **must** carry a completed `AgentRun` id (existing LIVE_DEMO_GATE).  
- **Event-occasion Insights** from graph + rules may appear **before** agents if labelled with provenance badges — still **DB rows**, never route-imported fixtures.  
- Provenance chips Obs / Agg / Hyp / Mock remain mandatory.

---


## 5b. Agent path (Run agents → Prisma → Insights)

Manual **Run agents** / stage `agents_queue` must follow **[RUN_AGENTS_UI_CONTRACT.md](./RUN_AGENTS_UI_CONTRACT.md)**:

1. `POST /app/runs` creates real `AgentRun` rows (personaId + `path-harbour-run-dawn.json` + storefront URL).  
2. App-server worker runs Playwright (headed default for manual demo; headless CI).  
3. On terminal: AffordanceScore / InsightScore (+ optional Recommendation) keyed by **`agentRunId`**.  
4. Agent runs UI polls Prisma ~2s; Insights board shows cards for **that** run id.

**Forbidden:** Vite localStorage fake runs; MCP Todo; Cloud Agents as shoppers; Insights “complete” without AgentRun; agents mutating GraphEdge / EventCandidate confidence.

## 6. Hackathon vertical slice DoD (must ship)

After:

```bash
npm run db:seed && npm run pipeline:demo
# (or equivalent: seed fixtures into Prisma + run pipeline stages through recommendations)
```

**Without Partner / live Shopify**, the following populate from **SQLite**:

- [ ] Overview KPIs (events / insights / frictions counts non-zero when seed expects them)  
- [ ] Events list (≥1 Harbour Run–style EventCandidate)  
- [ ] Insights | Frictions board (≥1 Recommendation / artifact row)

Verified by: loader code paths call Prisma; no primary-board `import` of fixture JSON; optional smoke test that empties a table and sees the UI empty (proves no hard-coded fallback).

---

## 7. Explicit anti-patterns

1. **`import …/demo.json` (or any fixture) inside Insights / Events / Overview loaders** for the primary board.  
2. Serving **`ui/*.html` static** as the embedded Admin experience.  
3. UI reading **Python graph-lab SQLite** (`syndicate-graph-lab/data/graph.sqlite`) instead of app Prisma.  
4. Dual code paths: “demo loader = JSON, live loader = Prisma.” Demo must share Prisma loaders.  
5. Claiming fixture Insights as agent-found without `AgentRun` + provenance.  
5b. Fake Agent runs progress via localStorage / toast-only Run agents (RUN_AGENTS_UI_CONTRACT).  
6. Merging Epic 08 with fixture-only Insights “temporary forever.”  
7. Treating graph-lab viz as Epic 08 substitute.  
8. Hard-coded Harbour Athletic / football-primary cards after the running pivot.

---

## Vertical slice order (agents)

1. Phase 0 schema + seed → DB has rows.  
2. Epics 02–07 write path → pipeline fills candidates / recs.  
3. Epic 08 loaders **Prisma-only** → Overview / Events / Insights.  
4. LIVE_DEMO_GATE headed Playwright when Partner store ready (A1) — Insights from **that** run.

See [BUILD_ORDER.md](./BUILD_ORDER.md) § Vertical slice wire · [AGENT_KICKOFF.md](./AGENT_KICKOFF.md).

---

## Architecture locks (do not reopen)

D26 agents capped · D28 Cloud Agents build ≠ runtime · D29 Insights naming · D30/D31 signals · D32 templates-first AI · **A5** hybrid · stop-before-pay · social never OBSERVED demand alone · **SQLite** graph · [RUN_AGENTS_UI_CONTRACT](./RUN_AGENTS_UI_CONTRACT.md) for real shoppers.
