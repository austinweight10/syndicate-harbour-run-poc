# Syndicate — Cursor Commerce Hackathon (plan pack)

**Product:** Occasion-commerce intelligence for Shopify Admin (sports + athleisure)  
**Date:** 25 Sep 2026 · Europe/London  
**Locale:** British English  
**Status:** **BUILD GREENLIT**

## Start building

Coding agents start at [`scope/AGENT_KICKOFF.md`](./scope/AGENT_KICKOFF.md) and follow [`scope/BUILD_ORDER.md`](./scope/BUILD_ORDER.md) + [`scope/SDD_PLAYBOOK.md`](./scope/SDD_PLAYBOOK.md) using paste-ready prompts in [`epics/PROMPTS/`](./epics/PROMPTS/).

**Pitch Day (Sat 26 Sep):** hour-by-hour operational plan → [`scope/HACKATHON_PDAY_PLAN.md`](./scope/HACKATHON_PDAY_PLAN.md).

**Hard DoD — live data wire:** Admin UI loaders must read EventCandidates and Insights/Frictions from **Prisma/SQLite** written by the pipeline — not static HTML, not route-imported fixture JSON. Spec: [`scope/LIVE_DATA_WIRE.md`](./scope/LIVE_DATA_WIRE.md).

Cloud Agents **BUILD** the app. Playwright runs merchant shoppers. Cloud Agents do **not** run `PipelineRun`s as runtime.

> This tree is the planning + fixtures pack. **Do not implement the Remix/shopify-app inside this folder** — implement on Origin per kickoff. HTML under `ui/` is visual SoT only.

## Layout

| Path | Role |
|------|------|
| `epics/` | Build units 01–09 + UI screen specs + `PROMPTS/` |
| `scope/` | System design, contracts, kickoff, build order, **LIVE_DATA_WIRE**, fixtures manifest |
| `fixtures/` | Authored demo JSON (**seed inputs** → SQLite; not route imports) |
| `ui/` | HTML visual / IA source of truth (layout only) |
| Root `*.md` | Combined / deep / architecture planning briefs |

On Origin the same content often lives under `docs/` (`docs/epics`, `docs/scope`, `docs/fixtures`, `docs/ui`).

## Locked for weekend (25 Sep 2026)

- **Primary demo vertical:** **RUNNING** — Harbour Run (`harbour-run-demo`); seed pack in `live-demo-store/` (football kits superseded — see `live-demo-store/PIVOT_RUNNING.md`)
- **Live wire:** pipeline → SQLite → Prisma loaders (Overview / Events / Insights) — [`scope/LIVE_DATA_WIRE.md`](./scope/LIVE_DATA_WIRE.md)
- **A5** hybrid (≥20 orders → live; else fixtures **seeded into DB**)  
- **A6** two personas + fashion stub (runner = stretch)  
- **A15** social = watchlist + `social.webHarvest` + MOCK (no unofficial X scrape)  
- **A13** skip nightly · **A14** agents ON capped · **A16** Strava curated/MOCK default  
- **A1** store still TBC — blocker for live Partner demo, not scaffolding / vertical slice
