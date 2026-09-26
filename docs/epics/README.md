# Syndicate epics — agent build pack

**Product:** Syndicate (sports + athleisure occasion-commerce intelligence for Shopify Admin)  
**Locale:** British English · Europe/London (BST)  
**Visual source of truth:** `/workspace/cursor-commerce-hackathon/ui/*.html` + `ui/styles.css`  
**Planning sources:** `COMBINED_PLAN.md`, `MVP_ARCHITECTURE.md`, `PLANNING_BRIEF_SHOPIFY_EVENTS.md`, `SPORTS_EVENT_GRAPH_PIPELINE.md`, `ui/SCOPE_UI.md`

These specs are written so a Cursor cloud agent can implement the happy path **without asking Austin clarifying questions**. Remaining ambiguity lives under **Open questions** in each epic — use the **Pragmatic defaults** below when blocked.


---

## Cursor-first build

Austin: use **Cursor tools as much as possible**. Full policy: [`../scope/CURSOR_TOOLING.md`](../scope/CURSOR_TOOLING.md).

1. **SoT:** this repo on Origin (`hugeinc/tmp-493181d83584bec6`) — epics + `scope/` + `ui/`. No parallel GitHub-required workflow for planning SoT.
2. **BUILD GREENLIT.** Start at [`../scope/AGENT_KICKOFF.md`](../scope/AGENT_KICKOFF.md) and launch **Cursor Cloud Agents on Origin** using `PROMPTS/01.md`…`09.md` — prefer Cloud Agent over local greenfield for each epic slice. Hard DoD: [`../scope/LIVE_DATA_WIRE.md`](../scope/LIVE_DATA_WIRE.md).
3. **Per epic:** attach the epic md + matching `PROMPTS/0N.md` + AGENT_KICKOFF (+ `UI_SCREEN_SPECS.md` for UI; `../scope/CONTRACTS.md` / `AUTO_PIPELINE_ON_INSTALL.md` when touching data/pipeline). Follow Implementation checklist; tick Acceptance criteria and DoD.
4. **Order:** `01 → (02 ∥ 03) → 04 → 05 → (06 ∥ 07) → 08 → 09`. One epic ≈ one agent-sized PR slice.
5. **Commits:** Origin / CloudAgent / `origin` CLI.
6. **Runtime honesty:** Cloud Agents **build** the app; they do **not** run merchant `PipelineRun`s. Product shoppers stay **Playwright** unless a documented Cursor Browser Agent API exists (optional future swap only).

---

## How a coding agent should use these specs

1. **Read this README first**, then `UI_SCREEN_SPECS.md` before any UI work.
2. **Implement epics in dependency order** (below). Do not start Playwright agents before ingest + catalogue + graph scoring produce Events/Personas.
3. **One epic = one PR-sized slice.** Finish Acceptance criteria checkboxes before moving on.
4. **Follow each epic’s Implementation checklist in order** — it is the build script.
5. **Copy tone:** British English in all merchant-facing strings. Provenance badges are non-negotiable: `OBSERVED` | `AGGREGATE PROXY` | `MODEL HYPOTHESIS` | `MOCK` (UI short forms: Obs / Agg / Hyp / Mock).
6. **Visual system:** canvas `#f3f0eb`, surfaces `#ffffff` (`ui/styles.css` wins), charcoal top bar `#292524`, kit-stripe monogram (kit-red / cream / navy), **green `#008060` for primary CTAs only**. Do not invent a generic AI-dashboard look.
7. **Tech constraints (global):** Remix Shopify app · SQLite (Prisma) for hackathon · Playwright **stop before payment** · OAuth scopes `read_orders,read_products,read_customers` · no wealth APIs · no parkrun live scrape · **AI = optional thin LLM naming/polish only** (templates first; no LangGraph / no LLM Playwright) — `../scope/AI_CALL_CONTRACT.md`.
8. **When UI and backend conflict:** UI layout/copy follows HTML prototype; data shapes follow epic Data model sections.
9. **Fixtures first (into DB):** if no live Shopify/dev-store data, **seed** epic Fixtures into SQLite so the demo path still works via the **same** Prisma loaders — never route-import JSON for the primary board ([LIVE_DATA_WIRE](../scope/LIVE_DATA_WIRE.md)).
10. **Auto pipeline is non-optional for live:** after real OAuth, implement PipelineRun stages a→f. Do **not** ask “should agents auto-run?” — yes, capped (D26). Do **not** leave the merchant on empty fixtures after live connect.
11. **UI polish:** implement [`../scope/UI_INTERACTION_CONTRACT.md`](../scope/UI_INTERACTION_CONTRACT.md) in epics 08/09 — **no inventing** hover/focus/toast/banner/empty chrome states. Tick [`UI_POLISH_CHECKLIST.md`](./UI_POLISH_CHECKLIST.md). D29: nav **Insights**; board **Insights | Frictions**.

### Pragmatic defaults (if blocked)

| Decision | Default |
|----------|---------|
| Demo vertical | **Harbour Run / running** primary; football merch fixtures = legacy MOCK label only |
| Checkpoint | Agents stop at **checkout start** (no payment) |
| Graph store | SQLite tables + `edges` JSON |
| Prior-year Y in confidence | Neutral `0.5` within 60d window; label in UI |
| Live APIs | football-data.org (PL) + Open-Meteo; all else MOCK JSON |
| Agent autonomy | Scripted Playwright paths + thin LLM for naming/blurbs only (see `../scope/AI_CALL_CONTRACT.md`; templates default) |
| Fashion persona | Greyed stub (“Anniversary night-out”) — non-interactive |
| Personas (A6) | **Two full + fashion stub**; Taper-week runner = optional stretch, not DoD |
| Demo data (A5) | **Hybrid** — live orders/products when ≥20 orders; else fixtures |
| Social (A15) | Watchlist + **`social.webHarvest`** public allowlist + MOCK; no unofficial X scrape; official X/Reddit P2 only |
| Auto pipeline on live OAuth | **Mandatory** (store makeup → graph → personas → capped agents). See `../scope/AUTO_PIPELINE_ON_INSTALL.md` |
| Auto agents | **Yes capped** (≤3, concurrency 1); Settings Pause toggle; default ON (D26) |

---

## Epic dependency order

```
01 Install / OAuth / shell
        │
        ├──────────────────────┐
        ▼                      ▼
02 Shopify ingest      03 Event catalogue job
        │                      │
        └──────────┬───────────┘
                   ▼
         04 Graph + confidence
                   │
                   ▼
              05 Personas
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
06 Synthetic agents   07 Recommendations / fixes
         │                   │
         └─────────┬─────────┘
                   ▼
            08 Admin UI  ←── also needs 09 for empty/loading/error
                   │
                   ▼
      09 Settings + empty states
```

| Order | File | Depends on | Delivers |
|-------|------|------------|----------|
| 1 | `01-install-oauth-shell.md` | — | Remix app, OAuth, App Bridge shell, Shop model |
| 2 | `02-shopify-ingest.md` | 01 | Orders / products / collections / geo → SQLite |
| 2 | `03-event-catalogue-job.md` | 01 | Live fixtures + weather Drivers + MOCK sports seed |
| 3 | `04-graph-and-confidence.md` | 02, 03 | Edges, EventCandidates, confidence % |
| 4 | `05-personas.md` | 04 | 2–3 personas linked to events |
| 5 | `06-synthetic-agents.md` | 05 | Playwright runs, Affordance/Insights scores |
| 5 | `07-recommendations-fixes.md` | 06 (scores) or 04 (merch-only) | P0–P2 fix / merch / collection cards |
| 6 | `08-admin-ui.md` | 04–07 for Prisma data; chrome earlier OK; **loaders Prisma-only** (LIVE_DATA_WIRE) | All demo screens |
| 7 | `09-settings-empty-states.md` | 01, 08 | Settings + empty/loading/error patterns |

**Parallelisation tip:** After 01, agents can build **02** and **03** in parallel. After 04, **05** then **06∥07**. **08** can start shell chrome as soon as 01 lands; **Prisma loaders** are the Vertical slice wire gate — UI cannot merge fixture-only Insights.

---

## Full install → recommendation path (must work end-to-end)

1. Merchant installs app → OAuth (`read_orders,read_products,read_customers`) → Connected pill → **PipelineRun `install` enqueued (live)**.
2. **Stage a:** ingest ≤60d + **StoreMakeupSnapshot**; **b:** OBSERVED graph seed; **c:** catalogue (football + Open-Meteo + social watchlist/webHarvest/MOCK + virtual/activity) scoped to store geos/affinity.
3. **Stage d:** graph join + confidence → EventCandidates (e.g. Race-day home kit rush @ 0.82 Obs).
4. **Stage e:** personas from **store-backed** graph → Race-day taper / Wet-weather trainer (Ready/Draft).
5. **Stage f:** auto-queue capped Playwright agents (or skip if Pause auto agents) → home → collection → PDP → ATC → checkout start → stop. Manual **Run agents** still available.
6. Insights board shows Insights | Frictions; Recommendations emit P0–P2 cards with provenance.
7. Demo narrates *why this weekend* without leaving Admin.

**Canonical spec:** `../scope/AUTO_PIPELINE_ON_INSTALL.md` + `../scope/SEQUENCE_INSTALL_TO_RECOMMENDATION.md` §0.

---

## Definition of Done — whole MVP

All of the following must be true for the hackathon demo:

- [ ] App installs on a Shopify dev store via OAuth; session persists; shop domain shown in top bar.
- [ ] Scopes exactly: `read_orders,read_products,read_customers` (no write_*, no pixels, no read_all_orders).
- [ ] Orders (≤60d), products, collections ingested into SQLite; PII minimised (hash customer GIDs; no street storage).
- [ ] Live: football-data.org PL fixtures (token via env) **or** graceful fallback to last-good + MOCK with banner.
- [ ] Live: Open-Meteo weather Drivers for top order cities (AGGREGATE PROXY) **or** labelled MOCK weather.
- [ ] Social: hashtag watchlist + webHarvest and/or MOCK SocialTrend; never OBSERVED demand from social alone; no unofficial X scrape.
- [ ] MOCK seed present: UK race weekend, Hyrox-style meet, parkrun-shaped weekly, virtual challenge, season drop — all labelled MOCK.
- [ ] ≥2 EventCandidates with confidence breakdown (Lt, G, A, Y, R) and provenance badges.
- [ ] ≥2 Personas (A6: two full + fashion stub; runner stretch optional) with goals, AOV-band budget (not income), device, constraints; fashion stub greyed.
- [ ] ≥2 Playwright agent runs complete with outcome `carted` or `checkout_started`; **never** submit payment.
- [ ] AffordanceScore + InsightScore persisted; Insights | Frictions board showable.
- [ ] ≥3 Recommendation cards (insight / merch / collection) with provenance + optional Admin deep links.
- [ ] All screens in `UI_SCREEN_SPECS.md` render in Remix routes with Polaris; visual system matches prototype.
- [ ] Empty, loading, and error states exist for Settings sync and zero-order shops.
- [ ] British English copy throughout; enrichment legend modal available from Overview/Settings.
- [ ] Demo path Overview → Event → Persona → Run → Insights runnable in ≤7 minutes without clarifying questions.
- [ ] Interaction Contract + `UI_POLISH_CHECKLIST.md` passed for epics 08/09.
- [ ] **Auto pipeline (non-optional live):** after live OAuth, PipelineRun runs store makeup → graph seed → catalogue → score → personas → capped agents (or agents skipped only via Settings pause).
- [ ] Settings shows demo vs live, pipeline stage strip, Refresh store + re-run, Pause auto agents.
- [ ] Live connect does **not** leave merchant on empty fixture Overview.
- [ ] **Live data wire (hard DoD):** after `db:seed` + `pipeline:demo` (or equiv.), Overview KPIs + Events list + Insights | Frictions board populate from **SQLite via Prisma** without Partner; no `import demo.json` in primary board routes — [`../scope/LIVE_DATA_WIRE.md`](../scope/LIVE_DATA_WIRE.md).

**Out of MVP DoD (explicit non-goals):** wealth APIs, pixels, Neo4j, App Store polish, completing checkout, parkrun live scrape, **unofficial Strava private-athlete scrapes** (curated/MOCK ActivityChallenge + optional OAuth club aggregates are in — D31), paid Hyrox API dependency.

---

## File index

| Path | Role |
|------|------|
| `README.md` | This index |
| `UI_SCREEN_SPECS.md` | Every screen: routes, wireframes, Polaris, loaders, ACs |
| `UI_POLISH_CHECKLIST.md` | Printable weekend QA derived from Interaction Contract |
| `../scope/UI_INTERACTION_CONTRACT.md` | Interaction polish SoT (states, toasts, banners, a11y) |
| `01-install-oauth-shell.md` | Install, OAuth, app chrome |
| `02-shopify-ingest.md` | Admin GraphQL ingest |
| `03-event-catalogue-job.md` | football-data + Open-Meteo + MOCK catalogue |
| `04-graph-and-confidence.md` | Graph edges + confidence model |
| `05-personas.md` | Persona derivation |
| `06-synthetic-agents.md` | Playwright shoppers |
| `07-recommendations-fixes.md` | Fix / merch / collection cards |
| `08-admin-ui.md` | Primary UI epic — screens to build/show |
| `09-settings-empty-states.md` | Settings + empty/loading/error + pipeline status |
| `PROMPTS/01.md` … `09.md` | Paste-ready Cloud Agent kickoff prompts |
| `../scope/AGENT_KICKOFF.md` | **Weekend entry** — BUILD GREENLIT |
| `../scope/LIVE_DATA_WIRE.md` | **Hard DoD** — UI↔SQLite↔Events/Insights single read/write path |
| `../scope/AUTO_PIPELINE_ON_INSTALL.md` | **Mandatory** live auto pipeline (store→graph→personas→agents) |

