# PLAN_COMPLETENESS — honest audit (next level)

**Date:** 26 Sep 2026 · Europe/London  
**Inputs:** `epics/01–09`, `epics/UI_SCREEN_SPECS.md`, `ui/SCOPE_UI.md`, `MVP_ARCHITECTURE.md`, `DEEP_PLAN.md`, `SPORTS_EVENT_GRAPH_PIPELINE.md`, `PLANNING_BRIEF_SHOPIFY_EVENTS.md`  
**Scoring legend**

| Rating | Meaning |
|--------|---------|
| **Ready** | Spec dense enough that a build agent can implement without inventing product behaviour |
| **Thin** | Direction clear but missing shapes, examples, or edge cases that would cause thrash |
| **Missing** | Not specified; agent would guess or block |

**Overall plan completeness (pre-scope):** ~**6.5 / 10** — strong epic stories/ACs/UI, weak cross-cutting contracts, sequences, unified dictionary, NFRs, and fixture file contents.  
**After this `scope/` pack (+ auto pipeline + 24 Sep SDD weekend pack):** target **~9.2 / 10** for “build-ready system design” — fixtures authored, A15 web harvest locked, AGENT_KICKOFF/BUILD_ORDER/SDD_PLAYBOOK ready. Still needs Austin **A1/A3/A4** + Partner credentials for live demo (not scaffolding).

---

## Matrix — epic × concern

| Epic / area | Stories | Data model | APIs | UI | ACs | Fixtures | Tests |
|-------------|:-------:|:----------:|:----:|:--:|:---:|:--------:|:-----:|
| **01** Install / OAuth / shell | Ready | Ready | Ready | Thin | Ready | Ready | Thin |
| **02** Shopify ingest | Ready | Ready | Ready | Thin | Ready | Ready | Ready |
| **03** Event catalogue job | Ready | Ready | Ready | Thin | Ready | Ready | Ready |
| **04** Graph + confidence | Ready | Ready | Thin | Thin | Ready | Ready | Ready |
| **05** Personas | Ready | Ready | Thin | Ready | Ready | Ready | Ready |
| **06** Synthetic agents | Ready | Ready | Thin | Ready | Ready | Ready | Thin |
| **07** Recommendations | Ready | Ready | Thin | Ready | Ready | Ready | Thin |
| **08** Admin UI | Ready | Thin* | Ready | Ready | Ready | Thin | Thin |
| **09** Settings / states | Ready | Ready | Ready | Ready | Ready | Thin | Thin |
| **UI** (SCOPE + screen specs) | Ready | Thin* | Ready | Ready | Ready | Thin | Thin |

\*UI loader types sketched in epic 08 / UI_SCREEN_SPECS; not previously unified with Prisma in one place (now → `CONTRACTS.md` + `DATA_DICTIONARY.md`).

---

## Per-epic gap notes (what would block a build agent)

### 01 — Install / OAuth / shell
| Concern | Gaps |
|---------|------|
| Stories / ACs | Solid. |
| Data model | Shop + Session clear. |
| APIs | Uninstall webhook named; payload shape not fully typed. |
| UI | Shell tokens referenced; no component prop contract for `AppShell`. |
| Fixtures | **Ready** — `fixtures/session/demo-shop.json`. |
| Tests | Manual-heavy; no asserted redirect status codes table. |
| **Blockers** | Partner app + tunnel URL + env var names scattered — need single env contract (`CONTRACTS.md`). |

### 02 — Shopify ingest
| Concern | Gaps |
|---------|------|
| Data model | Strong Prisma sketch. |
| APIs | GraphQL field lists good; **exact query documents** not pasted; job enqueue API informal. |
| Fixtures | **Ready** — `fixtures/orders/orders-demo.json` + `products/products-demo.json`. |
| UI | Sync meta deferred to 09 (OK). |
| **Blockers** | PCD redaction behaviour when fields null; billing vs shipping precedence partially stated; worker process lifecycle vs Remix not sequence-diagrammed (now → SEQUENCE). |

### 03 — Event catalogue
| Concern | Gaps |
|---------|------|
| Live APIs | Endpoints + thresholds Ready; **weather.forecastLocal** + **social.hashtagTrends** specified in SIGNAL_SOURCES + epic 03 (D30). |
| Fixtures | **Ready** — full `fixtures/catalogue/*` incl. web-harvest-allowlist (A15). |
| Failure | Circuit breaker described; no shared `JobRun` status enum with ingest. |
| **Blockers** | Offline golden samples for football-data / Open-Meteo referenced but missing; city→lat/lng ownership vs Geo table unclear for weather without orders; optional A15 keys. |

### 04 — Graph + confidence
| Concern | Gaps |
|---------|------|
| Formula | Ready (weights + low-n + softmax + **forecast-driven affinity + social lift cap**). |
| APIs | `graph.buildAndScore` named; **no HTTP/Remix trigger contract**; tool `graph.querySportsLift` underspecified I/O. |
| Fixtures | **Ready** — weekend golden `fixtures/graph/expected-scores-running.json` (football `expected-scores.json` SUPERSEDED). |
| **Blockers** | ~~Idempotent replace~~ → **LOCKED 26 Sep** delete-all-then-rewrite (CONTRACTS §2 / epic 04). ~~EventCandidate vs CatalogueEvent route ids~~ → **LOCKED** `/app/events/:id` = EventCandidate.id only (CONTRACTS §2b). |

### 05 — Personas
| Concern | Gaps |
|---------|------|
| Heuristics | Ready. |
| Fixtures | **Ready** — `fixtures/personas/demo.json` (A6 two + stub). |
| APIs | Derive job only; no action to force re-derive from Settings (09 mentions recompute — thin link). |
| **Blockers** | Third persona (Taper-week runner) optional vs required for demo DoD (≥2) — OK but demo script must pick. |

### 06 — Synthetic agents
| Concern | Gaps |
|---------|------|
| Loop / stop-before-pay | Ready + RUN_AGENTS_UI_CONTRACT. |
| APIs | ~~thin~~ → **LOCKED 26 Sep** CONTRACTS §5.5 CreateRuns + TimelineStep + storefront precedence. |
| Selectors | **Weekend SoT** `path-harbour-run-dawn.json` (Dawn). Football / Athletic paths **SUPERSEDED**. No durable multi-theme contract (accepted). |
| Fixtures | **Ready** — `path-harbour-run-dawn.json` primary; `demo-completed-run.json` = emergency MOCK **≠ PoC**. |
| Tests | Deny-list **LOCKED** enumerated SoT in CONTRACTS. |
| **Blockers** | ~~Storefront URL~~ → env overrides Shop.storefrontUrl else B06. ~~Deny strings~~ locked. **Still build:** real Playwright runner + concurrency enforce; PoC ≠ mock AgentRun. |

### 07 — Recommendations
| Concern | Gaps |
|---------|------|
| Mapping rules | Ready. |
| Deep links | Pattern given; GID→numeric parse edge cases Thin. |
| Fixtures | **Ready** — `fixtures/recommendations/demo.json`. |
| **Blockers** | When to run `fromLift` vs post-agent; Artifacts empty if agents never run (merch-only path under-documented for demo backup). |

### 08 — Admin UI
| Concern | Gaps |
|---------|------|
| Screens / Polaris / ACs | Ready (best of pack). |
| Data | Loader types local to epic — not synced to Prisma field names. |
| Fixtures | `fixtures/ui/*.json` listed — **missing**. |
| Tests | Manual rehearsal; no route smoke checklist as machine-readable. |
| **Blockers** | CSS port strategy (full custom vs Polaris overrides) Thin — visual risk, not logic. |

### 09 — Settings / empty / loading / error
| Concern | Gaps |
|---------|------|
| States | Ready. |
| Wiring | Resync / recatalogue / recompute actions named — response envelopes Thin. |
| Fixtures | settings.json + failed SyncRun — **missing**. |
| **Blockers** | Zero-order Overview empty copy OK; “load demo fixtures” CTA has no action contract. |

### UI pack (`SCOPE_UI` + `UI_SCREEN_SPECS`)
| Concern | Gaps |
|---------|------|
| IA / journeys / tokens | Ready. |
| Live vs MOCK table | Ready at product level. |
| **Blockers** | Prototype uses `sessionStorage` simulation; Remix must replace — SEQUENCE + CONTRACTS now define poll contract. |

---

## Cross-cutting gaps (biggest build thrash)

1. ~~**No fixture files on disk**~~ → **FILLED 24 Sep 2026** — see `fixtures/` + `FIXTURES_MANIFEST.md` (orders, products, catalogue, personas, graph, agents, recommendations, session). Thin remainders: football-data/Open-Meteo offline samples, `fixtures/ui/*.json`.  
2. **No unified TypeScript/Prisma contract surface** — duplicated partial models across epics.  
3. **No end-to-end sequence with failure paths** — install→recommendation happy path exists as bullets; auth fail / empty shop / crawl fail / agent timeout not diagrammed.  
4. ~~**Job orchestration vague**~~ → **FILLED:** `AUTO_PIPELINE_ON_INSTALL.md` + CONTRACTS PipelineRun/stages/idempotency; demo vs live modes.  
5. **NFR / cost / rate budgets** — scattered (10 req/min football-data, Open-Meteo, Shopify 429) not one class of service doc.  
6. **PCD / retention** — ethics language strong; field-level PCD + retention table missing.  
7. **Demo pitch not frozen to screens + live/MOCK labels** — MVP_ARCHITECTURE has a script; not tied to current UI routes and provenance.  
8. **Decision log** — A5/A6/A15 locked; **A7 default locked 26 Sep** (Austin may override) — see RISKS. Remaining Austin clicks: **A1 store, A3 storefront, A4 PCD** (A2 optional). PoC bar raised: real AgentRun required.

---

## What “next level” fills (this `scope/` pack)

| Doc | Fills |
|-----|-------|
| `PLAN_COMPLETENESS.md` | Honest matrix + blockers (this file) |
| `SEQUENCE_INSTALL_TO_RECOMMENDATION.md` | Mermaid happy + failure paths for six flows |
| `DATA_DICTIONARY.md` | Single field table: type, source, PCD, provenance, retention |
| `CONTRACTS.md` | Remix loaders/actions TS interfaces, webhooks, jobs, idempotency, Prisma sketch |
| `DEMO_SCRIPT.md` | 5–7 min pitch mapped to screens + live/MOCK |
| `RISKS_AND_DECISIONS.md` | Risk register + locked vs remaining Austin decisions |
| `NON_FUNCTIONALS.md` | Latency, limits, cost, obs, security minima |
| `SIGNAL_SOURCES.md` | Weather forecast + social/hashtag + P0/P1/P2 signal catalogue (D30) |
| `README.md` | Layering epics vs scope |
| `AGENT_KICKOFF.md` | Weekend coding-agent entry (24 Sep) |
| `BUILD_ORDER.md` | Phased weekend plan |
| `SDD_PLAYBOOK.md` | Cloud Agent prompt discipline |
| `FIXTURES_MANIFEST.md` | Every fixture path + golden asserts |

**Still not filled by docs alone (remain build/ops):** Partner Dashboard app, football-data token, real/dev store with kit catalogue (A1), tunnel/storefront URL (A3), PCD L2 (A4). Fixture JSON **authored** 24 Sep 2026.

---

## Completeness scorecard (detail)

| Dimension | Pre-scope | Post-scope (docs) |
|-----------|-----------|-------------------|
| Epic stories & ACs | 9/10 | 9/10 |
| Per-epic data sketches | 8/10 | 8/10 |
| Unified data dictionary | 3/10 | 9/10 |
| API/job contracts | 5/10 | 9/10 |
| E2E sequences + failures | 4/10 | 9/10 |
| UI screen specs | 9/10 | 9/10 |
| Fixtures **files** | 2/10 | **9/10** (authored 24 Sep 2026 — see FIXTURES_MANIFEST) |
| Tests plans | 6/10 | 7/10 (contracts give assertable envelopes) |
| NFRs | 3/10 | 8/10 |
| Demo script freeze | 6/10 | 9/10 |
| Risk / decision lock | 5/10 | **9.2/10** (A5/A6/A13/A14/A15/A16 locked 24 Sep; A1/A3/A4/A7 remain) |
| Auto pipeline (store→graph→agents) | 2/10 | **9/10** |
| Signal sources (weather/social) | 3/10 | **9.5/10** (A15 rewrite: watchlist + webHarvest + MOCK) |
| **Weighted overall** | **~6.5/10** | **~9.2/10** |

---


## Auto pipeline coverage (22 Sep 2026 bake-in)

| Concern | Status |
|---------|--------|
| Modes demo vs live | Ready — `AUTO_PIPELINE_ON_INSTALL.md` |
| StoreMakeupSnapshot fields | Ready — DATA_DICTIONARY + CONTRACTS |
| Ordered stages a→f + resume | Ready — SEQUENCE §0 + AUTO_PIPELINE |
| Epic DoDs require wiring | Ready — epics 01, 02, 04, 05, 06, 09 + README |
| Job/queue contracts | Ready — CONTRACTS PipelineRun / stages / idempotency |
| Auto agents vs opt-in | **Locked D26** — capped auto + Settings pause |
| Coding agent ambiguity “should this auto-run?” | **Eliminated** — must auto-run on live |

**Remaining Austin clicks:** **A1 store**, **A3 storefront URL**, **A4 PCD L2**. **A7** has a **default locked metric** (26 Sep; Austin may override). A5 hybrid / A14 ON / A15 webHarvest locked. **PoC** still needs real Playwright AgentRun (build).

---
## Signal sources coverage (22 Sep 2026 — D30)

| Concern | Status |
|---------|--------|
| Weather 7-day forecast per GeoBucket | Ready — `weather.forecastLocal` · WeatherForecast OBSERVED payloads |
| Social / hashtag buzz | Ready — `social.hashtagTrends` + **`social.webHarvest`** · watchlist + public allowlist + MOCK (A15 rewrite); X/Reddit P2 only |
| P1/P2 (races ICS, UK holidays, daylight, AQ, transport, competitor, influencer) | Documented in SIGNAL_SOURCES — soft/MOCK |
| ToS / no individual profiling | Ready — RISKS R17/R19 · A15 |
| Pipeline stage c sub-jobs | Ready — AUTO_PIPELINE + SEQUENCE |

---

## Recommended build-agent entry

1. Read **`AGENT_KICKOFF.md`** + `BUILD_ORDER.md` + `SDD_PLAYBOOK.md`.  
2. Austin closes remaining **A1/A3/A4/A7** (A5/A6/A15 already locked).  
3. Phase 0: Prisma from CONTRACTS + seed authored `fixtures/`.  
4. When greenlit: Cloud Agents per `epics/PROMPTS/01.md`…`09.md` following BUILD_ORDER.  
5. Rehearse `DEMO_SCRIPT.md`; keep MOCK replay path hot.  
6. Verify live OAuth → stage strip → personas → capped agents without asking whether auto-run is intended.

---

## Delta — holes pass 26 Sep 2026

Spec holes that caused build thrash (graph replace, event id collision, POST runs body, deny-list SoT, storefront precedence, path/football leftovers, dual UI, worker pending-forever, expected-scores golden, A7 default) are **locked** in CONTRACTS / epics / FIXTURES_MANIFEST / LIVE_DEMO_GATE. Ledger: [`HOLES_PLUGGED.md`](./HOLES_PLUGGED.md) · exec: [`PLAN_HOLES_DELTA.md`](./PLAN_HOLES_DELTA.md).

**PoC bar:** REAL runtime only — Prisma Admin + real headed Playwright + Insights cite that AgentRun. MOCK/`demo-completed-run.json` ≠ PoC acceptance.
