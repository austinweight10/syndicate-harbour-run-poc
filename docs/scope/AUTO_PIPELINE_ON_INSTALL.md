# AUTO_PIPELINE_ON_INSTALL — store makeup → graph → personas → agents

**Date:** 22 Sep 2026 · Europe/London  
**Status:** **Non-optional for MVP** — bake into every live connect. Docs only; no app code in this folder.  
**Audience:** coding agents implementing epics 01–09  
**Companion:** [SEQUENCE_INSTALL_TO_RECOMMENDATION.md](./SEQUENCE_INSTALL_TO_RECOMMENDATION.md) · [CONTRACTS.md](./CONTRACTS.md) · [DATA_DICTIONARY.md](./DATA_DICTIONARY.md)

---

## Why this exists

Austin’s constraint: when Syndicate is spun up against a **real shop**, the system must **inspect the makeup of that store**, **populate the graph** with that data, **run the persona pipeline from the graph**, and **kick off synthetic agents** with **clear, named triggers** — not mysterious background chaos, and not leave the merchant on an empty fixture Overview after OAuth.

A coding agent reading this doc + SEQUENCE + epic DoDs **must not ask** “should this auto-run?” — the answer is **yes, capped, ordered, idempotent**.

---

## Modes: `demo` vs `live`

| Mode | When | Behaviour |
|------|------|-----------|
| **`demo`** | `DEMO_FIXTURE_SHOP=1` and/or `USE_ORDER_FIXTURES=1` **and** no successful live OAuth session for a real shop | Fixtures / seed JSON only. **No** live Admin GraphQL jobs. **No** Playwright against a real storefront unless explicitly triggered with a MOCK replay path. Overview may show pre-seeded Events/Personas/Artifacts. PipelineRun is **not** required. |
| **`live`** | Successful OAuth → Shop row with offline token + scopes | **Must** create/enqueue a `PipelineRun` and execute stages a→f below. Fixtures may still backfill empty gaps (labelled MOCK) but **must not** replace OBSERVED store makeup when live ingest succeeds. |

**Switch rule:** first successful auth for a shop domain → mode=`live`. Settings shows a clear **Demo data** vs **Live shop** indicator (Epic 09). Reconnect after uninstall → new `PipelineRun` (new idempotency epoch).

---

## Ordered stages (a → f) — mandatory on live connect

On **successful OAuth / first live connect**, the app **automatically queues** one `PipelineRun` and executes stages **in order**. Each stage is **idempotent**. Workers must not skip ahead if a prior stage failed (except documented soft-degrade paths).

| Stage | Code | Job / service | Produces | UI status label |
|-------|------|---------------|----------|-----------------|
| **a** | `store_makeup` | `pipeline.storeMakeup` (part of / immediately after ingest) | `StoreMakeupSnapshot` | **Ingesting store makeup…** |
| **b** | `graph_seed` | Persist OBSERVED nodes/edges from snapshot + order window | GraphEdge / Order / Product / Collection / Geo | **Seeding graph…** |
| **c** | `catalogue_refresh` | Event catalogue refresh **scoped** to store geos + catalogue affinity | CatalogueEvent / Driver upserts | **Refreshing events…** |
| **d** | `score_link` | `graph.buildAndScore` — confidence + linking | EventCandidate + ConfidenceScore | **Scoring occasions…** |
| **e** | `personas` | `personas.derive` from high-confidence subgraphs | Persona (2–3) + PERSONA_OF | **Materialising personas…** |
| **f** | `agents_queue` | Queue capped AgentRuns for Ready personas | AgentRun `queued` → worker | **Agents running…** → **Recommendations ready** |

### Stage a — Store makeup snapshot (exact fields)

`StoreMakeupSnapshot` is a **first-class artifact** (see DATA_DICTIONARY). Built from Admin GraphQL products/collections + ≤60d orders (cap ~500). All fields OBSERVED unless noted.

```ts
interface StoreMakeupSnapshot {
  id: string;                 // cuid
  shopId: string;
  pipelineRunId: string;
  capturedAt: string;         // ISO
  windowDays: number;         // 60
  // Catalogue makeup
  collections: { id: string; title: string; handle?: string; productCount: number }[];
  productTypes: { type: string; count: number }[];       // top N by product count
  tags: { tag: string; count: number }[];                // top N product tags
  // Order / demand makeup
  orderSkuMix: { productId?: string; sku?: string; title: string; units: number; revenue: number }[]; // top N
  priceBands: { band: string; min: number; max: number; orderCount: number }[]; // e.g. "0-25","25-50","50-100","100+"
  topCollectionsByUnits: { collectionId: string; title: string; units: number }[];
  // Geo buckets (city/sector only — no street)
  geoBuckets: { city?: string; provinceCode?: string; countryCode: string; postalSector?: string; orderCount: number }[];
  // Roll-ups
  totals: {
    ordersInWindow: number;
    productsActive: number;
    collections: number;
    distinctSkusSold: number;
    aovP25: number; aovP50: number; aovP75: number;
    currencyCode: string;
  };
  emptyOrders: boolean;
  provenance: "OBSERVED";
}
```

**Hackathon caps:** top **20** SKUs, **15** tags, **10** productTypes, **10** collections, **15** geo buckets, **4** price bands.

### Stage b — Persist OBSERVED graph from snapshot + orders

- Upsert GraphEdges: `CONTAINS` (Order→SKU), `SHIPPED_TO` (Order→Geo), collection membership, tag/type affinity stubs.
- Map snapshot collections / tags / types / price bands into graph payload (edge `payloadJson` or lightweight `CatalogueAffinity` nodes — implementer’s choice; **must** be queryable by scorer).
- **Invariant:** after a successful live PipelineRun reaching `graph_seed`, the shop **must not** have an empty graph solely because “fixtures weren’t loaded.”

### Stage c — Catalogue refresh (scoped)

- Prefer cities from `geoBuckets` (top ≤3–5); else London / Manchester / Birmingham defaults.
- Prefer football-data / MOCK events whose audience/tags overlap `productTypes` + affinity dictionary (kit, race, trainers, …).
- **Sub-jobs (P0 — see SIGNAL_SOURCES.md / D30 / D31):**
  1. `catalogue.mock_sports_seed` (physical + hybrid seeds; `mode` on every row)
  2. **`catalogue.virtual_events_seed`** — VirtualEvent / CatalogueEvent `mode=virtual|hybrid` (streams, Zwift-style, class drops, online series) — MOCK/curated
  3. `catalogue.football_fixtures` (soft-degrade if no token)
  4. **`weather.forecastLocal`** — 7-day Open-Meteo forecast per GeoBucket → WeatherForecast upsert + spike Drivers
  5. **`social.hashtagTrends`** — HashtagWatch from curated JSON + SocialTrend (MOCK if thin)
  5b. **`social.webHarvest`** — public allowlist pages → SocialTrend AGGREGATE_PROXY (robots.txt; soft-degrade; **not** X keys as primary)
  6. **`catalogue.activity_challenges`** — ActivityChallenge curated/MOCK Strava-shaped + optional Drivers; optional Strava OAuth club aggregates (A16)
- Prefer events whose `mode` + audience/tags overlap store affinity; virtual rows bind audience GeoBuckets ∪ **`global/virtual`**.
- Soft-degrade: if FD token missing → MOCK fixtures + degraded banner; weather/social/virtual/activity keep last-good or MOCK labelled; **do not** fail the whole PipelineRun if Strava OAuth absent.

### Stage d — Confidence scoring / linking

- Run `graph.buildAndScore(shopId)` as today (Epic 04).
- Soft-degrade: zero EventCandidates → personas stage may emit **zero** sport personas (no hallucination) but fashion stub still OK; PipelineRun continues with `personas` partial + Overview EmptyState.

### Stage e — Materialise 2–3 personas

- Run `personas.derive(shopId)` from **store-backed** high-confidence subgraphs (not fixture-only when live ingest succeeded).
- Upsert ≥2 Ready/Draft when signal exists; always fashion stub.

### Stage f — Queue synthetic agents (capped)

- For each Persona with `status=ready` (max **3**), insert `AgentRun` `queued` **iff** Settings `agentsAutoRun !== false` (default **true** for live wow).
- Concurrency: **1** Playwright run machine-wide.
- Stop-before-payment unchanged.
- Do **not** spawn unbounded swarms; do **not** re-queue the same persona while a run for that persona is `queued` or `running` (idempotency key: `pipelineRunId + personaId` for auto-enqueue).

---

## Triggers (named — no mysterious chaos)

| Trigger | Creates PipelineRun? | Notes |
|---------|----------------------|-------|
| **Install complete** (OAuth success, first Shop upsert) | **Yes** — `trigger=install` | Primary path |
| **Reconnect** (re-auth after uninstall / token refresh success) | **Yes** — `trigger=reconnect` | New run; do not silently overwrite prior run history |
| **Manual “Refresh store + re-run”** in Settings | **Yes** — `trigger=manual_refresh` | Button copy exact; disables while PipelineRun `running` |
| **Nightly / periodic refresh** | Optional for hackathon — `trigger=scheduled` | If implemented: ≤1× / 24h; skip if last success &lt; 12h |
| Merchant clicks **Run agents** on Overview | No new PipelineRun | Enqueues AgentRuns only (existing Epic 06 path) |
| `demo` mode boot | No live PipelineRun | Fixture seed scripts only |

Every auto job must log `pipelineRunId` + `stage` + `trigger`. UI must never imply “something is happening” without a PipelineRun / stage chip.

---

## What does NOT auto-start

- Unbounded agent swarms / parallel Playwright farms  
- Payment / Buy it now / Shop Pay submit  
- Writing to the live storefront (no theme edits, no Admin write_*)  
- Fetching PCD beyond plan (no street, email, phone, names; no wealth APIs)  
- Live parkrun / CrossFit scrapes  
- Unofficial Twitter/X scrapes that break ToS; individual social profiling of customers  
- Auto-dismiss of Recommendations  
- Overwriting OBSERVED rows with MOCK when live ingest succeeded  

---

## UI feedback (Settings + Overview)

Progress states — single ordered strip (British English):

1. **Ingesting store makeup…**  
2. **Seeding graph…**  
3. **Refreshing events…**  
4. **Scoring occasions…**  
5. **Materialising personas…**  
6. **Agents running…**  
7. **Recommendations ready**

- Overview: show current stage under Connected pill while PipelineRun `status` ∈ `pending|running`.  
- Settings: Pipeline card with stage checklist, last error, **Pause auto agents** toggle, **Refresh store + re-run** CTA.  
- Partial success: completed stages stay ✓; failed stage shows error + **Resume** (requeues from last successful stage).

---

## Failure / partial / resume

| Situation | Behaviour |
|-----------|-----------|
| Stage fails (429, timeout, Playwright crash) | PipelineRun `status=failed` or `partial`; `failedStage` + `errorCode` set; prior stage artifacts **kept** |
| Resume / Retry | Start from **next stage after lastSuccessfulStage** (do not wipe OBSERVED orders) |
| Empty orders | Stage a succeeds with `emptyOrders=true`; stages b–e may be thin; offer “Load demo fixtures” CTA; agents may no-op if no Ready personas |
| Uninstall mid-pipeline | Cancel queued AgentRuns; PCD wipe as SEQUENCE |

---

## Idempotency

| Key | Rule |
|-----|------|
| PipelineRun create on install | `shopId + trigger + installEpoch` where installEpoch = `Shop.installedAt` ISO day or token fingerprint — **one active run per shop** (`pending`/`running`); duplicate enqueue returns existing id |
| Stage execution | `pipelineRunId + stage` — skip if stage already `success` |
| StoreMakeupSnapshot | Upsert by `pipelineRunId` (one snapshot per run) |
| Auto AgentRun | `pipelineRunId + personaId` — at most one auto-queued row |

---


---

## Cloud Agents vs app workers (do not confuse)

| | Cursor **Cloud Agents** (build) | Syndicate **PipelineRun** workers (runtime) |
|--|--------------------------------|---------------------------------------------|
| Role | Implement epics on Origin | Execute stages a→f after live OAuth / Refresh |
| Runs merchant PipelineRuns? | **No** | **Yes** |
| Runs Playwright shoppers? | Only while **authoring** runner code | **Yes** (capped AgentRuns) |

Pipeline jobs (`pipeline.storeMakeup`, `graph.buildAndScore`, `personas.derive`, `agents:run`, …) are **application workers** inside the Remix/Node process topology — **not** Cursor Cloud Agents at runtime. See [CURSOR_TOOLING.md](./CURSOR_TOOLING.md).

## Coding-agent mandate (non-negotiable)

1. After live OAuth success → **enqueue PipelineRun** (do not leave merchant on empty fixture UI).  
2. Implement stages a→f in order with status updates.  
3. Agents auto-queue only when personas materialise **and** Settings pause is off **and** caps respected.  
4. Surface progress in Settings/Overview.  
5. Do not invent a second parallel “background chaos” path outside PipelineRun.

**See also:** epic DoD updates in `01`, `02`, `04`, `05`, `06`, `09` and `epics/README.md`.
