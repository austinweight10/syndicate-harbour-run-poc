# RISKS_AND_DECISIONS — register + decision log

**Date:** 24 Sep 2026 · Europe/London  
**Product:** Syndicate MVP (hackathon)

---

## 1) Risk register

| ID | Risk | Likelihood | Impact | Mitigation (MVP) | Owner |
|----|------|------------|--------|------------------|-------|
| R1 | **PCD redaction** — shipping city/zip null on non-dev / unapproved Level 2 | M | H — weak geo → confidence / personas thin | Dev store or custom app with L2 Address; fixture geo + info Banner `PCD_REDACTED`; never invent street-level data | Austin + build |
| R2 | **ToS / crawl risk** — parkrun CDN, undocumented CrossFit, HTML race scrapers | M | H — legal / ethics fail on stage | **No live parkrun/CrossFit scrape**; MOCK only; CI grep ban parkrun fetch URLs | Build |
| R3 | **football-data free tier limits** (~10 req/min) + token missing | M | M — no live fixtures | Cache last-good; 6h schedule; circuit 1h; MOCK overlap OK with Obs preference when live returns | Build |
| R4 | **Open-Meteo non-commercial / rate** — fine for hackathon; production needs paid | L (hackathon) / H (prod) | M | Attribute CC BY; Settings copy; document paid plan post-hackathon | Austin (prod later) |
| R5 | **Shopify Admin 429** on ingest | M | M — empty demo | Cap 500 orders; backoff; Banner Retry; fixture import path | Build |
| R6 | **Playwright flakiness** — theme selectors, slow storefront, bot optics | H | H — kills live wow | Scripted path; concurrency 1; 180s timeout; **MOCK replay** labelled; stop before pay; guest only | Build |
| R7 | **Checkout / bot ToS optics** if payment attempted | L if guarded | H | Deny-list + code assertions; outcome checkout_started only; disclaimer on UI | Build |
| R8 | **Scope creep** — fashion depth, pixels, Neo4j, wealth proxies, write scopes, export PDF | H | H — miss demo | Locked MVP list below; epics Out of scope; fashion stub only | Austin |
| R9 | **LLM naming leaks PII** | L | H | Aggregate cards only; no customer names/emails in prompts; optional key | Build |
| R10 | **SQLite / single-box** — tunnel drop mid-demo | M | H | Pre-warm data; screen recording backup; local fixtures | Austin + build |
| R11 | **Confidence overclaim** — judges hear 82% as fact | M | M | Provenance + component breakdown; “we think” British English copy | Pitch |
| R12 | **Agent creates real carts noise** on shared dev store | M | L | Dedicated demo store; clear carts between runs | Austin |
| R13 | **Access token in SQLite plaintext** | M | M (hackathon) | `.gitignore` DB; never render in Settings; encrypt nice-to-have | Build |
| R14 | **Demo vertical mismatch** — store is fashion-only | M | H | Seed kit SKUs or choose football/athleisure store before build | **Austin** |
| R15 | **Auto agents surprise** — merchant confused by Playwright traffic on install | M | M | Named PipelineRun stages in UI; Settings **Pause auto agents**; cap ≤3; concurrency 1; stop-before-pay banner | Build + pitch |
| R16 | **Pipeline thrash** — re-OAuth / double enqueue floods jobs | M | M | Idempotency: one active PipelineRun per shop; stage keys | Build |
| R17 | **Social ToS / scrape risk** — unofficial X/Twitter HTML or shadow APIs | M | H — ethics/legal fail | Weekend hard P0 = curated HashtagWatch JSON + MOCK (`social.hashtagTrends`); **`social.webHarvest`** = soft-degrade allowlist (robots.txt) not DoD (D33); optional official X/Reddit APIs **P2 only** (A15); never hard-dep ToS-breaking scrapes; CI: no twitter.com/x.com fetch required | Build |
| R18 | **API keys absent** — football-data; Open-Meteo rate; web harvest blocked | M | M — thinner catalogue | Soft-degrade: MOCK fixtures/social; last-good WeatherForecast; webHarvest skip + MOCK; Settings degraded + signal-sources honesty | Build + Austin |
| R19 | **Social overclaim** — judges hear hashtag buzz as OBSERVED demand | M | M | Provenance rule: social alone never OBSERVED demand; needs order lift; UI copy “we think” + Agg/Hyp/Mock chips | Pitch + build |
| R20 | **Strava / activity ToS** — unofficial private-athlete scrape or over-broad OAuth scopes | M | H — ethics/legal fail | MVP = curated Club/Challenge JSON + MOCK Drivers; optional OAuth = **aggregate club stats only** (A16); never private activities; Settings honesty copy | Build + Austin |
| R21 | **Virtual geo thinness** — online events lack venue → weak geo score (G) | M | M — virtual cards look weak | Audience GeoBuckets from store orders + synthetic `global/virtual`; cap pure-virtual at national; label mode chip | Build |

**Risk heat (hackathon day):** R6, R8, R1, R14, R10, R15, R17, **R20** are the ones most likely to burn the pitch.

---

## 2) Decision log — locked choices (do not reopen in build)

| # | Decision | Locked choice | Source |
|---|----------|---------------|--------|
| D1 | Demo vertical | Sports + athleisure; football kit + athleisure hybrid | epics README pragmatic defaults |
| D2 | Product name | Syndicate | COMBINED / MVP |
| D3 | OAuth scopes | `read_orders,read_products,read_customers` only | epics 01 |
| D4 | Order history | ≤60 days; hackathon cap ~500 | epics 02 |
| D5 | Graph store | SQLite tables + GraphEdge (not Neo4j) | epics 04 |
| D6 | Live calendars | **Running PROXY + Open-Meteo forecast** primary (Harbour Run); football-data.org PL = **optional colour only** (D33) | epics 03 / sports pipeline / SIGNAL_SOURCES / D33 |
| D7 | Races / Hyrox / parkrun-shaped / virtual | MOCK JSON labelled; virtual also first-class via **D31** (`mode` + VirtualEvent) | epics 03 |
| D8 | parkrun live scrape | **Forbidden** | sports pipeline |
| D9 | Architecture | Graph + agents hybrid | planning brief |
| D10 | Agent stop policy | Checkout **start** OK; **never** payment | epics 06 |
| D11 | Agent autonomy | Scripted Playwright + thin LLM for naming/blurbs | pragmatic defaults |
| D12 | Prior-year Y | Neutral `0.5`; label in UI | epics 04 |
| D13 | Confidence canonical | `value` float 0..1 | epics 04 |
| D14 | Fashion persona | Greyed stub “Anniversary night-out” non-interactive | epics 05 / UI |
| D15 | UI locale | British English | global |
| D16 | Visual direction | Cream `#f2ebe3` / charcoal `#292524` / kit stripe / green `#008060` CTAs only | UI specs |
| D17 | Provenance set | OBSERVED · AGGREGATE PROXY · MODEL HYPOTHESIS · MOCK | ethics |
| D18 | Wealth / credit APIs | Out | MVP cut |
| D19 | Pixels / Customer Events | Out of MVP | MVP cut |
| D20 | write_* scopes / auto theme edit | Out | epics 07 |
| D21 | Export brief | Honest empty / not wired | epics 07/09 |
| D22 | Demo shop domain story | **Live primary:** `harbour-run-demo.myshopify.com` (Harbour Run Dawn). Legacy UI prototype story `harbour-run-demo.myshopify.com` = fixture/MOCK label only | live-demo-store pack 24 Sep 2026 |
| D23 | Timezone default | Europe/London | Shop model |
| D24 | Currency default | GBP | personas / shop |
| D25 | EventCandidate replace strategy | Delete-and-rewrite per shop on recompute | CONTRACTS.md |
| D26 | **Auto-run agents on live install** | **Yes, capped** (≤3 Ready personas, concurrency 1, stop-before-pay). Settings toggle **Pause auto agents** (`ShopSettings.agentsAutoRun`, default `true`). Demo mode does not auto-run live Playwright. | Austin feedback 22 Sep 2026; AUTO_PIPELINE_ON_INSTALL.md |
| D27 | Auto pipeline on live OAuth | **Mandatory** stages a→f (store makeup → graph seed → catalogue → score → personas → agents queue). Not opt-in for wiring; agents pause is the only merchant opt-out mid-pipeline. | Austin feedback 22 Sep 2026 |
| D28 | **Cursor-first build** | Implement via **Cursor Cloud Agents on Origin**; epics are agent-buildable; docs SoT in this tree; no parallel GitHub-required SoT workflow. **Playwright** remains the runtime synthetic shopper unless a **documented** Cursor Browser Agent / computer-use API becomes a supported swap (optional future). Cloud Agents **build** the app — they do **not** execute merchant PipelineRuns in production. Do not invent Cursor commerce APIs. | Austin feedback 22 Sep 2026; CURSOR_TOOLING.md |
| D29 | **Friction renamed to Insights** | Merchant board/column, UI copy, and surfaced schema (`InsightScore`, rec kind `insight`) use **Insights**; English “friction” as UX phenomenon in research/competitor notes may remain | Austin 22 Sep 2026 |
| D30 | **Social + weather forecast first-class** | Trending hashtags/social buzz + **7-day local weather forecasts** per GeoBucket are baked-in Event/Driver inputs. Jobs `social.hashtagTrends` + `social.webHarvest` + `weather.forecastLocal`. **Weekend hard-path subset superseded by D33** (watchlist + weather hard; webHarvest soft-degrade). WeatherForecast payloads OBSERVED; social never OBSERVED demand alone. | Austin ask 22 Sep 2026; A15 rewrite 24 Sep 2026; **D33** 26 Sep 2026; SIGNAL_SOURCES.md |
| D31 | **Virtual/online events + Strava/activity networks first-class** | `Event.mode` = `physical`\|`virtual`\|`hybrid` (UI chips + catalogue filters). Schema + jobs for VirtualEvent seed + ActivityChallenge curated/MOCK Drivers remain; **weekend DoD soft-degrade per D33** (not hard blockers). Optional Strava OAuth = **aggregate club stats only** (A16). Activity buzz = AGGREGATE_PROXY or MOCK — never OBSERVED demand without order lift. | Austin ask 22 Sep 2026; **D33** 26 Sep 2026; SIGNAL_SOURCES.md · SPORTS_EVENT_GRAPH_PIPELINE.md |
| D32 | **AI runtime contract** | Optional thin LLM only for `ai.eventName`, `ai.personaBlurb`, `ai.recPolish` on aggregate non-PII inputs. Weekend default **templates only** (A8). Primary OpenAI `gpt-4o-mini`; fallback Anthropic `claude-haiku-4-5` (Claude Haiku class); else off. Caps ≤5 calls/batch, ≤$5 weekend. Provenance MODEL_HYPOTHESIS. **Never:** LangGraph runtime, LLM-driven Playwright, embeddings/RAG, vision, customer-email rewrite, social demand via LLM, Cloud Agent as PipelineRun. Full SoT: [`AI_CALL_CONTRACT.md`](./AI_CALL_CONTRACT.md). | Austin tighten 24 Sep 2026; A8; NON_FUNCTIONALS |
| D33 | **Weekend catalogue hard P0 cut** | Harbour Run DoD catalogue signals = **`weather.forecastLocal`** + **race/running calendar PROXY** (`catalogue.mock_sports_seed` running rows) + **`social.hashtagTrends`** (watchlist + MOCK). Soft-degrade / not DoD: `social.webHarvest`, virtual_events_seed, activity_challenges, football_fixtures (optional colour), AQ/transport/school holidays, official X/Reddit, Strava OAuth (A16). Schema + jobs kept. Ethics unchanged. SoT: `WEEKEND_SIGNAL_P0.md` · `SIGNAL_SOURCES.md` §1. | Austin lock 26 Sep 2026; proves joins not catalogue fat |
| D34 | **Admin Graph view in PoC** | Merchants get Remix Admin route **`/app/graph`** (nav **Graph**) — force-style canvas from Prisma `GraphEdge` + node labels; default **Race-day evidence path**; caps ~150/300; Overview teaser optional. Lab `syndicate-graph-lab/viz` remains builder aid only. **Never** lab sqlite or Vite-as-Admin. Overrides earlier “no Admin force graph for MVP” in GRAPH_VISUAL for weekend PoC. SoT: `ADMIN_GRAPH_VIEW.md` · `GRAPH_VISUAL.md` · `ui/graph.html`. | Austin ask 26 Sep 2026 |

---

## 3) Remaining decisions — Austin must make before build

Priority: **P0** blocks day-1 scaffold; **P1** blocks demo quality; **P2** can default.

| ID | Decision | Options | Default if unreachable | Pri |
|----|----------|---------|------------------------|-----|
| A1 | **Dev / Partner store** | Existing Partner store with kit catalogue vs new store vs fixture-only demo | **Seed pack ready 24 Sep 2026:** create `harbour-run-demo` via [`../live-demo-store/SETUP_RUNBOOK.md`](../live-demo-store/SETUP_RUNBOOK.md); fixture-first only if Austin blocked | **P0** — Austin must still create Partner store (we can't) |
| A2 | **football-data.org token** | Provide token vs MOCK fixtures only | MOCK fixtures + degraded banner; **optional for running demo** | **P2** (was P0 for football-primary) |
| A3 | **Storefront URL** for Playwright | Primary domain from Shop vs password-protected preview vs override env | **Pack provides** `live-demo-store/.env.example` + Dawn path; Austin pastes final URL; prefer password OFF | **P0** |
| A4 | **PCD Level 2 Address** on Partner app | Enable for city/sector vs orders-only + fixture geo | Runbook §9 in live-demo-store; enable on Syndicate custom/dev; Banner if null | **P0** |
| A5 | **Demo data strategy** | Live vs fixtures vs hybrid | **LOCKED 24 Sep 2026: Hybrid** — prefer live orders/products when ≥20 orders; fixtures only if thin | **Done** |
| A6 | **Persona count** | Third runner vs 2 + stub | **LOCKED DEFAULT 24 Sep 2026: two full personas + fashion stub**; Taper-week runner = optional stretch, **not** DoD | **Done** |
| A7 | **Hackathon success metric** | Insight quality vs live agent wow vs install→artifact speed | **LOCKED DEFAULT 26 Sep:** PoC proves **≥1 agent-attributed Insight with real AgentRun id** + **≥2 Ready personas** (headed stop-before-pay). Austin may override in reply. | **Done (default)** — Austin override OK |
| A8 | **LLM key for naming/polish** | Provide OpenAI `gpt-4o-mini` / Anthropic Claude Haiku class vs templates only | **LOCKED WEEKEND DEFAULT: Templates only** (P2). Optional polish if `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` present — see D32 / `AI_CALL_CONTRACT.md`. App must demo with LLM off. | **P2** (default locked) |
| A9 | **Hosted tunnel** | Cloudflare/Shopify default vs fixed ngrok domain for slides | Shopify `app dev` default | **P2** |
| A10 | **Post-hackathon intent** | App Store vs design partners only | Design partners (affects PCD narrative only) | **P2** |
| A11 | **Kidswear language** | Keep kids scarf goal vs exclude junior | Keep kids scarf (fanwear); no health claims | **P2** |
| A12 | **Campaign recommendation card** | Include one P2 vs insight/merch/collection only | One optional P2 OK | **P2** |
| A13 | **Nightly pipeline refresh** | Scheduled vs install/manual only | **LOCKED: Skip scheduled** for hackathon; install + reconnect + manual Refresh only | **Done** |
| A14 | **Confirm D26** Pause-agents default | Default ON vs OFF | **CONFIRMED: Default ON** — capped auto agents + Pause toggle (D26) | **Done** |
| A15 | **Social / buzz acquisition** | X/Reddit keys vs curated vs public web | **LOCKED REWRITE 24 Sep 2026:** (a) curated hashtag watchlist always · (b) **`social.webHarvest`** public allowlist crawl (robots.txt, AGGREGATE_PROXY) · (c) MOCK. Optional official X/Reddit APIs = **P2 only** if keys later — **not required**. No unofficial X HTML scrapes / shadow APIs / per-customer handles. | **Done** |
| A16 | **Optional Strava OAuth app** for activity path (c) | Provide credentials vs curated/MOCK | **LOCKED DEFAULT: Curated + MOCK**; OAuth = aggregate club/challenge only if provided — never block pipeline | **Done** |


### A1 / A3 / A4 — seed pack status (24 Sep 2026)

File-side mitigation shipped: [`../live-demo-store/`](../live-demo-store/) (products/customers/orders seed, Dawn Playwright path, SETUP_RUNBOOK). Pre-Saturday gate: [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md). Holes ledger: [`HOLES_PLUGGED.md`](./HOLES_PLUGGED.md).

**Still Austin-only:** Partner → create store; PCD L2 on Syndicate app; run `seed_orders.py` with a **separate** write-scoped seed app token; paste `SHOP_STOREFRONT_URL`. Build agents must not claim A1 closed until LIVE_DEMO_GATE is signed.

### Suggested Austin reply format (copy-paste)

```
A1 store: harbour-run-demo (or URL) — use live-demo-store pack; still Austin creates Partner store
A2 football-data token: yes/no (paste to 1Password / env, not chat if secret)
A3 storefront URL: …
A4 PCD L2 Address: enabled / not
A7 judge metric: DEFAULT locked (≥1 agent Insight + real AgentRun id + ≥2 Ready personas) — override: insight | agent | speed

# Locked — do not re-ask unless overturning:
# A5 hybrid (≥20 orders → live; else fixtures)
# A6 two personas + fashion stub (runner = stretch only)
# A13 skip nightly · A14 agents ON capped · A15 webHarvest+watchlist+MOCK · A16 Strava curated/MOCK default
# A8 templates default · D32 AI_CALL_CONTRACT (optional gpt-4o-mini / Claude Haiku polish only)
```

---

## 4) Open questions from epics — resolved by defaults

| Epic open question | Resolution |
|--------------------|------------|
| Remix vs React Router template | Whatever `shopify app init` scaffolds; keep `/app/*` |
| Encrypt tokens at rest | Optional; plaintext SQLite OK if gitignored |
| Cap 500 vs full 60d | Cap 500 day-1 |
| PL only | Yes |
| Confidence 0–1 vs 0–100 | Store 0–1 |
| Cart vs checkout start | Checkout start |
| Campaign cards | One optional P2 |
| Settings demo playground buttons | Yes behind `DEMO_STATE_PLAYGROUND=1` |
| Auto agents on install? | **Yes capped** (D26); Settings pause toggle |
| Leave merchant on fixtures after live OAuth? | **No** — PipelineRun mandatory (D27) |
| Social + weather forecast in MVP? | **Yes** — D30; **weekend hard = weather + watchlist** (D33); webHarvest soft |
| Unofficial X scrape? | **No** as hard-dep; curated watchlist + **public web harvest** + MOCK (A15 rewrite); official X/Reddit APIs P2 only |
| Virtual + Strava/activity in MVP? | **Schema yes (D31)**; **weekend soft-degrade / not DoD (D33)**; Strava OAuth A16 optional |
| Unofficial Strava private-athlete scrape? | **No**; never hard-dep |
| LLM / LangGraph at runtime? | **Templates first**; optional thin naming/blurb/polish only (D32 / AI_CALL_CONTRACT). No LangGraph; no LLM Playwright |

---

## 5) Escalation rule for build agents

**A7 default locked 26 Sep** — do not block build waiting for metric reply; Austin may override.

If a choice is **not** in §2 and **not** answered in §3, use **Pragmatic defaults** from `epics/README.md` / `scope/AGENT_KICKOFF.md` and note the assumption in the PR description — do **not** message Austin mid-build unless **A1–A4** (store/token/storefront/PCD) block compile/install. A5/A6/A8-default-templates/A13/A14/A15/A16/D32 are locked — do not re-escalate; do not invent LangGraph or LLM browsers.


### Vertical pivot (2026-09-24)

**D-pivot:** Primary weekend demo vertical is **RUNNING** (Harbour Run / `harbour-run-demo`), not football kits. Architecture locks D26–D32 unchanged. football-data.org becomes optional/secondary. See `live-demo-store/PIVOT_RUNNING.md`.
