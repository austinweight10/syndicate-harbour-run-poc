# SETUP_RUNBOOK — Harbour Run development store

**Audience:** Austin  
**Time:** ~30 minutes  
**Outcome:** Live Dawn storefront + running catalogue + ≥20 (target ≥40 / pack **48**) orders + env ready for Syndicate + Playwright  
**Date:** 24 Sep 2026 · Europe/London  
**Note:** Supersedes Harbour Athletic / football-kit runbook. Subdomain **`harbour-run-demo`**.

Do **not** install random apps. Cookie banner **OFF**. Theme = **Dawn** only until after the demo.

---

## 1) Partner → Create development store

1. Open [Shopify Partner Dashboard](https://partners.shopify.com/) → **Stores** → **Add store** → **Create development store**.
2. Store name: **Harbour Run**.
3. Suggested store URL / subdomain: **`harbour-run-demo`**  
   (old `harbour-athletic-demo` is superseded — do not use for this weekend’s primary demo).
4. Purpose: **Test an app** / build a new app (whichever Partner UI shows).
5. Login: create / use a staff account you control.
6. Open the store Admin once to confirm it boots.

---

## 2) Settings: GBP, UK, Europe/London

In Admin:

1. **Settings → Store details** — Store name: Harbour Run · Country/region: **United Kingdom**
2. **Settings → General / Store defaults** — Currency: **GBP (£)** · Timezone: **Europe/London**
3. **Settings → Shipping and delivery** — Keep Shopify-managed / general shipping so rates appear **at checkout** (intentional shipping-cost Insight). Do **not** add free-shipping-at-cart apps.

---

## 3) Online Store → Themes → Dawn → Publish

1. **Online Store → Themes**.
2. If Dawn is not current: **Add theme** → **Explore free themes** → **Dawn** → Add → **Publish**.
3. **Customize** once → confirm desktop + mobile → Save.
4. Do **not** install third-party themes for the demo.

---

## 4) Password / storefront access (Playwright)

**Preferred:** disable the password page.

1. **Online Store → Preferences**.
2. Turn **off** “Restrict access to visitors with a password”.
3. Visit `https://harbour-run-demo.myshopify.com` in a private window — home should load.

**If you must keep a password:** set `SHOP_STOREFRONT_URL` + local secret password; Playwright handles Dawn password form before the path — see `playwright/PATH_DAWN_HARBOUR.md`. Prefer disabling password for the headed green run.

---

## 5) Import products CSV

1. Admin → **Products** → **Import**.
2. Upload `live-demo-store/data/products.csv`.
3. Verify **9** products / **26** variants (SKUs `HR-*`), including:
   - **Race Tee — Unisex** (`race-tee-unisex`) — S–XL
   - **Running Shorts** (`running-shorts`)
   - **Waterproof Shell Jacket** (`waterproof-shell-jacket`)
   - **Kids / Youth Run Tee** (`kids-youth-run-tee`) — **open PDP → confirm no Size guide section** (P0)
4. A CSV import gives placehold.co placeholders. `seed_store.py`'s `images` stage swaps in the rendered `images/` set (see README → Images).


## 6) Create manual collections (exact handles)

Follow [`data/collections.md`](./data/collections.md). Summary:

| Title | Handle | Include |
|-------|--------|---------|
| Race Kits | `race-kits` | Race tee, shorts, socks, soft flask — **exclude shell** (P1) |
| Wet-weather training | `wet-weather-training` | Shell, half-zip, recovery joggers |
| Race-day essentials | `race-day-essentials` | Tee, shorts, socks, cap, flask |
| Kids & Youth | `kids-youth` | Kids / Youth Run Tee |

---

## 7) Import customers CSV

1. Admin → **Customers** → **Import**.
2. Upload `data/customers.csv`.
3. **25** customers `@harbour-run-demo.test` · London-heavy (W2, SW11, E9, N1, SE1, …).

---

## 8) Orders — three paths (pick one)

### Path A — preferred: Admin API script

See [`scripts/seed_orders_via_api.md`](./scripts/seed_orders_via_api.md).

```bash
export SHOPIFY_STORE_DOMAIN=harbour-run-demo.myshopify.com
export SHOPIFY_SEED_ADMIN_TOKEN=shpat_...   # Harbour Seed Tool app — NOT Syndicate
DRY_RUN=1 LIMIT=3 python3 live-demo-store/scripts/seed_orders.py
python3 live-demo-store/scripts/seed_orders.py
```

Expect ~48 orders; Saturdays heavy on **race tee** (+ shorts/socks). Syndicate stays read-only.

### Path B — Matrixify

Import `data/matrixify-orders.csv` via Matrixify Orders template. Best-effort columns — fall back to A/C if rejected. Uninstall Matrixify after seed if desired.

### Path C — minimum: 8 manual critical orders

Create paid orders by hand:

| # | When | Area | Basket | Why |
|---|------|------|--------|-----|
| 1 | Last Sat 10:00 | W2 | Race Tee L + Running Shorts L | Race-day taper |
| 2 | Last Sat 11:30 | SW11 | Race Tee M + Socks 3-pack | Race-day taper |
| 3 | Prior Sat 09:45 | E9 | Race Tee L + Shorts M + Soft Flask | Race-day taper |
| 4 | Prior Sat 12:00 | N1 | Race Tee L + Socks 5-pack | Saturday spike |
| 5 | Mon 19:00 | W2 | Shell L + Race Tee L | Wet-weather trainer |
| 6 | Wed 18:30 | SW11 | Shell M | Wet-weather thin |
| 7 | Thu 20:00 | E9 | Shell L + Half-Zip M | Wet-weather layers |
| 8 | Last Sat 10:30 | SE1 | Cap + Recovery Joggers M | Club social colour |

---

## 9) PCD Level 2 Address (A4)

On the **Syndicate** Partner app (not seed tool): enable **Level 2 Address** (city / postal sector). Re-install/refresh token if redacted. If still null: keep geo Banner honest.

---

## 10) Freeze theme / apps

- [ ] Dawn published; no theme churn after headed Playwright green  
- [ ] Cookie / consent banner **OFF**  
- [ ] No random apps except Syndicate (+ temporary Matrixify if Path B)  
- [ ] Clear abandoned carts between rehearsals if noisy (R12)

---

## 11) Navigation (Dawn menu)

**Online Store → Navigation → Main menu:**

1. Home → `/`
2. Race Kits → `/collections/race-kits`
3. Wet-weather training → `/collections/wet-weather-training`
4. Race-day essentials → `/collections/race-day-essentials`
5. Kids & Youth → `/collections/kids-youth`

---

## 12) Record final URL into env

Copy [`.env.example`](./.env.example) into the Syndicate app `.env`:

```
SHOP_STOREFRONT_URL=https://harbour-run-demo.myshopify.com
SHOPIFY_STORE_DOMAIN=harbour-run-demo.myshopify.com
USE_ORDER_FIXTURES=0
AGENTS_AUTO_RUN=false
SYNDICATE_LLM_PROVIDER=off
```

Keep `AGENTS_AUTO_RUN=false` (**Pause ON**) until one headed Playwright path is green.

---

## Smoke checklist (before Saturday)

Use [`../scope/LIVE_DEMO_GATE.md`](../scope/LIVE_DEMO_GATE.md). Minimum:

- [ ] ≥20 orders in Admin (prefer ≥40 / 48)  
- [ ] Kids / Youth Run Tee PDP has no size guide  
- [ ] Race Kits has no waterproof shell  
- [ ] Storefront URL loads (password off preferred)  
- [ ] Headed agent path → `checkout_started` → STOP  
