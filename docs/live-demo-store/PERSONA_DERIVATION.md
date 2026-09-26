# PERSONA_DERIVATION — heuristic clusters from live orders

**Date:** 24 Sep 2026 · Europe/London  
**Shop:** Harbour Run  
**Vertical:** London running (race-day + wet-weather)  
**Epic:** 05 — derivation job reads **live OrderRows after ingest**

---

## Hard rule

**This is not ML training.**  
Austin’s “synthetics trained on what we find” for the hackathon means:

> **Heuristic derivation from observed order / SKU / geo / temporal clusters.**

No embeddings, no classifier training, no fine-tunes. Rules with thresholds below. Fixture personas in `fixtures/personas/demo.json` are **expected outputs** to assert against live derivation — **not** the runtime source of truth for the live demo.

When `USE_ORDER_FIXTURES=0` and the store has ≥20 orders, epic 05 must derive from **ingested** orders. Seed data in `orders-seed.json` **guarantees** the clusters exist.

---

## Seed guarantees (from `data/orders-seed.json`)

| Cluster / signal | Seed target | What to observe |
|------------------|-------------|-----------------|
| Race-day taper | **n ≥ 15** (seed ≈ 18) | Sat windows; London W2/SW11/E9/N1/SE1…; race tee + shorts/socks (± flask/cap); AOV ~£54–£98; `source_name=web` |
| Wet-weather trainer | **n ≥ 10** (seed ≈ 12) | Midweek; waterproof shell alone or shell + race tee / half-zip; London postcodes |
| Race-day temporal lift | Saturday race-tee count ≫ weekday baseline | Seed meta: `race_tee_saturday` ≫ `race_tee_weekday` |
| Club social | Tagged cohort (~10) | Sat easy + cap / joggers / half-zip — colours insights; **not** third DoD persona |
| Wx / athleisure colour | Optional (~8) | Recovery / lifestyle rows — **not** required for A6 DoD |

---

## Derivation rules (epic 05 job)

Inputs: OrderRow list for shop (≤60d), line items with SKU/handle, `createdAt`, shipping city / postal sector, `sourceName`.

### Rule set A — Race-day taper → Ready

A row (or customer rollup) counts toward the cluster when **all** hold:

1. **Basket:** ≥1 line with handle `race-tee-unisex` **AND** (≥1 of `running-shorts` **OR** `performance-socks` **OR** `soft-flask`).  
2. **AOV band:** subtotal ∈ **[50, 100]** GBP (soft band; seed core baskets ~£54–£98).  
3. **Geo:** shipping city = `London` **or** postal sector ∈ `{W2,SW11,E9,N1,SE1,SW4,E1,SW1}` (extend with store’s own top sectors near Hyde Park / Battersea / Hackney).  
4. **Temporal:** `createdAt` local day-of-week **Saturday** **or** within 3h of a catalogue Race-day event start (when event join exists — Hyde Park 5K/10K, Battersea, parkrun PROXY).  
5. **Channel:** `sourceName` in `{web, mobile_web, shopify_draft_order}`.

**Materialise persona** when cluster size **n ≥ 8** (demo Ready bar; seed provides ≥15).  

Populate:

- goals: race tee (adult L preferred); shorts or socks under £45  
- budgetMin/Max: 50 / 100  
- constraints.sizes: `["L"]`; mobileFirst true; timePressure **MODEL_HYPOTHESIS** (race morning)  
- locationProxy: `London — Hyde Park / Battersea / Hackney`  
- evidenceOrderCount: n  
- provenance: OBSERVED (orders) + MODEL_HYPOTHESIS (time pressure) + AGGREGATE_PROXY (race calendar join)

### Rule set B — Wet-weather trainer → Ready or Draft

Count toward cluster when:

1. **Basket:** ≥1 line with handle `waterproof-shell-jacket` (± optional `race-tee-unisex` or `half-zip-midlayer`).  
2. **Temporal:** `createdAt` local day-of-week **Mon–Thu** (midweek rain window).  
3. **Geo:** London / GB postal sectors as above.  
4. **Weather narrative:** Open-Meteo precip bump is **PROXY for Insights copy only** — orders remain OBSERVED; do **not** claim weather caused the purchase without labelled PROXY.

**Materialise** when **n ≥ 6** (seed ≥10). Status Ready if n≥8 else Draft.

### Rule set C — Race-day temporal lift (event confidence input)

Not a persona — feeds epic 04 confidence / IntentCandidate:

```
lift = count(race-tee orders on Saturdays) / max(1, count(race-tee orders on Mon–Fri) / 5)
```

If `lift ≥ 2.0` and Saturday race-tee **n ≥ 5** → support Race-day kit rush narrative (OBSERVED orders + race calendar when present as PROXY).

### Rule set D — Club social (optional colour)

Sat orders with cap / recovery joggers / half-zip without full race-tee+shorts combo → tag cohort `club_social`. May colour Race-day taper constraints (social / café-run) but **does not** create a third DoD persona (A6 locked: two full + stub).

---

## Expected Ready thresholds (assert)

| Persona | Ready when | Seed expected |
|---------|------------|---------------|
| Race-day taper | n ≥ 8 | Ready (≈18) |
| Wet-weather trainer | n ≥ 8 Ready; n ≥ 6 Draft | Ready (≈12) |
| Anniversary night-out | Always stub | Stub |

---

## Fixture personas = expected outputs

| Fixture id | Assert against live derivation |
|------------|--------------------------------|
| `pers_race_day_taper` | Name/status Ready; evidenceOrderCount ≥ 8; geo London race postcodes; goals include race tee |
| `pers_wet_weather_trainer` | Ready or Draft; shell baskets; evidence ≥ 6 |
| `pers_anniversary_stub` | Always stub — not derived from run orders |
| `pers_club_social_stretch` | Optional tagged cluster — **not DoD** |

Test idea: after ingest of seeded store, `personas.derive(shopId)` golden-checks names + status; do **not** ship UI that only reads `fixtures/personas/demo.json` when live orders exist.

---

## What agents consume

Epic 06 Playwright paths use **derived** Ready personas’ goals/constraints.  
Primary path: `path-harbour-run-dawn.json` (Race-day taper).  
Insights must come from the **AgentRun** against Dawn — see `scope/LIVE_DEMO_GATE.md`. Fixture recommendation cards are illegal on the Artifacts board in live/demo-live mode without MOCK badge (epic 07 gate).
