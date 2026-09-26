# CONTRACTS — jobs, Remix APIs, webhooks, SQLite

**Date:** 26 Sep 2026 · Europe/London  
**Audience:** build agent implementing epics 01–09  
**Stack:** Remix (or RR Shopify template) · Prisma SQLite · Playwright (in-process job runner OK for weekend)  
**Locale strings:** British English  
**PoC DoD:** REAL runtime only — see `LIVE_DEMO_GATE.md` / `HOLES_PLUGGED.md` (26 Sep). Vite / route-import fixtures / unbadged MOCK / `demo-completed-run.json` as happy path = **NOT PoC**.

---

## 0) Shared enums & provenance

```ts
export type Provenance =
  | "OBSERVED"
  | "AGGREGATE_PROXY"
  | "MODEL_HYPOTHESIS"
  | "MOCK";

export type SyncStatus = "pending" | "running" | "success" | "failed";
export type JobStatus = SyncStatus; // reuse

export type EventCategory =
  | "race_running"
  | "team_fixture"
  | "competition_meet"
  | "crossfit_functional"
  | "virtual_challenge"
  | "weather_driver"
  | "season_drop_calendar";

/** D31 — first-class physical / virtual / hybrid */
export type EventMode = "physical" | "virtual" | "hybrid";

export type ActivityPlatform = "strava" | "garmin" | "zwift" | "mock";

export type EventArchetype =
  | "match_day"
  | "race_weekend"
  | "functional_meet"
  | "virtual"
  | "weather"
  | "seasonal_drop"
  | "other";

export type PersonaStatus = "ready" | "draft" | "stub";
export type AgentRunStatus = "queued" | "running" | "stopped_before_payment" | "completed" | "failed";
export type AgentOutcome = "carted" | "checkout_started" | "abandoned" | "failed";
export type RecKind = "insight" | "merch" | "collection" | "campaign";
export type RecPriority = "P0" | "P1" | "P2";

/** Auto pipeline on live connect — see AUTO_PIPELINE_ON_INSTALL.md */
export type PipelineMode = "demo" | "live";
export type PipelineTrigger =
  | "install"
  | "reconnect"
  | "manual_refresh"
  | "scheduled";
export type PipelineStatus =
  | "pending"
  | "running"
  | "success"
  | "partial"
  | "failed"
  | "cancelled";
export type PipelineStage =
  | "store_makeup"
  | "graph_seed"
  | "catalogue_refresh"
  | "score_link"
  | "personas"
  | "agents_queue";
export type PipelineStageStatus = "pending" | "running" | "success" | "failed" | "skipped";
```

---

## 1) Environment contract

```ts
export interface EnvContract {
  SHOPIFY_API_KEY: string;
  SHOPIFY_API_SECRET: string;
  SCOPES: "read_orders,read_products,read_customers";
  SHOPIFY_APP_URL: string; // tunnel
  DATABASE_URL: string; // file:./dev.sqlite
  FOOTBALL_DATA_TOKEN?: string; // optional
  HASHTAG_WATCHLIST_PATH?: string; // optional override of fixtures/catalogue/hashtag-watchlist.json
  WEB_HARVEST_ALLOWLIST_PATH?: string; // optional override of fixtures/catalogue/web-harvest-allowlist.json
  X_BEARER_TOKEN?: string; // optional P2 official X API — A15 (not required)
  REDDIT_CLIENT_ID?: string; // optional P2 — A15
  REDDIT_CLIENT_SECRET?: string; // optional P2 — A15
  ACTIVITY_CHALLENGES_PATH?: string; // optional override of fixtures/catalogue/activity-challenges.json
  STRAVA_CLIENT_ID?: string; // optional A16 — merchant Strava OAuth
  STRAVA_CLIENT_SECRET?: string; // optional A16
  OPENAI_API_KEY?: string; // optional naming/blurbs only
  SHOP_STOREFRONT_URL?: string; // LOCKED precedence: env OVERRIDES Shop.storefrontUrl; missing → B06, no silent no-op
  DEMO_FIXTURE_SHOP?: "1";
  USE_ORDER_FIXTURES?: "1";
  DEMO_FIXTURES?: "1"; // UI loader fallback JSON
  DEMO_STATE_PLAYGROUND?: "1"; // Settings loading/error demo buttons
  /** Default true when unset — capped auto agents after personas (D26) */
  AGENTS_AUTO_RUN_DEFAULT?: "0" | "1";
}
```

---

## 2) Idempotency keys

| Operation | Idempotency key | Behaviour on retry |
|-----------|-----------------|--------------------|
| Shop upsert | `myshopifyDomain` | Update scopes/token/storefrontUrl |
| Order upsert | `OrderRow.id` = Shopify GID | Overwrite mutable fields |
| Product upsert | `ProductRow.id` GID | Overwrite |
| Collection join | `(productId, collectionId)` | Insert ignore |
| Geo | Prefer stable hash `shopId+country+city+postalSector` as id or unique | Upsert |
| CatalogueEvent | `naturalKey` | Upsert; live OBSERVED wins over MOCK same key/day |
| Driver | `naturalKey` | Upsert |
| WeatherForecast | `naturalKey` = hash(geoBucketKey + forecastDateUTC) | Upsert |
| HashtagWatch | `naturalKey` = lower(tag) | Upsert |
| SocialTrend | `naturalKey` = hash(tag + timeBucketStart + geoHint) | Upsert |
| VirtualEvent | `naturalKey` | Upsert; align with CatalogueEvent when dual-written |
| ActivityChallenge | `naturalKey` = hash(platform + title + windowStart) | Upsert |
| EventCandidate + shop GraphEdge replace | `shopId` + `scoreBatchId` (cuid per `graph.buildAndScore`) | **LOCKED 26 Sep (D25):** **delete-all-then-rewrite** for that shop — delete `EventCandidate` + `ConfidenceScore` + shop-scoped occasion `GraphEdge` rows (order CONTAINS/SHIPPED_TO may be rebuilt or retained per job; scorer must not leave orphan candidates). **Do not** upsert-merge stale candidate ids across recomputes. CatalogueEvent/Driver/Weather/Social upserts stay naturalKey (separate). |
| Persona upsert | `shopId + name` unique | Upsert |
| AgentRun create | new cuid each enqueue | Never reuse |
| Recommendation upsert | hash(`kind+targetRef+title`) per shop | Dedupe; cap 10 |
| SyncRun / CatalogueJobRun | new cuid each attempt | History append-only |
| PipelineRun create | `shopId + trigger + installEpoch`; only one `pending`/`running` per shop | Return existing active id |
| Pipeline stage tick | `pipelineRunId + stage` | Skip if stage already success |
| StoreMakeupSnapshot | `pipelineRunId` unique | Upsert |
| Auto AgentRun enqueue | `pipelineRunId + personaId` | At most one auto row |
| Webhook APP_UNINSTALLED | Shopify webhook id header if present; else shop domain | Wipe once; cancel PipelineRun |

---

## 2b) ID naming — EventCandidate vs CatalogueEvent (LOCKED 26 Sep)

| Entity | Id prefix / shape | UI route |
|--------|-------------------|----------|
| **CatalogueEvent** | Prisma cuid; optional display `naturalKey` | **Not** primary Events list. Catalogue admin/debug only if needed. |
| **EventCandidate** | Prisma cuid; **never** reuse CatalogueEvent id | **`/app/events/:id`** — `:id` is **always EventCandidate.id** |
| Deep links / cards | `eventCandidateId` field name in DTOs | Do not pass CatalogueEvent id into Events routes |

If a loader receives an unknown id: EmptyState — not a silent CatalogueEvent fallback.

## 2c) Worker vs Remix process (LOCKED 26 Sep)

**Weekend MVP:** **in-process job runner** on the Shopify app server is **OK** (poll `AgentRun`/`PipelineRun` queued rows from the same Node process, or `npm run agents:run` / `pipeline:run` as a sibling script sharing Prisma). A named separate worker is optional, not required.

**Must not:** leave PipelineRun stages `pending` forever after enqueue (P0-4). After `pipelineEnqueue`, a runner must advance stages or mark `failed`/`skipped` with reason.

**Must not:** Cursor Cloud Agents execute merchant PipelineRun / shoppers (D28).

## 2d) Dual UI ban (LOCKED 26 Sep)

| Surface | Role |
|---------|------|
| **`shopify-app/` Remix (React Router)** | **Shipping Admin only** — PoC / demo |
| **`ui/` Vite HTML** | **Layout / IA SoT only** — never open as the demo Admin |

Opening Vite as Admin = **NOT PoC**. localStorage agent theatre in `ui/app.js` is prototype-only.

---

## 3) Job schedule & envelopes

```ts
export type JobName =
  | "pipeline.run"              // orchestrates stages a→f
  | "pipeline.storeMakeup"      // stage a artifact
  | "ingest.shopifyFull"
  | "catalogue.mock_sports_seed"
  | "catalogue.football_fixtures"
  | "catalogue.weather_drivers"   // legacy alias → weather.forecastLocal
  | "weather.forecastLocal"
  | "social.hashtagTrends"
  | "social.webHarvest"
  | "graph.buildAndScore"
  | "personas.derive"
  | "agents.runOne"
  | "agents.enqueueForPipeline" // stage f capped queue
  | "recommendations.build"
  | "recommendations.fromLift"
  | "pcd.wipeShop";

export interface JobEnvelope<TPayload = Record<string, unknown>> {
  job: JobName;
  shopId: string;
  idempotencyKey: string;
  payload: TPayload;
  enqueuedAt: string; // ISO
  attempt: number;
}

export interface JobResult {
  ok: boolean;
  job: JobName;
  shopId: string;
  finishedAt: string;
  stats?: Record<string, number>;
  errorCode?: string; // HTTP_429 | AUTH_FAIL | CIRCUIT_OPEN | TIMEOUT | PLAYWRIGHT |
  errorMessage?: string;
}
```

| Job | Schedule (hackathon) | Payload |
|-----|----------------------|---------|
| `pipeline.run` | Post-OAuth live; reconnect; Settings “Refresh store + re-run”; optional nightly | `{ pipelineRunId, resumeFrom?: PipelineStage }` |
| `pipeline.storeMakeup` | Stage a of pipeline (after/with ingest) | `{ pipelineRunId, syncRunId }` |
| `ingest.shopifyFull` | Pipeline stage a; Settings resync; if last success &gt;6h on boot | `{ maxOrders?: 500, pipelineRunId? }` |
| `catalogue.mock_sports_seed` | Once per deploy/boot; also pipeline stage c — **race/running PROXY rows = weekend hard P0 (D33)** | `{ pipelineRunId? }` |
| `catalogue.football_fixtures` | Boot + every 6h; pipeline stage c scoped — **optional colour / not DoD (D33)** | `{ dateFrom, dateTo, pipelineRunId? }` |
| `catalogue.weather_drivers` | Legacy alias of `weather.forecastLocal` | same |
| `weather.forecastLocal` | **weekend hard P0 (D33)** · Boot + every 3h; pipeline stage c | `{ geoBuckets: {key,name?,lat,lng}[]; forecastDays?: 7; pipelineRunId? }` max 5 |
| `social.hashtagTrends` | Boot + every 6h; pipeline stage c — **weekend hard P0 (D33)** | `{ watchlistPath?: string; pipelineRunId? }` |
| `social.webHarvest` | Boot + every 6h; pipeline stage c — **soft-degrade / not weekend DoD (D33)** | `{ allowlistPath?: string; maxPages?: number; pipelineRunId? }` — see sketch below |
| `graph.buildAndScore` | Pipeline stage d (after b+c) | `{ pipelineRunId? }` |
| `personas.derive` | Pipeline stage e | `{ pipelineRunId? }` |
| `agents.enqueueForPipeline` | Pipeline stage f if agentsAutoRun | `{ pipelineRunId, maxPersonas?: 3 }` |
| `agents.runOne` | Worker polls AgentRun queued | `{ runId }` |
| `recommendations.build` | After agent completed | `{ runId }` |
| `recommendations.fromLift` | After graph (demo backup) | `{}` |
| `pcd.wipeShop` | APP_UNINSTALLED | `{}` |


### Job sketch — `social.webHarvest` (A15 path b · **soft-degrade / not weekend DoD — D33**)

```ts
export interface SocialWebHarvestPayload {
  allowlistPath?: string; // default fixtures/catalogue/web-harvest-allowlist.json
  maxPages?: number;      // default 40
  pipelineRunId?: string;
}

export interface SocialWebHarvestResult {
  ok: boolean;
  pagesFetched: number;
  pagesSkippedRobots: number;
  trendsUpserted: number; // SocialTrend rows, provenance AGGREGATE_PROXY
  errors?: string[];
}
```

| Gate | Rule |
|------|------|
| Allowlist | Only seed URLs + same-domain discovery from allowlist JSON |
| robots.txt | Must respect; skip disallowed paths; count in `pagesSkippedRobots` |
| Rate limit | ≤30 req/domain/hour (hackathon default) |
| Forbidden hosts | Never hard-target `twitter.com` / `x.com` / `t.co` |
| Provenance | Upserts are **AGGREGATE_PROXY** — never OBSERVED demand alone |
| Soft-degrade | On total failure → leave last-good + rely on watchlist/MOCK; do not fail PipelineRun |

**Backoff:** 30s → 2m → 10m; catalogue circuit OPEN 1h after 3 failures.  
**Concurrency:** 1 Playwright run machine-wide; ingest/catalogue may parallelise across shops (hackathon = 1 shop).
**Pipeline:** exactly one active (`pending`/`running`) PipelineRun per shop; stages serial a→f; resume from `lastSuccessfulStage`.

---

## 3.1) PipelineRun contract (auto install path)

```ts
export interface PipelineRunRecord {
  id: string;
  shopId: string;
  mode: PipelineMode;
  trigger: PipelineTrigger;
  status: PipelineStatus;
  currentStage?: PipelineStage;
  lastSuccessfulStage?: PipelineStage;
  failedStage?: PipelineStage;
  stages: {
    stage: PipelineStage;
    status: PipelineStageStatus;
    startedAt?: string;
    finishedAt?: string;
    errorCode?: string;
  }[];
  agentsAutoRunSnapshot: boolean;
  errorCode?: string;
  errorMessage?: string;
  startedAt: string;
  finishedAt?: string;
  idempotencyKey: string;
}

/** Stage order — do not reorder without Austin */
export const PIPELINE_STAGE_ORDER: PipelineStage[] = [
  "store_makeup",
  "graph_seed",
  "catalogue_refresh",
  "score_link",
  "personas",
  "agents_queue",
];

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  store_makeup: "Ingesting store makeup…",
  graph_seed: "Seeding graph…",
  catalogue_refresh: "Refreshing events…",
  score_link: "Scoring occasions…",
  personas: "Materialising personas…",
  agents_queue: "Agents running…",
};
```

**Rules:** OAuth success in `live` mode **must** call `pipelineEnqueue(shopId, "install")`. Demo mode must **not** create a live PipelineRun. Stage `agents_queue` is `skipped` (not failed) when `agentsAutoRun=false`. Soft-degrade catalogue → stage c `success` with degraded flag, not hard-fail of whole run unless ingest itself failed.

---

## 4) Webhook payloads

```ts
/** Shopify APP_UNINSTALLED — verify HMAC before trust */
export interface AppUninstalledWebhook {
  shop_id?: number;
  shop_domain: string; // e.g. demo-football-merch.myshopify.com
}

/** Optional ORDERS_CREATE / ORDERS_UPDATED — nice-if-time */
export interface OrderWebhookStub {
  id: number;
  admin_graphql_api_id: string; // gid://shopify/Order/...
  processed_at?: string;
  test?: boolean;
}
```

Handlers:
- `POST /webhooks/app/uninstalled` → verify → `pcd.wipeShop`
- Optional `POST /webhooks/orders/create` → single-order upsert

---

## 5) Remix loaders & actions (TypeScript interfaces)

### 5.1 Overview — `GET /app`

```ts
export interface OverviewLoader {
  shop: { domain: string; connected: boolean };
  kpis: {
    watchLabel: string; // e.g. "This weekend"
    events: number;
    personas: number; // non-stub
    insights: number;
  };
  heroEvent: EventCandidateCard | null;
  secondaryEvents: EventCandidateCard[];
  personas: PersonaCard[];
  artifactTeaser: {
    resonate: number;
    insights: number;
    nextAction: string;
  };
  sync?: { status: SyncStatus; errorCode?: string };
  emptyOrders?: boolean;
  /** Live auto pipeline progress — required when mode=live */
  pipeline?: {
    id: string;
    mode: PipelineMode;
    status: PipelineStatus;
    currentStage?: PipelineStage;
    stageLabel: string; // British English strip copy
    agentsAutoRun: boolean;
  } | null;
}
```

### 5.2 Events — `GET /app/events`

```ts
export interface EventCandidateCard {
  id: string;
  name: string;
  confidence: number; // 0..1
  provenance: Provenance; // primary chip
  provenanceLabels?: string[];
  nOrders: number;
  windowLabel?: string;
  blurb: string;
  archetype?: EventArchetype;
  mode?: EventMode; // D31 — UI Physical / Virtual / Hybrid chip
}

export interface EventsListLoader {
  events: EventCandidateCard[]; // confidence desc
  /** Optional filter echoed from query `?mode=` */
  modeFilter?: EventMode | "all";
}
```

### 5.3 Event detail — `GET /app/events/:id`

```ts
export interface EventDetailLoader {
  event: EventCandidateCard & {
    blurb: string;
    timeStart: string;
    timeEnd: string;
  };
  confidence: {
    value: number;
    Lt: number;
    G: number;
    A: number;
    Y: number;
    R: number;
    provenanceLabels: string[];
    competing: { name: string; value: number }[];
    baselinePct: number;
  };
  signals: { label: string; detail: string; provenance: Provenance | string }[];
  catalogue: { title: string; lift?: string; sku?: string }[];
  personas: PersonaCard[];
}
```

### 5.4 Personas — `GET /app/personas` · `GET /app/personas/:id`

```ts
export interface PersonaCard {
  id: string;
  name: string;
  status: PersonaStatus;
  summary: string;
  initials: string;
}

export interface PersonaDetailLoader {
  persona: {
    id: string;
    name: string;
    status: PersonaStatus;
    vertical: string;
    goals: string[];
    budgetMin: number;
    budgetMax: number;
    currencyCode: string;
    constraints: Record<string, unknown>;
    behavioural: Record<string, unknown>;
    locationProxy?: string;
    mockFlags: string[];
    successCriteria: Record<string, unknown>;
    agentBrief: string; // British English
  };
  primaryEvent: EventCandidateCard | null;
  priorRuns: { id: string; outcome: AgentOutcome | null; endedAt: string | null }[];
}
```

### 5.5 Runs — `POST /app/runs` · `GET /app/runs` · `GET /app/runs/:id`

**SoT companion:** `RUN_AGENTS_UI_CONTRACT.md`. PoC requires real Playwright → real `AgentRun` — not MOCK hydrate as happy path.

```ts
export interface CreateRunsActionInput {
  personaIds?: string[]; // default: all Ready for shop; N = min(eligible, 3)
  forceHeadedDemo?: boolean; // allow one manual run while Pause ON (Settings / rehearsal)
  /** Ignored if set — path locked to Harbour Run Dawn for weekend primary */
  pathId?: "path-harbour-run-dawn";
}

export interface CreateRunsActionResult {
  runIds: string[]; // new AgentRun cuid[]
  enqueued: number;
  skippedReason?: 
    | "no_storefront_url"      // → Banner B06; button should have been disabled
    | "no_ready_persona"
    | "paused_no_force"        // Pause ON and forceHeadedDemo !== true
    | "at_cap"                 // in-flight / cap; toast T02
    | "idempotent_noop";
  toastMessage: string; // e.g. "Agents queued — Race-day taper is heading to your storefront."
}

export interface TimelineStep {
  at: string; // ISO Europe/London-aware storage as UTC ISO OK
  step:
    | "home"
    | "collection"
    | "pdp"
    | "variant"
    | "atc"
    | "cart"
    | "checkout"
    | "stop"
    | "error";
  label: string; // British English — merchant-visible
  status: "pending" | "active" | "done" | "error";
  url?: string; // optional observed URL (never payment submit URL as success)
}

export interface AgentRunDTO {
  id: string;
  personaId: string;
  personaName: string;
  pathId: string; // "path-harbour-run-dawn" for primary
  eventId?: string; // EventCandidate.id if linked — never CatalogueEvent.id
  status: AgentRunStatus;
  outcome?: AgentOutcome | null;
  progressPct: number; // 0..100
  timeline: TimelineStep[];
  startedAt?: string | null;
  endedAt?: string | null;
  errorMessage?: string | null;
  storefrontUrl?: string | null;
  stopBeforePay: true;
  provenance?: Provenance; // MOCK only if emergency replay — never PoC acceptance
}

export interface RunsListLoader {
  active: AgentRunDTO | null;
  history: AgentRunDTO[];
  storefrontConfigured: boolean;
  agentsAutoRun: boolean;
}

export type RunDetailLoader = AgentRunDTO;
```

**Storefront URL resolution (LOCKED):** `process.env.SHOP_STOREFRONT_URL?.trim() || shop.storefrontUrl` — env wins. If both missing → do not enqueue; B06.

**Happy-path terminal for PoC:** `status: "stopped_before_payment"` (preferred) or `completed` + `outcome: "checkout_started"|"carted"`. UI label always stop-before-pay (B05).

### 5.6 Artifacts — `GET /app/artifacts`

```ts
export interface AffordanceDTO {
  id: string;
  targetType: string;
  targetRef: string;
  score: number;
  notes?: string;
  personaName?: string;
}

export interface InsightDTO extends AffordanceDTO {
  insightKind: string;
}

export interface RecommendationDTO {
  id: string;
  kind: RecKind;
  priority: RecPriority;
  title: string;
  body: string;
  provenanceLabels: string[];
  adminDeepLink?: string | null;
  personaId?: string | null;
  eventId?: string | null; // EventCandidate.id
  agentRunId?: string | null; // REQUIRED for agent-attributed PoC cards
  confidence?: number | null;
  status: "open" | "done" | "dismissed";
}

export interface ArtifactsLoader {
  resonates: AffordanceDTO[];
  insights: InsightDTO[];
  recommendations: RecommendationDTO[];
  disclaimer: string; // stop-before-pay
}
```

### 5.7 Recommendations action (optional) — `POST /app/recommendations/:id`

```ts
export interface UpdateRecommendationInput {
  status: "open" | "done" | "dismissed";
}
```

### 5.8 Settings — `GET /app/settings` · actions

```ts
export interface SettingsLoader {
  shop: {
    domain: string;
    connected: boolean;
    scopes: string[];
    installedAt: string;
    storefrontUrl?: string;
  };
  /** demo = fixtures-only; live = real OAuth shop */
  mode: PipelineMode;
  sync: {
    status: SyncStatus;
    finishedAt?: string;
    ordersUpserted?: number;
    productsUpserted?: number;
    errorCode?: string;
  } | null;
  catalogue: {
    football: { status: string; lastAt?: string; degraded: boolean };
    weather: { status: string; lastAt?: string; forecastDays?: number }; // weather.forecastLocal
    social: { status: string; lastAt?: string; watchlistCount?: number; mode: "curated_mock" | "api_enriched" };
    virtual: { status: string; lastAt?: string; count: number }; // catalogue.virtual_events_seed
    activity: {
      status: string;
      lastAt?: string;
      challengeCount: number;
      mode: "curated_mock" | "strava_oauth_enriched";
    }; // catalogue.activity_challenges
    mockSeed: { loaded: boolean; count: number };
  };
  pipeline: {
    id: string | null;
    status: PipelineStatus | null;
    trigger?: PipelineTrigger;
    currentStage?: PipelineStage;
    lastSuccessfulStage?: PipelineStage;
    failedStage?: PipelineStage;
    errorCode?: string;
    errorMessage?: string;
    stages: { stage: PipelineStage; status: PipelineStageStatus; finishedAt?: string }[];
    agentsAutoRun: boolean; // Settings toggle; default true (D26)
  };
  storeMakeup?: {
    capturedAt: string;
    totals: {
      ordersInWindow: number;
      productsActive: number;
      collections: number;
      distinctSkusSold: number;
    };
    emptyOrders: boolean;
  } | null;
  compliance: {
    stopBeforePay: true;
    provenanceLegend: true;
    openMeteoAttribution: string;
    footballDataAttribution: string;
    socialSignalNote: string; // curated / optional API / MOCK — no customer profiling
    activitySignalNote: string; // curated / optional club aggregates / MOCK — no private athletes
    signalSourcesSummary: string; // one-liner for Settings “signal sources”
    noWealthApis: true;
  };
}

export interface ResyncActionResult {
  syncRunId: string;
}

export interface RecatalogueActionResult {
  jobIds: string[];
}

export interface RecomputeActionResult {
  ok: boolean;
}

export interface RefreshStoreActionResult {
  pipelineRunId: string;
}

export interface SetAgentsAutoRunResult {
  agentsAutoRun: boolean;
}
```

Actions:
- `POST /app/settings/resync` → `{ syncRunId }` (also acceptable as alias into pipeline stage a)
- `POST /app/settings/recatalogue` → `{ jobIds }`
- `POST /app/settings/recompute` → graph+personas (stages d–e)
- `POST /app/settings/refresh-store` → full PipelineRun `trigger=manual_refresh` → `{ pipelineRunId }`
- `POST /app/settings/agents-auto-run` body `{ enabled: boolean }` → pause/resume auto agents (D26)
- `POST /app/settings/pipeline-resume` → resume from `lastSuccessfulStage`
- `POST /app/settings/load-fixtures` (optional) → seed orders/ui when empty

### 5.9 Health shell — any `/app/*`

Unauthenticated → redirect to auth. Never return `accessToken`.

---

## 6) Internal service function signatures

```ts
declare function pipelineEnqueue(shopId: string, trigger: PipelineTrigger): Promise<{ pipelineRunId: string }>;
declare function pipelineRun(pipelineRunId: string, opts?: { resumeFrom?: PipelineStage }): Promise<JobResult>;
declare function pipelineStoreMakeup(shopId: string, pipelineRunId: string): Promise<JobResult>;
declare function ingestShopifyFull(shopId: string, opts?: { maxOrders?: number; pipelineRunId?: string }): Promise<JobResult>;
declare function catalogueMockSeed(): Promise<JobResult>;
declare function catalogueFootballFixtures(opts: { dateFrom: string; dateTo: string }): Promise<JobResult>;
declare function catalogueWeatherDrivers(cities: { name: string; lat: number; lng: number }[]): Promise<JobResult>; // alias
declare function weatherForecastLocal(opts: {
  geoBuckets: { key: string; name?: string; lat: number; lng: number }[];
  forecastDays?: number;
  pipelineRunId?: string;
}): Promise<JobResult>;
declare function socialHashtagTrends(opts?: {
  watchlistPath?: string;
  useApis?: boolean;
  pipelineRunId?: string;
}): Promise<JobResult>;
declare function graphBuildAndScore(shopId: string): Promise<JobResult>;
declare function personasDerive(shopId: string): Promise<JobResult>;
declare function agentsEnqueueForPipeline(shopId: string, pipelineRunId: string, opts?: { maxPersonas?: number }): Promise<JobResult>;
declare function agentsRunOne(runId: string): Promise<JobResult>;
declare function recommendationsBuild(shopId: string, runId?: string): Promise<JobResult>;
declare function recommendationsFromLift(shopId: string): Promise<JobResult>;
declare function pcdWipeShop(shopId: string): Promise<JobResult>;

declare function graphQuerySportsLift(input: {
  eventId: string;
  band?: "venue_local" | "metro" | "region" | "national";
  windowDays?: number;
}): Promise<{ skus: { title: string; qty: number }[]; collections: { title: string; qty: number }[] }>;
```

### Confidence formula (implement exactly)

\[
C(E)=\mathrm{clip}_{0,1}(0.30 L_t + 0.25 G + 0.25 A + 0.10 Y + 0.10 R)
\]

- Cap display at `0.40` if `n_W < 5` + label low-n hypothesis.  
- Softmax multi-event + baseline ≈ 100%.  
- `Y = 0.5` if no prior-year data.
- Forecast-driven affinity + social lift fold into \(A\) / \(R\) (social cap +0.15 on \(A\)); social alone never OBSERVED demand — see Epic 04 / SIGNAL_SOURCES.

### Agent deny-list (payment stop) — SoT enumerated (LOCKED 26 Sep)

Single source of truth for Epic 06 + CI assertions. Match **case-insensitive** on visible text / `aria-label` / URL path.

```ts
/** Button / link accessible-name or innerText substrings — never click */
export const PAYMENT_DENY_TEXT = [
  "Pay now",
  "Pay Now",
  "Complete order",
  "Complete purchase",
  "Buy it now",
  "Buy It Now",
  "Buy with Shop Pay",
  "Shop Pay",
  "Pay with",
  "Place order",
  "Submit payment",
] as const;

/** URL substrings — never navigate / never treat as success past checkout landing */
export const PAYMENT_DENY_URL_SUBSTR = [
  "/checkouts/",          // allow load of checkout *landing*; block deeper payment steps
  "/payments",
  "/payment",
  "complete_purchase",
  "processing_payment",
  "thank_you",            // order confirmation = went too far
] as const;

/** Extra Playwright selector hints */
export const PAYMENT_DENY_SELECTORS = [
  'button:has-text("Pay now")',
  'button:has-text("Complete order")',
  'button:has-text("Buy it now")',
  'button:has-text("Buy with Shop Pay")',
  '[type="submit"][name="complete"]',
  '[name="complete"]',
  'button[type="submit"]:has-text("Pay")',
  'input[name="number"]',           // card number field — never fill
  'iframe[src*="card"]',
] as const;
```

**Policy:** Outcome may be `checkout_started` / status `stopped_before_payment` when checkout **page** loaded; **never** fill card fields; **never** click deny-list controls; **never** create a real order. Path fixture `denyList` arrays must be a **subset** of this SoT (may add theme-specific hints).

---

## 7) Prisma-ish SQLite schema sketch

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Session {
  // Shopify template fields retained as-is
  id            String  @id
  shop          String
  state         String
  isOnline      Boolean @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String
  userId        BigInt?
  // ...template remainder
}

model Shop {
  id              String    @id // domain
  myshopifyDomain String    @unique
  name            String?
  accessToken     String
  scopes          String
  installedAt     DateTime  @default(now())
  uninstalledAt   DateTime?
  primaryLocale   String?   @default("en-GB")
  currencyCode    String?   @default("GBP")
  timezone        String?   @default("Europe/London")
  storefrontUrl   String?
  // agentsAutoRun lives on ShopSettings (default true) — D26
}

model SyncRun {
  id               String    @id @default(cuid())
  shopId           String
  kind             String
  status           String
  startedAt        DateTime  @default(now())
  finishedAt       DateTime?
  cursor           String?
  ordersUpserted   Int       @default(0)
  productsUpserted Int       @default(0)
  errorCode        String?
  errorMessage     String?
  pipelineRunId    String?
  @@index([shopId, startedAt])
}

model PipelineRun {
  id                   String    @id @default(cuid())
  shopId               String
  mode                 String    // demo|live
  trigger              String    // install|reconnect|manual_refresh|scheduled
  status               String    // pending|running|success|partial|failed|cancelled
  currentStage         String?   // PipelineStage
  lastSuccessfulStage  String?
  failedStage          String?
  stagesJson           String    // [{ stage, status, startedAt?, finishedAt?, errorCode? }]
  agentsAutoRunSnapshot Boolean  @default(true)
  errorCode            String?
  errorMessage         String?
  startedAt            DateTime  @default(now())
  finishedAt           DateTime?
  idempotencyKey       String    @unique
  @@index([shopId, startedAt])
  @@index([shopId, status])
}

model StoreMakeupSnapshot {
  id              String   @id @default(cuid())
  shopId          String
  pipelineRunId   String   @unique
  capturedAt      DateTime @default(now())
  windowDays      Int      @default(60)
  collectionsJson String   // [{ id, title, handle?, productCount }]
  productTypesJson String  // [{ type, count }]
  tagsJson        String   // [{ tag, count }]
  orderSkuMixJson String   // [{ productId?, sku?, title, units, revenue }]
  priceBandsJson  String   // [{ band, min, max, orderCount }]
  topCollectionsJson String
  geoBucketsJson  String   // city/sector only
  totalsJson      String   // ordersInWindow, productsActive, ...
  emptyOrders     Boolean  @default(false)
  provenance      String   @default("OBSERVED")
  @@index([shopId, capturedAt])
}

model ShopSettings {
  shopId         String  @id
  agentsAutoRun  Boolean @default(true) // D26 — pause auto agents
  modeOverride   String? // optional force demo|live for playground
}

model OrderRow {
  id                       String   @id
  shopId                   String
  name                     String?
  processedAt              DateTime
  createdAt                DateTime
  currencyCode             String
  subtotalAmount           Decimal
  totalAmount              Decimal
  totalShipping            Decimal?
  displayFinancialStatus   String?
  displayFulfillmentStatus String?
  sourceName               String?
  tags                     String?
  test                     Boolean  @default(false)
  customerHash             String?
  geoId                    String?
  @@index([shopId, processedAt])
}

model LineItemRow {
  id           String  @id
  orderId      String
  shopId       String
  productId    String?
  variantId    String?
  sku          String?
  title        String
  variantTitle String?
  vendor       String?
  quantity     Int
  unitPrice    Decimal
  lineTotal    Decimal
  productType  String?
  tagsJson     String?
  @@index([shopId, orderId])
}

model ProductRow {
  id          String   @id
  shopId      String
  title       String
  handle      String?
  productType String?
  vendor      String?
  tags        String?
  status      String?
  updatedAt   DateTime
  @@index([shopId])
}

model CollectionRow {
  id     String  @id
  shopId String
  title  String
  handle String?
  @@index([shopId])
}

model ProductCollection {
  productId    String
  collectionId String
  @@id([productId, collectionId])
}

model Geo {
  id           String  @id @default(cuid())
  shopId       String
  city         String?
  provinceCode String?
  countryCode  String
  postalSector String?
  lat          Float?
  lng          Float?
  provenance   String
  @@unique([shopId, countryCode, city, postalSector])
  @@index([shopId])
}

model CatalogueEvent {
  id                  String   @id @default(cuid())
  naturalKey          String   @unique
  title               String
  category            String
  mode                String   @default("physical") // physical|virtual|hybrid — D31
  audienceJson        String
  city                String?
  region              String?
  countryCode         String?
  lat                 Float?
  lng                 Float?
  venueName           String?
  virtualFlag         Boolean  @default(false) // derived: mode !== "physical"
  startAt             DateTime
  endAt               DateTime
  recurrence          String   @default("none")
  sourceUrl           String?
  sourceType          String
  sourceExternalId    String?
  lastCrawledAt       DateTime
  freshnessConfidence Float    @default(1)
  provenance          String
  stale               Boolean  @default(false)
  rawPayloadHash      String?
}

model Driver {
  id            String   @id @default(cuid())
  naturalKey    String   @unique
  type          String
  label         String
  geoCity       String?
  countryCode   String?
  lat           Float?
  lng           Float?
  timeStart     DateTime
  timeEnd       DateTime
  metricsJson   String?
  provenance    String
  sourceType    String
  externalRef   String?
  lastCrawledAt DateTime
  stale         Boolean  @default(false)
}

model WeatherForecast {
  id             String   @id @default(cuid())
  naturalKey     String   @unique
  geoBucketKey   String
  geoCity        String?
  countryCode    String?
  lat            Float
  lng            Float
  forecastDate   DateTime
  tMinC          Float?
  tMaxC          Float?
  precipMm       Float?
  windKph        Float?
  weatherCode    Int?
  sunriseAt      DateTime?
  sunsetAt       DateTime?
  rawPayloadHash String?
  sourceType     String   @default("open_meteo")
  provenance     String   // OBSERVED
  lastCrawledAt  DateTime
  stale          Boolean  @default(false)
  @@index([geoBucketKey, forecastDate])
}

model HashtagWatch {
  id                    String   @id @default(cuid())
  tag                   String
  naturalKey            String   @unique
  geoHint               String?
  catalogueAffinityJson String?
  clubOrEventHint       String?
  sourceType            String
  enabled               Boolean  @default(true)
  provenance            String
  updatedAt             DateTime
}

model SocialTrend {
  id              String   @id @default(cuid())
  naturalKey      String   @unique
  hashtagWatchId  String?
  tag             String
  timeBucketStart DateTime
  timeBucketEnd   DateTime
  score           Float
  volumeProxy     Float?
  geoHint         String?
  geoBucketKey    String?
  sourceType      String
  provenance      String // MOCK | AGGREGATE_PROXY | MODEL_HYPOTHESIS
  lastCrawledAt   DateTime
  stale           Boolean  @default(false)
  payloadJson     String?
  @@index([tag, timeBucketStart])
}

model VirtualEvent {
  id               String   @id @default(cuid())
  naturalKey       String   @unique
  catalogueEventId String?
  title            String
  category         String
  mode             String   // virtual|hybrid
  audienceJson     String
  audienceGeoJson  String?
  globalVirtual    Boolean  @default(true)
  streamOrAppHint  String?
  startAt          DateTime
  endAt            DateTime
  sourceType       String
  provenance       String
  lastCrawledAt    DateTime
  stale            Boolean  @default(false)
}

model ActivityChallenge {
  id                    String   @id @default(cuid())
  naturalKey            String   @unique
  title                 String
  platform              String   // strava|garmin|zwift|mock
  mode                  String   @default("virtual")
  windowStart           DateTime
  windowEnd             DateTime
  catalogueAffinityJson String?
  volumeProxy           Float?
  geoBucketKey          String?
  sourceType            String
  provenance            String // MOCK | AGGREGATE_PROXY
  lastCrawledAt         DateTime
  stale                 Boolean  @default(false)
  payloadJson           String?
  @@index([platform, windowStart])
}

model CatalogueJobRun {
  id           String    @id @default(cuid())
  job          String
  status       String
  startedAt    DateTime  @default(now())
  finishedAt   DateTime?
  upserted     Int       @default(0)
  errorMessage String?
}

model GraphEdge {
  id          String   @id @default(cuid())
  shopId      String
  fromType    String
  fromId      String
  toType      String
  toId        String
  relation    String
  weight      Float    @default(1)
  provenance  String
  payloadJson String?
  createdAt   DateTime @default(now())
  @@index([shopId, relation])
  @@index([fromType, fromId])
  @@index([toType, toId])
}

model EventCandidate {
  id               String   @id @default(cuid())
  shopId           String
  catalogueEventId String?
  name             String
  archetype        String
  timeStart        DateTime
  timeEnd          DateTime
  venueCity        String?
  venueCountry     String?
  driverIdsJson    String?
  enrichmentSource String
  nOrders          Int
  windowLabel      String?
  createdAt        DateTime @default(now())
  @@index([shopId])
}

model ConfidenceScore {
  id                   String   @id @default(cuid())
  eventCandidateId     String   @unique
  valuePct             Float
  value                Float
  Lt                   Float
  G                    Float
  A                    Float
  Y                    Float
  R                    Float
  baselinePct          Float
  competingJson        String
  provenanceLabelsJson String
  nOrders              Int
  windowStart          DateTime
  windowEnd            DateTime
}

model Persona {
  id                  String   @id @default(cuid())
  shopId              String
  primaryEventId      String?
  name                String
  status              String
  vertical            String
  goalsJson           String
  budgetMin           Decimal
  budgetMax           Decimal
  currencyCode        String   @default("GBP")
  constraintsJson     String
  behaviouralJson     String
  locationProxy       String?
  mockFlagsJson       String
  successCriteriaJson String
  avatarInitials      String?
  createdAt           DateTime @default(now())
  @@unique([shopId, name])
}

model AgentRun {
  id            String    @id @default(cuid())
  shopId        String
  personaId     String
  eventId       String?
  status        String
  outcome       String?
  startedAt     DateTime?
  endedAt       DateTime?
  progressPct   Int       @default(0)
  timelineJson  String?
  storefrontUrl String?
  errorMessage  String?
  @@index([shopId, startedAt])
}

model AffordanceScore {
  id           String @id @default(cuid())
  shopId       String
  personaId    String
  runId        String
  targetType   String
  targetRef    String
  score        Float
  evidenceJson String
  notes        String?
  @@index([runId])
}

model InsightScore {
  id           String @id @default(cuid())
  shopId       String
  personaId    String
  runId        String
  targetType   String
  targetRef    String
  score        Float
  insightKind String
  evidenceJson String
  notes        String?
  @@index([runId])
}

model Recommendation {
  id                   String   @id @default(cuid())
  shopId               String
  kind                 String
  priority             String
  title                String
  body                 String
  personaId            String?
  eventId              String?
  runId                String?
  targetType           String?
  targetRef            String?
  adminDeepLink        String?
  provenanceLabelsJson String
  confidence           Float?
  status               String   @default("open")
  createdAt            DateTime @default(now())
  @@index([shopId, priority])
}
```

---

## 8) Fixture file paths (author at build; shapes locked)

| Path | Shape |
|------|-------|
| `fixtures/orders/orders-demo.json` | `{ orders: OrderRow-like[] }` ≥40 orders |
| `fixtures/products/products-demo.json` | products + collections |
| `fixtures/catalogue/hashtag-watchlist.json` | HashtagWatch seed (**weekend hard P0** social watchlist · D33) |
| `fixtures/catalogue/web-harvest-allowlist.json` | Seed URLs/domains for `social.webHarvest` (no twitter/x hard targets) |
| `fixtures/catalogue/social-trends-mock.json` | MOCK SocialTrend series (path c) |
| `fixtures/catalogue/virtual-events-mock.json` | Virtual/hybrid MOCK |
| `fixtures/catalogue/activity-challenges.json` | ActivityChallenge MOCK |
| `fixtures/session/demo-shop.json` | DEMO_FIXTURE_SHOP session |
| `fixtures/catalogue/open-meteo-forecast-sample.json` | Offline OM 7d sample |
| `fixtures/catalogue/sports-mock.json` | `CatalogueEvent[]` ≥6 MOCK |
| `fixtures/catalogue/football-data-pl-sample.json` | raw API sample |
| `fixtures/graph/expected-scores.json` | `{ name, confidenceMin, confidenceMax, provenance }[]` |
| `fixtures/personas/demo.json` | Persona seed Away-day dad / First-time fan / stub |
| `fixtures/agents/path-football-merch.json` | selector hints / scripted path |
| `fixtures/agents/demo-completed-run.json` | AgentRunDTO MOCK |
| `fixtures/recommendations/demo.json` | RecommendationDTO[] |
| `fixtures/ui/*.json` | Overview/Events/Personas/Artifacts/Runs/Settings loaders |

---

## 9) Error code vocabulary

| Code | Where | UI |
|------|-------|-----|
| `AUTH_FAIL` | OAuth | Re-auth |
| `HTTP_429` | Shopify / FD | Banner Retry |
| `CIRCUIT_OPEN` | Catalogue | Degraded banner |
| `EMPTY_ORDERS` | Ingest success | EmptyState |
| `PCD_REDACTED` | Ingest geo null | Info banner |
| `PLAYWRIGHT` / `TIMEOUT` | Agents | Run failed |
| `STOREFRONT_UNREACHABLE` | Agents | failed + suggest MOCK replay |
