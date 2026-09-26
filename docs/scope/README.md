# Syndicate — `scope/` system design (next level)

**Product:** Syndicate (sports + athleisure occasion-commerce intelligence for Shopify Admin)  
**Date:** 25 Sep 2026 · Europe/London (BST)  
**Locale:** British English UI · cream/kit-stripe visual direction  
**Status:** Planning only — **no application code** in this folder

---

**26 Sep holes pass:** [`HOLES_PLUGGED.md`](./HOLES_PLUGGED.md) · [`PLAN_HOLES_DELTA.md`](./PLAN_HOLES_DELTA.md) — PoC = REAL runtime only (see LIVE_DEMO_GATE).

## How this sits above `epics/`

| Layer | Path | Role |
|-------|------|------|
| **Epics** | `../epics/` | **Build units** — PR-sized slices a coding agent implements in dependency order (01→09 + UI screen specs). Stories, ACs, checklists, fixtures per slice. |
| **Scope** | `./` (this folder) | **System design next level** — cross-cutting completeness audit, end-to-end sequences, unified data dictionary, implementable contracts, demo script, risks/decisions, non-functionals. |

**Rule of thumb:** An epic answers *“what do I build in this PR?”*  
Scope answers *“how does the whole system hang together, and what still blocks a build agent?”*

Visual / IA source of truth remains `../ui/*.html` + `../ui/SCOPE_UI.md`. Planning sources: `../COMBINED_PLAN.md`, `../MVP_ARCHITECTURE.md`, `../DEEP_PLAN.md`, `../PLANNING_BRIEF_SHOPIFY_EVENTS.md`, `../SPORTS_EVENT_GRAPH_PIPELINE.md`.

---

## Locked MVP (do not reopen in build without Austin)

- Vertical: **sports + athleisure** — primary **Harbour Run / running**; football merch = legacy fixture label only
- OAuth scopes: `read_orders,read_products,read_customers` only
- Ingest window: **≤60 days** (cap ~500 orders for day-1)
- Live APIs: **football-data.org (PL)** + **Open-Meteo 7-day forecasts**; **social buzz** = curated hashtag watchlist + **`social.webHarvest`** public allowlist + MOCK (**D30 / A15**); official X/Reddit APIs P2 only; **virtual/online events** + **activity challenges** curated/MOCK (+ optional Strava OAuth aggregate club only) (**D31 / A16**); races / Hyrox / parkrun-shaped = **MOCK**
- **Personas (A6):** two full + fashion stub; Taper-week runner optional stretch
- **Data (A5):** hybrid — live when ≥20 orders; else fixtures
- Architecture: **graph + agents hybrid** (SQLite edges, not Neo4j)
- Agents: Playwright **stop before payment** (checkout start OK); **AI:** templates-first optional thin LLM only (`AI_CALL_CONTRACT.md`)
- Provenance labels: `OBSERVED` | `AGGREGATE PROXY` | `MODEL HYPOTHESIS` | `MOCK` (UI: Obs / Agg / Hyp / Mock)
- UI: British English · canvas `#f3f0eb` / surfaces `#ffffff` / charcoal `#292524` / kit stripe · green `#008060` **CTAs only** · polish per `UI_INTERACTION_CONTRACT.md`
- Fashion persona: greyed stub only
- **Auto pipeline on live connect (non-optional):** store makeup → graph seed → catalogue → score → personas → capped agents — see `AUTO_PIPELINE_ON_INSTALL.md`

---

## File index

| Doc | Purpose |
|-----|---------|
| [AGENT_KICKOFF.md](./AGENT_KICKOFF.md) | **Weekend entry** for coding agents — reading order, locked decisions, DoD, escalation |
| [WEEKEND_BUILD_SPEC.md](./WEEKEND_BUILD_SPEC.md) | Tight Sat–Sun builder brief (In/Out, stages, merge gates) — **BUILD GREENLIT** |
| [LIVE_DATA_WIRE.md](./LIVE_DATA_WIRE.md) | **Hard DoD** — single write (pipeline→SQLite) · single read (loaders→Prisma) · anti-patterns |
| [AI_CALL_CONTRACT.md](./AI_CALL_CONTRACT.md) | **What AI the app calls** — call sites, providers, caps, templates-first, forbidden LangGraph/LLM-browser |
| [UI_INTERACTION_CONTRACT.md](./UI_INTERACTION_CONTRACT.md) | **UI polish bible** — component states, toasts/banners, empty/error by route, a11y, motion (epics 08/09) |
| [BUILD_ORDER.md](./BUILD_ORDER.md) | Phased weekend plan (P0 fixtures → P5 polish) with merge gates |
| [SDD_PLAYBOOK.md](./SDD_PLAYBOOK.md) | Spec-driven Cloud Agent prompts, branches, AC discipline |
| [FIXTURES_MANIFEST.md](./FIXTURES_MANIFEST.md) | Every fixture path, provenance, epic owner, golden asserts |
| [PLAN_COMPLETENESS.md](./PLAN_COMPLETENESS.md) | Honest audit: Ready / Thin / Missing per epic × concern; gaps that block build; what “next level” fills |
| [FLOWS.md](./FLOWS.md) | **Canonical whole-process Mermaid SoT** — live install, offline demo, real Run agents, write ownership, and dual-UI ban |
| [SEQUENCE_INSTALL_TO_RECOMMENDATION.md](./SEQUENCE_INSTALL_TO_RECOMMENDATION.md) | Detailed Mermaid sequences: OAuth, ingest, catalogue tick, score+persona, Run agents, recommendation click + failure paths |
| [AUTO_PIPELINE_ON_INSTALL.md](./AUTO_PIPELINE_ON_INSTALL.md) | **Mandatory** live auto pipeline: store makeup → graph → personas → capped agents; demo vs live; triggers; UI strip |
| [SIGNAL_SOURCES.md](./SIGNAL_SOURCES.md) | **D30/D31** catalogue of event/driver signals: weather, social, **virtual/online**, **Strava/activity**, P0/P1/P2, provenance, ToS, geo binding |
| [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) | Every entity/field: type, source, PCD?, provenance, retention |
| [CONTRACTS.md](./CONTRACTS.md) | REST/Remix shapes, webhooks, job schedules, idempotency, Prisma-ish SQLite sketch |
| [DEMO_SCRIPT.md](./DEMO_SCRIPT.md) | 5–7 min hackathon pitch (sports/athleisure) tied to UI screens; live vs MOCK |
| [RISKS_AND_DECISIONS.md](./RISKS_AND_DECISIONS.md) | Risk register + locked decision log + decisions Austin must make before build |
| [CURSOR_TOOLING.md](./CURSOR_TOOLING.md) | Cursor-first build (Cloud Agents on Origin) vs custom runtime; Playwright stays shopper |
| [NON_FUNCTIONALS.md](./NON_FUNCTIONALS.md) | Latency, rate limits, cost ceilings, observability, security minima |
| [README.md](./README.md) | This index |

---

## Suggested reader order (for Austin or a build lead)

1. **`AGENT_KICKOFF.md`** — start here for weekend agents (GREENLIT)  
1a. `LIVE_DATA_WIRE.md` — UI↔DB hard DoD  
1b. `WEEKEND_BUILD_SPEC.md` + `AI_CALL_CONTRACT.md` — weekend brief + what AI is called  
2. `BUILD_ORDER.md` + `SDD_PLAYBOOK.md` + `FIXTURES_MANIFEST.md`  
3. `PLAN_COMPLETENESS.md` — know the score and gaps  
4. `RISKS_AND_DECISIONS.md` — locked A5/A6/A15; remaining A1/A3/A4/A7  
5. `CURSOR_TOOLING.md` — Cloud Agents on Origin for build; Playwright for runtime shoppers  
6. `CONTRACTS.md` + `DATA_DICTIONARY.md` + `SIGNAL_SOURCES.md`  
7. [`FLOWS.md`](./FLOWS.md) — canonical whole-process diagrams  
7a. `AUTO_PIPELINE_ON_INSTALL.md` + `SEQUENCE_INSTALL_TO_RECOMMENDATION.md`  
8. `NON_FUNCTIONALS.md` · `DEMO_SCRIPT.md`  
9. Then execute `../epics/` via `../epics/PROMPTS/` when greenlit

---

## Out of this folder

- Application / Remix / Prisma source code  
- `npm install` / scaffolding  
- Messaging Austin or Slack/email  
- (Epics were updated in this pass so DoDs require the auto pipeline — scope + epics now agree)
