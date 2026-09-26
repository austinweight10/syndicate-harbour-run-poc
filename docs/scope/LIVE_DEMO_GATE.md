# LIVE_DEMO_GATE — pre-Saturday checklist (closes A1 / A3 / A4 / Playwright theatre)

**Date:** 26 Sep 2026 · Europe/London  
**Product:** Syndicate  
**Store pack:** [`../live-demo-store/`](../live-demo-store/)  
**Vertical:** **RUNNING** (Harbour Run) — football kits are no longer the primary demo story  
**Rule:** Do **not** claim a live demo until every **P0** box is ticked. Fixture / MOCK paths remain legal **only** when labelled.

---


## PoC DoD — REAL runtime only (LOCKED 26 Sep 2026)

A **fully wired working PoC** means all of the below. Anything less is **NOT PoC-complete** (even if UI looks finished).

| Must | Forbidden for PoC acceptance |
|------|------------------------------|
| Admin Overview / Events / Insights loaders = **Prisma only** ([LIVE_DATA_WIRE](./LIVE_DATA_WIRE.md)) | Vite `ui/` opened as the demo Admin |
| **Run agents** → real Prisma `AgentRun` + headed Playwright ([RUN_AGENTS_UI_CONTRACT](./RUN_AGENTS_UI_CONTRACT.md)) | localStorage / sessionStorage fake progress |
| Agent-found Insights cite a **real** completed / `stopped_before_payment` `AgentRun` id from **that** session | Route `import demo.json` for primary board |
| Storefront URL: `SHOP_STOREFRONT_URL` overrides `Shop.storefrontUrl`; missing → **B06** | Silent no-op Run agents |
| Deny-list enforced (CONTRACTS SoT); no real order | Unbadged MOCK Insights as “agent-found” |
| Pipeline stages advance (in-process runner OK) | MCP Todo / Cloud Agents as shoppers |
| | `demo-completed-run.json` as **happy path** (emergency/dev + MOCK badge only) |

**Note (bc-18dcc6ca):** UI↔DB wire landed but still using **mock AgentRun** — that is **NOT PoC-complete**. PoC requires a real headed Playwright run reflected in Agent runs + Insights.

Labelled MOCK = emergency/dev / CI stub only — **never** PoC acceptance and **never** silent stand-in on stage.

## P0 — must be green

| ID | Gate | Evidence |
|----|------|----------|
| **A1** | Development store created | Partner store **Harbour Run**; subdomain `harbour-run-demo` (or documented alt). Old `harbour-athletic-demo` superseded. |
| **A3** | Storefront URL | `SHOP_STOREFRONT_URL` env **overrides** `Shop.storefrontUrl` (CONTRACTS); private-window Dawn home OK; missing → B06 |
| **A4** | PCD Level 2 Address | Syndicate custom app: city / postal sector present on ingested orders (or honest `PCD_REDACTED` Banner — prefer enabled) |
| **Dawn** | Theme frozen | Dawn published; menu = Home · Race Kits · Wet-weather training · Race-day essentials · Kids & Youth; cookie banner OFF; no random apps |
| **Orders** | Seed landed | Admin shows **≥40** orders preferred; **≥20** absolute floor for hybrid live (A5) |
| **Playwright** | One headed green | Race-day taper path → `checkout_started` / `stopped_before_payment`; stop before pay; path JSON `path-harbour-run-dawn.json` |
| **Run agents UI** | Real AgentRun visible | Admin **Run agents** creates Prisma `AgentRun` rows; Agent runs page shows live/~2s poll (persona, path, state, scores) — **not** localStorage theatre. See [`RUN_AGENTS_UI_CONTRACT.md`](./RUN_AGENTS_UI_CONTRACT.md). |
| **Insights** | From that run only | AffordanceScore / InsightScore / agent-attributed Artifacts cards reference **that** `AgentRun` id |
| **UI↔DB** | Admin loaders hit Prisma | Events + Insights/Frictions (and Overview KPIs) loaders query Prisma/`EventCandidate` + Recommendation/Artifacts — **verified**; no route-level `import demo.json` for primary board. See [`LIVE_DATA_WIRE.md`](./LIVE_DATA_WIRE.md). |
| **Pause** | Auto agents OFF until green | `AGENTS_AUTO_RUN=false` / Settings Pause ON until headed path passes once |
| **MOCK** | Emergency/dev only — **not PoC** | `demo-completed-run.json` hydrate **only** with visible **MOCK** badge + spoken “replay” — **never** PoC acceptance / never silent stand-in |

---

## P1 — strongly preferred

- [ ] Kids / Youth Run Tee PDP: confirm **no** size guide (P0 Insight bait).  
- [ ] Race Kits collection: **no** waterproof shell (P1 filter dead-end).  
- [ ] Race tee / shell body: weak race-day / weather language still present (P2 copy bait).  
- [ ] Persona derivation from live orders yields Race-day taper Ready + Wet-weather trainer Ready/Draft (`PERSONA_DERIVATION.md`).  
- [ ] `USE_ORDER_FIXTURES=0`.

---

## Forbidden on stage (theatre)

- Saying “watch your store shop itself” while the board is fixture recommendations with no matching completed AgentRun.  
- Claiming fixture Insights as agent-found.  
- Running MOCK replay without the MOCK chip.  
- Pitching write/auto-fix of the size guide (read-only MVP).  
- Leading with football kit / match-day shirt as the primary story (running is primary).
- Shipping Insights/Events from static HTML or `import demo.json` in the route (must be Prisma — LIVE_DATA_WIRE).
- Clicking **Run agents** that only toasts / fakes progress without a Prisma `AgentRun` (RUN_AGENTS_UI_CONTRACT).
- Treating MCP Todo or Cursor Cloud Agents as the shopper runtime.
- Using `demo-completed-run.json` (or any MOCK hydrate) as the PoC happy path.
- Claiming PoC-complete when UI↔DB is wired but AgentRun is still mock (e.g. bc-18dcc6ca pattern).

---

## Austin-only remaining clicks

Files in `live-demo-store/` cannot create a Partner store or enable PCD. Austin must still:

1. Create the development store (`harbour-run-demo`).  
2. Create Syndicate app + optional Harbour Seed Tool.  
3. Enable PCD L2 Address.  
4. Run `scripts/seed_orders.py` (or Matrixify / manual).  
5. Paste `SHOP_STOREFRONT_URL` / tokens into env.

Runbook: [`../live-demo-store/SETUP_RUNBOOK.md`](../live-demo-store/SETUP_RUNBOOK.md). Pivot note: [`../live-demo-store/PIVOT_RUNNING.md`](../live-demo-store/PIVOT_RUNNING.md).

---

## Sign-off

| Role | Name | Date | Headed run id |
|------|------|------|----------------|
| Hackathon lead | | | |

When signed, DEMO_SCRIPT live beats are authorised. Until then, open the pitch as **hybrid / fixture-backed** in the first 20 seconds.
