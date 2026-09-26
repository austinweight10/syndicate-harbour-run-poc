# Epic 08 — Admin UI (PRIMARY UI epic)

## Goal (1 paragraph)
Build every merchant-facing Remix + Polaris screen mapped from `ui/SCOPE_UI.md` and the polished HTML prototype so the sports/athleisure demo can be shown end-to-end in Admin: Overview → Events → Event detail → Personas → Persona detail → Agent runs → **Insights**, with warm canvas (`#f3f0eb`), charcoal kit-stripe chrome, green CTAs only, provenance badges, and British English copy — wired to **Prisma-only** loaders from epics 02–07 (**fixtures only via DB seed** — never `import` fixture JSON in the route for the primary board; see [`../scope/LIVE_DATA_WIRE.md`](../scope/LIVE_DATA_WIRE.md)). **Must implement** [`../scope/UI_INTERACTION_CONTRACT.md`](../scope/UI_INTERACTION_CONTRACT.md) in full (state matrix, toasts, banners, a11y, motion); DoD includes [`UI_POLISH_CHECKLIST.md`](./UI_POLISH_CHECKLIST.md).

## Why it exists
Judges and merchants experience Syndicate through UI. This epic is the showable surface; backend epics are invisible without it. Visual fidelity to `/workspace/cursor-commerce-hackathon/ui/*.html` is part of the pitch.

## Dependencies (other epic IDs)
- **01** App shell / nav / auth.
- Data: **04–07** for Prisma loaders; may scaffold chrome earlier but **seed fixtures into DB** and read Prisma — no dual “fixture loader” path ([LIVE_DATA_WIRE](../scope/LIVE_DATA_WIRE.md)).
- **09** for Settings empty/loading/error patterns (can stub Settings link until 09).
- **Run agents SoT:** [`../scope/RUN_AGENTS_UI_CONTRACT.md`](../scope/RUN_AGENTS_UI_CONTRACT.md) (with Epic 06 runner).

## Out of scope
- Theme app extensions / storefront UI.
- App Store listing assets.
- Dark mode.
- Full mobile-native Admin redesign beyond Polaris embed.
- Implementing ingest/agent logic inside React components (call services only).
- Importing fixture JSON / static HTML as the primary Events or Insights data source.
- Toast-only **Run agents** with no POST enqueue / no Prisma AgentRun / fake localStorage progress ([RUN_AGENTS_UI_CONTRACT](../scope/RUN_AGENTS_UI_CONTRACT.md)).

## User / system stories (Given/When/Then)
1. **Given** connected shop with scored events, **When** merchant opens Overview, **Then** they see KPI strip, hero Race-day event, personas teaser, Run agents CTA.
2. **Given** Events page with EventCandidates in SQLite, **When** loaded, **Then** entity cards + table show ranked Harbour Run / running occasions from Prisma with confidence bars and Obs/Agg/Hyp/Mock badges.
3. **Given** Event detail, **When** tabs Signals / Catalogue / Personas clicked, **Then** panel content switches without full navigation loss.
4. **Given** Run agents clicked, **When** action succeeds, **Then** toast fires **and** real Prisma `AgentRun` rows appear; Agent runs page shows live/~2s polled progress per [`../scope/RUN_AGENTS_UI_CONTRACT.md`](../scope/RUN_AGENTS_UI_CONTRACT.md) — **not** toast-only theatre.
5. **Given** Recommendation / artifact rows in SQLite (and AgentRun id on agent-attributed cards), **When** Insights opens, **Then** Insights | Frictions board + P0–P2 fixes load from Prisma for demo narration.
6. **Given** enrichment Labels control, **When** opened, **Then** modal explains OBSERVED / AGGREGATE PROXY / MODEL HYPOTHESIS / MOCK.

## Data model (tables/fields or TypeScript interfaces)
No new tables — UI consumes:
```ts
type OverviewLoader = {
  shop: { domain: string; connected: boolean };
  kpis: { watchLabel: string; events: number; insights: number; frictions: number; personas?: number };
  heroEvent: EventCandidateCard | null;
  secondaryEvents: EventCandidateCard[];
  personas: PersonaCard[];
  insightsTeaser: { insights: number; frictions: number; nextAction: string };
};

type EventCandidateCard = {
  id: string; name: string; confidence: number; provenance: Provenance;
  nOrders: number; windowLabel?: string; blurb: string;
};

type PersonaCard = {
  id: string; name: string; status: "ready"|"draft"|"stub";
  summary: string; initials: string;
};
```

## APIs / jobs / webhooks (endpoints, schedules, payloads)
Remix routes (loaders/actions):

| Route | Method | Purpose |
|-------|--------|---------|
| `/app` | loader | Overview |
| `/app/events` | loader | Event list |
| `/app/events/:id` | loader | Event detail + tabs data |
| `/app/personas` | loader | Persona list |
| `/app/personas/:id` | loader | Persona detail + prior runs |
| `/app/artifacts` | loader | Board + recommendations |
| `/app/runs` | loader | Latest + history |
| `/app/runs/:id` | loader | Timeline poll |
| `/app/runs` | action POST | Enqueue agents |
| `/app/settings` | loader | See Epic 09 |

Toast via App Bridge — **exact strings** from `UI_INTERACTION_CONTRACT` §E (T01–T12); do not invent.

## UI (if any) — screens, components, copy samples British English

**Visual source of truth:** `ui/index.html`, `events.html`, `event-detail.html`, `personas.html`, `persona-detail.html`, `artifacts.html`, `agent-run.html`, `styles.css`.  
**Interaction source of truth:** `scope/UI_INTERACTION_CONTRACT.md` (do not invent hover/toast/banner copy).

### Global chrome
- Charcoal top bar `#292524`; brand mark SY + kit stripe (kit-red / cream / navy); shop domain; Connected pill.
- Left nav ~220px; canvas `#f3f0eb`; surfaces `#ffffff` (styles.css wins).
- Primary buttons `#008060` only; do not use green for non-CTA decoration.
- Serif display for page H1 / hero titles; system-ui body 13.5px.
- Provenance: quiet chips Obs / Agg / Hyp / Mock (+ aria-labels).
- Nav label **Insights** (href `/app/artifacts`); never “Artifacts” in chrome.

### Screen map (build all)

1. **Overview** (`/app`) — “This weekend”; Run agents; Labels; KPI strip Events·Insights·Frictions; hero event; secondary list; persona rows; Insights|Frictions teaser.
2. **Events** (`/app/events`) — entity cards + IndexTable; confidence bars; mode chips; hover lift.
3. **Event detail** (`/app/events/:id`) — Race-day home kit rush; Tabs Signals / Catalogue / Personas.
4. **Personas** (`/app/personas`) — Ready/Draft cards; fashion stub greyed (§K).
5. **Persona detail** (`/app/personas/:id`) — goals, budget, device, agent instructions, prior runs, Run CTA.
6. **Insights** (`/app/artifacts`) — two-column **Insights | Frictions**; fix recommendations P0–P2.
7. **Agent runs** (`/app/runs`, `/app/runs/:id`) — timeline, progress %, outcome, history; live region.
8. **Settings** — shell link required; full patterns in Epic 09.

### Copy samples
- Overview subtitle: “Sat home-shirt spike · 2 personas ready · last 28 days”
- Compliance: “Demo fixtures · geo & persona traits labelled · how we label enrichment”
- Toast: use catalogue **T01** — “Agents queued — watching your storefront as Race-day taper.” (full list in Interaction Contract §E)
- Insights intro: “What worked vs where shoppers like these personas hit journey blockers. No payment was taken.”

### Polaris mapping
Card, Box, InlineStack, BlockStack, Text, Badge, Button, Tabs, IndexTable/DataTable, Modal, Banner, EmptyState, ProgressBar (or custom confidence), Skeleton*, Page backAction, DescriptionList (settings).

Detailed wireframes: see `UI_SCREEN_SPECS.md`.

## Algorithms / heuristics (formulas, thresholds)
- Confidence bar colour: ≥0.75 high/green-navy fill; 0.5–0.74 mid/warning; <0.5 low/kit-red.
- Stub personas: `pointer-events: none`; opacity ~0.55; no navigation.
- Poll runs every 2s while status running; stop on completed/failed.

## Ethics / provenance labels required
- Labels modal content mandatory (Overview + Settings entry points).
- Every event/persona/artifact row shows provenance where data is non-observed.
- Stop-before-pay disclaimer (Banner B05) on Agent runs + Insights.

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Embedded Polaris; App Bridge NavMenu.
- Port CSS variables from `ui/styles.css` into `app/styles/syndicate.css` (Polaris theme overrides where needed).
- British English `lang`-appropriate copy.
- No new OAuth scopes.
- **Loaders/actions query Prisma only** (`EventCandidate`, `GraphEdge`, `Persona`, `AgentRun`, `Recommendation` / Artifacts). `DEMO_FIXTURE_SHOP=1` uses the same loaders after seed + pipeline.

## Acceptance criteria (checkbox list, testable)
- [ ] All routes in UI_SCREEN_SPECS.md render without crashing with **DB-backed** fixture-seed or live data.
- [ ] **Prisma-only loaders:** Events + Insights/Frictions (+ Overview KPIs) hit Prisma; no `import demo.json` (or equivalent) in primary board routes ([LIVE_DATA_WIRE](../scope/LIVE_DATA_WIRE.md)).
- [ ] After `db:seed` + `pipeline:demo` (or equiv.), Overview + Events + Insights populate **without Partner**.
- [ ] Visual system: canvas `#f3f0eb`, surfaces `#ffffff`, charcoal top bar, kit stripe, green primary CTAs only — verified against prototype / refine-v3 shots.
- [ ] Overview shows ≥1 hero event + Run agents + Labels modal; KPIs include **insights AND frictions** counts.
- [ ] Events show confidence + provenance for ≥3 candidates (or empty state if none); entity-card hover/focus states.
- [ ] Event detail tabs switch content.
- [ ] Personas show stub greyed; Ready persona links to detail.
- [ ] Run agents → toast **T01** → **real** AgentRun rows + run page **Prisma** progress (~2s poll); idempotent **T02** at cap — see [RUN_AGENTS_UI_CONTRACT](../scope/RUN_AGENTS_UI_CONTRACT.md). **Forbidden:** toast-only / localStorage fake progress.
- [ ] Insights (`/app/artifacts`) shows **Insights | Frictions** dual columns + ≥1 P0 recommendation.
- [ ] **Interaction Contract** implemented: component state matrix, toast §E, banner §F, per-route §G, modals §H, a11y §I, reduced-motion §J.
- [ ] [`UI_POLISH_CHECKLIST.md`](./UI_POLISH_CHECKLIST.md) ticked (DoD).
- [ ] British English throughout; no US “analyze/favor” spellings in UI strings.
- [ ] Demo-showable in 5–7 min path without leaving Admin.
- [ ] **UI is showable in a demo** checklist in UI_SCREEN_SPECS.md all checked.

## Implementation checklist for a coding agent (ordered steps)
1. Port design tokens from `ui/styles.css` into app stylesheet; confirm canvas/topbar.
2. Finalize `AppShell` layout + NavMenu active states.
3. Build Overview page matching `index.html` structure with loader.
4. Build Events list + Event detail with Tabs.
5. Build Personas list + Persona detail.
6. Build Insights board (Insights | Frictions) + recommendation list.
7. Build Agent runs list/detail + wire POST `/app/runs` to real enqueue + ~2s Prisma polling ([RUN_AGENTS_UI_CONTRACT](../scope/RUN_AGENTS_UI_CONTRACT.md)) — button must trigger real action, not toast-only.
8. Wire Labels enrichment Modal (shared component).
9. Hook loaders to Prisma services only; for demo, **seed** fixtures into DB (`db:seed` / `pipeline:demo`) — **do not** fallback-import `fixtures/ui/*.json` or `demo.json` in the route. Empty DB → EmptyState, not JSON bypass.
10. Pass visual QA against `ui/shots/refine-v3/*.png` and SCOPE_UI journeys A/B/C; run `UI_POLISH_CHECKLIST.md`.
11. Ensure Settings route exists (delegate empty/error to Epic 09).
12. Freeze demo script selector IDs/`data-*` hooks where prototype used them (`data-run-agents`, `data-confidence`).

## Fixtures / seed data required
- Seed inputs (orders, catalogue, graph, personas, agents, recommendations) via `db:seed` — mirroring Harbour Run / running demo narrative.
- Optional `fixtures/ui/*.json` may exist for **visual QA / HTML prototype parity checks only** — **not** imported by Remix loaders for the primary board.
- SoT for data path: [`../scope/LIVE_DATA_WIRE.md`](../scope/LIVE_DATA_WIRE.md).

## Test plan
- Playwright/Component: nav to each route; assert H1 text.
- Visual regression optional vs shots.
- Manual demo rehearsal: Overview → Event → Persona → Run → Insights ≤7 min.
- A11y smoke: buttons have names; modal focus trap Polaris default.

## Open questions
1. Exact Polaris version from Shopify template — accept template default.
2. Custom confidence bar vs ProgressBar? → Custom thin bar per prototype CSS preferred.
