# Harbour Run — live demo store seed pack

**Product:** Syndicate (Cursor Commerce hackathon)  
**Store story:** Harbour Run — London running apparel (race-day + wet-weather training)  
**Suggested myshopify subdomain:** `harbour-run-demo` (Austin may still create this; old `harbour-athletic-demo` is **superseded**)  
**Locale:** British English · GBP · Europe/London · country GB  
**Theme:** Dawn (free, stable selectors)  
**Date:** 24 Sep 2026 · **Vertical pivot:** football kits → **RUNNING** (see [`PIVOT_RUNNING.md`](./PIVOT_RUNNING.md))

---

## What this is

A **complete Shopify Admin upload pack** so Austin can stand up a **real** development store that:

1. Has a coherent Harbour Run catalogue (handles/SKUs `HR-*` aligned with `fixtures/`).
2. Contains **≥40 seeded orders** (pack ships **48**) with observable **Saturday race-tee spike** and persona clusters (**Race-day taper**, **Wet-weather trainer**) derived **heuristically** from order/SKU/geo patterns — **not ML**.
3. Bakes in **intentional frictions** (missing youth size guide, Race Kits excludes shell, weak race/weather copy, shipping cost at checkout) so live Playwright agents can **find** Insights from a real run — not from fixture theatre.

This pack does **not** implement the Remix app. It does **not** need Austin’s Shopify login in this workspace. You get files + click-path runbooks. **No Origin push.**

---

## Why live (not theatre)

Adversarial kill shots A1 / A3 / A4 / Playwright were open because the pitch sold “watch your store shop itself” while the night path was fixtures + MOCK replay. This pack closes the **file-side** of that gap:

| Hole | What this pack provides |
|------|-------------------------|
| **A1** store | Exact Partner click path + CSV/JSON seed for **harbour-run-demo** |
| **A3** URL | `.env.example` + Dawn navigation contract |
| **A4** PCD | Runbook step to enable Level 2 Address on Partner app |
| Playwright | Dawn path `path-harbour-run-dawn.json` + optional theme hooks |

**Austin still must** create the Partner development store and paste tokens — we cannot do that for him.

---

## 30-minute setup (estimate)

| Step | Time |
|------|------|
| Partner → Create development store + GBP/UK/London | 5 min |
| Publish Dawn; password off (or note for Playwright) | 3 min |
| Import `data/products.csv` + create collections | 8 min |
| Import `data/customers.csv` | 2 min |
| Seed orders (Path A script **or** Matrixify **or** manual baskets) | 5–15 min |
| PCD L2 + nav + record URL in `.env` | 5 min |

**Total:** ~25–40 minutes depending on order path.

Full click paths: [`SETUP_RUNBOOK.md`](./SETUP_RUNBOOK.md).

---

## Pack contents

```
live-demo-store/
  README.md
  PIVOT_RUNNING.md
  SETUP_RUNBOOK.md
  PERSONA_DERIVATION.md
  VALIDATION_REPORT.md          ← superseded — re-validate after pivot
  .env.example
  data/
    products.csv
    customers.csv
    orders-seed.json
    matrixify-orders.csv
    collections.md
  images/                       ← <handle>/<colour>.png, manifest.json, contact-sheet.png
  scripts/
    seed_store.py               ← full seed (products, collections, images, customers, orders, menu)
    render_product_images.mjs   ← renders images/ (+ product_image_templates.mjs)
    seed_orders.py
    seed_orders_via_api.md
  playwright/
    PATH_DAWN_HARBOUR.md
  theme-snippets/
    syndicate-demo-hooks.liquid
  fixtures/agents/
    path-harbour-run-dawn.json
    path-harbour-athletic-dawn.json  ← DEPRECATED
```

Also mirrored under repo `fixtures/agents/path-harbour-run-dawn.json` and `scope/LIVE_DEMO_GATE.md`.

---

## Success criteria (live demo)

- [ ] Development store created (`harbour-run-demo` or equivalent).
- [ ] Dawn published; menu: Home · Race Kits · Wet-weather training · Race-day essentials · Kids & Youth.
- [ ] Products imported (≥9 products / SKUs `HR-*`).
- [ ] **≥20 live orders** visible in Admin (target **≥40** / pack **48** from seed).
- [ ] Syndicate app installed (read-only scopes) → ingest sees those orders.
- [ ] `SHOP_STOREFRONT_URL` set; one **headed** Playwright path green (`checkout_started`).
- [ ] Insights / Affordance scores attributed only to **that** `AgentRun` id.
- [ ] Pause auto agents **ON** until headed green; MOCK replay only if labelled emergency.

Pre-Saturday checklist: [`../scope/LIVE_DEMO_GATE.md`](../scope/LIVE_DEMO_GATE.md).

---

## Intentional catalogue frictions (agents should find these)

| Priority | Friction | Where |
|----------|----------|--------|
| **P0** | Kids / Youth Run Tee PDP has **no** size guide section | `kids-youth-run-tee` Body HTML |
| **P1** | Race Kits collection **excludes** waterproof shell | Collections + keep-list |
| **P2** | Weak race-day / weather copy on race tee or shell | `race-tee-unisex` / `waterproof-shell-jacket` Body HTML |
| **Shipping** | Cost only at checkout | Shopify basic shipping / Dawn default — document only |

---

## Personas (heuristic)

| Persona | Role | Seed cohort |
|---------|------|-------------|
| **Race-day taper** | Full Ready | `race_day_taper` — Sat race tee + shorts/socks; London W2/SW11/E9… |
| **Wet-weather trainer** | Full Ready | `wet_weather_trainer` — midweek shell ± tee; Open-Meteo is PROXY narrative |
| **Anniversary night-out** | Fashion stub | Not derived from run orders (A6) |
| Club social / wx athleisure | Tagged clusters | Feed insights; not a third Ready persona unless derivation says so |

Rules: [`PERSONA_DERIVATION.md`](./PERSONA_DERIVATION.md). London signal provenance: `/workspace/london-runner-demo/SIGNALS.md` (AGGREGATE_PROXY).

---

## Images

CSV `Image Src` still uses public **placehold.co** HTTPS URLs so a one-click CSV import works without Files uploads.

`images/<handle>/<colour>.png` (or `main.png`) are rendered flat-lay product images — one per product × colourway,
1200×1200, original artwork (no third-party marks). `images/manifest.json` maps them to products/colours and
`images/contact-sheet.png` shows the whole set. Regenerate with
`node scripts/render_product_images.mjs` (Playwright from `shopify-app/`).

`scripts/seed_store.py`'s `images` stage uploads them (staged upload → product media), links each colour
variant to its image and detaches the old placehold.co media. Products in the manifest are created without
the placeholder. Needs `write_files` on the seed app:

```bash
ONLY=products,collections,images python3 docs/live-demo-store/scripts/seed_store.py
```

---

## What ONLY Austin can do

1. Partner Dashboard → Create development store (`harbour-run-demo`).  
2. Create Syndicate custom app + seed custom app (separate tokens).  
3. Enable **Protected Customer Data Level 2 Address**.  
4. Run `seed_orders.py` with `SHOPIFY_SEED_ADMIN_TOKEN`.  
5. Install Syndicate on the store and set `SHOP_STOREFRONT_URL`.

No Origin push from this pack. British English in merchant-facing copy.
