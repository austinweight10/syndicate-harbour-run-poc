# VALIDATION_REPORT — superseded

**Status:** Superseded by the **2026-09-24 running vertical pivot** (Harbour Athletic / football kits → **Harbour Run**).

Football match-day validation claims in prior revisions of this file are **stale** and must not be cited on stage.

**Re-validate after pivot** once Austin creates `harbour-run-demo` and seeds orders:

1. Import `data/products.csv` + collections from `collections.md`.  
2. Import `data/customers.csv`.  
3. Seed via `scripts/seed_orders.py` (DRY_RUN first) or Matrixify.  
4. Confirm Admin ≥40 orders; Saturday race-tee spike; cohorts `race_day_taper` / `wet_weather_trainer`.  
5. Headed Playwright: `path-harbour-run-dawn.json` → `checkout_started`.  
6. Persona derivation Ready thresholds per `PERSONA_DERIVATION.md`.

See [`PIVOT_RUNNING.md`](./PIVOT_RUNNING.md) and [`../scope/LIVE_DEMO_GATE.md`](../scope/LIVE_DEMO_GATE.md).
