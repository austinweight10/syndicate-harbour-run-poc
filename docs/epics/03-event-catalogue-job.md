# Epic 03 — Event catalogue job (live + MOCK)

## Goal (1 paragraph)
Keep a shop-agnostic (and shop-joinable) catalogue of sports occasions and ambient Drivers fresh. **Weekend hard P0 (D33):** (1) **7-day local weather** (`weather.forecastLocal` → WeatherForecast + spike Drivers), (2) **race / running calendar PROXY** via `catalogue.mock_sports_seed` (curated London races / parkrun-shaped / run clubs — never OBSERVED demand), (3) **social watchlist** (`social.hashtagTrends` → HashtagWatch + SocialTrend from curated JSON + MOCK when thin). **Soft-degrade / not DoD:** `social.webHarvest`, `catalogue.virtual_events_seed` / VirtualEvent, `catalogue.activity_challenges` / ActivityChallenge, `catalogue.football_fixtures` (optional colour for Harbour Run). Schema + jobs stay named; fail soft + labelled MOCK. See `scope/SIGNAL_SOURCES.md` · `scope/WEEKEND_SIGNAL_P0.md` (D30, D31, **D33**, A15).

## Why it exists
Syndicate’s differentiator is discovering *why this weekend*. Live calendars + labelled mocks give Event nodes to join against Shopify demand without illegal scrapes or paid APIs on day one.

## Dependencies (other epic IDs)
- **01** for app boot / worker process and env config.
- Soft: **02** for “top order cities” list (else use default London, Manchester, Birmingham).

## Out of scope
- Live parkrun CDN scrape (ToS risk) — MOCK only.
- Unofficial Twitter/X HTML scraping, shadow APIs, or per-customer handle resolution as MVP hard-dep (A15: official X/Reddit APIs are **P2 only**, not required).
- Individual social profiling of customers / handle→Persona links.
- Paid Hyrox Result API, Active.com, Met Office DataHub, undocumented CrossFit APIs as **hard-deps**.
- **Unofficial Strava private-athlete scrapes** / individual athlete stalking (curated/MOCK ActivityChallenge + optional merchant Strava OAuth for **aggregate club stats only** are **in** — D31).
- Betting/odds feeds; licensed crest rights.
- Neo4j.
- Confidence scoring against orders (Epic 04).

## User / system stories (Given/When/Then)
1. **Given** `FOOTBALL_DATA_TOKEN` is set, **When** `catalogue.football_fixtures` runs, **Then** upcoming PL matches upsert as Events with provenance OBSERVED and `sourceType=football_data`.
2. **Given** top cities with lat/lng, **When** `catalogue.weather_drivers` runs, **Then** cold/rain/heat Drivers upsert with provenance AGGREGATE PROXY and `sourceType=open_meteo`.
3. **Given** deploy/boot, **When** `catalogue.mock_sports_seed` runs, **Then** MOCK race/Hyrox/parkrun-shaped/virtual/season-drop Events exist and are labelled MOCK in UI-ready fields.
4. **Given** football-data returns 429/5xx, **When** retries exhaust, **Then** circuit opens 1h, last-good catalogue remains, dashboard can show “Calendar source degraded”.
5. **Given** duplicate fixture from fuzzy match, **When** upsert runs, **Then** single Event remains (naturalKey dedupe).
6. **Given** store GeoBuckets (or city defaults), **When** `weather.forecastLocal` runs, **Then** 7-day WeatherForecast rows upsert per geo with provenance **OBSERVED** for Open-Meteo payloads; spike thresholds still emit Drivers (wet weekend / cold snap / heatwave / high wind).
7. **Given** curated `hashtag-watchlist.json`, **When** `social.hashtagTrends` runs, **Then** HashtagWatch (+ optional MOCK SocialTrend) upsert; provenance MOCK or AGGREGATE_PROXY.
7b. **Given** `web-harvest-allowlist.json`, **When** `social.webHarvest` runs, **Then** public pages fetched within allowlist + robots.txt; SocialTrend upserts labelled AGGREGATE_PROXY; soft-degrade to MOCK if blocked; never OBSERVED demand alone.
8. **Given** SocialTrend `#MUFC` surge with Manchester geoHint + kit affinity, **When** graph links later (Epic 04), **Then** TRENDING_IN / AFFINITY edges exist — demand claim stays HYPOTHESIS until order lift.
9. **Given** deploy/boot, **When** `catalogue.virtual_events_seed` runs, **Then** ≥3 VirtualEvents / CatalogueEvents with `mode=virtual` or `hybrid` exist (sofa-to-5K, Zwift-style ride, watch party or class drop) labelled MOCK (or OBSERVED if public calendar).
10. **Given** curated `activity-challenges.json`, **When** `catalogue.activity_challenges` runs, **Then** ≥2 ActivityChallenge rows + optional MOCK Drivers upsert; provenance MOCK or AGGREGATE_PROXY; no private athlete payloads.
11. **Given** Events list / catalogue_refresh filter `mode=virtual`, **When** queried, **Then** only virtual/hybrid rows return; UI can show **Virtual** chip.
12. **Given** no Strava OAuth (A16 unset), **When** activity job runs, **Then** curated + MOCK path succeeds without calling Strava.

## Data model (tables/fields or TypeScript interfaces)
```ts
type EventCategory =
  | "race_running"
  | "team_fixture"
  | "competition_meet"
  | "crossfit_functional"
  | "virtual_challenge"
  | "weather_driver"
  | "season_drop_calendar";

type EventMode = "physical" | "virtual" | "hybrid";

type Provenance = "OBSERVED" | "AGGREGATE_PROXY" | "MODEL_HYPOTHESIS" | "MOCK";

model CatalogueEvent {
  id                 String   @id @default(cuid())
  naturalKey         String   @unique
  title              String
  category           String
  mode               String   @default("physical") // physical|virtual|hybrid — D31
  audienceJson       String   // string[]
  city               String?
  region             String?
  countryCode        String?
  lat                Float?
  lng                Float?
  venueName          String?
  virtualFlag        Boolean  @default(false) // derived: mode !== "physical"
  startAt            DateTime
  endAt              DateTime
  recurrence         String   @default("none") // none|weekly
  sourceUrl          String?
  sourceType         String   // football_data|open_meteo|mock_json
  sourceExternalId   String?
  lastCrawledAt      DateTime
  freshnessConfidence Float   @default(1)
  provenance         String
  stale              Boolean  @default(false)
  rawPayloadHash     String?
}

model Driver {
  id          String   @id @default(cuid())
  naturalKey  String   @unique
  type        String   // weather|fixture|payday|drop|school_holiday|activity_challenge
  label       String
  geoCity     String?
  countryCode String?
  lat         Float?
  lng         Float?
  timeStart   DateTime
  timeEnd     DateTime
  metricsJson String?  // { tMinC, precipMm, windKph, weatherCode }
  provenance  String
  sourceType  String
  externalRef String?
  lastCrawledAt DateTime
  stale       Boolean @default(false)
}

model CatalogueJobRun {
  id         String @id @default(cuid())
  job        String // football_fixtures|weather.forecastLocal|social.hashtagTrends|social.webHarvest|mock_sports_seed|virtual_events_seed|activity_challenges|…
  status     String
  startedAt  DateTime @default(now())
  finishedAt DateTime?
  upserted   Int @default(0)
  errorMessage String?
}

/** 7-day forecast payload per GeoBucket / day — see SIGNAL_SOURCES + DATA_DICTIONARY */
model WeatherForecast {
  id            String   @id @default(cuid())
  naturalKey    String   @unique // hash(geoKey + forecastDateUTC)
  geoBucketKey  String   // city|region or lat,lng round
  geoCity       String?
  countryCode   String?
  lat           Float
  lng           Float
  forecastDate  DateTime // date (UTC midnight or local date key)
  tMinC         Float?
  tMaxC         Float?
  precipMm      Float?
  windKph       Float?
  weatherCode   Int?
  sunriseAt     DateTime?
  sunsetAt      DateTime?
  rawPayloadHash String?
  sourceType    String   @default("open_meteo")
  provenance    String   // OBSERVED for OM payload
  lastCrawledAt DateTime
  stale         Boolean  @default(false)
}

model HashtagWatch {
  id            String   @id @default(cuid())
  tag           String   // e.g. #MUFC
  naturalKey    String   @unique // lower(tag)
  geoHint       String?  // Manchester, London, …
  catalogueAffinityJson String? // ["kit","scarf","home"]
  clubOrEventHint String?
  sourceType    String   // curated_json|x_api|reddit_json|google_trends_proxy|mock_json
  enabled       Boolean  @default(true)
  provenance    String   // MOCK | AGGREGATE_PROXY
  updatedAt     DateTime
}

model SocialTrend {
  id            String   @id @default(cuid())
  naturalKey    String   @unique // hash(tag + timeBucketStart + geoHint)
  hashtagWatchId String?
  tag           String
  timeBucketStart DateTime
  timeBucketEnd   DateTime
  score         Float    // 0..1 normalised buzz
  volumeProxy   Float?   // raw count/interest if available
  geoHint       String?
  geoBucketKey  String?
  sourceType    String
  provenance    String   // MOCK | AGGREGATE_PROXY | MODEL_HYPOTHESIS — never OBSERVED demand
  lastCrawledAt DateTime
  stale         Boolean  @default(false)
  payloadJson   String?
}

/** Online/hybrid occasion — may be stored as CatalogueEvent(mode=virtual|hybrid) instead; if separate, keep fields aligned */
model VirtualEvent {
  id                 String   @id @default(cuid())
  naturalKey         String   @unique
  catalogueEventId   String?  // optional link when dual-written
  title              String
  category           String
  mode               String   // virtual|hybrid
  audienceJson       String
  audienceGeoJson    String?  // GeoBucket keys from store orders
  globalVirtual      Boolean  @default(true)
  streamOrAppHint    String?  // zwift|peloton|twitch|youtube|app_race
  startAt            DateTime
  endAt              DateTime
  sourceType         String
  provenance         String
  lastCrawledAt      DateTime
  stale              Boolean  @default(false)
}

model ActivityChallenge {
  id                    String   @id @default(cuid())
  naturalKey            String   @unique
  title                 String
  platform              String   // strava|garmin|zwift|mock
  mode                  String   @default("virtual")
  windowStart           DateTime
  windowEnd             DateTime
  catalogueAffinityJson String?  // ["run_shoes","kit","recovery"]
  volumeProxy           Float?
  geoBucketKey          String?  // audience or global/virtual
  sourceType            String   // curated_json|strava_api|mock_json
  provenance            String   // MOCK | AGGREGATE_PROXY — never OBSERVED demand alone
  lastCrawledAt         DateTime
  stale                 Boolean  @default(false)
  payloadJson           String?  // no private athlete PII
}
```

**naturalKey (Events):** `hash(sourceType + sourceExternalId)` or `hash(sourceType + normalisedTitle + venueGeoKey + startDateUTC + mode)`.  
**WeatherForecast:** `hash(geoBucketKey + forecastDateUTC)`.  
**SocialTrend:** `hash(normalise(tag) + timeBucketStartISO + geoHint|none)`.  
**ActivityChallenge:** `hash(platform + normalisedTitle + windowStartISO)`.  
**VirtualEvent:** same as CatalogueEvent when dual-written; else `hash(sourceType + title + mode + startDateUTC)`.

## APIs / jobs / webhooks (endpoints, schedules, payloads)
### Live — football-data.org (**soft-degrade / optional colour** — not weekend DoD · D33)
- `GET https://api.football-data.org/v4/competitions/PL/matches?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`
- Header: `X-Auth-Token: $FOOTBALL_DATA_TOKEN`
- Map each match → CatalogueEvent `category=team_fixture`, audience `["fan_spectator"]`, provenance OBSERVED.
- Schedule: on boot + every 6h. Respect ~10 req/min.

### Live — Open-Meteo → job `weather.forecastLocal`
- `GET https://api.open-meteo.com/v1/forecast?latitude=&longitude=&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,windspeed_10m_max,weathercode,sunrise,sunset&forecast_days=7&timezone=Europe/London`
- **Always** upsert **WeatherForecast** rows for each day × GeoBucket (provenance **OBSERVED** for payload).
- Then create **Driver** spikes when: `tMinC ≤ 3` (cold snap), `precipMm ≥ 8` (wet / wet weekend Fri–Sun), `tMaxC ≥ 28` (heatwave), or `windKph ≥ 45` (high wind). Driver provenance typically **AGGREGATE_PROXY** (interpretation).
- Map Drivers → catalogue affinity (shells, layers, waterproofs, race-day hydration).
- Attribute Open-Meteo (CC BY) in Settings.
- Schedule: on boot + every 3h for top ≤3–5 GeoBuckets from store orders (else London / Manchester / Birmingham).
- Alias: legacy name `catalogue.weather_drivers` may call into the same implementation.

### Social buzz → jobs `social.hashtagTrends` (**weekend hard P0**) + `social.webHarvest` (**soft-degrade** · A15 · D33)
- **(a) Weekend hard P0:** load `fixtures/catalogue/hashtag-watchlist.json` → upsert HashtagWatch; synthesise SocialTrend from MOCK when thin.
- **(b) Soft-degrade only (`social.webHarvest`) — not DoD:** load `fixtures/catalogue/web-harvest-allowlist.json`; fetch allowed public pages; **respect robots.txt**; rate-limit; SocialTrend **AGGREGATE_PROXY**. Skip + MOCK if blocked. **Do not** hard-target twitter.com/x.com.
- **(c) Demo:** MOCK SocialTrend from `fixtures/catalogue/social-trends-mock.json` labelled MOCK (e.g. `#LondonMarathon` / run-club tags).
- **P2 only:** official X/Reddit APIs if keys later — never required for DoD.
- Link trends to geoHints + catalogueAffinityJson for Epic 04 edges (`TRENDING_IN`, `AFFINITY`, optional `AMPLIFIES`).
- Provenance: MOCK | AGGREGATE_PROXY | MODEL_HYPOTHESIS — **social alone never OBSERVED for demand**.
- Schedule: on boot + every 6h; also pipeline stage `catalogue_refresh` (no nightly-only job — A13).

### MOCK / PROXY race seed (repo JSON) — **weekend hard P0** (D33)
Path: `fixtures/catalogue/sports-mock.json` — **running PROXY rows are DoD**; football/virtual extras soft. Must include:
1. PL derby weekend (may overlap live; dedupe prefers live OBSERVED) — `mode=physical`.
2. UK 10K race weekend (Greater Manchester) — `race_running`, `mode=physical`.
3. Hyrox-style city meet — `crossfit_functional`, `mode=physical` (optional hybrid companion).
4. parkrun-shaped weekly geo (Saturday 09:00) — `race_running`, recurrence weekly, MOCK, `mode=physical`.
5. Virtual challenge (sofa-to-5K) — `virtual_challenge`, `mode=virtual` (virtualFlag true).
6. Athleisure season drop — `season_drop_calendar`.

Also ship: `fixtures/catalogue/hashtag-watchlist.json`, `web-harvest-allowlist.json`, `social-trends-mock.json` (authored 24 Sep 2026).

### Virtual / online events → job `catalogue.virtual_events_seed` (**soft-degrade** — D31 schema · D33 not DoD)
- Path: `fixtures/catalogue/virtual-events-mock.json` (or folded into sports-mock with `mode`).
- Must include ≥3 rows: sofa-to-5K series; Zwift-style virtual ride; race-day watch party **or** Peloton/class drop week; optionally online Hyrox qualifier window (`mode=virtual` or `hybrid`).
- Geo: bind audience geos from store GeoBuckets when available; always allow **`global/virtual`** GeoBucket.
- Filter: catalogue list APIs accept `mode=physical|virtual|hybrid|all`.

### Activity challenges → job `catalogue.activity_challenges` (**soft-degrade** — D31 schema · D33 not DoD)
- **(a) Soft-degrade:** `fixtures/catalogue/activity-challenges.json` → upsert ActivityChallenge (≥2: monthly distance, public club challenge) when time allows.
- **(b) MOCK Drivers:** emit Driver `type=activity_challenge` labelled MOCK for demo (affinity: run shoes, kits, recovery).
- **(c) Optional Strava API (A16):** if merchant connects OAuth, enrich **aggregate club / public challenge stats only** — document scopes; never private athlete activities; never customer→athlete edges.
- Provenance: MOCK | AGGREGATE_PROXY — **activity buzz never OBSERVED demand alone**.
- Schedule: boot + daily curated; also pipeline stage `catalogue_refresh`.

### Failure / backoff
```
attempt 1 → 30s; 2 → 2m; 3 → 10m; then circuit OPEN 1h
```
Never block Shopify ingest on catalogue failure.

## UI (if any) — screens, components, copy samples British English
- Events list shows provenance badges (Obs for fixtures / weather forecast payloads, Agg for weather spike Drivers & social/activity proxy, Mock for seed/social/activity demo) **and mode chips** (Physical / **Virtual** / Hybrid).
- Sample titles: “Arsenal vs Chelsea”, “Cold snap — Manchester”, “Wet weekend — Manchester”, “Greater Manchester 10K”, “Hyrox-style city meet (mock)”, “Sofa-to-5K virtual series (mock)”, “September 100K challenge (mock)”, “#MUFC buzz (mock)”.
- Degraded banner: “Fixture calendar source degraded — showing last good data.”
- Settings attribution: “Weather forecasts via Open-Meteo (observed payloads; spike drivers labelled aggregate). Social buzz via curated watchlist / public web harvest / MOCK — not individual profiles. Activity challenges via curated calendars / optional club aggregates / MOCK — no private athlete data. Fixtures via football-data.org where connected.”
- Settings **signal sources** line: list football · weather forecast · social watchlist · **web harvest** · **virtual events** · **activity challenges** · MOCK (see Epic 09 / SCOPE_UI).

## Algorithms / heuristics (formulas, thresholds)
- **Freshness:** `freshnessConfidence = sourceReliability * decay(age)`. Reliability: football_data 0.95, open_meteo 0.9, curated_social 0.7, mock_json 0.55. Decay: fixtures TTL 48h → stale; WeatherForecast/Drivers TTL 6h; SocialTrend TTL 12h.
- **Weather spike thresholds:** tMin≤3, precip≥8 (wet weekend = Fri–Sun precip sum or daily≥8), tMax≥28, wind≥45.
- **Social score:** normalise volumeProxy to 0..1 within rolling 14d per tag; geoHint optional.
- **Dedupe fuzzy:** same category + same `mode` + same calendar day + Jaro-Winkler(title)≥0.92 + haversine≤5km (or both non-physical).
- **Mode filter:** `mode` query param on list + catalogue_refresh scoping.
- **Weather as Driver not Event** unless scorer needs wrapper — then `category=weather_driver`; forecast rows stay WeatherForecast OBSERVED; never “Weather Festival” marketing language.
- **Social never upgrades demand to OBSERVED** without order lift (Epic 04).

## Ethics / provenance labels required
- football-data matches: **OBSERVED**.
- Open-Meteo **WeatherForecast** payloads: **OBSERVED**; spike Drivers: **AGGREGATE_PROXY** (+ attribution).
- SocialTrend / HashtagWatch: **MOCK** | **AGGREGATE_PROXY** | **MODEL_HYPOTHESIS** — never OBSERVED demand from social alone.
- Seed sports / virtual / activity challenges: **MOCK** (or AGGREGATE_PROXY for club aggregates) always labelled in UI.
- No athlete-level private data; no results scraping of private feeds; no individual social / Strava profiling; aggregate geo only (+ `global/virtual`).

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Worker script `npm run jobs:catalogue` + call from boot.
- Env: `FOOTBALL_DATA_TOKEN` (optional — if missing, MOCK fixtures only + warning); `WEB_HARVEST_ALLOWLIST_PATH` optional override; optional P2 `X_BEARER_TOKEN` / Reddit client (A15 — not required); optional Strava OAuth client (A16) for activity path (c).
- No Playwright here; read-only HTTP GETs to allowed APIs only.
- SQLite upserts.

## Acceptance criteria (checkbox list, testable)

### Weekend hard P0 (D33 — DoD blockers)
- [ ] **Race / running PROXY:** mock seed loads curated London races / parkrun-shaped / run clubs as CatalogueEvent PROXY/MOCK (incl. `mode` set); **never** claimed OBSERVED demand.
- [ ] parkrun-shaped entry is MOCK/PROXY curated only; no HTTP call to parkrun domains in code.
- [ ] `weather.forecastLocal` upserts ≥1 day × ≥1 geo WeatherForecast with provenance OBSERVED (or soft-degrade last-good / MOCK labelled).
- [ ] Weather spike path creates ≥0 Drivers; when GeoBucket forecast meets threshold, Driver appears with metricsJson (AGGREGATE_PROXY).
- [ ] `social.hashtagTrends` upserts HashtagWatch from watchlist + ≥1 SocialTrend (MOCK OK); no unofficial X scrape required.
- [ ] Pipeline stage `catalogue_refresh` **requires** weather + race PROXY seed + `social.hashtagTrends` for green DoD (`WEEKEND_SIGNAL_P0.md` / D33).

### Soft-degrade / not DoD (schema + jobs kept)
- [ ] Virtual seed / mock *may* include ≥3 `mode=virtual|hybrid` rows — **not** a DoD blocker if absent/soft-fail.
- [ ] `catalogue.activity_challenges` *may* upsert ActivityChallenge (+ MOCK Drivers); no private athlete fields — **not** DoD.
- [ ] With token: ≥1 future PL match upserted OBSERVED *or* skip gracefully — football **optional colour** only.
- [ ] `social.webHarvest` respects robots.txt + allowlist; upserts AGGREGATE_PROXY or soft-degrades; **failure does not fail DoD**; no twitter.com/x.com hard targets.

### Always
- [ ] Re-running jobs does not duplicate naturalKeys (Events, Drivers, WeatherForecast, SocialTrend, HashtagWatch).
- [ ] Circuit breaker sets job status failed without wiping catalogue.
- [ ] Every Event/Driver/WeatherForecast/SocialTrend has provenance + sourceType + lastCrawledAt.
- [ ] List/filter by `mode` works (physical|virtual|hybrid|all).

## Implementation checklist for a coding agent (ordered steps)
1. Add Prisma models; migrate.
2. Author `fixtures/catalogue/sports-mock.json` with required entries + British English titles.
3. Implement `catalogue/mockSeed.ts` idempotent upsert.
4. Implement `catalogue/footballData.ts` with token gate + match mapper.
5. Implement `catalogue/weatherForecastLocal.ts` (`weather.forecastLocal`): 7-day OM fetch → WeatherForecast upsert → spike Drivers.
6. Implement `catalogue/socialHashtagTrends.ts` (`social.hashtagTrends`): watchlist → HashtagWatch; MOCK path.
6b. Implement `catalogue/socialWebHarvest.ts` (`social.webHarvest`): allowlist fetch → SocialTrend AGGREGATE_PROXY; robots gate; rate limit.
7. Implement `catalogue/virtualEventsSeed.ts` (`catalogue.virtual_events_seed`): MOCK/curated VirtualEvents with `mode`; `global/virtual` geo binding.
8. Implement `catalogue/activityChallenges.ts` (`catalogue.activity_challenges`): curated JSON + MOCK Drivers; optional Strava OAuth aggregate-only enrich (A16).
9. Implement `catalogue/dedupe.ts` naturalKey + fuzzy merge (respect `mode`).
10. Implement job runner + CatalogueJobRun logging + backoff/circuit.
11. Wire boot + PipelineRun stage c: **hard P0** = mock race PROXY seed + weather.forecastLocal + social.hashtagTrends; **soft-degrade** = virtual + activity + football + social.webHarvest.
12. Expose `listCatalogueEvents({ mode? })`, `listWeatherForecasts`, `listSocialTrends`, `listActivityChallenges`, `listVirtualEvents` for Epic 04.
13. Add Settings strings for attribution + signal sources incl. virtual/activity (Epic 09).

## Fixtures / seed data required
- `fixtures/catalogue/sports-mock.json` (required; set `mode` on every row).
- `fixtures/catalogue/hashtag-watchlist.json` (**required** — weekend hard P0 social watchlist).
- `fixtures/catalogue/web-harvest-allowlist.json` (optional soft-degrade path b).
- `fixtures/catalogue/virtual-events-mock.json` (soft-degrade; schema kept).
- `fixtures/catalogue/activity-challenges.json` (soft-degrade; schema kept).
- Optional: `fixtures/catalogue/social-trends-mock.json` for demo buzz series.
- Default city coords: London 51.51,-0.13; Manchester 53.48,-2.24; Birmingham 52.48,-1.90.
- Sample football-data response recorded in `fixtures/catalogue/football-data-pl-sample.json` for offline tests.
- Sample Open-Meteo 7-day payload in `fixtures/catalogue/open-meteo-forecast-sample.json` for offline tests.

## Test plan
- Unit: spike thresholds; naturalKey stability; fuzzy dedupe.
- Integration: nock/msw football-data + open-meteo → assert upsert counts.
- Grep CI: fail if code contains `parkrun.com` or `images.parkrun.com` fetch URLs.
- Manual: boot app, query DB for MOCK + live rows, confirm UI badges later in Epic 08.

## Open questions
1. Free football-data tier competition set — PL only for MVP? → **Yes, PL only.**
2. Open-Meteo commercial terms for post-hackathon? → Hackathon non-commercial OK with attribution; production needs paid plan (document in Settings).
3. Social acquisition? → **A15 LOCKED** — watchlist + MOCK = weekend hard P0; webHarvest soft-degrade (D33); official X/Reddit APIs P2 only if keys later — not required.
4. P1 UK holidays / daylight? → Bake into SIGNAL_SOURCES; implement as soft jobs / fields on WeatherForecast when time allows.
5. Strava OAuth? → **A16** — default curated + MOCK; enable aggregate club path if Austin provides app credentials / merchant connect.
6. VirtualEvent separate table vs CatalogueEvent.mode only? → **Either OK**; dual-write or single table with `mode` — keep CONTRACTS aligned.
