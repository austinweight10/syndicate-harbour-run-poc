# seed_orders_via_api — Path A (preferred)

**Script:** `seed_orders.py`  
**Input:** `../data/orders-seed.json` (48 orders)  
**API:** Admin GraphQL `orderCreate` (`2025-01`)  
**Store:** Harbour Run · `harbour-run-demo.myshopify.com`

---

## Why a separate seed app?

| App | Scopes | Purpose |
|-----|--------|---------|
| **Syndicate** | `read_orders`, `read_products`, `read_customers` | Demo product — **read-only forever for MVP** |
| **Harbour Seed Tool** | `write_orders`, `write_customers`, `read_products` | One-shot / rare re-seed of development store |

Never merge write scopes into Syndicate. Judges will ask.

---

## Create the seed custom app

1. In the **Harbour Run** development store Admin → **Settings → Apps and sales channels → Develop apps** → **Allow custom app development** if prompted.
2. **Create an app** → name: `Harbour Seed Tool`.
3. **Configuration → Admin API integration** → select scopes:
   - `write_orders`
   - `write_customers`
   - `read_products`
4. **Save** → **Install app** → reveal **Admin API access token** once → store in 1Password / local env (not git, not Slack).
5. Note store domain: `harbour-run-demo.myshopify.com`.

---

## Prerequisites

- [ ] `data/products.csv` imported (variants must exist; script resolves by **SKU** `HR-*`).
- [ ] Customers imported (optional but recommended — orders still set email + address).
- [ ] Python 3.10+ (stdlib only; no pip deps).

---

## Run

```bash
cd /path/to/cursor-commerce-hackathon

export SHOPIFY_STORE_DOMAIN=harbour-run-demo.myshopify.com
export SHOPIFY_SEED_ADMIN_TOKEN='shpat_…'   # seed app only

# Sanity: print first 3 without writing
DRY_RUN=1 LIMIT=3 python3 live-demo-store/scripts/seed_orders.py

# Full seed
python3 live-demo-store/scripts/seed_orders.py
```

Expect ~48 `OK` lines. Admin → **Orders** should list them with tags `seed` + cohort hint (`race_day_taper`, `wet_weather_trainer`, …).

Rate limiting: script sleeps ~350 ms between creates. On 429, wait and re-run; script is not fully idempotent — check Admin before double-seeding (or change order names).

---

## If `orderCreate` userErrors

| Error | Fix |
|-------|-----|
| Variant not found | Re-import products; confirm SKUs `HR-RT-L`, `HR-WSJ-M`, `HR-KYT-YM`, etc. |
| Protected customer data | Seed app may need address permission on dev store; or strip address fields temporarily |
| Permission denied | Confirm `write_orders` on **seed** app, token from that app |
| Currency | Shop currency must be GBP |

Fallback: Path B Matrixify or Path C manual eight (SETUP_RUNBOOK §8).

---

## After seeding

1. Uninstall or disable **Harbour Seed Tool** if you want a clean app list (optional).
2. Install **Syndicate** (read-only) and run ingest — `USE_ORDER_FIXTURES=0`.
3. Do **not** leave `SHOPIFY_SEED_ADMIN_TOKEN` in the Syndicate process env for the pitch.
