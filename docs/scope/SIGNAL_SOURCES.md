# SIGNAL_SOURCES

> **Primary demo vertical (24 Sep 2026):** **RUNNING** — London races, parkrun, run clubs, Open-Meteo. football-data.org Premier League is **optional / secondary**, not required for the Harbour Run weekend demo.
 — event/driver input catalogue

**Date:** 26 Sep 2026 · Europe/London (P0 lock) · original draft 24 Sep 2026  
**Product:** Syndicate MVP (sports + athleisure)  
**Status:** Planning only — docs; no app code  
**Companion:** [SPORTS_EVENT_GRAPH_PIPELINE.md](../SPORTS_EVENT_GRAPH_PIPELINE.md) · [AUTO_PIPELINE_ON_INSTALL.md](./AUTO_PIPELINE_ON_INSTALL.md) · epics `03`, `04` · [DATA_DICTIONARY.md](./DATA_DICTIONARY.md) · [CONTRACTS.md](./CONTRACTS.md) · [WEEKEND_SIGNAL_P0.md](./WEEKEND_SIGNAL_P0.md)  
**Locked:** **D30** — social/hashtag + weather forecast first-class · **D31** — virtual/activity first-class (schema kept) · **D33** — **weekend hard P0 cut** (weather + race PROXY + social watchlist only; see callout)

> ### Weekend DoD (26 Sep lock) — D33
>
> **Hard P0 (must work or honest MOCK labelled where already allowed):**
> 1. **Weather** — `weather.forecastLocal` → WeatherForecast + spike Drivers (Open-Meteo per top GeoBuckets)
> 2. **Race / running calendar PROXY** — curated London races / parkrun-shaped / run clubs as CatalogueEvent **PROXY** (never claimed OBSERVED demand). Prefer running calendar over football for Harbour Run.
> 3. **Social watchlist** — `social.hashtagTrends` from curated `hashtag-watchlist.json` (+ MOCK SocialTrend when thin)
>
> **Soft-degrade / not weekend DoD blockers** (keep schema + jobs named; fail soft + labelled MOCK): `social.webHarvest` · `catalogue.virtual_events_seed` / VirtualEvent · `catalogue.activity_challenges` / ActivityChallenge · `catalogue.football_fixtures` (optional colour; **never weekend DoD**) · AQ · transport · school holidays · official X/Reddit APIs · Strava OAuth (A16).
>
> **Why:** prove joins (orders ↔ occasions ↔ confidence), not catalogue fat. Full one-pager: [`WEEKEND_SIGNAL_P0.md`](./WEEKEND_SIGNAL_P0.md).

---

## 0) Purpose & ethics

Syndicate joins **Shopify demand** (OBSERVED orders) to **external occasions and ambient drivers**. This doc catalogues every signal source Austin would expect for sports/athleisure — cadence, provenance, geo binding, confidence rules, and honest ToS notes.

**Hard ethics (do not reopen):**
- No wealth / credit / IMD individual scoring  
- No individual social profiling of customers (no linking a shopper’s account/handle to a Persona)  
- **Aggregate geo only** (city / postal sector / GeoBucket from store orders)  
- Every signal and edge carries a provenance label: `OBSERVED` | `AGGREGATE_PROXY` | `MODEL_HYPOTHESIS` | `MOCK`

**Confidence rule of thumb:**
| Signal alone | Demand / lift claim |
|--------------|---------------------|
| Social buzz / hashtag volume | **Never** OBSERVED for demand — stays `AGGREGATE_PROXY` or `MODEL_HYPOTHESIS` until order lift corroborates |
| Weather forecast payload (Open-Meteo JSON) | Payload rows = **OBSERVED**; spike→Driver interpretation = often `AGGREGATE_PROXY`; demand link scored separately (Epic 04) |
| Fixtures (football-data) | Event = OBSERVED; demand link scored separately |
| Virtual / online events (streams, Zwift, class drops) | Catalogue row = MOCK or OBSERVED if public calendar; demand scored separately |
| Activity challenge / Strava club aggregate | **AGGREGATE_PROXY** or **MOCK** — never OBSERVED demand alone |
| MOCK seed | Always MOCK in UI |

---

## 1) Priority tiers (bake into plan)

> **D33 (26 Sep 2026):** Weekend **hard P0** is a focused subset. Schema + named jobs for demoted signals stay; they soft-degrade and are **not** Harbour Run DoD blockers. See [`WEEKEND_SIGNAL_P0.md`](./WEEKEND_SIGNAL_P0.md).

### Weekend hard P0 — DoD blockers (stage `catalogue_refresh`)

| Signal | Job | Entity | Notes |
|--------|-----|--------|-------|
| Local weather **forecast** (7-day) | **`weather.forecastLocal`** | **WeatherForecast** + Driver spikes | Open-Meteo; per GeoBucket from store orders; payload OBSERVED; spike Driver usually AGGREGATE_PROXY |
| **Race / running calendar PROXY** | **`catalogue.mock_sports_seed`** (running rows) | CatalogueEvent `race_running` (**PROXY** / MOCK) | Curated London races / parkrun-shaped / run clubs — **never** claimed OBSERVED demand; no parkrun CDN scrape (R2/D8). Prefer over football for Harbour Run |
| Social / hashtag **watchlist** | **`social.hashtagTrends`** | **HashtagWatch** + **SocialTrend** | Curated `hashtag-watchlist.json` + MOCK SocialTrend when thin; social never OBSERVED demand alone |

### Soft-degrade / not weekend DoD (keep schema + jobs; fail soft + labelled MOCK)

| Signal | Job | Entity | Notes |
|--------|-----|--------|-------|
| Public-web allowlist harvest | **`social.webHarvest`** | SocialTrend (AGGREGATE_PROXY) | Soft-degrade: skip + MOCK if blocked/robots; **not** a DoD blocker |
| Virtual / online occasions | **`catalogue.virtual_events_seed`** | VirtualEvent / CatalogueEvent `mode=virtual|hybrid` | Schema kept (D31); MOCK OK; optional colour |
| Activity challenges (Strava-shaped) | **`catalogue.activity_challenges`** | ActivityChallenge + optional Driver | Schema kept (D31); curated/MOCK; Strava OAuth = A16 optional |
| Fixtures / results | `catalogue.football_fixtures` | CatalogueEvent `team_fixture` | **Optional colour only; never weekend DoD** for Harbour Run; football-data.org PL |
| AQ / transport / school holidays / official X·Reddit / Strava OAuth | various | Drivers / enrich | P1+ or A16 — never block weekend DoD |

### P1 — high value; implement if time / keys; else MOCK labelled

| Signal | Source options | Entity / Driver | Notes |
|--------|----------------|-----------------|-------|
| Race calendars (live ICS / paid APIs) | Hyrox / official race ICS when keyed; parkrun remains **MOCK/PROXY curated only** | CatalogueEvent `race_running` / `crossfit_functional` | Weekend DoD already covered by curated PROXY seed; live ICS is stretch |
| UK school half-terms / bank holidays | Curated UK calendar JSON (gov.uk-derived lists OK if attributed) | Driver `type=school_holiday` \| `bank_holiday` | Amplifies family kit / travel windows |
| Daylight / sunrise–sunset | Open-Meteo daily `sunrise`/`sunset` or NOAA-style calc | Driver `type=daylight` or metrics on WeatherForecast | Evening-training personas (winter dark commute) |
| **Public activity / segment pages** | Strava public Club/Challenge pages **only where ToS allows**; Garmin Connect IQ public race results | ActivityChallenge / CatalogueEvent | Prefer documented feeds; never scrape private athlete timelines |
| **Esports-adjacent fitness / class drops** | Public Twitch/YouTube schedule pages or curated ICS; Peloton/class drop calendars when public | VirtualEvent | MOCK default; OBSERVED only if official public calendar |
| **`social.webHarvest` deepen** | Allowlist harvest when time allows | SocialTrend | Soft-degrade path — not hard DoD |

### P2 — stubs / MOCK for pitch depth; not MVP hard-deps

| Signal | Approach | Provenance |
|--------|----------|------------|
| Air quality | Open-Meteo Air Quality API per GeoBucket | Forecast payload OBSERVED; AQ spike Driver AGGREGATE_PROXY |
| Transport disruption | Stub JSON (TfL-style shape; no live scrape required) | MOCK or AGGREGATE_PROXY if official feed later |
| Competitor promo | MOCK calendar (“Rival launch week”) | MOCK |
| Influencer drop calendars | MOCK JSON watchlist | MOCK |
| Official X / Reddit APIs | Keys later only (A15) | Enrich volume; never required |

---

## 2) Source catalogue (detail)

### 2.1 Fixtures / results (**soft-degrade / optional colour** — not weekend DoD · D33)

| Field | Value |
|-------|-------|
| Source | football-data.org `GET /v4/competitions/PL/matches` |
| Job | `catalogue.football_fixtures` |
| Cadence | Boot + every 6h; also pipeline stage `catalogue_refresh` |
| Geo binding | Venue city / club home metro → GeoBucket overlap |
| Provenance | Event = **OBSERVED**; demand join = scored (Hyp unless order lift) |
| ToS / keys | Free tier ~10 req/min; `FOOTBALL_DATA_TOKEN` (A2). Prefer live over MOCK overlap |
| Confidence | Social/fixture alone ≠ demand OBSERVED |

### 2.2 Weather predictions per local area (P0 — deepened)

| Field | Value |
|-------|-------|
| Source | Open-Meteo Forecast API (no key for non-commercial hackathon) |
| Endpoint | `https://api.open-meteo.com/v1/forecast?latitude=&longitude=&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode,sunrise,sunset&forecast_days=7&timezone=Europe/London` |
| Job | **`weather.forecastLocal`** (extends / supersedes spike-only `catalogue.weather_drivers`) |
| Cadence | Boot + every **3h**; pipeline stage `catalogue_refresh` sub-job |
| Geo binding | Top ≤**3–5** GeoBuckets from `StoreMakeupSnapshot.geoBuckets` (city/region from store orders); else London / Manchester / Birmingham defaults |
| Upsert | Idempotent **WeatherForecast** by `naturalKey = hash(geoBucketId \| lat,lng + forecastDateUTC)` |
| Spike → Driver | After upsert forecast days, emit Drivers when: wet weekend (`precipMm ≥ 8` Fri–Sun), cold snap (`tMinC ≤ 3`), heatwave (`tMaxC ≥ 28`), high wind (`windKph ≥ 45`) |
| Catalogue affinity | shells / waterproofs / layers / race-day hydration / summer tanks — see Epic 04 affinity dictionary |
| Provenance | **WeatherForecast** row / payload = **OBSERVED** (API response observed); spike **Driver** label typically **AGGREGATE_PROXY** (interpretation); demand / TEMPORAL_LIFT edges scored separately |
| Attribution | Settings: “Weather forecast © Open-Meteo contributors (CC BY).” Commercial post-hackathon → paid plan (R4) |
| TTL | Forecast rows stale after **6h** without refresh; Drivers TTL 6h |

**Do not:** invent “Weather Festival” Events; use Driver or `category=weather_driver` wrapper only when scorer needs an EventCandidate.

### 2.3 Social + trending hashtags / public-web buzz (watchlist = weekend hard P0 · webHarvest = soft-degrade · A15 · D33)

| Field | Value |
|-------|-------|
| Jobs | **`social.hashtagTrends`** (**weekend hard P0**) + **`social.webHarvest`** (**soft-degrade / not DoD**) |
| Entities | **HashtagWatch** (curated list), **SocialTrend** (time-bucketed buzz scores) |
| Cadence | Boot + every **6h**; pipeline stage `catalogue_refresh` sub-job (A13: no nightly-only schedule for hackathon) |
| Geo binding | Optional `geoHint` on watch tags (e.g. `#MUFC` → Manchester metro); join to GeoBuckets + kit SKU affinity; web harvest may carry venue/city hints from public pages |
| Provenance | Prefer **AGGREGATE_PROXY** (watchlist volume proxies / public-web harvest aggregates) or **MODEL_HYPOTHESIS** (scored “buzz→demand”); **MOCK** when seeded for demo. **Never** claim OBSERVED demand from social alone |

#### MVP acquisition paths (honest ToS — A15 locked)

| Path | When | How | ToS notes |
|------|------|-----|-----------|
| **(a) Curated hashtag watchlist JSON** | **Weekend hard P0** (DoD) | Repo file `fixtures/catalogue/hashtag-watchlist.json`. Job `social.hashtagTrends` reads watchlist → upserts HashtagWatch → may synthesise SocialTrend from MOCK buzz series when thin | No scrape; merchant/hackathon-owned list |
| **(b) Public web harvest — `social.webHarvest`** | **Soft-degrade only** — **not** weekend DoD | Fetch **allowed public pages** from curated allowlist `fixtures/catalogue/web-harvest-allowlist.json` when time/network allow. **Respect robots.txt**; rate-limit; label SocialTrend **AGGREGATE_PROXY**. Skip + MOCK if blocked. Never OBSERVED demand alone | Public pages only; no login walls; no credential stuffing |
| **(c) MOCK social buzz** | Demo / harvest empty / offline | Seed SocialTrend from `fixtures/catalogue/social-trends-mock.json` (e.g. `#LondonMarathon` week, run-club tags) labelled **MOCK** | Pitch-safe; pairs with watchlist path (a) for DoD |

**P2 only (not required for DoD):** optional **official** X/Twitter or Reddit APIs if keys exist later — enrich volume; never block pipeline; never replace (a)+(c). webHarvest (b) is optional colour, not a hard-dep.

**Hard line — explicit non-goals:** unofficial Twitter/X HTML scrapers, credential stuffing, shadow APIs, per-customer handle resolution. **Do not** list `twitter.com` / `x.com` as hard allowlist targets. CI mindset: no required dependency on unofficial X scrapers.

#### Example geo + catalogue affinity

```text
SocialTrend { tag: "#MUFC", geoHint: "Manchester", score: 0.78, windowBucket: Sat }
  -TRENDING_IN-> GeoBucket(Manchester)
  -AFFINITY-> SKU/Collection (home kit, scarf, kids kit)
  -AMPLIFIES-> CatalogueEvent (Man Utd home fixture)   // optional
Demand claim only if Order lift in same geo/window → else MODEL_HYPOTHESIS
```

### 2.4 P1 sources (document + bake stubs)

| Source | Job (future / soft) | Cadence | Provenance | ToS |
|--------|---------------------|---------|------------|-----|
| parkrun-shaped weeklies | part of `catalogue.mock_sports_seed` | Deploy | **MOCK only** | No live parkrun.com fetch (CI grep ban) |
| Hyrox / race ICS (incl. online qualifiers) | `catalogue.race_calendars` (P1) | Daily if keyed | OBSERVED if official ICS/API; else MOCK; set `mode` | Paid Hyrox Result API out of MVP |
| UK half-terms / bank holidays | `catalogue.uk_calendar` (P1) | Monthly / deploy JSON | AGGREGATE_PROXY or OBSERVED curated | Prefer static gov-derived lists + attribution |
| Daylight / sunrise | folded into `weather.forecastLocal` daily fields | With weather 3h | OBSERVED metrics on WeatherForecast | Open-Meteo |
| Public Strava/Garmin pages | `catalogue.activity_public_pages` (P1) | Daily if enabled | AGGREGATE_PROXY / MOCK | Only where ToS/robots allow; no private athletes |

### 2.5 P2 stubs

| Source | Fixture path (suggested) | Job | Provenance |
|--------|--------------------------|-----|------------|
| Air quality | Open-Meteo AQ when enabled | `weather.airQuality` optional | OBSERVED payload; AQ Driver AGGREGATE_PROXY |
| Transport disruption | `fixtures/catalogue/transport-stub.json` | seed only | MOCK |
| Competitor promo | `fixtures/catalogue/competitor-promo-mock.json` | seed only | MOCK |
| Influencer drops | `fixtures/catalogue/influencer-drops-mock.json` | seed only | MOCK |

---

## 2.6 Event.mode taxonomy (physical | virtual | hybrid)

First-class field on every CatalogueEvent / VirtualEvent / ActivityChallenge projection:

| `mode` | Meaning | Geo binding | UI chip |
|--------|---------|-------------|---------|
| `physical` | In-person venue / race / fixture | Venue city → GeoBucket overlap (existing) | **Physical** |
| `virtual` | Online-only (app race, stream, Zwift ride, Strava monthly challenge, class drop) | **Audience geo** from store order GeoBuckets **plus** optional **`global/virtual` GeoBucket** | **Virtual** |
| `hybrid` | Physical event with online qualifier / watch-party / livestream companion | Venue geo **and** audience/`global/virtual` | **Hybrid** |

**Compatibility:** keep `virtualFlag` as derived (`mode !== "physical"`) for older loaders; **prefer `mode` in new code, filters, and chips.**

**Catalogue job filters (Epic 03):** `catalogue_refresh` and Admin Events list accept `mode=physical|virtual|hybrid|all` (default `all`). Affinity scorer still joins on category + audience tags.

**Audience tags** (unchanged + reinforced): include `online_only` for pure virtual; keep `fan_spectator` for watch parties.

### Virtual / online event catalogue (**soft-degrade for weekend DoD** — D33; schema kept · D31)

> **Weekend note:** `catalogue.virtual_events_seed` / VirtualEvent are **not** Harbour Run DoD blockers. Keep schema + job; fail soft + labelled MOCK.

### Virtual / online event catalogue (examples for MOCK seed)

| Title (British English) | category | mode | Affinity hints |
|-------------------------|----------|------|----------------|
| Sofa-to-5K virtual series | `virtual_challenge` | virtual | trainers, recovery, finishers merch |
| Zwift-style virtual ride weekend | `virtual_challenge` | virtual | cycling kit, hydration, trainers |
| Match-day watch party (stream) | `team_fixture` companion / VirtualEvent | virtual or hybrid | home kit, snacks-adjacent athleisure, layers |
| Online Hyrox qualifier window | `crossfit_functional` | virtual / hybrid | grips, lifting shoes, shorts |
| Peloton / studio class drop week | `season_drop_calendar` | virtual | leggings, bras, layers |
| Monthly distance challenge (Strava-shaped) | ActivityChallenge → may project CatalogueEvent `virtual_challenge` | virtual | run shoes, kits, recovery |

---

## 2.7 Strava & activity networks (honest ToS — D31)

**Hard rule:** do **not** hard-depend on unofficial scraping of **private athlete data**, private activities, or stalking individuals. Activity buzz is never OBSERVED demand without order lift.

### Bake-in paths (**soft-degrade for weekend DoD** — D33; schema kept · D31)

> **Weekend note:** `catalogue.activity_challenges` / ActivityChallenge / Strava-shaped Drivers are **not** DoD blockers. Strava OAuth remains A16 optional.

| Path | When | How | Provenance |
|------|------|-----|------------|
| **(a) Curated public Club/Challenge calendars** | Soft-degrade (nice-to-have) | Repo JSON `fixtures/catalogue/activity-challenges.json` (Strava-shaped monthly distance challenges, public club events) → upsert **ActivityChallenge** (+ optional Driver `type=activity_challenge`) | **MOCK** or **AGGREGATE_PROXY** if sourced from merchant-owned curated public list |
| **(b) MOCK Strava-challenge Drivers** | Demo / no OAuth | Seed Drivers labelled MOCK (e.g. “September 100K challenge — UK runners”) with catalogue affinity run shoes / kits / recovery | **MOCK** |
| **(c) Optional Strava API** | Merchant connects OAuth (A16) | Documented Strava API only; **aggregate club stats** (club totals, public challenge participation counts) — **no** per-athlete stalking, no private activity feeds in Syndicate | Club/challenge aggregates = **AGGREGATE_PROXY**; never OBSERVED demand alone |

#### OAuth scopes (document carefully — A16)

When/if Strava connect ships:

| Scope intent | Allowed use in Syndicate | Forbidden |
|--------------|--------------------------|-----------|
| Club / challenge aggregate read | Upsert ActivityChallenge participation volume proxies; club-level totals for geo-agnostic or club-geo hints | Resolving individual shoppers to Strava athletes |
| Public profile (if required by API) | Club admin / merchant-owned connection only | Building customer→athlete edges |
| Activity:read (private) | **Out of MVP** — do not request unless product explicitly expands and ethics revisit | Default deny |

**Settings copy (British English):** “Activity challenges use curated calendars and optional club aggregates. We do not import private athlete activities or profile individual shoppers on Strava.”

### P1 bake-in

| Source | Job (soft) | Notes | Provenance |
|--------|------------|-------|------------|
| Public segment / event pages where ToS allows | `catalogue.activity_public_pages` | Prefer official/public; gate behind robots/ToS check at build time | AGGREGATE_PROXY or MOCK |
| Garmin Connect IQ / public race results | soft ingest or MOCK | Alternate when Strava connect absent | AGGREGATE_PROXY / MOCK |
| Online qualifier windows (Hyrox etc.) | fold into `catalogue.race_calendars` / virtual seed | `mode=virtual` or `hybrid` | MOCK unless official ICS/API |

### Provenance rule (activity buzz)

| Signal alone | Demand / lift claim |
|--------------|---------------------|
| ActivityChallenge volume / Strava club aggregate / MOCK challenge Driver | **AGGREGATE_PROXY** or **MOCK** — **never** OBSERVED demand |
| Same + order lift in audience GeoBuckets / window | May add **OBSERVED orders** alongside proxy activity buzz |

### Graph hooks (Epic 04)

```text
ActivityChallenge { title, platform: strava|garmin|zwift|mock, mode: virtual, window, affinity[] }
VirtualEvent { title, category, mode: virtual|hybrid, streamOrAppHint }

ActivityChallenge -AFFINITY-> SKU|Collection   // run shoes, kits, recovery
ActivityChallenge -TRENDING_IN-> GeoBucket(audience) | GeoBucket(global/virtual)
ActivityChallenge -AMPLIFIES-> CatalogueEvent / VirtualEvent   // optional
VirtualEvent -VENUE_IN-> GeoBucket(global/virtual)   // or audience geos
VirtualEvent -AFFINITY-> SKU|Collection
```

**Geo for virtual:** score \(G\) using **audience** GeoBuckets from `StoreMakeupSnapshot.geoBuckets` (order cities); also bind to synthetic GeoBucket key **`global/virtual`** so virtual catalogue rows are joinable when locality is weak. Cap pure-virtual geo weight at `national` (existing Epic 04 rule) unless audience overlap is strong.

---

## 3) Pipeline binding (stage `catalogue_refresh`)

Stage **c** of live PipelineRun runs catalogue refresh **scoped** to store geos + affinity. Sub-jobs (parallel OK within stage; all idempotent):

| Sub-job | Weekend hard P0 (D33)? | Soft-degrade |
|---------|------------------------|--------------|
| **`catalogue.mock_sports_seed`** (race / running PROXY rows) | **Yes** — London races / parkrun-shaped / run clubs as CatalogueEvent **PROXY** | Always prefer curated running calendar; never claim OBSERVED demand; no parkrun CDN scrape |
| **`weather.forecastLocal`** | **Yes** | Keep last-good WeatherForecast; optional MOCK weather labelled |
| **`social.hashtagTrends`** | **Yes** | Curated watchlist + MOCK SocialTrend when thin |
| **`social.webHarvest`** | **No** — soft-degrade | Allowlist → SocialTrend AGGREGATE_PROXY; skip + MOCK if robots/blocked; **not DoD** |
| **`catalogue.virtual_events_seed`** | **No** — soft-degrade | MOCK VirtualEvents + `mode` chips; schema kept |
| **`catalogue.activity_challenges`** | **No** — soft-degrade | Curated/MOCK ActivityChallenge; optional Strava OAuth (A16); **not DoD** |
| `catalogue.football_fixtures` | **No** — optional colour; **never weekend DoD** | MOCK + degraded banner; secondary for Harbour Run |
| P1/P2 seeds (AQ, transport, school holidays, …) | No | Skip or MOCK |

UI stage label remains **Refreshing events…** (no redesign). Settings catalogue card lists football / weather forecast / social buzz / **virtual events** / **activity challenges** / MOCK seed. Events list filters by `mode` (Physical / Virtual / Hybrid chips).

---

## 4) Confidence & scoring hooks (Epic 04)

| Factor | How social / weather / virtual / activity enter |
|--------|--------------------------------------------------|
| \(A\) affinity | Weather Driver → shells/layers/hydration; SocialTrend → club/kit/race tags; **ActivityChallenge / VirtualEvent → run shoes, kits, recovery, grips, class-drop athleisure** |
| \(G\) geo | WeatherForecast GeoBucket ∩ order Geo; SocialTrend.geoHint ∩ GeoBucket; **virtual: audience GeoBuckets ∪ `global/virtual`** (cap at national unless strong audience overlap) |
| \(L_t\) lift | **Orders only** for OBSERVED lift; social/weather/**activity buzz** never invent lift |
| Amplification | Driver/SocialTrend/ActivityChallenge `AMPLIFIES` Event → may boost residual / narrative, not fabricate OBSERVED demand |
| ProvenanceLabels | Must list e.g. `OBSERVED orders` · `OBSERVED weather forecast` · `AGGREGATE_PROXY hashtag buzz` · `MOCK social` · `MOCK activity challenge` · `AGGREGATE_PROXY club stats` |

**Rule:** Social alone **or** activity-challenge buzz alone never upgrades demand provenance to OBSERVED.

---

## 5) Env / Austin decisions

| Env / decision | Role |
|----------------|------|
| `FOOTBALL_DATA_TOKEN` | A2 — fixtures |
| Open-Meteo | No key hackathon; attribute CC BY |
| `HASHTAG_WATCHLIST_PATH` | Optional override of default watchlist JSON |
| `WEB_HARVEST_ALLOWLIST_PATH` | Optional override of `fixtures/catalogue/web-harvest-allowlist.json` |
| `X_BEARER_TOKEN` / `REDDIT_CLIENT_*` (optional P2) | Official APIs only if keys later — **not required** (A15) |
| `ACTIVITY_CHALLENGES_PATH` | Optional override of `fixtures/catalogue/activity-challenges.json` |
| Strava OAuth (`STRAVA_CLIENT_ID` / `STRAVA_CLIENT_SECRET`) | **A16** — optional merchant connect; aggregate club/challenge only; absent → curated + MOCK |

---

## 6) Coding-agent mandate

1. **Weekend hard P0 first:** implement **`weather.forecastLocal`**, **race/running calendar PROXY** via **`catalogue.mock_sports_seed`** (curated London races / parkrun-shaped / run clubs — never OBSERVED demand), and **`social.hashtagTrends`** (watchlist + MOCK). These alone satisfy Harbour Run catalogue DoD (D33).  
2. Keep named jobs + schema for **`social.webHarvest`**, **`catalogue.virtual_events_seed`**, **`catalogue.activity_challenges`**, **`catalogue.football_fixtures`** — wire soft-degrade; **do not** block pipeline or DoD on their failure.  
3. Persist **WeatherForecast**, **SocialTrend**, **HashtagWatch**, and (schema-kept) **VirtualEvent** / **ActivityChallenge** (DATA_DICTIONARY).  
4. Wire weekend hard-P0 sub-jobs into PipelineRun stage `catalogue_refresh`; soft-degrade jobs may run opportunistically. Support `Event.mode` filters + UI chips.  
5. Never hard-dep ToS-breaking X scrapes or **private Strava athlete scrapes**; never profile individual customers; respect robots.txt on web harvest; no parkrun CDN scrape; no wealth APIs.  
6. Label everything; social / activity buzz = AGGREGATE_PROXY or MOCK; prefer last-good + MOCK over failing the whole pipeline.
