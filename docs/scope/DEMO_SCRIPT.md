# DEMO_SCRIPT — 5–7 minute hackathon pitch (LIVE Harbour Run)

**Product:** Syndicate  
**Vertical:** Running + athleisure (London race-day / wet-weather training)  
**Shop story (live):** Harbour Run · `harbour-run-demo.myshopify.com`  
**Theme:** Dawn  
**Locale:** British English · Europe/London · GBP  
**Date:** 26 Sep 2026 · **Pivot:** football kits → **RUNNING** (see `live-demo-store/PIVOT_RUNNING.md`)  
**Visual:** cream canvas · charcoal top bar · run stripe · green CTAs only  
**Hard rules on stage:** provenance chips · stop before payment · no wealth APIs · **no fixture Insights claimed as agent-found**

**Gate:** Only use live beats below if [`LIVE_DEMO_GATE.md`](./LIVE_DEMO_GATE.md) is signed. Otherwise open as hybrid/fixture in the first 20s.

**Live vs MOCK (say out loud when relevant)**

| Signal | Mode |
|--------|------|
| OAuth + Admin orders/products from Harbour Run | **Live** Admin API (≥20 orders from seed pack) |
| London races / parkrun / run clubs (Hyde Park, Battersea, …) | **PROXY** curated calendar (**weekend hard P0**) — never claimed as OBSERVED shop demand |
| Weather Drivers (Open-Meteo) | **Live** / labelled MOCK (**weekend hard P0**) — forecast payload OBSERVED; spike Drivers AGGREGATE PROXY |
| Social hashtag watchlist (`social.hashtagTrends`) | **Watchlist + MOCK** when thin (**weekend hard P0**) — never OBSERVED demand alone |
| `social.webHarvest` / VirtualEvent / ActivityChallenge / Strava | **Soft-degrade** — not required on stage (D33) |
| football-data.org Premier League | **Optional / secondary colour** — not required for this demo |
| UK 10K / Hyrox-style / virtual / season drop extras | **MOCK** always when used — not DoD blockers |
| Confidence % & persona names | **MODEL HYPOTHESIS** on aggregates + **OBSERVED** order inputs (derived, not hardcoded fixtures) |
| Playwright browse | **Live** Dawn storefront — **required** for wow beat; MOCK replay only if labelled emergency |
| Recommendation / Insight cards | From **this** AgentRun id — fixture cards forbidden unless `mode=demo` fixtures **or** explicit **MOCK** badge |

---

## Pre-flight (T−10 min, off-stage)

1. `LIVE_DEMO_GATE` P0 ticked; `shopify app dev` tunnel healthy; Connected pill green on Harbour Run.  
2. SyncRun success (≥20 live orders; target ≥40); personas derived (Race-day taper Ready); Pause auto agents was ON until headed green — now as rehearsed.  
3. Storefront URL reachable (password off preferred); headed Playwright already green once today.  
4. Backup only: `demo-completed-run.json` hydrate with **Mock** badge — rehearse saying “replay”.  
5. Browser tabs: Admin app Overview only (no IDE). Labels modal rehearsed.

---

## Beat sheet

| Time | Beat | Screen / route | What you say | What they see | Live / MOCK |
|------|------|----------------|--------------|---------------|-------------|
| **0:00–0:45** | Hook | `/app` Overview | “Last Saturday Harbour Run’s dashboard said ‘+tees’. Syndicate asks: *which race-day shopper, and did the site help them?* Occasion commerce — why they buy this weekend.” | Cream Overview · KPI strip · hero **Race-day kit rush** · compliance note | Hero confidence from **live** orders + race calendar PROXY |
| **0:45–1:20** | Trust / install | Overview top bar + Labels modal | “One-click Admin install. Scopes: orders, products, customers — **read-only**. Every non-order signal is labelled.” | Connected · `harbour-run-demo` · Labels: Obs / Agg / Hyp / Mock | OAuth **Live**; legend static |
| **1:20–2:20** | Events | `/app/events` → Signals | “We join **these** orders to a London running calendar. Hyde Park / Battersea / parkrun as **proxy** demand drivers; Open-Meteo for wet midweeks; football fixtures are optional colour, not required.” | Cards with provenance chips · Signals Lt/G/A/Y/R | Races PROXY; weather Agg; football optional |
| **2:20–3:10** | Personas | `/app/personas` → Race-day taper | “**Race-day taper** falls out of Saturday London baskets — race tee + shorts/socks, £50–£100 band — not income. Derived from live clusters, not a hardcoded demo string.” | Ready card · Wet-weather trainer · greyed fashion stub | Budgets OBSERVED aggregate; time pressure Hyp |
| **3:10–5:00** | Live agent | `/app/runs/:id` | “Watch **this** Dawn storefront shop itself.” Click **Run agents**. Narrate: home → Race Kits → Race Tee L → ATC → Running Shorts → Kids / Youth tee (**no size guide**) → cart → checkout — **stopped before payment**.” | Toast · progress % · ≥5 timeline steps · outcome Carted · checkout started | Playwright **Live** on Harbour Run — **forbidden** to silently hydrate MOCK here |
| **5:00–6:20** | Artifacts | `/app/artifacts` | “What resonated on **this run**. Insights: buried youth size guide, Race Kits missing shell, weak race/weather copy, shipping at checkout. **P0:** add youth size guide for Race-day taper.” | Dual board · P0–P2 · provenance · stop-before-pay | Scores from **this** run id only |
| **6:20–7:00** | Close | Overview or Artifacts | “Enrichment apps tell you who. We show *why this weekend* and whether the site is ready. Agents never take payment. Questions — which vertical next?” | Optional Settings compliance flash | — |

**Total:** aim **6:30**; cut Unknown Fri and Draft persona if overrun.

---

## Click path (memorise)

```
Overview
  → Labels (open/close)
  → Events
  → Race-day kit rush (Signals 20s, Personas tab peek)
  → Personas → Race-day taper
  → Run agents
  → Agent runs (watch live Dawn path)
  → Artifacts (P0 card from THIS run)
  → (optional) Settings Compliance
```

---

## Sample lines (British English — freeze)

- Pitch: *“Stop guessing race-weekend merch. Watch Harbour Run shop itself as the people who actually buy.”*  
- Derivation: *“Race-day taper isn’t a persona we invented in Figma — it’s a Saturday order cluster we can show you in Admin.”*  
- Confidence: *“We think Race-day kit rush drove most of Saturday’s lift around Hyde Park and Battersea — observed orders plus race calendar proxy.”* (avoid fake precision % unless board shows it)  
- Ethics: *“Mock enrichment is labelled. No wealth or credit APIs. No payment was taken — runs stop at checkout.”*  
- Forbidden: *Never* say fixture Insights were “found by the agent” unless the run id matches. *Never* lead with football kits as the primary story.

---

## Failure recovery (spoken)

| Failure | Say / do |
|---------|----------|
| Tunnel / OAuth down | Open Overview in fixture mode; say “hybrid backup” in first 20s |
| Agent path flake | Retry once; then MOCK replay with badge + “replay” |
| Open-Meteo / race feed thin | Lean on OBSERVED Saturday race-tee spike alone |
| Persona Draft only | Still narrate Wet-weather trainer Draft + Race-day Ready |
