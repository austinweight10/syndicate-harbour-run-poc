# Syndicate UI scope — HTML prototype

**Project:** Cursor Commerce hackathon · occasion commerce intelligence for Shopify  
**Prototype path:** `/workspace/cursor-commerce-hackathon/ui/`  
**Date:** 24 Sep 2026 · refine v3  
**Locale:** British English · Europe/London (BST)

---

## 1. Information architecture

```
Syndicate (embedded Admin app)
├── Overview          index.html          Dashboard: pipeline strip, KPIs, events, personas, Insights/Frictions snapshot
├── Events            events.html         Event list + confidence + provenance + mode chips
│   └── Event detail  event-detail.html   Race-day home kit rush (signals / catalogue / personas tabs)
├── Personas          personas.html       Ready + draft + fashion stub
│   └── Persona detail persona-detail.html Race-day taper brief + agent instructions
├── Insights          artifacts.html      Insights | Frictions board + fix recommendations (route kept)
├── Agent runs        agent-run.html      Live timeline, stop-before-pay, capped auto-queue, outcome, history
└── Settings          settings.html       Demo/Live badge, Pause auto agents, pipeline checklist, store makeup, signal sources, empty/loading/error
```

**Chrome (every page)**  
- Top bar: brand mark “Syndicate” · shop domain `demo-football-merch.myshopify.com` · Connected pill  
- Left nav: Overview | Events | Personas | Insights | **Graph** | Agent runs | Settings  (Insights → `artifacts.html`; Graph → `graph.html` / `/app/graph`)  

**Visual system**  
- **Direction:** Shopify Admin-embeddable sports/athleisure product — not a generic template. Visual blend of **Basecamp** (soft module cards, airy whitespace), **Peec AI** (filter-pill rows, calm tables), **Manus** (serif page titles only), and **Mixpanel** (quiet KPI sparklines / data calm). Charcoal top bar with kit-stripe monogram; Shopify green reserved for primary CTAs; navy/charcoal structure; kit-red sparingly for Frictions/alerts — calm primary tint for Insights — no Mixpanel purple.  
- Canvas warm light grey `#f3f0eb`, soft white cards `#ffffff` with subtle borders and very soft shadows; larger radii (~12–16px) and generous page/card gaps  
- system-ui body + serif display titles only; Peec-style filters on Overview/Events (time · Virtual/Physical · provenance); quieter provenance chips (Obs / Agg / Hyp / Mock)

---

## 2. Screen inventory

| Screen | Purpose | Key UI | Sample data |
|--------|---------|--------|-------------|
| Overview | Pitch home / first insight | Demo pipeline strip (complete), KPIs (Events · Insights · Frictions), hero event, personas, Insights/Frictions teaser, Run agents | 4 events, 2 personas, 3 insights, 4 frictions |
| Events | Discover occasions | Entity cards + table, confidence, geo / affinity / evidence chips + **mode chips (Physical / Virtual / Hybrid)** + weather / hashtag / Strava / local-venue cues | Race-day 0.82 OBSERVED Physical; Away-day 0.71 AGGREGATE + café near run club; Sofa-to-5K 0.64 MOCK Virtual; Unknown Fri 0.48 HYPOTHESIS Hybrid |
| Event detail | Explain one event | Tabs: Signals / Catalogue / Personas | Race-day home kit rush |
| Personas | Twin shoppers | Cards with geo / affinity / evidence; fashion stub greyed | Race-day taper, Wet-weather trainer, Anniversary stub |
| Persona detail | Brief + run | Goals, budget, device, prior runs | Race-day taper |
| Insights (`artifacts.html`) | Insights \| Frictions board | Two-column board + P0–P2 fix queue (Insight / Friction / Merch / Collection / Campaign) + provenance | 3 Insights (positive), 4 Frictions |
| Agent run | Live status | Stop-before-pay banner, capped auto-queue note, timeline, outcome | Simulated Playwright loop |
| Settings | Ops + auto pipeline | Demo vs Live badge; Pause auto agents (default auto ON); **LLM polish** (Templates default · optional OpenAI/Anthropic · Hyp · AI_CALL_CONTRACT); Refresh store + re-run; mid-run pipeline checklist + last error stub; Harbour Run store makeup; **signal sources** (fixtures · weather forecast · social hashtags · **virtual events** · **activity challenges** · MOCK); empty/loading/error | Live sample mid-run + Demo Overview |

---

## 3. Primary merchant journeys

### A) Install → first insights (demo path)

1. Merchant installs app (OAuth — out of scope for HTML; Settings shows Connected).  
2. Orders / fixtures sync → Overview populates Events + Personas.  
3. Merchant opens **Race-day home kit rush** → sees OBSERVED confidence 0.82 and signals.  
4. Opens **Race-day taper** → understands goals (shirt + youth run tee, £40–£90, mobile, time-pressured).  

**Success:** Merchant can narrate *why this weekend* without leaving Admin.

### B) Agent run → fix recommendation

1. From Overview / Persona / Event, click **Run agents**.  
2. Toast confirms queue; **Agent runs** page advances timeline (sessionStorage-backed simulation).  
3. On complete → outcome “Carted · checkout started” (no payment).  
4. Open **Insights** → Insights column (collection clarity, PDP photos, Match ready badge) vs Frictions (size guide, away copy, kids filters, shipping shock).  
5. Act on P0: add kids size guide (recommendation stub; deep-link in Remix).

**Success:** Pitch line — “Watch your store shop itself as the people who actually buy.”

### C) Enrichment honesty (compliance journey)

1. Open Enrichment labels modal (Overview) or Settings compliance card.  
2. Merchant sees every non-order signal labelled MOCK / AGGREGATE / HYPOTHESIS.  

**Success:** Judges see ethical framing; no wealth/demographic APIs.

---


---

## 3a. Events mode chips (D31 — light UI)

On **Events** list and entity cards, show a quiet mode chip beside provenance:

| Chip | When |
|------|------|
| **Physical** | `mode=physical` (fixtures, venue races) |
| **Virtual** | `mode=virtual` (streams, Zwift-style, Strava-shaped challenges, class drops, app races) |
| **Hybrid** | `mode=hybrid` (physical + online qualifier / watch-party companion) |

Optional filter control: All · Physical · Virtual · Hybrid (maps to `EventsListLoader.modeFilter`). No HTML prototype redesign required beyond documenting the chip for Remix build.

## 3b. Auto pipeline (UI)

Merchant-visible stages (Overview strip + Settings checklist):

1. Store makeup → 2. Graph → 3. Events → 4. Score → 5. Personas → 6. Agents → 7. Recommendations ready

- **Overview (this prototype):** Demo data mode — strip shows **Complete** / fixture state.
- **Settings:** Samples a **mid-run live** PipelineRun (Personas running) with soft-degrade `FD_TOKEN_MISSING` stub, Pause auto agents toggle, and **Refresh store + re-run** CTA.
- Agents: stop before payment; auto-queue capped ≤3 Ready personas (D26).


## 3c. Insights naming + Overview KPI strip (refine v3)

| Surface | Label |
|---------|--------|
| Left nav | **Insights** (href `artifacts.html`) — never “Artifacts” |
| Page title | Insights |
| Board columns | **Insights** (positive / resonates) \| **Frictions** (problems) |
| Overview KPIs | **Events** · **Insights** · **Frictions** as three separate metric cells |
| Agent runs | Stop-before-pay banner prominent; auto-queue capped **≤3** Ready personas |
| Settings LLM | Templates (default) · optional OpenAI / Anthropic key · Hyp provenance · see `scope/AI_CALL_CONTRACT.md` |

## 4. Empty / loading / error states

**Authoritative interaction polish** (hover, focus, disabled, toasts, banners, per-route empty/loading/error, modals, a11y, motion): [`../scope/UI_INTERACTION_CONTRACT.md`](../scope/UI_INTERACTION_CONTRACT.md). Weekend QA: [`../epics/UI_POLISH_CHECKLIST.md`](../epics/UI_POLISH_CHECKLIST.md). Epics 08/09 must implement the contract — do not invent chrome copy.

Summary (prototype + Remix target):

| State | Where | Behaviour |
|-------|-------|-----------|
| Empty | Settings — “No custom sync rules yet” | Icon + copy + CTAs to open loading/error examples |
| Empty (modal) | Insights — Export brief | ExportNotWiredModal “Not wired in this prototype” |
| Loading | Settings modal | Skeleton shimmer bars (maps to Polaris Skeleton*; static if `prefers-reduced-motion`) |
| Error | Settings modal | Critical banner: API 429 + Retry / Dismiss (B01) |
| Idle agent | Agent runs | Timeline placeholder until Run agents |
| Stub persona | Personas | Anniversary night-out greyed (`stub`), non-interactive, tooltip “Parked for this weekend” |
| Toasts / banners | Global | Exact catalogues in Interaction Contract §E / §F |

---

## 5. Interactions implemented in prototype

- Left nav + breadcrumbs between all screens  
- **Run agents** → toast + `sessionStorage` run state + Agent run page progress simulation  
- **Pause auto agents** + **Refresh store + re-run** (Settings; sessionStorage + toast)  
- Confidence bars from `data-confidence`  
- Score chips / provenance badges  
- **Mode chips** on Events list / cards: Physical · **Virtual** · Hybrid (filter + display; D31)  
- Tabs on event detail (Signals / Catalogue / Personas)  
- Modals: enrichment legend, export empty, loading, error  
- Fashion persona visually secondary  

---

## 6. Component list for Remix + Polaris build

Map HTML ≈ Polaris / App Bridge:

| Prototype | Polaris / Remix target |
|-----------|-------------------------|
| App shell topbar + sidenav | `AppProvider` + App Bridge NavMenu / `ui-nav-menu` |
| Cards / card headers | `Card`, `Box`, `InlineStack`, `BlockStack` |
| Stat cards | `Card` + `Text` variant heading/lg |
| Data tables | `IndexTable` or `DataTable` |
| Entity cards | `ResourceItem` / custom `Card` links |
| Badges (Connected, Ready) | `Badge` tone success/info/attention/critical |
| Provenance badges | Custom `Badge` + monospace label OR `Tag` |
| **Mode chips (Physical / Virtual / Hybrid)** | `Badge` / `Tag` — Virtual emphasised for online catalogue rows |
| Confidence bars | Custom thin progress or `ProgressBar` |
| Score chips | `Badge` / custom chip |
| Tabs | `Tabs` |
| Buttons | `Button` primary/secondary |
| Toast | `useAppBridge` toast API |
| Modal | `Modal` |
| Empty state | `EmptyState` |
| Skeletons | `SkeletonPage`, `SkeletonBodyText`, `SkeletonDisplayText` |
| Banner | `Banner` tone info/warning/critical |
| Breadcrumb | `Page` backAction + title metadata |
| Run timeline | Custom list + `Icon` status |
| Settings DL | `DescriptionList` |

**Routes (suggested)**  
`/app` · `/app/events` · `/app/events/:id` · `/app/personas` · `/app/personas/:id` · `/app/artifacts` (Insights UI) · `/app/graph` (Graph, D34) · `/app/runs` · `/app/runs/:id` · `/app/settings`

---

## 7. Mock vs would be live

| Piece | Prototype | Live Remix MVP |
|-------|-----------|----------------|
| Shop domain + Connected | Hard-coded | OAuth session / Shop model |
| Events list & confidence | Static HTML | Clustering job on orders (+ optional fixture CSV) |
| Geo London/Manchester | MOCK / AGGREGATE labels | Aggregate postcode roll-ups only |
| Fixture calendar overlay | MOCK | Optional merchant CSV / public fixtures |
| Persona traits (budget, mobile, pressure) | Mixed OBSERVED + MOCK + HYPOTHESIS | Orders_only behaviour + labelled proxies |
| Fashion Anniversary stub | Greyed placeholder | Second vertical later |
| Agent timeline | Client JS simulation | Playwright worker queue + websockets / polling |
| Insights / Frictions scores | Static copy from “prior run” | Written by agent scorer post-run |
| Fix recommendations | Static P0–P2 | LLM brief + Admin deep links |
| Export brief | Empty modal | PDF / Notion / email |
| Re-scan orders | Disabled button | Admin API sync + rate-limit handling |
| Refresh store + re-run | Toast stub | PipelineRun `trigger=manual_refresh` |
| Pause auto agents | Checkbox default off (auto ON) | `ShopSettings.agentsAutoRun` |
| Pipeline strip | Demo complete / Settings mid-run | PipelineRun stages a→f + recommendations ready |
| Store makeup card | Harbour Run sample | StoreMakeupSnapshot |
| Settings sync rules | Empty state | Webhooks, calendars, enrichment toggles |
| Settings signal sources | Catalogue card line | football-data · Open-Meteo forecast · hashtag watchlist/social · MOCK — see SIGNAL_SOURCES.md |

**Hard product rules carried into UI copy**  
- Agents stop before payment  
- Board language (**D29 refine v3**): nav + page title **Insights** (never “Artifacts”); columns **Insights** (positive / resonates / keep doing) | **Frictions** (problems / blockers). Fix queue stays below. Overview KPI strip = **Events · Insights · Frictions** (separate counts — never a single mixed “INSIGHTS: 4”).  
- Enrichment always labelled  
- No wealth / sensitive demographic APIs in MVP  
- No individual social profiling; social buzz is aggregate geo only  
- Signal fixtures in UI: virtual/hybrid modes · weather forecast · social hashtags · Strava/activity challenges · local venue PROXY — all MOCK/AGGREGATE labelled; no live API wiring in HTML prototype  
- Live connect must not leave merchants on empty fixtures (auto PipelineRun)  

---

## 8. Next build steps

1. Scaffold Remix Shopify app; port tokens from `styles.css` into Polaris theme overrides where needed.  
2. Replace static tables with loaders over `Event`, `Persona`, `AgentRun`, `Artifact` models (see MVP_ARCHITECTURE.md).  
3. Wire **Run agents** to a job queue; stream step status to `/app/runs/:id`.  
4. Persist artifacts from runner; deep-link P0 fixes into Admin product/collection editors.  
5. Add real empty/error paths for OAuth failure, 429 sync, and zero-order shops.  
6. Keep British English + provenance badges as non-negotiable in review checklist.  
7. Demo script: Overview → Event → Persona → Run → Insights board (5–7 min).

---

## 9. File list

```
ui/
  index.html
  events.html
  event-detail.html
  personas.html
  persona-detail.html
  artifacts.html          ← Insights board (route kept)
  agent-run.html
  settings.html
  styles.css
  app.js
  SCOPE_UI.md
  REFINE_NOTES.md         ← refine v3 changelog for Austin
  shots/refine-v3/        ← pitch screenshots
```

Open `index.html` in a browser (local file or static server). No network required for fonts or assets.
