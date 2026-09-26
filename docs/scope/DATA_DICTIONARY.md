# DATA_DICTIONARY — entities & fields

**Date:** 22 Sep 2026 · Europe/London  
**Sources:** epics 01–09, MVP_ARCHITECTURE, PLANNING_BRIEF, SPORTS_EVENT_GRAPH_PIPELINE  
**Provenance enum:** `OBSERVED` | `AGGREGATE_PROXY` | `MODEL_HYPOTHESIS` | `MOCK`  
**PCD:** Protected Customer Data (Shopify). Prefer minimise; hash identity; no street/email/phone/name storage.

### Source column key
| Value | Meaning |
|-------|---------|
| Shopify | Admin GraphQL / OAuth session |
| crawl | Live HTTP (football-data / Open-Meteo / optional social APIs) |
| derived | Computed in Syndicate (graph, personas, scores, recs) |
| MOCK | Seed JSON / demo replay |
| system | App runtime / Playwright telemetry |

### Retention key
| Value | Meaning |
|-------|---------|
| session | Shopify session lifetime / uninstall wipe |
| shop-life | While app installed; purge on uninstall |
| 60d-window | Analytics window; older ingest not fetched (MVP) |
| run-life | Kept with AgentRun; wipe with shop |
| deploy | MOCK catalogue re-seeded per deploy |
| ephemeral | Logs/metrics only; no long store |

---

## Shop & sync

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| Shop.id | string (domain) | Shopify | No | OBSERVED | shop-life |
| Shop.myshopifyDomain | string | Shopify | No | OBSERVED | shop-life |
| Shop.name | string? | Shopify | No | OBSERVED | shop-life |
| Shop.accessToken | string | Shopify | No (secret) | — | session/shop-life; never log/UI |
| Shop.scopes | string | Shopify | No | OBSERVED | shop-life |
| Shop.installedAt | datetime | system | No | OBSERVED | shop-life |
| Shop.uninstalledAt | datetime? | system | No | OBSERVED | shop-life |
| Shop.primaryLocale | string? | Shopify / default en-GB | No | OBSERVED | shop-life |
| Shop.currencyCode | string? | Shopify / GBP | No | OBSERVED | shop-life |
| Shop.timezone | string? | default Europe/London | No | OBSERVED | shop-life |
| Shop.storefrontUrl | string? | Shopify primaryDomain | No | OBSERVED | shop-life |
| Session.* | template fields | Shopify | No | OBSERVED | session; wipe uninstall |
| SyncRun.id | cuid | system | No | — | shop-life |
| SyncRun.shopId | string | system | No | — | shop-life |
| SyncRun.kind | string | system | No | — | shop-life |
| SyncRun.status | enum pending\|running\|success\|failed | system | No | OBSERVED | shop-life |
| SyncRun.startedAt / finishedAt | datetime | system | No | OBSERVED | shop-life |
| SyncRun.cursor | string? | Shopify | No | OBSERVED | ephemeral/shop-life |
| SyncRun.ordersUpserted | int | derived | No | OBSERVED | shop-life |
| SyncRun.productsUpserted | int | derived | No | OBSERVED | shop-life |
| SyncRun.errorCode / errorMessage | string? | system | No | OBSERVED | shop-life |
| SyncRun.pipelineRunId | string? FK | system | No | — | shop-life |
| PipelineRun.id | cuid | system | No | — | shop-life |
| PipelineRun.shopId | string | system | No | — | shop-life |
| PipelineRun.mode | demo\|live | system | No | — | shop-life |
| PipelineRun.trigger | install\|reconnect\|manual_refresh\|scheduled | system | No | OBSERVED | shop-life |
| PipelineRun.status | pending\|running\|success\|partial\|failed\|cancelled | system | No | OBSERVED | shop-life |
| PipelineRun.currentStage / lastSuccessfulStage / failedStage | PipelineStage? | system | No | OBSERVED | shop-life |
| PipelineRun.stagesJson | JSON array of stage statuses | system | No | OBSERVED | shop-life |
| PipelineRun.agentsAutoRunSnapshot | boolean | system | No | OBSERVED | shop-life |
| PipelineRun.errorCode / errorMessage | string? | system | No | OBSERVED | shop-life |
| PipelineRun.startedAt / finishedAt | datetime | system | No | OBSERVED | shop-life |
| PipelineRun.idempotencyKey | string unique | system | No | — | shop-life |
| ShopSettings.shopId | string PK | system | No | — | shop-life |
| ShopSettings.agentsAutoRun | boolean default true | merchant toggle | No | OBSERVED | shop-life |
| ShopSettings.modeOverride | demo\|live? | system | No | — | shop-life |

---

## Store makeup snapshot (pipeline stage a)

First-class artifact of live connect. Built from Admin catalogue + ≤60d orders. All fields **OBSERVED** (fixture path → MOCK). No street/email/phone.

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| StoreMakeupSnapshot.id | cuid | system | No | — | shop-life |
| StoreMakeupSnapshot.shopId | string | system | No | — | shop-life |
| StoreMakeupSnapshot.pipelineRunId | string unique | system | No | — | shop-life |
| StoreMakeupSnapshot.capturedAt | datetime | system | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.windowDays | int (60) | system | No | — | shop-life |
| StoreMakeupSnapshot.collectionsJson | [{id,title,handle?,productCount}] | Shopify | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.productTypesJson | [{type,count}] top N | Shopify | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.tagsJson | [{tag,count}] top N | Shopify | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.orderSkuMixJson | [{productId?,sku?,title,units,revenue}] top N | Shopify derived | Via orders | OBSERVED | shop-life |
| StoreMakeupSnapshot.priceBandsJson | [{band,min,max,orderCount}] | derived | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.topCollectionsJson | [{collectionId,title,units}] | derived | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.geoBucketsJson | [{city?,provinceCode?,countryCode,postalSector?,orderCount}] | derived Geo | **Yes L2 reduced** | OBSERVED | shop-life; purge uninstall |
| StoreMakeupSnapshot.totalsJson | {ordersInWindow,productsActive,collections,distinctSkusSold,aovP25,aovP50,aovP75,currencyCode} | derived | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.emptyOrders | boolean | derived | No | OBSERVED | shop-life |
| StoreMakeupSnapshot.provenance | OBSERVED\|MOCK | system | No | **row label** | shop-life |

**Caps (hackathon):** ≤20 SKUs, ≤15 tags, ≤10 productTypes, ≤10 collections, ≤15 geo buckets, 4 price bands (`0-25`,`25-50`,`50-100`,`100+` in shop currency).

**Graph mapping:** stage b reads this snapshot + OrderRow/LineItemRow/ProductRow/CollectionRow/Geo to seed OBSERVED edges (CONTAINS, SHIPPED_TO, collection membership, tag/type affinity). After live stage b success, graph must not be empty solely for lack of fixtures.

---

## Orders & catalogue (Shopify ingest)

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| OrderRow.id | GID string | Shopify | Order is PCD class | OBSERVED | shop-life / 60d-window fetch |
| OrderRow.shopId | string | system | No | — | shop-life |
| OrderRow.name | string? (#1234) | Shopify | Low sensitivity | OBSERVED | shop-life |
| OrderRow.processedAt / createdAt | datetime | Shopify | No | OBSERVED | shop-life |
| OrderRow.currencyCode | string | Shopify | No | OBSERVED | shop-life |
| OrderRow.subtotalAmount / totalAmount | decimal | Shopify | No | OBSERVED | shop-life |
| OrderRow.totalShipping | decimal? | Shopify | No | OBSERVED | shop-life |
| OrderRow.displayFinancialStatus | string? | Shopify | No | OBSERVED | shop-life |
| OrderRow.displayFulfillmentStatus | string? | Shopify | No | OBSERVED | shop-life |
| OrderRow.sourceName | string? | Shopify | No | OBSERVED | shop-life |
| OrderRow.tags | string? | Shopify | No | OBSERVED | shop-life |
| OrderRow.test | boolean | Shopify | No | OBSERVED | shop-life |
| OrderRow.customerHash | string? sha256(GID) | derived from Shopify | **Yes (pseudonym)** | OBSERVED | shop-life; purge uninstall |
| OrderRow.geoId | FK? | derived | Indirect | OBSERVED | shop-life |
| LineItemRow.id | string | Shopify | Via order | OBSERVED | shop-life |
| LineItemRow.orderId / shopId | string | system | No | — | shop-life |
| LineItemRow.productId / variantId | GID? | Shopify | No | OBSERVED | shop-life |
| LineItemRow.sku / title / variantTitle / vendor | string | Shopify | No | OBSERVED | shop-life |
| LineItemRow.quantity | int | Shopify | No | OBSERVED | shop-life |
| LineItemRow.unitPrice / lineTotal | decimal | Shopify | No | OBSERVED | shop-life |
| LineItemRow.productType | string? | Shopify | No | OBSERVED | shop-life |
| LineItemRow.tagsJson | string? | Shopify snapshot | No | OBSERVED | shop-life |
| ProductRow.id | GID | Shopify | No | OBSERVED | shop-life |
| ProductRow.title / handle / productType / vendor / tags / status | string | Shopify | No | OBSERVED | shop-life |
| ProductRow.updatedAt | datetime | Shopify | No | OBSERVED | shop-life |
| CollectionRow.id / title / handle | string | Shopify | No | OBSERVED | shop-life |
| ProductCollection.productId+collectionId | composite PK | Shopify | No | OBSERVED | shop-life |
| Geo.id | cuid | derived | **Yes (address-derived)** | OBSERVED | shop-life; purge uninstall |
| Geo.city / provinceCode | string? | Shopify shipping (L2) | **Yes L2** | OBSERVED | shop-life |
| Geo.countryCode | string | Shopify | **Yes L2** | OBSERVED | shop-life |
| Geo.postalSector | string? (e.g. M1) | derived from zip | **Yes L2 reduced** | OBSERVED | shop-life |
| Geo.lat / lng | float? | Shopify address geocode | **Yes L2** | OBSERVED | shop-life |
| Geo.provenance | enum | system | No | OBSERVED | shop-life |

**Never store:** `address1`, `address2`, email, phone, customer display name, raw IP (optional coarse resolve then drop), access tokens in UI.

**Fixture mirror fields:** same shapes; Source=MOCK; Provenance=MOCK; PCD=No (synthetic).

---

## Event catalogue & drivers

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| CatalogueEvent.id | cuid | system | No | — | deploy/shop-agnostic |
| CatalogueEvent.naturalKey | string unique | derived | No | — | deploy |
| CatalogueEvent.title | string | crawl / MOCK | No | OBSERVED or MOCK | deploy |
| CatalogueEvent.category | enum | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.mode | physical\|virtual\|hybrid | crawl / MOCK | No | inherits | deploy — **D31** first-class |
| CatalogueEvent.audienceJson | string[] JSON | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.city / region / countryCode | string? | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.lat / lng | float? | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.venueName | string? | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.virtualFlag | boolean | derived (`mode !== physical`) | No | inherits | deploy — legacy |
| CatalogueEvent.startAt / endAt | datetime | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.recurrence | none\|weekly | MOCK / crawl | No | inherits | deploy |
| CatalogueEvent.sourceUrl | string? | crawl / MOCK | No | inherits | deploy |
| CatalogueEvent.sourceType | football_data\|open_meteo\|mock_json\|curated_json\|… | system | No | — | deploy |
| CatalogueEvent.sourceExternalId | string? | crawl | No | OBSERVED | deploy |
| CatalogueEvent.lastCrawledAt | datetime | system | No | OBSERVED | deploy |
| CatalogueEvent.freshnessConfidence | float | derived | No | MODEL_HYPOTHESIS | deploy |
| CatalogueEvent.provenance | enum | system | No | **row label** | deploy |
| CatalogueEvent.stale | boolean | derived | No | — | deploy |
| CatalogueEvent.rawPayloadHash | string? | derived | No | — | deploy |
| Driver.id / naturalKey | string | system | No | — | deploy |
| Driver.type | weather\|fixture\|activity_challenge\|… | crawl / MOCK | No | AGGREGATE_PROXY / MOCK | deploy |
| Driver.label | string | derived | No | inherits | deploy |
| Driver.geoCity / countryCode / lat / lng | geo | crawl | No | AGGREGATE_PROXY | deploy |
| Driver.timeStart / timeEnd | datetime | crawl | No | inherits | deploy |
| Driver.metricsJson | {tMinC,precipMm,…} | crawl OM | No | AGGREGATE_PROXY | deploy |
| Driver.provenance / sourceType / externalRef | string | system | No | AGGREGATE_PROXY | deploy |
| Driver.lastCrawledAt / stale | datetime/bool | system | No | — | deploy |
| CatalogueJobRun.* | job meta | system | No | OBSERVED | shop-life / deploy |

**Category enum:** `race_running` · `team_fixture` · `competition_meet` · `crossfit_functional` · `virtual_challenge` · `weather_driver` · `season_drop_calendar`

**Mode enum (D31):** `physical` · `virtual` · `hybrid` — UI chips Physical / Virtual / Hybrid; catalogue filters.

**CatalogueEvent.sourceType** also allows: `curated_json` · `hashtag_watch` · `activity_curated` · `strava_api` (when wrapping social/activity as soft event — rare).

**GeoBucket:** include synthetic key **`global/virtual`** for online-only occasions (audience geos from store order buckets still preferred when present).

---

## Weather forecast & social trends (D30)

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| WeatherForecast.id | cuid | system | No | — | deploy / shop-scoped refreshes |
| WeatherForecast.naturalKey | string unique | derived | No | — | deploy |
| WeatherForecast.geoBucketKey | string | derived Geo | No street | — | deploy |
| WeatherForecast.geoCity / countryCode | string? | derived | No | OBSERVED | deploy |
| WeatherForecast.lat / lng | float | crawl OM | No | OBSERVED | deploy |
| WeatherForecast.forecastDate | date/datetime | crawl OM | No | OBSERVED | deploy |
| WeatherForecast.tMinC / tMaxC / precipMm / windKph | float? | crawl OM | No | **OBSERVED** | deploy |
| WeatherForecast.weatherCode | int? | crawl OM | No | OBSERVED | deploy |
| WeatherForecast.sunriseAt / sunsetAt | datetime? | crawl OM | No | OBSERVED | deploy |
| WeatherForecast.rawPayloadHash | string? | derived | No | — | deploy |
| WeatherForecast.sourceType | open_meteo | system | No | — | deploy |
| WeatherForecast.provenance | enum | system | No | **OBSERVED** (payload) | deploy |
| WeatherForecast.lastCrawledAt / stale | datetime/bool | system | No | — | deploy |
| HashtagWatch.id / naturalKey | string | system | No | — | deploy |
| HashtagWatch.tag | string | curated / API | No | MOCK / AGGREGATE_PROXY | deploy |
| HashtagWatch.geoHint | string? | curated | No (aggregate) | inherits | deploy |
| HashtagWatch.catalogueAffinityJson | string[] JSON | curated | No | inherits | deploy |
| HashtagWatch.clubOrEventHint | string? | curated | No | inherits | deploy |
| HashtagWatch.sourceType | curated_json\|x_api\|reddit_json\|google_trends_proxy\|mock_json | system | No | — | deploy |
| HashtagWatch.enabled | boolean | system | No | — | deploy |
| HashtagWatch.provenance | enum | system | No | **row label** | deploy |
| HashtagWatch.updatedAt | datetime | system | No | — | deploy |
| SocialTrend.id / naturalKey | string | system | No | — | deploy |
| SocialTrend.hashtagWatchId | FK? | system | No | — | deploy |
| SocialTrend.tag | string | crawl / MOCK | No | inherits | deploy |
| SocialTrend.timeBucketStart / timeBucketEnd | datetime | system | No | inherits | deploy |
| SocialTrend.score | float 0..1 | derived | No | AGGREGATE_PROXY / MOCK / MODEL_HYPOTHESIS | deploy |
| SocialTrend.volumeProxy | float? | crawl / MOCK | No | inherits | deploy |
| SocialTrend.geoHint / geoBucketKey | string? | curated / derived | No (aggregate) | inherits | deploy |
| SocialTrend.sourceType | string | system | No | — | deploy |
| SocialTrend.provenance | enum | system | No | **Never OBSERVED demand** — MOCK \| AGGREGATE_PROXY \| MODEL_HYPOTHESIS | deploy |
| SocialTrend.lastCrawledAt / stale | datetime/bool | system | No | — | deploy |
| SocialTrend.payloadJson | string? | crawl / MOCK | No PII / no handles of customers | inherits | deploy |

**Jobs:** `weather.forecastLocal` · `social.hashtagTrends` · `catalogue.virtual_events_seed` · `catalogue.activity_challenges` — see SIGNAL_SOURCES.md + CONTRACTS (D30/D31).

**Ethics:** no individual social profiling; aggregate geo only; social never upgrades demand to OBSERVED without order lift.

---

## Virtual events & activity challenges (D31)

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| VirtualEvent.id / naturalKey | string | system | No | — | deploy |
| VirtualEvent.catalogueEventId | FK? | system | No | — | deploy |
| VirtualEvent.title / category / mode | string | curated / MOCK / public calendar | No | MOCK or OBSERVED if public calendar | deploy |
| VirtualEvent.audienceJson | string[] JSON | curated | No | inherits | deploy |
| VirtualEvent.audienceGeoJson | GeoBucket keys JSON? | derived from store orders | No street | AGGREGATE_PROXY | deploy |
| VirtualEvent.globalVirtual | boolean | system | No | — | default true |
| VirtualEvent.streamOrAppHint | zwift\|peloton\|twitch\|youtube\|app_race\|… | curated | No | inherits | deploy |
| VirtualEvent.startAt / endAt | datetime | curated / MOCK | No | inherits | deploy |
| VirtualEvent.sourceType / provenance / lastCrawledAt / stale | meta | system | No | **row label** | deploy |
| ActivityChallenge.id / naturalKey | string | system | No | — | deploy |
| ActivityChallenge.title | string | curated / API / MOCK | No | inherits | deploy |
| ActivityChallenge.platform | strava\|garmin\|zwift\|mock | curated / system | No | — | deploy |
| ActivityChallenge.mode | virtual (typical) | system | No | inherits | deploy |
| ActivityChallenge.windowStart / windowEnd | datetime | curated / API | No | inherits | deploy |
| ActivityChallenge.catalogueAffinityJson | string[] JSON | curated | No | inherits | deploy |
| ActivityChallenge.volumeProxy | float? | API aggregate / MOCK | No | AGGREGATE_PROXY / MOCK | deploy |
| ActivityChallenge.geoBucketKey | string? | audience or `global/virtual` | No street | inherits | deploy |
| ActivityChallenge.sourceType | curated_json\|strava_api\|mock_json | system | No | — | deploy |
| ActivityChallenge.provenance | enum | system | No | **Never OBSERVED demand alone** — MOCK \| AGGREGATE_PROXY | deploy |
| ActivityChallenge.payloadJson | string? | API / MOCK | **No private athlete PII** | inherits | deploy |

**Ethics (activity):** optional Strava OAuth = **aggregate club / challenge stats only** (A16); never private athlete activities; never customer→athlete edges. Activity buzz never OBSERVED demand without order lift.

---

## Graph, events, confidence

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| GraphEdge.id | cuid | derived | No | — | shop-life |
| GraphEdge.shopId | string | system | No | — | shop-life |
| GraphEdge.fromType / fromId / toType / toId | string | derived | Maybe via Order/Geo ids | per-edge | shop-life |
| GraphEdge.relation | string incl. FORECAST_FOR, TRENDING_IN, SOCIAL_LIFT, AFFINITY, AMPLIFIES, CHALLENGE_OF, VENUE_IN | derived | No | — | shop-life |
| GraphEdge.weight | float | derived | No | MODEL_HYPOTHESIS | shop-life |
| GraphEdge.provenance | enum | derived | No | **edge label** | shop-life |
| GraphEdge.payloadJson | string? | derived | No PII | varies | shop-life |
| EventCandidate.id | cuid | derived | No | — | shop-life |
| EventCandidate.shopId | string | system | No | — | shop-life |
| EventCandidate.catalogueEventId | string? | derived | No | — | shop-life |
| EventCandidate.name | string | derived / optional LLM | No | OBSERVED path / MODEL_HYPOTHESIS if LLM name | shop-life |
| EventCandidate.archetype | enum | derived | No | — | shop-life |
| EventCandidate.timeStart / timeEnd | datetime | derived | No | — | shop-life |
| EventCandidate.venueCity / venueCountry | string? | catalogue | No | inherits calendar | shop-life |
| EventCandidate.driverIdsJson | string? | derived | No | — | shop-life |
| EventCandidate.enrichmentSource | orders_only\|orders_plus_calendar\|orders_plus_mock | derived | No | — | shop-life |
| EventCandidate.nOrders | int | derived | No | OBSERVED | shop-life |
| EventCandidate.windowLabel | string? | derived | No | — | shop-life |
| ConfidenceScore.* | see CONTRACTS | derived | No | provenanceLabelsJson required | shop-life |
| ConfidenceScore.value | float 0..1 | derived | No | MODEL_HYPOTHESIS (+ inputs labelled) | shop-life |
| ConfidenceScore.Lt / G / A / Y / R | float 0..1 | derived | No | — | shop-life |
| ConfidenceScore.baselinePct | float | derived | No | — | shop-life |
| ConfidenceScore.competingJson | JSON | derived | No | — | shop-life |
| ConfidenceScore.nOrders / window* | int/datetime | derived | No | OBSERVED window | shop-life |

**Y default:** 0.5 neutral within 60d; label in provenanceLabels (“prior-year neutral”).

---

## Personas

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| Persona.id | cuid | derived | No | — | shop-life |
| Persona.shopId | string | system | No | — | shop-life |
| Persona.primaryEventId | EventCandidate id? | derived | No | — | shop-life |
| Persona.name | string | derived / MOCK seed | No | MODEL_HYPOTHESIS / MOCK | shop-life |
| Persona.status | ready\|draft\|stub | derived | No | — | shop-life |
| Persona.vertical | sport\|athleisure\|fashion_stub | derived | No | — | shop-life |
| Persona.goalsJson | string[] | derived from baskets | No | OBSERVED aggregate | shop-life |
| Persona.budgetMin / budgetMax | decimal GBP | AOV percentiles | No | OBSERVED aggregate (**not income**) | shop-life |
| Persona.currencyCode | string | shop | No | OBSERVED | shop-life |
| Persona.constraintsJson | JSON | derived | No | mix; badge traits | shop-life |
| Persona.behaviouralJson | JSON | derived | No | MODEL_HYPOTHESIS often | shop-life |
| Persona.locationProxy | string? | Geo aggregate | Indirect | AGGREGATE_PROXY / OBSERVED | shop-life |
| Persona.mockFlagsJson | string[] | system | No | lists MOCK/HYP flags | shop-life |
| Persona.successCriteriaJson | JSON | derived | No | — | shop-life |
| Persona.avatarInitials | string? | derived | No | — | shop-life |

**Demo targets:** Away-day dad (ready), First-time fan (draft), Anniversary night-out (stub). Optional Taper-week runner.

---

## Agents & scores

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| AgentRun.id | cuid | system | No | — | run-life |
| AgentRun.shopId / personaId / eventId? | string | system | No | — | run-life |
| AgentRun.status | queued\|running\|completed\|failed | system | No | OBSERVED | run-life |
| AgentRun.outcome | carted\|checkout_started\|abandoned\|failed? | system | No | OBSERVED or MOCK if replay | run-life |
| AgentRun.startedAt / endedAt | datetime? | system | No | OBSERVED | run-life |
| AgentRun.progressPct | int | system | No | OBSERVED | run-life |
| AgentRun.timelineJson | steps[] | system / MOCK replay | No | OBSERVED / MOCK | run-life |
| AgentRun.storefrontUrl | string? | Shop / env | No | OBSERVED | run-life |
| AgentRun.errorMessage | string? | system | No | OBSERVED | run-life |
| AffordanceScore.id | cuid | derived | No | — | run-life |
| AffordanceScore.personaId / runId / shopId | string | system | No | — | run-life |
| AffordanceScore.targetType | product\|collection\|copy\|nav\|filter\|page | derived | No | OBSERVED (agent) | run-life |
| AffordanceScore.targetRef | string | derived | No | OBSERVED | run-life |
| AffordanceScore.score | float 0..1 | derived | No | OBSERVED | run-life |
| AffordanceScore.evidenceJson | JSON | derived | No | OBSERVED | run-life |
| AffordanceScore.notes | string? British English | derived | No | OBSERVED / MODEL_HYPOTHESIS blurb | run-life |
| InsightScore.* | as Affordance + insightKind | derived | No | OBSERVED | run-life |
| InsightScore.insightKind | dead_end\|missing_variant\|weak_copy\|ux_trap\|price_shock\|trust\|sizing | derived | No | OBSERVED | run-life |

---

## Recommendations

| Entity.field | Type | Source | PCD? | Provenance label | Retention |
|--------------|------|--------|------|------------------|-----------|
| Recommendation.id | cuid | derived | No | — | shop-life |
| Recommendation.shopId | string | system | No | — | shop-life |
| Recommendation.kind | insight\|merch\|collection\|campaign | derived | No | — | shop-life |
| Recommendation.priority | P0\|P1\|P2 | derived | No | — | shop-life |
| Recommendation.title / body | string en-GB | derived / optional LLM | No | MODEL_HYPOTHESIS for copy polish | shop-life |
| Recommendation.personaId / eventId / runId | string? | derived | No | — | shop-life |
| Recommendation.targetType / targetRef | string? | derived | No | OBSERVED refs | shop-life |
| Recommendation.adminDeepLink | string? | derived | No | — | shop-life |
| Recommendation.provenanceLabelsJson | string[] JSON | derived | No | **required non-empty** | shop-life |
| Recommendation.confidence | float? | derived | No | MODEL_HYPOTHESIS | shop-life |
| Recommendation.status | open\|done\|dismissed | system | No | — | shop-life |

---

## UI-only / non-persisted

| Name | Type | Source | PCD? | Provenance | Retention |
|------|------|--------|------|------------|-----------|
| OverviewLoader KPIs | computed | derived | No | mix | ephemeral request |
| Enrichment legend copy | static | system | No | — | code |
| Export brief | not wired | — | No | — | — |
| DEMO replay timeline | JSON file | MOCK | No | MOCK | deploy |

---

## Provenance → UI chip map

| Full label | Chip | Typical fields |
|------------|------|----------------|
| OBSERVED | Obs | Orders, PL fixtures, **WeatherForecast payloads**, agent telemetry, AOV bands |
| AGGREGATE_PROXY | Agg | Weather spike Drivers, curated/API social buzz, metro locationProxy |
| MODEL_HYPOTHESIS | Hyp | Confidence C(E), social→demand without lift, time-pressure trait, LLM names |
| MOCK | Mock | Race/Hyrox/parkrun-shaped/virtual seed, ActivityChallenge seed, MOCK SocialTrend, agent replay |

---

## PCD wipe checklist (uninstall)

Delete or anonymise for shopId: Session, OrderRow, LineItemRow, Geo, customerHash references, GraphEdges touching orders/geo, StoreMakeupSnapshot (incl. geoBucketsJson), PipelineRun, ShopSettings, SyncRun error strings if they embedded PII (should not). Cancel queued AgentRuns. Keep shop-agnostic CatalogueEvent/Driver/WeatherForecast/HashtagWatch/SocialTrend/VirtualEvent/ActivityChallenge (unless shop-scoped copies exist — then wipe those). Personas/EventCandidates/scores/runs: delete with shop.
