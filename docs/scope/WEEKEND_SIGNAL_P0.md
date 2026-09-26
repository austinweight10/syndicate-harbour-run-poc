# WEEKEND_SIGNAL_P0 — catalogue hard-path lock (D33)

**Date:** 26 Sep 2026 · Europe/London  
**Decision:** **D33** — Harbour Run weekend DoD catalogue signals  
**Vertical lock:** **Running / Harbour Run primary** — race/running calendar PROXY is the occasion spine; football fixtures = optional colour only, never DoD. Do not expand non-running signal breadth for this weekend.  
**Companion:** [`SIGNAL_SOURCES.md`](./SIGNAL_SOURCES.md) · [`RISKS_AND_DECISIONS.md`](./RISKS_AND_DECISIONS.md) · epic `03` · [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)

---

## Why this cut

Prove **joins** (Shopify orders ↔ occasions/drivers ↔ confidence ↔ personas ↔ agent Insights), **not catalogue fat**. A thin, honest signal set beats a wide soft-fail surface that judges read as “are you scraping?” or “why is half the board MOCK?”

Ethics unchanged: social never OBSERVED demand alone · weather payload OBSERVED / spike Driver usually AGGREGATE_PROXY · no parkrun CDN scrape · no wealth APIs · no private Strava athlete scrape.

---

## Weekend hard P0 (must work or honest MOCK labelled)

| # | Signal | Job | Entity / output | Honesty |
|---|--------|-----|-----------------|---------|
| 1 | **Weather** | `weather.forecastLocal` | WeatherForecast + spike Drivers (Open-Meteo per top GeoBuckets) | Payload **OBSERVED**; spike Driver usually **AGGREGATE_PROXY**; soft last-good / labelled MOCK OK |
| 2 | **Race / running calendar PROXY** | `catalogue.mock_sports_seed` (running rows) | CatalogueEvent `race_running` — London races / parkrun-shaped / run clubs | **PROXY** / **MOCK** only — **never** claimed OBSERVED demand; parkrun-shaped = curated only (D8) |
| 3 | **Social watchlist** | `social.hashtagTrends` | HashtagWatch + SocialTrend from `hashtag-watchlist.json` | **MOCK** or **AGGREGATE_PROXY**; **never** OBSERVED demand alone; MOCK SocialTrend when thin |

Prefer **running calendar over football** for the Harbour Run pitch.

---

## Soft-degrade / not weekend DoD blockers

Keep **schema + named jobs**; fail soft + labelled MOCK. Do **not** block PipelineRun or pitch DoD.

| Signal | Job / note |
|--------|------------|
| Public-web allowlist harvest | `social.webHarvest` |
| Virtual / online events | `catalogue.virtual_events_seed` / VirtualEvent |
| Activity challenges / Strava-shaped | `catalogue.activity_challenges` / ActivityChallenge |
| Football fixtures | `catalogue.football_fixtures` — **optional colour only; never weekend DoD** |
| AQ, transport, school holidays | P1+ stubs |
| Official X / Reddit APIs | A15 P2 only |
| Strava OAuth | A16 optional aggregate club only |

---

## What “done” means on stage

- Events board shows **race PROXY** chips + **weather** (live or labelled MOCK) + **social watchlist** (or MOCK buzz).  
- Do **not** imply webHarvest / VirtualEvent / Strava / football are required for the Harbour Run weekend claim.  
- Full SoT details remain in `SIGNAL_SOURCES.md` §§2–6; this page is the DoD lock only.
