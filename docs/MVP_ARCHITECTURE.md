# Cursor Commerce Hackathon — Event-Driven Shopping Agents
**Working title:** Syndicate (one-click Shopify app)  
**Owner idea:** Austin Weight  
**Constraint:** 1-day MVP · pragmatic · mock enrichment labelled · British English in merchant-facing copy  
**Date context:** 22 Sep 2026


> **SUPERSEDED as weekend SoT (26 Sep 2026).** Product vertical for the hackathon PoC is **Harbour Run / running** — not football kits as primary. Do **not** implement from this file alone.  
> **SoT now:** [`scope/WEEKEND_BUILD_SPEC.md`](./scope/WEEKEND_BUILD_SPEC.md) · [`scope/AGENT_KICKOFF.md`](./scope/AGENT_KICKOFF.md) · [`scope/LIVE_DATA_WIRE.md`](./scope/LIVE_DATA_WIRE.md) · [`scope/RUN_AGENTS_UI_CONTRACT.md`](./scope/RUN_AGENTS_UI_CONTRACT.md) · [`scope/LIVE_DEMO_GATE.md`](./scope/LIVE_DEMO_GATE.md) · [`live-demo-store/`](./live-demo-store/) · epics 01–09.  
> Football / match-day content below is **historical / optional secondary catalogue** only. Kept for research context — do not re-litigate D26–D32.

---

## Shopify feasibility notes (research summary)

| Need | Feasible in 1 day? | How |
|------|-------------------|-----|
| OAuth + Admin GraphQL | Yes | Remix Shopify app template; scopes `read_orders`, `read_products`, `read_customers` |
| Orders / products / collections | Yes | Admin GraphQL; orders default last 60 days (`read_all_orders` needs Partner approval — skip for MVP) |
| Customers (location, tags) | Partial | Customer fields often redacted outside approved protected-customer-data apps; **dev store = full**; production = mock/redact + label |
| Browse / session analytics | No (MVP) | Web Pixels / Customer Events need pixel install + consent; **infer browse from order line items + product taxonomy** |
| Storefront browse as persona | Yes | Playwright against Online Store URL (dev/preview); Storefront API cart optional |
| Real checkout complete | Risky / cut | Checkout Completions create real/test orders & bot limits; **stop at cart or checkout start** for demo |
| App embed / Admin UI | Yes | Shopify App Bridge + Polaris embedded app; no theme embed required for MVP |

**Ethics / legal MVP stance:** Prefer behavioural + location (shipping/billing country/city when available) + product taxonomy. Do **not** build wealth/credit scoring. Label any demographic/economic proxies as `MOCK / HYPOTHESIS`. GDPR: no third-party enrichment APIs; no PII in agent logs beyond hashed customer IDs.

---

## A) Problem → insight → solution (one-pager pitch)

### Problem
Sport and fashion merchants know *what* sold, not *why it sold that weekend*. Dashboards show SKUs and AOV; they miss the **event** (match day, festival, date night) and the **persona** (away-day dad, festival first-timer, anniversary shopper) that drove the basket. Merchandising and UX stay generic while demand is episodic.

### Insight
Buying in these categories is **event-driven**. Orders already encode latent events: spikes by date × geography × collection mix × basket shape. If we cluster those signals into event archetypes and personas, we can **replay shopping** as those personas on the live storefront and surface which products, collections, copy, and UX paths resonate — and where friction kills the journey.

### Solution
**Syndicate** — a one-click Shopify app that:
1. Ingests store orders, products, collections (customers where allowed).
2. Clusters into **Events** and **Personas** (with labelled mock enrichment if needed).
3. Spawns **syndicate shopping agents** that browse (and approach checkout) as those personas.
4. Emits artifacts: Events list · Personas · Affordance (resonates) vs Insights scores on site parts.

**Pitch line:** *Stop guessing match-day merch. Watch your store shop itself as the people who actually buy.*

---

## B) MVP scope — one day

### Must-have (ship by demo)
- [ ] Shopify OAuth via official Remix app template (dev store)
- [ ] Ingest: last N orders (≤60d), products, collections via Admin GraphQL
- [ ] Order clustering → **2–3 Event archetypes** (rule + simple heuristics; LLM optional for naming)
- [ ] Derive **2–3 Personas** per demo vertical (sport *or* fashion)
- [ ] Agent runner: Playwright loop for **2–3 persona runs** on storefront (home → collection → PDP → add to cart → checkout start)
- [ ] Persist Event / Persona / AffordanceScore / InsightScore
- [ ] Embedded dashboard: Events, Personas, Resonates vs Insights tables
- [ ] Label all mock enrichment clearly in UI

### Cut (explicitly out of scope)
- Real demographic/wealth APIs, lookalike audiences, ad platforms
- Live browse pixels / historical session replay
- Completing payment / creating real orders
- Theme app extensions / storefront embeds
- Multi-store, billing, App Store listing polish
- Production protected-customer-data approval
- Full ML clustering pipeline (HDBSCAN etc.) — heuristics + LLM naming enough
- Abandoned-checkout deep dive, inventory optimisation, email flows

### Nice-if-time (only after must-haves)
- Storefront API cart creation as parallel path
- Screenshot capture of insights moments
- One “what to fix” recommendation card

---

## C) Architecture diagram (description)

```
┌─────────────────────────────────────────────────────────────────┐
│                     Shopify Admin (merchant)                      │
│  Products · Collections · Orders · Customers (dev store)          │
└──────────────────────────────┬──────────────────────────────────┘
                               │ OAuth + GraphQL Admin API
                               │ scopes: read_orders, read_products,
                               │         read_customers (dev)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              Syndicate App (Remix + App Bridge + Polaris)         │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐ │
│  │ Ingest job  │→ │ Enrichment   │→ │ Discovery               │ │
│  │ (sync)      │  │ (location +  │  │ Events + Personas       │ │
│  │             │  │  taxonomy;   │  │ clustering / heuristics │ │
│  │             │  │  MOCK flags) │  │                         │ │
│  └─────────────┘  └──────────────┘  └───────────┬─────────────┘ │
│                                                 │                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────▼─────────────┐ │
│  │ Dashboard UI │← │ Scores DB    │← │ Agent orchestrator    │ │
│  │ Events /     │  │ Affordance + │  │ (queue persona runs)  │ │
│  │ Personas /   │  │ Insights     │  └─────────┬─────────────┘ │
│  │ Artifacts    │  └──────────────┘            │               │
│  └──────────────┘                              │               │
└────────────────────────────────────────────────┼───────────────┘
                                                 │ spawn
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Agent runner (Node worker + Playwright)                           │
│  Persona goals/budget/constraints → browse Online Store URL       │
│  Actions: navigate, search, filter, PDP, ATC, checkout start      │
│  Observe: dwell proxies, dead-ends, missing size, weak copy       │
│  Emit: AffordanceScore + InsightScore per site part              │
│  STOP before payment (demo policy)                                │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS (buyer-like traffic)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│ Online Store / Preview theme (sport OR fashion sample merchant)   │
│ Optional later: Storefront API for cart; NOT required for MVP     │
└─────────────────────────────────────────────────────────────────┘

Out of MVP: App Pixel / Customer Events (browse). Theme app embed.
```

**Component roles**
- **Admin API** = source of truth for what sold and catalogue structure.
- **Remix embedded app** = OAuth, sync, discovery, dashboard.
- **Agent runner** = separate process/script so Playwright does not block Remix request cycle.
- **Storefront** = live UX under test; agents act as personas, not as Admin.

---

## D) Data model

### Event
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| shopId | string | Shopify shop domain |
| name | string | e.g. "Match day — home kit rush" |
| archetype | enum | `match_day` \| `festival` \| `date_night` \| `seasonal_drop` \| `other` |
| windowStart / windowEnd | datetime | Clustered order spike window |
| geoHint | string? | City/region/country aggregate (no street) |
| signalSummary | json | Top collections, AOV band, order count, day-of-week |
| confidence | float 0–1 | Heuristic strength |
| enrichmentSource | enum | `orders_only` \| `orders_plus_mock` |
| createdAt | datetime | |

### Persona
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| shopId | string | |
| eventId | uuid? | Optional link to primary Event |
| name | string | e.g. "Away-day dad" |
| goals | string[] | What they came to buy / achieve |
| budgetMin / budgetMax | money | Soft constraint |
| constraints | json | sizes, colours, brand prefs, time pressure, mobile-first |
| behaviouralTraits | json | impulse vs deliberate, collection-first vs search-first |
| locationProxy | string? | Country/city from orders — **not income** |
| mockFlags | string[] | e.g. `["demographic_proxy_mock"]` |
| successCriteria | json | See agent loop |
| createdAt | datetime | |

### AffordanceScore (resonates)
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| shopId | string | |
| personaId | uuid | |
| runId | uuid | Agent run |
| targetType | enum | `product` \| `collection` \| `copy` \| `nav` \| `filter` \| `page` |
| targetRef | string | Shopify GID or URL/path or copy snippet hash |
| score | float 0–1 | Higher = resonated |
| evidence | json | clicks, ATC, time-on-PDP proxy, matched goal keywords |
| notes | string? | British English merchant-facing blurb |

### InsightScore
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | |
| shopId | string | |
| personaId | uuid | |
| runId | uuid | |
| targetType | enum | same as Affordance + `checkout` \| `sizing` \| `search` |
| targetRef | string | |
| score | float 0–1 | Higher = more insights |
| insightKind | enum | `dead_end` \| `missing_variant` \| `weak_copy` \| `ux_trap` \| `price_shock` \| `trust` |
| evidence | json | retries, back-nav, abandoned ATC, error text |
| notes | string? | |

### Supporting (minimal)
- `Shop`, `SyncCursor`, `AgentRun` (status, personaId, startedAt, endedAt, outcome: `carted` \| `checkout_started` \| `abandoned` \| `failed`)

---

## E) Agent loop — how a persona shops

```
LOAD Persona + linked Event context + catalogue hints (top collections for event)
SET session: viewport (mobile/desktop), locale, geo cookie if useful
goal_queue ← Persona.goals
budget_remaining ← Persona.budgetMax
success ← false

WHILE goals remain AND steps < maxSteps AND !timeout:
  OBSERVE page (title, H1, nav, products, price, CTAs, errors)
  DECIDE next action against goals/constraints:
    - land home / event collection
    - search keyword from goal
    - open collection matching taxonomy
    - open PDP if product matches constraints
    - select variant (size/colour) if required
    - add to cart if within budget and constraints
    - open cart → checkout start if successCriteria met
  ACT via Playwright
  SCORE:
    + Affordance if progress toward goal (right collection, clear kit builder, strong PDP)
    + Insights if blocked (OOS size, confusing nav, weak copy, price > budget)
  UPDATE budget_remaining, goal_queue
  IF successCriteria satisfied → success ← true; BREAK
  IF stuck (same URL ×3 / no matching products) → InsightScore; BREAK

STOP before payment
PERSIST AffordanceScore[], InsightScore[], AgentRun.outcome
```

**Goals (examples — sport):** “Find home shirt for Saturday”, “Get scarf under £25”, “Bundle for two”.  
**Goals (examples — fashion):** “Date-night outfit under £120”, “Festival layer that photographs well”.

**Constraints:** size, colour, delivery urgency proxy (“need by Friday”), mobile-only, avoid kids’ aisle, brand allow/deny list.

**Success criteria (MVP):** ≥1 goal item in cart **and** checkout page reached **or** cart value within [budgetMin, budgetMax] with all constraints satisfied. Partial success: ATC but abandoned with recorded insights.

**Budget:** Soft — prefer in-range SKUs; if only over-budget options, record `price_shock` insights and stop.

---

## F) Demo script (5–7 min) — sample: **sport merchant** (football kit / fanwear)

*Alt: swap to fashion “date night / festival” with same beats.*

| Time | Beat | What audience sees |
|------|------|--------------------|
| 0:00–0:45 | Hook | “Last Saturday this shop’s orders spiked — but the dashboard just said ‘+shirts’. Syndicate asks: *which match-day shopper, and did the site help them?*” |
| 0:45–1:30 | Install | One-click install on dev store → OAuth → “Syncing orders & catalogue…” |
| 1:30–2:30 | Events | Dashboard: **Match day**, **Away travel**, **Gift for match** with order windows + geo hints. Call out `orders_only` vs `MOCK` badges. |
| 2:30–3:15 | Personas | Open **Away-day dad**: goals, £40–£80 budget, adult L, mobile-first. |
| 3:15–5:00 | Live agent | Run agent: home → Men’s Kits → PDP → size L → ATC → checkout start. Narrate Affordance (clear kit collection) vs Insights (size guide buried / scarf upsell missing). |
| 5:00–6:15 | Artifacts | Resonates table (Home Kit collection, product X) vs Insights (search “scarf” dead-end, weak PDP copy). One fix suggestion: “Surface ‘Match day essentials’ collection on home for Saturday traffic.” |
| 6:15–7:00 | Close | Vision: event-aware merchandising + continuous persona QA. Ask: which vertical first? |

**Merchant-facing copy sample (British English):**  
*“These scores show how shoppers like this persona moved through your store. Mock enrichment is labelled. No payment was taken — runs stop at checkout.”*

---

## G) Tech stack (Cursor-agents-can-build-in-a-day)

**Built with Cursor Cloud Agents on Origin** (`hugeinc/tmp-493181d83584bec6`). Epics in `epics/` are the agent briefs; planning SoT is this docs tree — not a parallel GitHub-required workflow. Full policy: `scope/CURSOR_TOOLING.md`. **Playwright remains the agent runner** for synthetic storefront shoppers (Cursor Browser Agent / computer-use = optional future swap only if a documented product API exists). Cloud Agents build the app; they do not run merchant PipelineRuns at runtime.

| Layer | Choice | Why |
|-------|--------|-----|
| **Build** | **Cursor Cloud Agents on Origin** + epic md attach | Max Cursor leverage; agent-buildable slices; `origin` / CloudAgent commits |
| App framework | **Shopify Remix app template** (`shopify app init`) | OAuth, session, App Bridge, Polaris, GraphQL Admin client already wired |
| Language | TypeScript | Shared types for Event/Persona/scores |
| DB | SQLite (Prisma) for hackathon; Postgres if already in template | Zero ops |
| Clustering | Heuristics in TS (day spikes, collection co-occurrence, geo buckets) + optional OpenAI/Claude for naming only | No ML infra |
| Agent runner | **Playwright** (Node) as `npm run agents:run` | Real storefront UX; primary runtime shopper — not a Cursor cloud agent |
| Queue | In-process / simple file or DB job row (app workers) | No Redis; PipelineRun ≠ Cloud Agent |
| Hosting | `shopify app dev` tunnel for demo | One machine |
| Storefront API | Optional later | Playwright-first is enough for “shop as persona” story |
| UI | Polaris embedded routes: `/app`, `/app/events`, `/app/personas`, `/app/runs` | Familiar merchant UX |

**Do not use for day-1:** Next.js greenfield (rebuilds OAuth), Selenium, full LangGraph multi-agent cloud, pixel extensions, invented “Cursor commerce” APIs, Cloud Agents as production PipelineRun executors, LLM-driven Playwright, embeddings/RAG as required path. Runtime AI call sites: `scope/AI_CALL_CONTRACT.md` only.

**Repo layout sketch**
```
app/                 # Remix routes + Shopify auth
app/services/ingest.ts
app/services/discover.ts
app/services/scores.ts
prisma/schema.prisma
agents/runner.ts     # Playwright persona loop
agents/personas/     # seed JSON for demo
```

---

## H) Open questions for Austin

1. **Vertical for demo:** sport (football fanwear) or fashion (date night / festival) — pick one sample catalogue now?
2. **Dev store:** existing Partner/dev store with realistic order history, or seed synthetic orders?
3. **Checkout policy:** hard stop at cart, or allow checkout *start* only (no payment)? Confirm for ToS / bot optics.
4. **Customer PII:** stay orders+products only even on dev store, or use customer city when present?
5. **Enrichment:** are labelled mocks acceptable on stage, or must every badge be `orders_only`?
6. **Agent autonomy:** ~~scripted vs LLM-driven~~ → **RESOLVED (D11 / D32, 24 Sep 2026):** **scripted Playwright** + thin LLM for event naming / persona blurb / optional rec polish only. **No** LLM decide-next-click. SoT: `scope/AI_CALL_CONTRACT.md`.
7. **Success metric for the hackathon judges:** insight quality, live agent wow, or install→artifact speed?
8. **Name:** Syndicate OK, or preferred product name / domain?
9. **Post-hackathon:** is App Store distribution a goal, or internal tool for selected merchants?
10. **Compliance red line:** any markets/categories to exclude (kidswear, health, etc.) from persona inference language?

---

## Suggested day timeline (for Cursor Cloud Agents on Origin)

| Block | Focus |
|-------|--------|
| 0–1.5h | `shopify app init`, OAuth, Prisma models, Polaris shell |
| 1.5–3.5h | Ingest orders/products/collections; clustering → Events/Personas |
| 3.5–5.5h | Playwright agent loop + 2–3 seeded runs; score writers |
| 5.5–7h | Dashboard artifacts + British English copy + MOCK labels |
| 7–8h | Rehearse demo script; freeze; backup screen recording of agent run |

---

## Pragmatic defaults (if Austin unreachable)

- Vertical: **sport / match day**
- Stop at **checkout start**
- Enrichment: **orders_only + labelled mock geo/persona colour**
- Agents: **scripted Playwright only** (no LLM in runner); thin optional LLM for persona blurb + event naming + rec polish — templates default (`scope/AI_CALL_CONTRACT.md`)
- Scopes: `read_orders,read_products,read_customers` on **dev store only**
