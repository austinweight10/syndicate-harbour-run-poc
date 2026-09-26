# PIVOT_RUNNING — Harbour Athletic → Harbour Run

**Date:** 24 Sep 2026 · Europe/London  
**Decision:** Primary hackathon demo vertical is **RUNNING**, not football kits.

---

## What changed

| Area | Before | After |
|------|--------|--------|
| Brand | Harbour Athletic | **Harbour Run** |
| myshopify subdomain | `harbour-athletic-demo` | **`harbour-run-demo`** (Austin may still create) |
| Catalogue | Home/away shirts, scarves, kits | 9 running products / 26 variants · SKUs `HR-*` |
| Primary personas | Away-day dad · First-time fan | **Race-day taper** · **Wet-weather trainer** (+ fashion stub) |
| Temporal story | Saturday home-shirt match-day spike | **Saturday race-tee spike** (Hyde Park / Battersea / parkrun) |
| Signal story | football-data.org primary | Races, parkrun, run clubs, **Open-Meteo** primary; football-data optional/secondary |
| Playwright path | `path-harbour-athletic-dawn.json` | **`path-harbour-run-dawn.json`** (old paths kept, deprecated) |
| Folder | `live-demo-store/` | **Unchanged path** — content rewritten |

---

## New personas (heuristic, not ML)

1. **Race-day taper** — London race weekend (Sat heavy): race tee + shorts/socks; postcodes W2 / SW11 / E9…; Ready when n≥8 (seed ≈18).  
2. **Wet-weather trainer** — midweek rain: waterproof shell ± race tee; Open-Meteo is **PROXY** for Insights narrative; orders stay **OBSERVED**; Ready n≥8 (seed ≈12).  
3. **Anniversary night-out** — fashion/athleisure **stub** only (A6: two full + stub).  
4. Optional tagged cohorts: `club_social`, `wx_athleisure` — feed insights, not a third Ready persona.

---

## Austin’s Partner steps (`harbour-run-demo`)

1. Partner → Create development store **Harbour Run**, subdomain **`harbour-run-demo`**.  
2. GBP · United Kingdom · Europe/London · publish **Dawn**.  
3. Import `data/products.csv`, `data/customers.csv`; create collections per `data/collections.md`.  
4. Seed 48 orders via `scripts/seed_orders.py` (`DRY_RUN=1` first) or Matrixify / Path C.  
5. PCD L2 Address on Syndicate app; set `SHOP_STOREFRONT_URL=https://harbour-run-demo.myshopify.com`.  
6. Headed Playwright: `path-harbour-run-dawn.json` → `checkout_started` → stop before pay.

Full click path: [`SETUP_RUNBOOK.md`](./SETUP_RUNBOOK.md).

---

## What stayed the same

- Architecture locks **D26–D32**, A5 hybrid, A8 templates, stack, Insights|Frictions dual board  
- Folder name **`live-demo-store/`** (not renamed)  
- Docs / fixtures / labs / seed packs **only** — no Remix epic implementation, no Origin push, no invented live Shopify access  
- Stop-before-pay Playwright policy  
- British English · GBP · Dawn · provenance chips (OBSERVED / AGGREGATE_PROXY / MODEL_HYPOTHESIS / MOCK)  
- Intentional friction pattern (P0 size guide, P1 collection filter, P2 weak copy, shipping at checkout)

---

## Research inputs (do not invent URLs)

`/workspace/london-runner-demo/SIGNALS.md` + `signals.json` — Hyde Park 5K/10K 26 Sep, Battersea, parkrun, run clubs, Open-Meteo. Events in fixtures = **PROXY**; seed orders = **OBSERVED** shop data.
