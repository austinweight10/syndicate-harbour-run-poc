# Epic 09 — Settings + empty / loading / error states

## Goal (1 paragraph)
Ship a Settings screen and shared empty/loading/error patterns so operators can see connection status, **demo vs live mode**, **PipelineRun progress** (store makeup → graph → events → personas → agents → recommendations ready), sync metadata, **Pause auto agents** toggle, **LLM polish card (Templates default)**, compliance/attribution, and so zero-order shops, rate limits, and not-wired features fail honestly — matching `ui/settings.html`, SCOPE_UI, and **Banner/Toast catalogues** in [`../scope/UI_INTERACTION_CONTRACT.md`](../scope/UI_INTERACTION_CONTRACT.md) — without blocking the happy-path demo. DoD includes [`UI_POLISH_CHECKLIST.md`](./UI_POLISH_CHECKLIST.md).

## Why it exists
Demos break on edge cases. Judges also look for ethical framing (labels, attribution). Settings + state patterns prove production conscience inside a hackathon MVP.

## Dependencies (other epic IDs)
- **01** Shop session + Connected pill.
- **02** SyncRun metadata for last sync.
- **03** Catalogue job status / attribution strings.
- **08** Shared Modal/Banner/EmptyState components and route `/app/settings`.

## Out of scope
- Full sync-rule builder / webhook management UI.
- Billing plans.
- Merchant-editable enrichment toggles that persist (show stubs only).
- Real PDF export implementation.

## User / system stories (Given/When/Then)
1. **Given** connected shop, **When** Settings opens, **Then** DescriptionList shows shop domain, scopes, last sync time, order count, catalogue sources.
2. **Given** no custom sync rules, **When** Rules section renders, **Then** EmptyState “No custom sync rules yet” with secondary CTAs.
3. **Given** user opens Loading example, **When** modal opens, **Then** skeleton shimmer bars display (maps to Polaris Skeleton*).
4. **Given** sync 429, **When** error surfaced, **Then** critical Banner “API 429” with Retry / Dismiss.
5. **Given** zero orders after sync, **When** Overview loads, **Then** empty insight state guides “Seed demo fixtures” or “Wait for orders” — no blank tables crash.
6. **Given** Export brief on Insights, **When** clicked, **Then** ExportNotWiredModal “Not wired in this build”.
7. **Given** live PipelineRun active, **When** Settings/Overview load, **Then** stage strip shows current label (Ingesting store makeup… → … → Recommendations ready) and failed stage surfaces with Resume.
8. **Given** merchant toggles **Pause auto agents**, **When** saved, **Then** `ShopSettings.agentsAutoRun=false` and future `agents_queue` stages skip; existing running AgentRun finishes but no new auto queues.
9. **Given** merchant clicks **Refresh store + re-run**, **When** action fires, **Then** PipelineRun `trigger=manual_refresh` enqueues (idempotent one-active-per-shop).

## Data model (tables/fields or TypeScript interfaces)
```ts
type SettingsLoader = {
  shop: {
    domain: string;
    connected: boolean;
    scopes: string[];
    installedAt: string;
    storefrontUrl?: string;
  };
  sync: {
    status: string;
    finishedAt?: string;
    ordersUpserted?: number;
    productsUpserted?: number;
    errorCode?: string;
  } | null;
  catalogue: {
    football: { status: string; lastAt?: string; degraded: boolean };
    weather: { status: string; lastAt?: string; forecastDays?: number };
    social: { status: string; lastAt?: string; watchlistCount?: number; mode: "curated_mock" | "api_enriched" };
    mockSeed: { loaded: boolean; count: number };
  };
  compliance: {
    stopBeforePay: true;
    provenanceLegend: true;
    openMeteoAttribution: string;
    footballDataAttribution: string;
  };
  mode: "demo" | "live";
  pipeline: {
    id: string | null;
    status: string | null;
    currentStage?: string;
    stageLabel?: string;
    stages: { stage: string; status: string }[];
    agentsAutoRun: boolean;
    errorCode?: string;
  };
  storeMakeup?: { capturedAt: string; ordersInWindow: number; productsActive: number; emptyOrders: boolean } | null;
};
```

Reuse SyncRun / CatalogueJobRun / PipelineRun / StoreMakeupSnapshot / ShopSettings from CONTRACTS + epics 02–03; Settings is the operator surface for the auto pipeline.

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- `GET /app/settings` loader → SettingsLoader.
- `POST /app/settings/resync` → enqueue ingest (Epic 02).
- `POST /app/settings/recatalogue` → enqueue catalogue jobs (Epic 03).
- `POST /app/settings/recompute` → graph+personas (04–05) optional.
- `POST /app/settings/refresh-store` → full PipelineRun `manual_refresh`.
- `POST /app/settings/agents-auto-run` `{ enabled }` → Pause auto agents (D26).
- `POST /app/settings/pipeline-resume` → resume from lastSuccessfulStage.
- Retry action clears error banner and requeues.

## UI (if any) — screens, components, copy samples British English
**Ref:** `ui/settings.html`.

### Settings layout
- Page title: “Settings”
- Card **Connection**: DL — Shop, Scopes, Installed, Storefront URL, Status Connected.
- Card **Sync**: last run, counts, Re-scan orders button (enabled when not running; label **“Syncing…”** while running).
- Card **Pipeline**: demo vs live pill; stage checklist; **Refresh store + re-run** (confirm modal M06 → toast T05); **Pause auto agents** toggle (**instant**, no confirm → T03/T04); Resume on failure → T06.
- Card **Catalogue sources** / **signal sources**: football-data.org, Open-Meteo **7-day forecasts**, social/hashtag buzz (curated watchlist · optional API · MOCK), MOCK sports seed — with provenance (D30 / SIGNAL_SOURCES).
- Card **Recommendation / naming polish (LLM)**: Templates **default** · optional OpenAI / Anthropic · Hyp provenance · quiet note B07 — must not contradict `AI_CALL_CONTRACT.md`.
- Card **Compliance**: stop-before-pay; enrichment labels link; “No wealth or credit APIs”.
- Card **Sync rules**: EmptyState.

### Copy samples
- Empty: “No custom sync rules yet. Syndicate syncs orders and calendars with sensible defaults.”
- Loading modal title: “Syncing catalogue…”
- Error: “Shopify rate-limited this sync (HTTP 429). Wait a moment and retry.”
- Attribution: “Weather forecasts © Open-Meteo contributors (observed payloads; spike drivers labelled aggregate). Social buzz via curated watchlist / optional APIs / MOCK — aggregate geo only, no customer profiling. Fixtures via football-data.org when configured.”
- Zero-order Overview: “No orders in the last 60 days yet. Connect a busier store or load demo fixtures.”

### Shared components to export
- `EnrichmentLegendModal` (M01)
- `ExportNotWiredModal` (M02)
- `LoadingExampleModal` (M03)
- `Error429Modal` (M04) / `ErrorBanner429` (B01)
- `ConfirmRefreshStoreModal` (M06) — **not** Confirm Pause
- `SyndicateEmptyState` · `SyndicateSkeletonBlock` · `SyndicateBanner` (tones)
- Toast helpers bound to catalogue IDs T01–T12
- Focus-visible + disabled wrappers for Button / IconButton / FilterPill / EntityCard

## Algorithms / heuristics (formulas, thresholds)
- Treat SyncRun `failed` + `errorCode=HTTP_429` as rate-limit pattern.
- Catalogue `degraded=true` if circuit open or last success > 48h for fixtures.
- Disable Re-scan while status `running`.

## Ethics / provenance labels required
- Compliance card always visible.
- Attribution for Open-Meteo + football-data.
- Explicit “No wealth / sensitive demographic APIs in MVP”.

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Polaris EmptyState, SkeletonPage/BodyText, Banner, Modal, DescriptionList.
- Actions must authenticate.admin.
- Do not expose access tokens in Settings UI.

## Acceptance criteria (checkbox list, testable)
- [ ] `/app/settings` renders Connection + Sync + Pipeline + Catalogue + **LLM polish (Templates default)** + Compliance + Empty rules.
- [ ] Re-scan enqueues SyncRun and button disables while running (“Syncing…”).
- [ ] EmptyState visible for sync rules (copy from Interaction Contract §G R9-E).
- [ ] Loading modal/skeleton pattern available (demo button OK on Settings) — M03; reduced-motion static.
- [ ] Error banner / modal pattern for 429 with Retry — B01 / M04.
- [ ] Export not-wired modal from Insights — M02.
- [ ] Zero-order empty path on Overview does not throw — B03 / R1-E.
- [ ] Banner catalogue B01–B08 and Toast catalogue T01–T12 used; **no invented** chrome copy.
- [ ] Pause is instant (no confirm); Refresh store uses M06 confirm.
- [ ] Tokens never rendered in HTML.
- [ ] British English copy.
- [ ] Matches prototype tone in `settings.html`.
- [ ] Demo vs live mode indicator visible.
- [ ] Pipeline stage strip + Refresh store + re-run + Pause auto agents wired.
- [ ] Partial/failed PipelineRun shows failed stage + Resume.
- [ ] [`UI_POLISH_CHECKLIST.md`](./UI_POLISH_CHECKLIST.md) Settings + banner/toast rows ticked.

## Implementation checklist for a coding agent (ordered steps)
1. Create `/app/settings` route + SettingsLoader.
2. Build Connection DescriptionList from Shop model.
3. Wire Sync card to latest SyncRun + resync action.
3b. Wire Pipeline card (mode, stages, refresh-store, agents-auto-run, pipeline-resume).
4. Wire Catalogue status from CatalogueJobRun + attributions.
5. Build Compliance card + reuse EnrichmentLegendModal.
6. Implement EmptyState for rules.
7. Implement Loading and Error modals as Patterns (M03/M04; prototype demo triggers — keep for judges).
7b. Wire ConfirmRefreshStoreModal (M06); ensure Pause has **no** confirm.
7c. Add LLM polish card (Templates default / B07 quiet note).
8. Add Overview zero-order empty branch.
9. Add Insights export empty modal (M02).
10. QA: disconnect token from UI; verify retry path with mocked failed SyncRun.

## Fixtures / seed data required
- `fixtures/ui/settings.json` — connected demo shop meta.
- Mock failed SyncRun row for error demo (`errorCode=HTTP_429`).

## Test plan
- Loader unit: connected shop → expected DL fields.
- Action: resync creates pending SyncRun.
- Manual: trigger error fixture → banner → Retry.
- Security: snapshot Settings HTML contains no `shpat_` / access token strings.

## Open questions
1. Keep prototype “open loading/error examples” demo buttons in production Settings? → **Yes for hackathon**; hide behind `DEMO_STATE_PLAYGROUND=1` if noisy.
2. PCD redaction banner? → Show info Banner if geo fields null after sync.
