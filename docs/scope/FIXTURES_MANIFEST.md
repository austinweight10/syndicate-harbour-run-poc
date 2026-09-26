# FIXTURES_MANIFEST — every fixture on disk

**Date:** 26 Sep 2026 · Europe/London  
**Companion:** [AGENT_KICKOFF.md](./AGENT_KICKOFF.md) · [CONTRACTS.md](./CONTRACTS.md) §8  
**Rule:** Fixtures are **authored** — agents seed from these files; do not invent alternate demo copy that fights `ui/*.html`.

Each JSON includes `_meta` with `provenance`, `version`, `locale`, `britishEnglishNotes`, owning epic.

---

## Catalogue (`fixtures/catalogue/`)

| Path | Purpose | Provenance | Epic | Golden asserts |
|------|---------|------------|------|----------------|
| `hashtag-watchlist.json` | P0 HashtagWatch seed — path (a) always | CURATED | 03 | ≥8 tags; geoHint/affinity present; used by `social.hashtagTrends` |
| `web-harvest-allowlist.json` | Seed URLs/domains for **`social.webHarvest`** | CURATED | 03 | No `twitter.com`/`x.com` seeds; `robotsPolicy=respect_robots_txt`; discovery same-domain |
| `social-trends-mock.json` | Demo SocialTrend buzz series — path (c) | MOCK | 03 | Scores 0..1; never claimed OBSERVED demand |
| `sports-mock.json` | PL-shaped + race/Hyrox/parkrun-shaped + virtual + season drop | MOCK | 03 | ≥6 events; every row has `mode`; parkrun-shaped notes forbid live fetch |
| `virtual-events-mock.json` | Virtual/hybrid occasions | MOCK | 03 | ≥3 `mode=virtual\|hybrid` |
| `activity-challenges.json` | Strava-shaped ActivityChallenge | MOCK | 03 | ≥2 challenges; no private athlete fields |

---

## Orders / products

| Path | Purpose | Provenance | Epic | Golden asserts |
|------|---------|------------|------|----------------|
| `orders/orders-demo.json` | Demo orders for personas + A5 ≥20 threshold | MOCK | 02 | ≥40 orders; kids scarf + shirt lines; GBP; city/sector only |
| `products/products-demo.json` | Harbour Run running SKUs + collections | MOCK | 02 | Race tee, shorts, shell, socks, youth tee; Race Kits collection |

---

## Personas / graph

| Path | Purpose | Provenance | Epic | Golden asserts |
|------|---------|------------|------|----------------|
| `personas/demo.json` | **A6:** Race-day taper + Wet-weather trainer + fashion stub; runner stretch flagged `includeInDoD:false` | MIXED | 05 | Exactly 2 DoD personas + 1 stub; no income/wealth words |
| `graph/expected-scores-running.json` | **WEEKEND GOLDEN** Harbour Run confidence bands | GOLDEN | 04 | Race-day taper ≥0.72; wet-weather; virtual; social never OBSERVED demand |
| `graph/expected-scores.json` | **SUPERSEDED** football-era goldens | SUPERSEDED | 04 | Optional secondary only — do not assert as primary demo |

---

## Agents / recommendations / session

| Path | Purpose | Provenance | Epic | Golden asserts |
|------|---------|------------|------|----------------|
| `agents/path-harbour-run-dawn.json` | **WEEKEND SoT** Dawn path — Harbour Run PoC | CURATED | 06 | Ends checkout_started / stopped_before_payment; deny-list ⊆ CONTRACTS |
| `agents/path-football-merch.json` | **SUPERSEDED** football merch path | SUPERSEDED | 06 | Optional secondary only |
| `agents/path-harbour-athletic-dawn.json` | **SUPERSEDED** Harbour Athletic Dawn path | SUPERSEDED | 06 | Optional secondary only |
| `agents/demo-completed-run.json` | Emergency/dev MOCK completed run | MOCK | 06 | **Never PoC acceptance**; MOCK badge mandatory if shown |
| `recommendations/demo.json` | Seed Insights\|Frictions (agentRunIdRequired) | MOCK seed | 07 | Seed→Prisma only; PoC agent cards need real AgentRun id or MOCK badge |
| `session/demo-shop.json` | `DEMO_FIXTURE_SHOP=1` shop/session | MOCK | 01 | Domain `harbour-run-demo.myshopify.com`; scopes read-only |

---

## Not authored (optional later)

| Path | Notes |
|------|-------|
| `fixtures/catalogue/football-data-pl-sample.json` | Offline nock sample — thin; record when token available |
| `fixtures/catalogue/open-meteo-forecast-sample.json` | Offline OM sample — thin; record on first live fetch |
| `fixtures/ui/*.json` | Loader stubs — may be generated from above at epic 08 |

---

## Seed order (suggested)

1. `session/demo-shop.json`  
2. `products/products-demo.json` + `orders/orders-demo.json`  
3. All `catalogue/*`  
4. `graph/expected-scores-running.json` (assert only; football `expected-scores.json` SUPERSEDED)  
5. `personas/demo.json`  
6. `agents/*` + `recommendations/demo.json`

---

## PoC vs fixture (26 Sep)

Fixtures are **seed inputs** into SQLite. They are **not** the Admin runtime. PoC DoD = Prisma loaders + real Playwright AgentRun (see LIVE_DEMO_GATE). Labelled MOCK = emergency/dev only.
