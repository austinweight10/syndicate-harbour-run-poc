# Syndicate — UI screen specs

**Visual source of truth:** `/workspace/cursor-commerce-hackathon/ui/*.html` + `ui/styles.css`  
**IA source:** `ui/SCOPE_UI.md`  
**Interaction polish:** [`../scope/UI_INTERACTION_CONTRACT.md`](../scope/UI_INTERACTION_CONTRACT.md) — **authoritative** for hover/focus/disabled/loading/toasts/banners/a11y/motion. Epics 08/09 must implement every row. Weekend QA: [`UI_POLISH_CHECKLIST.md`](./UI_POLISH_CHECKLIST.md).  
**Primary epic:** `08-admin-ui.md` · states: `09-settings-empty-states.md`  
**Locale:** British English · Europe/London

---

## Global visual system (all screens)

Tokens below must match `ui/styles.css` `:root` (**styles.css wins** if this table drifts).

| Token | Value | Usage |
|-------|-------|-------|
| Canvas | `#f3f0eb` | Page background |
| Surface | `#ffffff` | Cards |
| Charcoal | `#292524` | Top bar |
| Navy | `#1a2744` | Accents / info / focus ring |
| Kit red | `#a11d2a` | Kit stripe + **Frictions** accents sparingly |
| Primary green | `#008060` | **Primary CTAs only** |
| Border | `#e6e0d6` | Card borders |
| Radii | 8 / 12 / 16px | pills · cards · panels |
| Body font | system-ui 13.5px | UI chrome |
| Display font | ui-serif / Georgia | H1 + hero titles |

**Chrome (every authenticated page)**  
- Top bar: SY kit-stripe monogram · Syndicate · `{shop}.myshopify.com` · Connected pill  
- Left nav: Overview · Events · Personas · Insights · **Graph** · Agent runs · Settings (Insights route `/app/artifacts`; never label “Artifacts”; Graph route `/app/graph`)  
- Provenance chips: Obs / Agg / Hyp / Mock (full words in tooltips/modals + `aria-label`)  
- Entity cards: hover lift (shadow-raised, 140ms); stubs no lift — see Interaction Contract §C.11 / §K

**Acceptance — UI is showable in a demo (global)**  
- [ ] Tunnelled embedded app opens inside Shopify Admin  
- [ ] Warm canvas + charcoal top bar + kit stripe visible without explaining “WIP theme”  
- [ ] Green used only on primary buttons (Run agents, Retry, Save-type CTAs)  
- [ ] Labels/enrichment modal openable in ≤2 clicks  
- [ ] Happy path clickable: Overview → Event → Persona → Run → **Insights** → **Graph**  
- [ ] Interaction Contract polish checklist (`UI_POLISH_CHECKLIST.md`) passed  

---

## 1. Overview

| Field | Spec |
|-------|------|
| **Route** | `/app` |
| **Prototype** | `ui/index.html` |
| **Purpose** | Pitch home — pipeline strip, “why this weekend” KPIs (Events · Insights · Frictions), hero event, personas teaser, Insights/Frictions snapshot, optional **Graph** teaser card, Run agents |

### Layout zones (ASCII)
```
┌──────────── charcoal top bar: SY | Syndicate          shop · Connected ┐
├──────── nav ────────┬──────────────────────────────────────────────────┤
│ Overview *          │ H1 This weekend                    [Labels][Run] │
│ Events              │ Demo/Live badge · pipeline strip (stages 1–7)    │
│ Personas            │ ┌─────┐┌─────┐┌─────┐  Events·Insights·Frictions│
│ Insights            │ └─────┘└─────┘└─────┘                           │
│ Graph               │ ┌────────────── hero event ─────────┐┌ also… ┐ │
│ Agent runs          │ │ Race-day home kit rush           ││ rows  │ │
│ ─────               │ │ conf bar · Obs · tags             ││ personas│
│ Settings            │ └───────────────────────────────────┘└───────┘ │
│                     │ Insights|Frictions teaser · Graph teaser · next  │
└─────────────────────┴──────────────────────────────────────────────────┘
```

### Components / Polaris
`Page`, `Card`, `InlineStack`, `BlockStack`, `Text`, `Button` primary/secondary, `Badge`, `Modal` (enrichment), custom `MetricStrip`, `HeroEvent`, `ConfidenceBar`, `ProvenanceBadge`, App Bridge toast.

### Data props / loaders
`OverviewLoader` (see Epic 08): kpis `{ events, insights, frictions, personas? }`, heroEvent, secondaryEvents[], personas[], insightsTeaser `{ insights, frictions, nextAction }`, optional `graphTeaser` `{ edgeCount, presetLabel, href: "/app/graph" }`, shop, pipeline? (mode/status/stages).

### Empty / loading / error
See Interaction Contract §G matrix **R1-L / R1-E / R1-X / R1-P**.
- **Loading (R1-L):** Skeleton metric strip (3 cells) + 2 card skeletons.  
- **Empty (R1-E):** EmptyState “No occasions yet — sync orders or load demo fixtures.” + Settings / Load fixtures.  
- **Error (R1-X):** Banner B01/B02 if SyncRun / PipelineRun failed.  
- **Partial (R1-P):** B08 catalogue degraded; pipeline strip mid-run OK.

### Interactions
- Labels → EnrichmentLegendModal (M01)  
- Run agents → POST `/app/runs` → toast **T01** (or T02 idempotent) → optional navigate `/app/runs/:id`  
- Hero / entity cards → event or persona detail; **hover lift** per §C.11  
- Optional Graph teaser → `/app/graph` (D34)  
- Disabled Run agents → B06 / T11 / T12 reasons  

### Visual notes
Hero left border kit-red accent; serif H2 on hero title; primary green only on Run agents. KPI cells = Events · Insights · Frictions (never a mixed “INSIGHTS: 4”).

### Demo acceptance
- [ ] Hero shows Race-day-style event with confidence ≥0.7 or fixture equivalent  
- [ ] Run agents CTA visible above the fold  
- [ ] Compliance note + Labels entry present  
- [ ] Pipeline strip visible (demo complete or live stage)  

---

## 2. Events list

| Field | Spec |
|-------|------|
| **Route** | `/app/events` |
| **Prototype** | `ui/events.html` |
| **Purpose** | Discover occasions with confidence, provenance, geo / catalogue affinity / evidence counts |

### Layout zones
```
│ H1 Events                         [filters optional] │
│ ┌ entity card ┐ ┌ entity card ┐ ┌ entity card ┐     │
│ │ title/desc  │ │             │ │ Unknown Fri │     │
│ │ conf bar    │ │             │ │ Hyp 0.48    │     │
│ └─────────────┘ └─────────────┘ └─────────────┘     │
│ IndexTable: Name · Window · Orders · Conf · Source  │
```

### Components / Polaris
`Page`, `Card`, `IndexTable` or `DataTable`, `Badge`, `ConfidenceBar`, `ResourceItem`-style entity cards, `Filters` optional.

### Data props / loaders
`{ events: EventCandidateCard[] }` sorted by confidence desc.

### Empty / loading / error
Matrix **R2-L / R2-E / R2-X / R2-P** (`UI_INTERACTION_CONTRACT` §G).
- Empty: “No events scored yet.” CTA Recompute / Settings.  
- Loading: 3 entity-card skeletons + SkeletonTable.  
- Error: Banner B09 from score job failure.  
- Partial: Hyp-only rows OK.

### Interactions
- Card/row → `/app/events/:id`; entity-card **hover lift**; focus-visible ring  
- Confidence from `data-confidence` / `confidence` prop; tooltip + `aria-valuetext`  
- Filter pills + mode chips per §C.6 / §C.8  

### Visual notes
Entity titles: display font on primary card only; quieter on secondary.

### Demo acceptance
- [ ] ≥3 events or clear empty  
- [ ] Obs/Agg/Hyp badges readable at a glance  
- [ ] Confidence bars render  

---

## 3. Event detail

| Field | Spec |
|-------|------|
| **Route** | `/app/events/:id` |
| **Prototype** | `ui/event-detail.html` |
| **Purpose** | Explain one event — signals, catalogue affinity, linked personas |

### Layout zones
```
│ ← Events   H1 Race-day home kit rush   conf · Obs · Run agents │
│ Tabs: [Signals] [Catalogue] [Personas]                          │
│ ┌ tab panel ───────────────────────────────────────────────┐   │
│ │ component breakdown Lt G A Y R · evidence bullets         │   │
│ │ OR top SKUs/collections OR linked personas                │   │
│ └───────────────────────────────────────────────────────────┘   │
```

### Components / Polaris
`Page` backAction, `Tabs`, `Card`, `DescriptionList`, `Badge`, `Button`, `DataTable` (catalogue SKUs), persona mini-cards.

### Data props / loaders
```ts
{
  event: EventCandidateCard & { blurb: string; timeStart: string; timeEnd: string };
  confidence: { value: number; Lt: number; G: number; A: number; Y: number; R: number; provenanceLabels: string[]; competing: {name:string;value:number}[]; baselinePct: number };
  signals: { label: string; detail: string; provenance: string }[];
  catalogue: { title: string; lift?: string; sku?: string }[];
  personas: PersonaCard[];
}
```

### Empty / loading / error
Matrix **R3-L / R3-E / R3-X / R3-P**.
- Loading: SkeletonPage.  
- 404: Banner “Event not found” + back.  
- Empty tab: “No catalogue affinity edges yet.”

### Interactions
- Tab change client-side.  
- Run agents preselects linked Ready personas.  
- Persona card → detail.

### Visual notes
Active tab underline kit-red per prototype; confidence prominent in header.

### Demo acceptance
- [ ] Signals tab shows lift/geo/affinity story narratable in <60s  
- [ ] Provenance labels visible  
- [ ] Personas tab lists Race-day taper (or equivalent)  

---

## 4. Personas list

| Field | Spec |
|-------|------|
| **Route** | `/app/personas` |
| **Prototype** | `ui/personas.html` |
| **Purpose** | Twin shoppers Ready / Draft / fashion stub |

### Layout zones
```
│ H1 Personas                                                      │
│ ┌ Ready card ─────┐ ┌ Draft card ─────┐ ┌ Stub greyed ──────┐ │
│ │ AD Race-day taper │ │ FF First-time   │ │ Anniversary…      │ │
│ │ goals · budget  │ │                 │ │ Fashion parked    │ │
│ └─────────────────┘ └─────────────────┘ └───────────────────┘ │
```

### Components / Polaris
`Page`, `Card`, `Badge` (Ready success / Draft attention / Stub), `Avatar` initials, `Text`, `Button` disabled on stub.

### Data props / loaders
`{ personas: PersonaCard[] }`

### Empty / loading / error
Matrix **R4-L / R4-E / R4-X / R4-P**.
- Empty: “No personas derived — score events first.”  
- Loading: 3 skeleton cards.  
- Stub always shown once shop exists (honesty).

### Interactions
- Ready/Draft → `/app/personas/:id` (hover lift on cards)  
- Stub: no navigation; tooltip “Parked for this weekend” (§K)  

### Visual notes
Stub opacity ~0.55; muted avatar; not a green CTA target; no hover lift.

### Demo acceptance
- [ ] Race-day taper Ready card showable  
- [ ] Fashion stub visibly secondary  
- [ ] Budget/goals summary on cards  

---

## 5. Persona detail

| Field | Spec |
|-------|------|
| **Route** | `/app/personas/:id` |
| **Prototype** | `ui/persona-detail.html` |
| **Purpose** | Brief + constraints + agent instructions + prior runs + Run CTA |

### Layout zones
```
│ ← Personas  H1 Race-day taper          [Ready] [Run agents]      │
│ ┌ Goals ──────┐ ┌ Budget / device ┐ ┌ Constraints ─────────┐ │
│ └─────────────┘ └─────────────────┘ └──────────────────────┘ │
│ Agent instructions (British English brief)                     │
│ Prior runs table                                               │
│ Mock / hypothesis trait badges                                 │
```

### Components / Polaris
`Page` backAction, `Card`, `Badge`, `DescriptionList`, `Button` primary, `IndexTable` prior runs, `Banner` info for labelled traits.

### Data props / loaders
Full `Persona` + `primaryEvent` + `priorRuns: { id, outcome, endedAt }[]` + `mockFlags`.

### Empty / loading / error
Matrix **R5-L / R5-E / R5-X / R5-P**.
- Loading: SkeletonPage.  
- No prior runs: “No agent runs yet — queue one before kick-off.”  
- Stub route: redirect list or static “parked” page.

### Interactions
- Run agents → enqueue this personaId.  
- Prior run row → `/app/runs/:id`.  
- Event link → event detail.

### Visual notes
Same chrome; primary green only on Run agents.

### Demo acceptance
- [ ] Goals include shirt + youth run tee (or fixture equivalent)  
- [ ] Budget £40–£90 band visible  
- [ ] Trait badges present  

---

## 6. Insights (route `/app/artifacts`)

| Field | Spec |
|-------|------|
| **Route** | `/app/artifacts` (nav + H1 label **Insights** — D29) |
| **Prototype** | `ui/artifacts.html` |
| **Purpose** | **Insights \| Frictions** board + P0–P2 recommendation cards with provenance |

### Layout zones
```
│ H1 Insights                     [Export brief]                   │
│ disclaimer stop-before-pay (B05)                                 │
│ ┌ Insights ──────────────┐ ┌ Frictions ────────────────────┐  │
│ │ · collection clarity   │ │ · size guide P0               │  │
│ │ · PDP photos           │ │ · away copy                   │  │
│ │ · Match ready badge    │ │ · kids filters                │  │
│ └────────────────────────┘ │ · shipping shock              │  │
│                            └───────────────────────────────┘  │
│ Fix recommendations: P0 / P1 / P2 cards + deep links           │
```

### Components / Polaris
`Page`, `Card`, two-column `InlineGrid`, custom board items, `Badge` priority, `Button` secondary Export, `Modal` ExportNotWired (M02), `Banner` B05.

### Data props / loaders
```ts
{
  insights: AffordanceScore[];   // positive / keep-doing column
  frictions: InsightScore[];     // problems column (was “insights” noise in older copy)
  recommendations: Recommendation[];
}
```
Loader may still read AffordanceScore / InsightScore tables; **UI columns** are Insights | Frictions.

### Empty / loading / error
Matrix **R6-L / R6-E / R6-X / R6-P**.
- Empty: “Run agents to generate Insights & Frictions.” CTA to `/app/runs` (B10).  
- Export: Modal M02 “Not wired in this build.”  
- Loading: dual skeleton columns + rec skeletons.

### Interactions
- Export → ExportNotWiredModal (M02).  
- Recommendation deep link → Admin (new tab).  
- Optional filter by persona; optional dismiss checkbox → toast T09 if MVP.  
- Board cards: hover lift if deep-linkable.

### Visual notes
**Frictions** items left border kit-red; **Insights** quieter success/info tone — **not** flooding green (green reserved for CTAs).

### Demo acceptance
- [ ] Dual board populated for demo (≥2 Insights, ≥2 Frictions)  
- [ ] P0 kids size guide (or equivalent) narratable  
- [ ] Stop-before-pay disclaimer (B05) visible  

---

---

## 7. Graph

| Field | Spec |
|-------|------|
| **Route** | `/app/graph` |
| **Prototype** | `ui/graph.html` |
| **Purpose** | Merchant occasion-evidence force graph — Prisma `GraphEdge` Race-day path (D34). Full SoT: [`../scope/ADMIN_GRAPH_VIEW.md`](../scope/ADMIN_GRAPH_VIEW.md) |

### Layout zones
```
│ H1 Graph                              [Labels]                    │
│ Showing top occasion subgraph · Race-day evidence path            │
│ [Order][SKU][Geo][Catalogue…] Search · Fit · Physics on/off       │
│ ┌──────────────── force canvas (~420px+) ───────────────────────┐ │
│ │ Order → Geo ← race PROXY + weather Driver + EventCandidate    │ │
│ └───────────────────────────────────────────────────────────────┘ │
│ Legend: Obs · Agg · Hyp · Mock                                    │
```

### Components / Polaris
`Page`, `Card`, filter pills, `TextField` search, Fit button, Physics toggle, custom `GraphCanvas`, `EmptyState`, provenance `Badge`, Labels → M01.

### Data props / loaders
`GraphLoader`: nodes[], edges[] from Prisma `GraphEdge` + related labels (Order/SKU/Geo/CatalogueEvent/Driver/Weather/Social/EventCandidate/Persona). Caps ~150 nodes / ~300 edges. **Never** lab sqlite or Vite JSON.

### Empty / loading / error
- Empty: “No graph edges yet — complete store makeup and score, or refresh the store.”  
- Loading: skeleton canvas.  
- Error: Banner + Retry — no fixture/lab fallback.

### Interactions
Node-type chips · search · Fit · Physics · optional node → Event/Persona deep link.

### Visual notes
Cream/kit-stripe Admin chrome; canvas in white card; kit-red sparingly on EventCandidate.

### Demo acceptance
- [ ] Race-day evidence path narratable in Admin  
- [ ] Provenance legend visible  
- [ ] Cap note when truncated  
- [ ] Empty state if no edges after pipeline  

## 8. Agent runs (list + detail)

| Field | Spec |
|-------|------|
| **Routes** | `/app/runs` · `/app/runs/:id` |
| **Prototype** | `ui/agent-run.html` |
| **Purpose** | Live timeline, stop-before-payment, capped auto-queue note, progress, outcome, history |

### Layout zones
```
│ H1 Agent runs                              [Run agents]          │
│ Active run card: persona · progress bar % · outcome              │
│ Timeline: ○ Opened home → ○ Collection → ○ PDP → ○ ATC → ● Checkout stopped │
│ History table: time · persona · outcome · link                   │
```

### Components / Polaris
`Page`, `Card`, `ProgressBar`, custom `Timeline` + `Icon`, `Badge` outcome, `Button`, `IndexTable` history, toast.

### Data props / loaders
List: `{ runs: AgentRun[] }`  
Detail: `{ run: AgentRun & { timeline: Step[]; persona: PersonaCard } }`  
Poll detail every 2s while `status==="running"`.

### Empty / loading / error
Matrix **R7/R8-L / E / X / P**.
- Idle: timeline placeholder “Queue a run to watch a persona shop.”  
- Loading run: progress indeterminate then %.  
- Failed: critical Banner + errorMessage.  
- Live region polite on step/progress updates (§I).

### Interactions
- Run agents → POST.  
- Auto-scroll timeline on update.  
- History → detail.

### Visual notes
Outcome success uses Badge tone success (Polaris) — acceptable; primary button still green CTA.

### Demo acceptance
- [ ] Timeline ≥5 steps on completed demo run  
- [ ] Outcome shows carted or checkout_started  
- [ ] Explicit “stopped before payment” in outcome copy  

---

## 9. Settings

| Field | Spec |
|-------|------|
| **Route** | `/app/settings` |
| **Prototype** | `ui/settings.html` |
| **Purpose** | Connection, sync ops, catalogue attribution, compliance, empty/loading/error examples |

### Layout zones
```
│ H1 Settings                          [Refresh store + re-run]    │
│ Card Shop + Demo/Live badge                                      │
│ Card Auto agents — Pause toggle (auto default ON)                │
│ Card Pipeline — mid-run checklist + last error stub              │
│ Card Store makeup — collections / geo / price bands / affinity   │
│ Card Labelling + Compliance                                      │
│ Card Sync rules → EmptyState + loading/error playground          │
```

### Components / Polaris
`Page`, `Card`, `DescriptionList`, `Button`, `EmptyState`, `Modal`, `SkeletonBodyText`, `Banner` critical, `Badge` Connected.

### Data props / loaders
`SettingsLoader` (Epic 09): shop, mode, agentsAutoRun, pipeline stages, storeMakeup snapshot, lastError.

### Empty / loading / error
Matrix **R9-L / R9-E / R9-X / R9-P** + Banner/Toast catalogues §E/§F.
- Empty rules: icon + “No custom sync rules yet” + defaults copy.  
- Loading modal M03: skeleton shimmer (static if reduced-motion).  
- Error modal M04 / Banner B01: HTTP 429 + Retry / Dismiss.  
- Refresh store: confirm modal M06 then toast T05.  
- Pause: **no confirm** — instant + T03/T04.  
- LLM: quiet templates note B07 (not critical Banner).  
- Never show access token.

### Interactions
- Re-scan → POST resync.  
- Labels → EnrichmentLegendModal.  
- Retry → requeue.  
- Demo playground buttons optional behind flag.

### Visual notes
Same chrome; secondary buttons for Re-scan; primary green only if single primary action emphasized (Retry on error).

### Demo acceptance
- [ ] Connected shop domain visible + Demo/Live badge  
- [ ] Pause auto agents toggle + Refresh store + re-run  
- [ ] Pipeline checklist + store makeup (Harbour Run sample)  
- [ ] Compliance card states no wealth APIs + stop-before-pay  
- [ ] Empty + loading + error patterns demonstrable  

---

## Enrichment legend modal (shared)

**Trigger:** Overview Labels · Settings Compliance  
**Content:** Define OBSERVED, AGGREGATE PROXY, MODEL HYPOTHESIS, MOCK with sports examples (orders, Open-Meteo, confidence residuals, Hyrox mock).  
**AC:** [ ] Openable in demo without leaving Admin.

---

## Route checklist (Remix)

| Path | Screen |
|------|--------|
| `/app` | Overview |
| `/app/events` | Events list |
| `/app/events/:id` | Event detail |
| `/app/personas` | Personas list |
| `/app/personas/:id` | Persona detail |
| `/app/artifacts` | Insights (nav label Insights; board Insights \| Frictions) |
| `/app/graph` | Graph (D34 Admin Graph view) |
| `/app/runs` | Agent runs |
| `/app/runs/:id` | Agent run detail |
| `/app/settings` | Settings |

---

## Demo-showable UI checklist (roll-up)

- [ ] All ten routes above resolve in embedded app  
- [ ] Visual system matches prototype (cream / charcoal / kit stripe / green CTAs only)  
- [ ] Provenance chips on events + labelled persona traits  
- [ ] Journey A: install/connected → Overview insights  
- [ ] Journey B: Run agents → timeline → Insights / Frictions fixes  
- [ ] Journey C: Labels modal ethical framing  
- [ ] Empty/loading/error patterns exist (Settings + §G matrix)  
- [ ] `UI_POLISH_CHECKLIST.md` passed (Interaction Contract)  
- [ ] British English copy QA passed  
- [ ] Backup fixtures hydrate UI if live APIs fail  

