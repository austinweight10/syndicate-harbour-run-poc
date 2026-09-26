# AGENT_KICKOFF — weekend entry point for coding agents

**Date:** 26 Sep 2026 · Europe/London  
**Product:** Syndicate — occasion-commerce intelligence for Shopify Admin (sports + athleisure)  
**Status:** **BUILD GREENLIT** · start Phase 0 → epic 01 · live-data wire is hard DoD

---

## One-liner

**Stop guessing race-weekend merch.** Discover the occasions that drive buy intent, mint store-backed personas, then watch synthetic shoppers pressure-test the storefront — stop before payment — and surface Insights / Frictions with provenance.

**PoC = REAL runtime only (26 Sep):** Prisma Admin + real headed Playwright AgentRun + Insights citing that run id. Vite / route-import fixtures / unbadged MOCK / `demo-completed-run.json` happy path = **NOT PoC**. See `LIVE_DEMO_GATE.md` · `HOLES_PLUGGED.md` · `PLAN_HOLES_DELTA.md`.

---

## Source of truth (SoT) paths

| Layer | Local mirror | Origin (`hugeinc/tmp-493181d83584bec6`) |
|-------|--------------|------------------------------------------|
| Epics | `epics/` | `docs/epics/` |
| Scope / contracts | `scope/` | `docs/scope/` |
| Fixtures | `fixtures/` | `docs/fixtures/` |
| UI HTML SoT | `ui/` | `docs/ui/` |
| Root plans | `*.md` at repo root of this tree | often under `docs/` or root — prefer attached paths |

Visual/IA SoT: `ui/*.html` + `ui/styles.css` + `epics/UI_SCREEN_SPECS.md` (**layout only**).  
**UI polish SoT:** `scope/UI_INTERACTION_CONTRACT.md` (+ `epics/UI_POLISH_CHECKLIST.md`).  
**Live data SoT:** `scope/LIVE_DATA_WIRE.md` — loaders Prisma-only; fixtures via DB seed.  
**Run agents SoT (P0):** `scope/RUN_AGENTS_UI_CONTRACT.md` — real Playwright shoppers + Agent runs UI poll; not MCP Todo / Cloud Agents as runtime.  
**Whole-process diagram SoT:** [`scope/FLOWS.md`](./FLOWS.md) — Harbour Run / running, REAL PoC, Prisma Admin, and the dual-UI ban.  
Implementable shapes: `scope/CONTRACTS.md` + `scope/DATA_DICTIONARY.md`.

---

## BUILD GREENLIT — start here

| Mode | Rule |
|------|------|
| **GREENLIT (now)** | Scaffold Remix, implement epic TypeScript, follow `BUILD_ORDER.md` Phase 0 → epic `01` using `epics/PROMPTS/01.md`. Cloud Agents **BUILD** the app. |
| **Hard DoD** | End-to-end **live data path** per [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md): UI loaders read EventCandidates + Insights/Frictions from Prisma/SQLite written by the pipeline — **not** static HTML, **not** `import demo.json` in routes. |

**Runtime honesty (locked D28):** Cloud Agents build the app. **Playwright** runs merchant shoppers. Cloud Agents do **NOT** execute merchant `PipelineRun`s as production runtime.

---

## Vertical slice order (must ship)

1. **Phase 0** — Prisma schema + `db:seed` (fixtures → SQLite).  
2. **02–07 write path** — pipeline stages persist EventCandidate / GraphEdge / Persona / AgentRun / Recommendation.  
3. **08 Prisma-only loaders** — Overview + Events + Insights | Frictions read DB (same loaders for `DEMO_FIXTURE_SHOP=1`).  
4. **Smoke:** `npm run db:seed && npm run pipeline:demo` → boards populate **without Partner**.  
5. **LIVE_DEMO_GATE** — headed Harbour Run Playwright when A1 store ready; Insights from **that** AgentRun.

UI **cannot** merge with fixture-only Insights. Detail: [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md) · [`BUILD_ORDER.md`](./BUILD_ORDER.md).

---

## Reading order (exactly)

1. **This file** — `scope/AGENT_KICKOFF.md`
2. `scope/LIVE_DATA_WIRE.md` — **UI↔DB hard DoD**
2b. `scope/RUN_AGENTS_UI_CONTRACT.md` — **Run agents → real Playwright** (P0)
2c. `scope/LIVE_DEMO_GATE.md` + `scope/HOLES_PLUGGED.md` + `scope/PLAN_HOLES_DELTA.md` — PoC bar + plugged holes
2d. [`scope/FLOWS.md`](./FLOWS.md) — whole-process diagrams (read before implementing cross-epic wiring)  
3. `scope/BUILD_ORDER.md` — phased weekend plan
4. `scope/SDD_PLAYBOOK.md` — how to run one epic = one Cloud Agent
5. `scope/RISKS_AND_DECISIONS.md` — locked decisions + remaining Austin calls
5b. `scope/AI_CALL_CONTRACT.md` + `scope/WEEKEND_BUILD_SPEC.md` — what AI is called; Sat–Sun brief
6. `scope/FIXTURES_MANIFEST.md` — every fixture on disk (seed inputs)
7. `epics/README.md` — dependency graph + whole-MVP DoD
8. `scope/CONTRACTS.md` + `scope/DATA_DICTIONARY.md` + `scope/SIGNAL_SOURCES.md`
9. `scope/AUTO_PIPELINE_ON_INSTALL.md` + `scope/SEQUENCE_INSTALL_TO_RECOMMENDATION.md`
10. Target epic md + matching `epics/PROMPTS/0N.md`
11. For UI: `epics/UI_SCREEN_SPECS.md` + `scope/UI_INTERACTION_CONTRACT.md` + relevant `ui/*.html`

---

## Global constraints

| Constraint | Rule |
|------------|------|
| Scopes | `read_orders,read_products,read_customers` only |
| Locale | British English merchant-facing strings |
| Graph | SQLite + GraphEdge — not Neo4j |
| Admin surface | **`shopify-app/` Remix only** — Vite `ui/` = layout SoT; never demo Admin |
| PoC AgentRun | Real Playwright only — MOCK hydrate ≠ PoC acceptance |
| Agents | Playwright **stop before payment** (checkout start OK) |
| Provenance | OBSERVED · AGGREGATE_PROXY · MODEL_HYPOTHESIS · MOCK |
| Social | Never OBSERVED demand from social alone |
| parkrun | **No live scrape** — MOCK only |
| X/Twitter | **No** unofficial HTML scrape / shadow API hard-dep |
| Strava | Curated/MOCK default; optional OAuth = aggregate club only |
| Fashion | Greyed stub only |
| Nightly refresh | **Skip** for hackathon (A13) |
| AI / LLM | Optional thin naming/blurb/rec polish only — **templates first**; see [`AI_CALL_CONTRACT.md`](./AI_CALL_CONTRACT.md). No LangGraph; no LLM Playwright |
| **UI data** | **Prisma only** — fixtures via seed; see [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md) |
| **Run agents** | Real Playwright via app server — [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md); **not** MCP Todo / Cloud Agent shoppers |
| Primary vertical | **Harbour Run / running** (football = legacy fixture label only) |

---

## Locked decisions (bake in — do not reopen)

| ID | Status | Choice |
|----|--------|--------|
| **A1** | **Open (blocker for live Partner demo, not scaffolding)** | Use fixtures / `DEMO_FIXTURE_SHOP` + DB seed until Partner store chosen |
| **A5** | **LOCKED** | **Hybrid** — prefer live orders/products when history ≥20 orders; fixtures only if thin (**seeded into DB**) |
| **A6** | **LOCKED DEFAULT** | **Two full personas + fashion stub**; Taper-week runner = optional stretch, **not** DoD |
| **A13** | **LOCKED** | Skip nightly scheduled refresh — install / reconnect / manual Refresh only |
| **A14** | **LOCKED** | Agents default **ON** capped (≤3, concurrency 1) + Pause toggle |
| **A15** | **LOCKED REWRITE** | Social = (a) curated hashtag watchlist **always** · (b) **`social.webHarvest`** public-web harvest from allowlist (robots.txt, AGGREGATE_PROXY) · (c) MOCK buzz. Optional official X/Reddit APIs = **P2 only** if keys later — **not required**. No unofficial X scrapes. |
| **A16** | **LOCKED DEFAULT** | Strava OAuth optional; curated/MOCK default |
| **A8 / D32** | **LOCKED WEEKEND DEFAULT** | **AI = templates only** by default; optional OpenAI `gpt-4o-mini` / Claude Haiku class polish if key present. Call sites only in [`AI_CALL_CONTRACT.md`](./AI_CALL_CONTRACT.md) |
| **UI polish** | **LOCKED** | Interaction states / toasts / banners / empty-error / a11y = [`UI_INTERACTION_CONTRACT.md`](./UI_INTERACTION_CONTRACT.md); QA = `epics/UI_POLISH_CHECKLIST.md`. D29: nav **Insights**; board **Insights | Frictions** |
| **Live wire** | **LOCKED DoD** | [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md) — single write (pipeline→SQLite) · single read (loaders→Prisma) |
| **Run agents UI** | **LOCKED P0** | [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md) — button → real AgentRun + headed demo default |

---

## Build order (parallelisation)

```
Phase 0  fixtures already authored + Prisma from CONTRACTS (no Shopify yet)
Phase 1  epic 01  Remix / OAuth shell
Phase 2  02 ∥ 03
Phase 3  04 → 05
Phase 4  06 ∥ 07
★ Vertical slice wire — UI Prisma loaders; no fixture-only Insights merge
Phase 5  08 → 09 + DEMO_SCRIPT rehearsal
```

Detail: `scope/BUILD_ORDER.md`. Prompts: `epics/PROMPTS/01.md` … `09.md`.

---

## Per-epic “attach these files” checklist

| Epic | Always attach | Also |
|------|---------------|------|
| 01 | epic, this kickoff, CONTRACTS (Shop/Session/env), `fixtures/session/demo-shop.json` | CURSOR_TOOLING |
| 02 | epic, CONTRACTS ingest, DATA_DICTIONARY, `fixtures/orders/*`, `fixtures/products/*` | AUTO_PIPELINE |
| 03 | epic, SIGNAL_SOURCES, CONTRACTS jobs, all `fixtures/catalogue/*` | AUTO_PIPELINE stage c |
| 04 | epic, CONTRACTS graph, `fixtures/graph/expected-scores.json`, **LIVE_DATA_WIRE** | SIGNAL_SOURCES scoring hooks |
| 05 | epic, `fixtures/personas/demo.json`, A6 note | UI personas.html |
| 06 | epic, `fixtures/agents/*`, stop-before-pay deny list, **RUN_AGENTS_UI_CONTRACT** | NON_FUNCTIONALS |
| 07 | epic, `fixtures/recommendations/demo.json`, artifacts.html, **LIVE_DATA_WIRE** | — |
| 08 | epic, UI_SCREEN_SPECS, **UI_INTERACTION_CONTRACT**, UI_POLISH_CHECKLIST, **LIVE_DATA_WIRE**, **RUN_AGENTS_UI_CONTRACT**, ui/*.html, styles.css | fixtures as **DB seed only** — loaders Prisma-only; Run agents = real POST |
| 09 | epic, UI_INTERACTION_CONTRACT, UI_POLISH_CHECKLIST, AUTO_PIPELINE UI strip, settings.html, AI_CALL_CONTRACT | DEMO_SCRIPT |

Copy-paste prompt template: `scope/SDD_PLAYBOOK.md`.

---

## Definition of Done — whole MVP

See checkbox list in `epics/README.md` § Definition of Done. Highlights:

- OAuth + scopes exact; ≤60d ingest; PCD-minimised geo
- Catalogue: running calendar PROXY + Open-Meteo; football-data optional **or** MOCK; Open-Meteo forecast; **social paths a/b/c per A15**; virtual + activity MOCK; parkrun MOCK only
- ≥2 EventCandidates with confidence breakdown + provenance **in SQLite**; Events UI reads them via Prisma
- ≥2 personas + fashion stub (runner stretch optional)
- ≥2 Playwright runs → `carted` / `checkout_started`; never pay
- Insights board + ≥3 recommendation cards **from DB** (LIVE_DATA_WIRE)
- Live PipelineRun stages a→f (agents capped / pauseable)
- British English + enrichment legend
- **Vertical slice:** `db:seed` + `pipeline:demo` → Overview + Events + Insights without Partner

---

## Escalation rule

Use **pragmatic defaults** (`epics/README.md`). **Only escalate to Austin** if blocked on **secrets** (tokens) or **store** (A1 / A3 / A4). Do not ping for A5/A6/A15/A16 — locked above.

---

## Explicit runtime split

| Actor | Does | Does not |
|-------|------|----------|
| **Cursor Cloud Agents** | Implement epics, PRs, tests, fixtures→DB wiring | Run merchant PipelineRuns as prod runtime |
| **Playwright (in app)** | Synthetic merchant shoppers ([RUN_AGENTS_UI_CONTRACT](./RUN_AGENTS_UI_CONTRACT.md)) | Replace Cloud Agents for coding; not MCP Todo |
| **PipelineRun worker (in app)** | Stages a→f on live install; writes SQLite | Be executed by Cloud Agent “as the shop” |
| **Remix loaders (Epic 08)** | Query Prisma for Overview / Events / Insights | Import fixture JSON for primary board |
