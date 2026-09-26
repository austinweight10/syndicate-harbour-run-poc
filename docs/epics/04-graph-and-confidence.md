# Epic 04 — Graph and confidence model

## Goal (1 paragraph)
Join ingested Shopify orders **and the StoreMakeupSnapshot** with the sports event catalogue — including **WeatherForecast / weather Drivers** and **SocialTrend / HashtagWatch** (D30) — into an entity–evidence graph (SQLite nodes + edges), **auto-seed OBSERVED edges on live PipelineRun stage `graph_seed`** (no empty graph after live connect), score EventCandidates with the planning-brief confidence formula (temporal lift, geo overlap, catalogue affinity **incl. forecast-driven + social-lift factors**, prior-year neutral, residual), and persist explainable confidence breakdowns so the Admin UI can show “Race-day home kit rush · 0.82 · Observed” with competing-event context.

## Why it exists
The graph + confidence layer turns raw orders and calendars into the product insight: *which occasion drove lift, how sure are we, and what evidence path supports that claim.*

## Dependencies (other epic IDs)
- **02** Shopify ingest (Order, SKU, Geo).
- **03** Event catalogue (CatalogueEvent, Driver, WeatherForecast, SocialTrend, HashtagWatch).

## Out of scope
- Neo4j / Memgraph.
- Full ML clustering (HDBSCAN etc.).
- Individual wealth / IMD strata (optional MOCK strata card cut).
- Persona derivation (Epic 05) and Playwright (Epic 06).
- Pixel session graphs.
- Treating Python `syndicate-graph-lab` SQLite as the Admin app database (lab = builder aid only).

## User / system stories (Given/When/Then)
1. **Given** Saturday order spike in London + Hyde Park / race calendar PROXY (Harbour Run), **When** scorer runs, **Then** an EventCandidate “Race-day taper rush” (or LLM-named equivalent) appears with confidence ≥0.70 and provenance including OBSERVED orders + calendar label. (Optional secondary: PL fixture → “match-day” candidate if football catalogue present.)
2. **Given** n_W < 5 orders in window, **When** scored, **Then** displayed confidence capped at 40% and labelled `MODEL HYPOTHESIS (low n)`.
3. **Given** two overlapping events same day, **When** scored, **Then** softmax-normalised shares + baselinePct sum ≈ 100%.
4. **Given** weather Driver cold snap without fixture, **When** jacket SKU lift detected, **Then** evidence edges exist Driver→cohort; UI may show Driver card without inventing a fake festival Event.
5. **Given** merchant opens Event detail, **When** loader reads ConfidenceScore, **Then** components Lt, G, A, Y, R are available for Signals tab.
6. **Given** live PipelineRun reaches stage `graph_seed` after successful ingest, **When** seed completes, **Then** GraphEdge rows exist from store-backed orders/catalogue makeup — graph is **not** empty solely because fixtures were never loaded.
7. **Given** WeatherForecast wet weekend for Manchester GeoBucket + shell SKU affinity, **When** scorer runs, **Then** \(A\) / narrative may include forecast-driven affinity; provenanceLabels include `OBSERVED weather forecast`; demand lift still requires orders (\(L_t\)).
8. **Given** SocialTrend `#MUFC` surge near Manchester + kit SKUs without order lift, **When** scored, **Then** TRENDING_IN / AFFINITY edges exist with AGGREGATE_PROXY or MODEL_HYPOTHESIS — **not** OBSERVED demand; if order lift corroborates, labels may add OBSERVED orders alongside proxy social.
9. **Given** ActivityChallenge “September 100K” (MOCK) + run-shoe SKU affinity + audience GeoBuckets, **When** scored without order lift, **Then** AFFINITY / TRENDING_IN edges exist with MOCK or AGGREGATE_PROXY — **not** OBSERVED demand.
10. **Given** VirtualEvent `mode=virtual` with only `global/virtual` geo, **When** geo band computed, **Then** G capped at national unless audience GeoBucket overlap is present.

## Data model (tables/fields or TypeScript interfaces)
```ts
model GraphEdge {
  id         String @id @default(cuid())
  shopId     String
  fromType   String // Order|SKU|Geo|Event|Driver|Persona|Collection|WeatherForecast|SocialTrend|HashtagWatch|VirtualEvent|ActivityChallenge
  fromId     String
  toType     String
  toId       String
  relation   String // CONTAINS|SHIPPED_TO|VENUE_IN|DRIVEN_BY|AMPLIFIES|TEMPORAL_LIFT|AFFINITY|GEO_OVERLAP|FORECAST_FOR|TRENDING_IN|SOCIAL_LIFT|CHALLENGE_OF|...
  weight     Float  @default(1)
  provenance String
  payloadJson String?
  createdAt  DateTime @default(now())
  @@index([shopId, relation])
  @@index([fromType, fromId])
  @@index([toType, toId])
}

model EventCandidate {
  id               String @id @default(cuid())
  shopId           String
  catalogueEventId String? // link to CatalogueEvent when joined
  name             String
  archetype        String // match_day|race_weekend|functional_meet|virtual|weather|seasonal_drop|other
  timeStart        DateTime
  timeEnd          DateTime
  venueCity        String?
  venueCountry     String?
  driverIdsJson    String?
  enrichmentSource String // orders_only|orders_plus_calendar|orders_plus_mock
  nOrders          Int
  windowLabel      String? // "Sat 10–18"
  createdAt        DateTime @default(now())
}

model ConfidenceScore {
  id              String @id @default(cuid())
  eventCandidateId String @unique
  valuePct        Float  // 0..100 (UI may show 0–1; store pct or ratio consistently — use 0..1 float `value` + display)
  value           Float  // 0..1 canonical for UI bars
  Lt              Float
  G               Float
  A               Float
  Y               Float
  R               Float
  baselinePct     Float
  competingJson   String // [{ eventId, valuePct }]
  provenanceLabelsJson String // ["OBSERVED orders","MOCK fixtures"]
  nOrders         Int
  windowStart     DateTime
  windowEnd       DateTime
}
```

**Affinity dictionary (sports + athleisure):** keywords/tags/types matching kit, jersey, scarf, matchday, trainers, running, waterproof, shell, recovery, hyrox, grips, leggings, sports-bra, layer, parkrun, race, hydration, base-layer, windproof, zwift, peloton, challenge, virtual, cycling.

**Forecast-driven affinity map (examples):** cold snap → layers/base/jackets; wet weekend → shells/waterproofs; heatwave → tanks/hydration/lightweight; high wind → windproof/layers.

**Social affinity:** HashtagWatch.catalogueAffinityJson ∪ club hints (e.g. `#MUFC` → home kit, scarf, kids kit) joined to store productTypes/tags.

**Activity / virtual affinity:** ActivityChallenge.catalogueAffinityJson (run shoes, kits, recovery) + VirtualEvent category maps (class-drop → leggings/bras/layers; Zwift-style → cycling kit/hydration; watch party → home kit).

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- **Job:** `graph.buildAndScore(shopId)` as PipelineRun stages `graph_seed` + `score_link` (after ingest + catalogue).
- **Tool for agents (later):** `graph.querySportsLift({ eventId, band, windowDays })` returning top SKUs/collections.
- **No external HTTP** in this epic beyond reading DB.
- Trigger: PipelineRun auto path (mandatory on live); Settings “Refresh store + re-run” / recompute.
- **Invariant:** after live connect, do **not** leave an empty graph waiting for a manual button.

## UI (if any) — screens, components, copy samples British English
- **UI consumers (Epic 08):** Events list + Event detail + Overview hero **must** read `EventCandidate` / `ConfidenceScore` / `GraphEdge` via Prisma. This epic’s write path is the sole production source of those rows — not Python graph-lab, not route-imported JSON. See [`../scope/LIVE_DATA_WIRE.md`](../scope/LIVE_DATA_WIRE.md).
- Events list confidence bars (`data-confidence`).
- Sample blurb (Harbour Run): “We think **Race-day taper kit rush** drove about **82%** of Saturday’s lift in London (observed orders + race calendar). Labels: OBSERVED orders · PROXY calendar.”
- Low-n: “Early signal — fewer than five orders in this window.”
- Prototype refs (layout SoT only): `ui/events.html`, `ui/event-detail.html` Signals tab.

## Algorithms / heuristics (formulas, thresholds)
### Distance bands (ship-to vs venue)
| Band | Distance | Weight |
|------|----------|--------|
| venue_local | ≤25 km | 1.0 |
| metro | ≤80 km | 0.7 |
| region | same country subdivision | 0.4 |
| national | same country | 0.2 |
| none | else | 0.0 |

Virtual / hybrid events: geo weight uses **audience GeoBuckets** from store orders ∪ synthetic **`global/virtual`**; pure-virtual without audience overlap capped at `national` (same as prior rule).

### Confidence
\[
C(E) = \mathrm{clip}_{0,1}(0.30 L_t + 0.25 G + 0.25 A + 0.10 Y + 0.10 R)
\]

| Component | MVP computation |
|-----------|-----------------|
| \(L_t\) | Baseline = median same weekday × prior 4–6 weeks within 60d. Lift = (n_W−b)/max(b,1); map 0→0, ≥1→1. **Orders only** — social/weather never invent lift |
| \(G\) | Weighted mean of proximity band weights for orders in W; WeatherForecast / SocialTrend.geoHint / **ActivityChallenge.geoBucketKey** / **VirtualEvent audience geos** may **boost band selection** when overlapping GeoBucket (not a substitute for ship-to); `global/virtual` alone → national cap |
| \(A\) | Fraction of line items matching affinity dictionary for event category **+ forecast-driven affinity** when Driver active in window **+ social-tag affinity** when SocialTrend score ≥ 0.5 overlaps window/geo **+ activity-challenge affinity** when ActivityChallenge overlaps window (cap social+activity contribution to \(A\) at +0.20 combined so buzz cannot dominate) |
| \(Y\) | 0.5 neutral if no prior-year data; flag in provenanceLabels |
| \(R\) | If competing same-day events, split residual by affinity; else 1 − normalised noise. Optional: SocialTrend / ActivityChallenge `AMPLIFIES` may nudge residual narrative weight — still not OBSERVED demand |

**Social lift factor (documented, folded into \(A\) / \(R\) — not a 6th raw weight for MVP):**  
`S_proxy = clip(SocialTrend.score × geoOverlap × catalogueAffinityMatch)` → contributes only via affinity/amplification; provenanceLabels must include `AGGREGATE_PROXY hashtag buzz` or `MOCK social` / `MODEL_HYPOTHESIS social→demand`.

**Activity buzz factor (same pattern — D31):**  
`Act_proxy = clip(ActivityChallenge.volumeProxy_or_1 × geoOverlap × catalogueAffinityMatch)` → AGGREGATE_PROXY or MOCK only; never OBSERVED demand without order lift; labels e.g. `MOCK activity challenge` · `AGGREGATE_PROXY club stats`.

**Forecast-driven affinity:** when WeatherForecast/Driver overlaps W + geo, multiply matching SKU fraction for mapped categories (shells/layers/hydration) into \(A\); label `OBSERVED weather forecast` for payload + `AGGREGATE_PROXY weather driver` for spike interpretation.

- Softmax-normalise multi-event day so events + baseline ≈ 100%.
- If raw C < 0.25, treat as baseline-dominant; still may show as Hypothesis card (e.g. Unknown Fri spike @ 0.48).
- Cap display at 0.40 if n_W < 5 + label low-n hypothesis.
- **Social alone or activity-challenge buzz alone never yields OBSERVED demand** — without order lift, candidate enrichment stays Hypothesis/Proxy.

### Candidate generation (heuristics)
1. For each CatalogueEvent overlapping shop geos in next/past 14 days, gather orders in [start−2d, end+1d] (race: −7d/+2d).
2. Also detect order spikes (DOW × city) without catalogue → EventCandidate enrichmentSource `orders_only`, provenance MODEL HYPOTHESIS.
3. Attach Drivers via AMPLIFIES when weather / activity_challenge overlaps event window + geo.
4. Attach WeatherForecast `FORECAST_FOR` → Geo; SocialTrend `TRENDING_IN` → Geo / `AFFINITY` → SKU|Collection; optional SocialTrend `AMPLIFIES` → Event when tag matches fixture/race.
5. Attach VirtualEvent `VENUE_IN` → GeoBucket(`global/virtual`) and/or audience geos; ActivityChallenge `AFFINITY` → SKU|Collection, `TRENDING_IN` → Geo, optional `CHALLENGE_OF` / `AMPLIFIES` → VirtualEvent|Event.

### Naming
- Rule names first: “Race-day home kit rush”, “Away-day travel kit”, “Race weekend — {city} 10K”, “Sofa-to-5K virtual series”, “Monthly distance challenge — run kit”.
- Optional LLM rename on **aggregate cards only** (no PII) → label MODEL HYPOTHESIS for name if LLM used.

## Ethics / provenance labels required
- Persist `provenanceLabels` on every ConfidenceScore.
- Edges carry provenance: OBSERVED for order links + WeatherForecast payloads; MOCK/AGGREGATE_PROXY for calendar/social/activity/spike Drivers; MODEL_HYPOTHESIS for scored lifts and social/activity→demand without lift.
- No street-level geo in payloads; no individual social handles or athlete IDs.

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- SQLite GraphEdge table (not Neo4j).
- Pure TypeScript scorer in `app/services/graph/`.
- Haversine helper; no paid geo API required if lat/lng present from catalogue + order address.


## Graph idempotent replace + ID naming (LOCKED 26 Sep 2026)

**Replace strategy (D25):** On each `graph.buildAndScore` / PipelineRun `score_link` for a shop: **delete-all-then-rewrite** that shop’s `EventCandidate` + `ConfidenceScore` + occasion-graph edges, then insert fresh rows under a new `scoreBatchId`. **Do not** upsert-merge stale candidate ids. CatalogueEvent/Driver/etc. remain naturalKey upserts (Epic 03) — orthogonal.

**UI route ids:** `/app/events/:id` = **EventCandidate.id** only (cuid). Never put CatalogueEvent.id in Events routes. See `scope/CONTRACTS.md` §2b.

**Weekend golden scores:** `fixtures/graph/expected-scores-running.json` (Harbour Run). Football-era `expected-scores.json` = **SUPERSEDED** for primary demo.

**Agents ≠ graph writers:** AgentRun must not mutate GraphEdge / EventCandidate confidence (RUN_AGENTS_UI_CONTRACT).

## Acceptance criteria (checkbox list, testable)
- [ ] `graph.buildAndScore` creates ≥2 EventCandidates on demo fixtures.
- [ ] Each candidate has ConfidenceScore with Lt,G,A,Y,R populated.
- [ ] Demo fixture yields one high-confidence race-day style event ≈0.75–0.90 range.
- [ ] Low-n path caps at 0.40 with hypothesis label.
- [ ] GraphEdge rows exist for CONTAINS, SHIPPED_TO, AFFINITY, GEO_OVERLAP (and VENUE_IN / DRIVEN_BY when catalogue linked).
- [ ] Competing events JSON present when two windows overlap.
- [ ] Weather Driver can exist without forcing a fake Event title.
- [ ] Forecast-driven affinity adjusts \(A\) when WeatherForecast/Driver overlaps and shells/layers SKUs present; provenanceLabels mention weather forecast.
- [ ] SocialTrend can create TRENDING_IN / AFFINITY edges; without order lift, demand provenance is not OBSERVED.
- [ ] ActivityChallenge / VirtualEvent create AFFINITY (and TRENDING_IN / VENUE_IN) edges; activity buzz alone is not OBSERVED demand.
- [ ] Virtual geo uses audience ∪ `global/virtual`; pure-virtual G respects national cap.
- [ ] Recompute is idempotent via **delete-all-then-rewrite** for shop EventCandidate+scores (CONTRACTS §2 / D25) — not upsert-merge.
- [ ] Live PipelineRun stage `graph_seed` auto-runs after store makeup; no empty graph after live connect when ingest returned products/orders.
- [ ] StoreMakeupSnapshot collections/tags/types/price bands contribute AFFINITY (or equivalent) edges.
- [ ] PipelineRun stages `graph_seed` + `score_link` status updated for Settings strip.
- [ ] `listEventCandidates` / `getEventDetail` are the queries Epic 08 Events loaders call (Prisma) — golden seed yields rows visible without Partner.

## Implementation checklist for a coding agent (ordered steps)
1. Add GraphEdge, EventCandidate, ConfidenceScore models; migrate.
2. Implement affinity dictionary module for sports/athleisure.
3. Build order→SKU CONTAINS and order→Geo SHIPPED_TO edges from ingest tables; also seed from StoreMakeupSnapshot (collections/tags/types/price bands).
3b. Wire as PipelineRun stage `graph_seed` — auto after stage a; mark stage success before score_link.
4. Link CatalogueEvent→Geo VENUE_IN; Event→Driver DRIVEN_BY; WeatherForecast→Geo FORECAST_FOR; SocialTrend→Geo TRENDING_IN; SocialTrend→SKU AFFINITY; VirtualEvent→Geo VENUE_IN; ActivityChallenge→SKU AFFINITY / Geo TRENDING_IN; optional CHALLENGE_OF.
5. Implement baseline + lift calculator by weekday (orders only).
6. Implement geo band weighting (haversine) + geoHint overlap helpers.
7. Implement affinity fraction per event category + forecast-driven map + social/activity affinity cap (+0.20 combined).
8. Assemble C(E); apply low-n cap; softmax multi-event; write ConfidenceScore + provenanceLabels for social/weather/virtual/activity.
9. Seed-friendly naming; optional LLM hook behind `OPENAI_API_KEY` (skip if unset).
10. Expose queries: `listEventCandidates(shopId)`, `getEventDetail(id)` with components + top SKUs — **consumed by Epic 08 loaders** (LIVE_DATA_WIRE).

## Fixtures / seed data required
- Depends on Epic 02/03 fixtures.
- `fixtures/graph/expected-scores-running.json` — **weekend golden** (Race-day taper ≈0.72–0.92, wet-weather, virtual). Football-era `expected-scores.json` SUPERSEDED for primary.

## Test plan
- Unit tests for clip, softmax, low-n cap, haversine bands.
- Golden fixture test: seed DB → score → assert names + confidence bands.
- Property: components each in [0,1]; value in [0,1].

## Open questions
1. Store confidence as 0–1 or 0–100? → **Canonical `value` 0–1**; UI multiplies for % copy when needed.
2. Show full component breakdown to judges? → **Yes** on Event detail Signals tab; list view shows single bar only.
