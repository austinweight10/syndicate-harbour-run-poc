# Syndicate — Deep technical planning report

**Product:** Syndicate (occasion-commerce intelligence Shopify app)  
**Owner:** Austin Weight  
**Audience:** engineering / product planning  
**Date:** 22 Sep 2026 (Europe/London)  
**Companion docs:** `MVP_ARCHITECTURE.md`, `COMBINED_PLAN.md`  
**Language:** British English  

This report answers three questions with citations. Where a field or API behaviour could not be verified from official docs at research time, it is marked **verify** rather than invented.


> **SUPERSEDED as weekend SoT (26 Sep 2026).** Product vertical for the hackathon PoC is **Harbour Run / running** — not football kits as primary. Do **not** implement from this file alone.  
> **SoT now:** [`scope/WEEKEND_BUILD_SPEC.md`](./scope/WEEKEND_BUILD_SPEC.md) · [`scope/AGENT_KICKOFF.md`](./scope/AGENT_KICKOFF.md) · [`scope/LIVE_DATA_WIRE.md`](./scope/LIVE_DATA_WIRE.md) · [`scope/RUN_AGENTS_UI_CONTRACT.md`](./scope/RUN_AGENTS_UI_CONTRACT.md) · [`scope/LIVE_DEMO_GATE.md`](./scope/LIVE_DEMO_GATE.md) · [`live-demo-store/`](./live-demo-store/) · epics 01–09.  
> Football / match-day content below is **historical / optional secondary catalogue** only. Kept for research context — do not re-litigate D26–D32.

---

## Executive summary

Syndicate can ship as an **embedded Admin app** scaffolded with Shopify CLI (React Router / historically Remix template). Honest “one-click” means: merchant clicks Install → grants scopes → app opens in Admin and starts a background backfill. It does **not** mean zero configuration for theme pixels, App Store listing, protected-customer-data approval, or billing.

For data, MVP should lean on **orders + products + collections** (last 60 days), use shipping **city / province / country / zip** only after Level 2 protected-customer-data approval (or on custom/dev installs where PCD is always available), and treat browse pixels / ShopifyQL as Tier 1+.

For models, a **tiered architecture** is recommended: Tier 0 (hackathon) = calendar heuristics + basket rules + LLM naming; Tier 1 = geo×collection anomaly detection + simple clustering; Tier 2 = embeddings, sequence models, aggregate IMD/ACS enrichment. **Never** score individual wealth; use area aggregates only, labelled as proxies.

---

## ASCII data-flow diagram

```
                         ┌──────────────────────────────────────┐
                         │  Merchant (Shopify Admin)            │
                         │  App Store / custom install link     │
                         └──────────────────┬───────────────────┘
                                            │ 1. Install + scope grant
                                            │    (managed install via
                                            │     shopify.app.toml)
                                            ▼
┌───────────────────────────────────────────────────────────────────────────┐
│  Embedded Syndicate app (App Bridge + Polaris + React Router/Remix)        │
│                                                                           │
│  Browser ──ID token──► authenticate.admin() ──token exchange──► offline   │
│                              │                           access token     │
│                              │                                   │         │
│  ┌───────────────────────────┴───────────────────────────┐       │         │
│  │ Admin UI: Events · Personas · Affordance / Insights   │       │         │
│  └───────────────────────────┬───────────────────────────┘       │         │
│                              │                                   │         │
│  ┌───────────────────────────▼───────────────────────────┐       │         │
│  │ App backend                                           │◄──────┘         │
│  │  • GraphQL Admin API client                           │                 │
│  │  • Webhook HMAC verifier                              │                 │
│  │  • Job queue (after APP_UNINSTALLED / ORDERS_CREATE)  │                 │
│  └───────────┬───────────────────────────┬───────────────┘                 │
└──────────────┼───────────────────────────┼─────────────────────────────────┘
               │                           │
               │ sync / webhooks           │ spawn persona runs
               ▼                           ▼
┌──────────────────────────────┐   ┌────────────────────────────────────────┐
│ Shopify Admin GraphQL        │   │ Agent runner (Playwright / later API)  │
│  Orders · LineItems          │   │ Browse Online Store as persona         │
│  Products · Variants         │   │ STOP before payment                    │
│  Collections · Tags          │   └──────────────────┬─────────────────────┘
│  Customers* (PCD gated)      │                      │
│  Markets · Metafields        │                      ▼
│  AbandonedCheckout*          │   ┌────────────────────────────────────────┐
│  customerJourneySummary*     │   │ Online Store / preview theme           │
│  shopifyqlQuery* (reports)   │   └────────────────────────────────────────┘
└──────────────┬───────────────┘
               │ normalised events
               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Syndicate analytics store (Postgres / SQLite for hackathon)              │
│  orders_facts · basket_vectors · event_labels · persona_profiles         │
│  affordance_scores · insight_scores · enrichment_flags (MOCK|AGGREGATE) │
└──────────┬───────────────────────────────┬───────────────────────────────┘
           │                               │
           ▼                               ▼
┌────────────────────────────┐   ┌─────────────────────────────────────────┐
│ Event / occasion inference │   │ Location behavioural patterns (agg.)    │
│ Tier0: calendars + rules   │   │ Tier0: city/country frequency only      │
│ Tier1: anomaly detection   │   │ Tier1: postcode sector → LSOA IMD join  │
│ Tier2: embeddings+LLM name │   │ Tier2: ACS/IMD features + propensity    │
└────────────────────────────┘   └─────────────────────────────────────────┘

Optional later (NOT MVP):
  Theme app extension · Web Pixel (consent-gated) · Billing API · App Store review

* = protected customer data and/or extra scopes; see §2
```

---

## Recommended OAuth scope lists

### MVP / hackathon (dev store or custom app)

Declare in `shopify.app.toml` (managed installation):

```toml
[access_scopes]
scopes = "read_products,read_orders,read_customers"
```

| Scope | Why |
|-------|-----|
| `read_products` | Products, variants, product type, vendor, tags, collections (via product/collection queries) |
| `read_orders` | Orders + line items + tags + note/`customAttributes`; last **60 days** only |
| `read_customers` | Customer records when PCD allows; on public App Store installs fields may be redacted until approved |

**Also request in Partner Dashboard (PCD):** Level 1 minimum; Level 2 **Address** (and optionally Name) if shipping city/zip are required for geo personas. On **custom apps** and **admin-created custom apps**, Level 1/2 PCD is generally always available (Level 2 may vary by plan for admin-created). Development-store-only installs: select fields in Partner Dashboard; no App Store review needed.  
Source: https://shopify.dev/docs/apps/launch/protected-customer-data

### Full product (v1+)

```toml
scopes = "read_products,read_orders,read_all_orders,read_customers,read_markets,read_reports,read_metaobjects,write_pixels,read_customer_events"
```

| Scope | Why | Gate |
|-------|-----|------|
| `read_all_orders` | Orders older than 60 days | Partner approval; request alongside `read_orders` — https://shopify.dev/docs/api/usage/access-scopes |
| `read_markets` | Markets / locales for international stores | Verify exact Markets object scopes in current Admin API reference |
| `read_reports` | `shopifyqlQuery` analytics | Also requires **Level 2 PCD** — https://shopify.dev/docs/apps/build/shopifyql/graphql-admin-api |
| `write_pixels` + `read_customer_events` | Web pixel for browse events | Consent / privacy purposes — https://shopify.dev/docs/apps/build/marketing/build-web-pixels |
| Metafields | Often covered by owning resource scopes; app-owned metafields may need definition setup | Prefer app-owned namespace |

**Optional later:** billing-related flows use App Billing / subscription APIs (not an install scope in the same sense); see §1.8.

**Do not request for MVP:** `write_orders`, `write_products`, `write_customers`, checkout completion scopes, inventory write.

---

# 1) How would it work as a one-click Shopify plugin?

## 1.1 Distribution models

| Path | Who installs | Review / PCD | Fit for Syndicate |
|------|--------------|--------------|-------------------|
| **Public App Store** | Any merchant via listing | App review + PCD review for customer/order data | Long-term distribution |
| **Custom distribution** (link / Shopify admin install) | Named merchants | Custom apps: PCD Level 1/2 typically always available | Hackathon + early design partners |
| **Dev store** | Developer testing | PCD fields selectable without full review | Day-1 build |

Docs: https://shopify.dev/docs/apps/launch/distribution (verify current distribution UI names in Partner Dashboard / Dev Dashboard).

“Plugin” in Shopify terms usually means either an **embedded Admin app** (our case) and/or **theme app extensions** / **web pixels**. Syndicate’s core value is Admin analytics + agents; theme extension is optional.

## 1.2 Real install flow (embedded CLI app)

Shopify’s recommended path for embedded apps built with CLI:

1. Merchant clicks **Install** (App Store or install link).
2. Shopify shows the **scope grant** UI for scopes declared in `shopify.app.toml`.
3. With **Shopify managed installation**, Shopify installs/updates scopes **without** your app implementing the classic authorization-code redirect dance.
4. Merchant opens the app inside Admin → App Bridge issues a short-lived **ID token** (historically called a **session token** in App Bridge 2.0 docs).
5. Backend calls `authenticate.admin(request)` (React Router / Remix template) → validates ID token → **token exchange** for an **offline access token**.
6. Offline token is used for GraphQL Admin API (`X-Shopify-Access-Token`), webhooks, and background jobs.

Primary docs:

- About authentication: https://shopify.dev/docs/apps/build/authentication-authorization  
- CLI app authentication / managed install: https://shopify.dev/docs/apps/build/authentication-authorization/cli-app-authentication  
- Token exchange: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens  
- Implement token exchange: https://shopify.dev/docs/apps/build/authentication-authorization/implement-token-exchange  

**Standalone (non-embedded) apps** still use authorization code grant with redirects — avoid this for Syndicate Admin UX.

## 1.3 What “one click” can honestly mean

| Truly one (or few) clicks | Still needs setup / time |
|---------------------------|---------------------------|
| Install + approve scopes | Waiting for initial order/product backfill |
| Land in embedded dashboard | Configuring brand vertical / demo filters (optional) |
| Auto-subscribe webhooks via TOML | **App Store** listing, screenshots, privacy policy |
| | **Protected customer data** approval for public apps before address fields work in production |
| | Enabling **web pixel** + merchant Customer events connection + consent banner purposes |
| | Theme app extension enablement in theme editor (if used) |
| | Billing plan selection (if monetised) |
| | `read_all_orders` Partner approval for >60 days history |

**Honest pitch line:** “Install once; Syndicate starts learning from your recent orders automatically. Theme pixels and deep history are optional upgrades.”

## 1.4 Embedded Admin app (App Bridge + Polaris)

- UI runs in an Admin iframe; App Bridge handles navigation, toasts, resource pickers, and ID tokens.
- Template stack (2025–2026): Shopify CLI scaffolds a **React Router** app (evolution of the Remix Shopify app template). Older docs and repos still say “Remix”; treat them as the same family.
- Scaffold (verify current CLI flag names): `shopify app init` → choose the official template; then `shopify app dev` against a development store.

Auth performance guidance: https://shopify.dev/docs/apps/build/performance/admin-installation-oauth  

Session / ID tokens:

- App Bridge provides ID tokens to the frontend; backend exchanges them; **never** expose the offline access token to the browser.
- Online tokens = tied to staff session; offline tokens = background jobs / webhooks. Prefer **offline** for ingest.

## 1.5 Theme app extensions (optional)

Theme app extensions inject Liquid/JS blocks into Online Store themes without editing theme code by hand. Useful later for:

- On-site “occasion” merchandising blocks  
- Collecting consented behavioural signals alongside pixels  

**Not required** for MVP: Admin ingest + Playwright agents against the storefront URL suffice.  
Extensions overview: https://shopify.dev/docs/apps/build/app-extensions/configure-app-extensions  

## 1.6 Webhooks for orders / products

Subscribe in `shopify.app.toml` or via GraphQL Admin API. Typical Syndicate topics:

| Topic | Use |
|-------|-----|
| `app/uninstalled` | Tear down shop data / cancel jobs |
| `orders/create`, `orders/updated` | Incremental event inference |
| `products/create`, `products/update` | Keep catalogue taxonomy fresh |
| `collections/create`, `collections/update` | Collection membership for geo×collection spikes |

Docs: https://shopify.dev/docs/apps/build/webhooks  

Notes:

- Verify HMAC on every delivery.  
- Ordering across topics is **not** guaranteed.  
- Webhook payloads involving customers/orders are subject to the same PCD redaction rules as the Admin API.  
- Prefer webhooks + initial bulk/paginated sync over polling.

## 1.7 Background jobs after install

Recommended post-install pipeline:

1. Persist shop record + offline session (template Prisma/SQLite or your DB).  
2. Enqueue **BackfillJob**: paginate `orders` (≤60d), `products`, `collections`.  
3. Enqueue **DiscoverJob**: Tier 0 heuristics → Events + Personas.  
4. (Demo) Enqueue **AgentJob** for 2–3 personas.  
5. Register/ensure webhook subscriptions (TOML deploy usually handles this).  

Rate limits: use GraphQL cost-aware pagination; for large catalogues consider Bulk Operations (Admin API) — verify current bulk ops docs if order volume is high.

## 1.8 Remix / React Router template path

Practical path for the hackathon:

1. Partner / Dev Dashboard app + CLI linked project.  
2. Official Shopify app template (React Router; Remix docs still apply conceptually).  
3. Declare scopes in `shopify.app.toml`; `shopify app deploy` / `shopify app dev` for managed install.  
4. Loaders/actions call `authenticate.admin(request)` then `admin.graphql(...)`.  
5. Add a worker process or in-process queue for backfill (hackathon: fire-and-forget async in action + progress UI).

## 1.9 Billing API (optional, later)

Monetisation is **not** part of install scopes. Typical pattern:

- Use App Subscription / Billing APIs so merchants approve a recurring charge in Admin.  
- Gate premium features (pixels, long history, more agent runs) behind `billing.check` / `billing.require` helpers in the app library.  

Start unpaid for hackathon; add billing when packaging for App Store.  
Docs entry points: https://shopify.dev/docs/apps/launch/billing (verify current “managed pricing” vs manual Billing API path — Shopify has been evolving listing pricing).

---

# 2) What data could it access?

Prefer **GraphQL Admin API** over REST (REST still exists; GraphQL is the primary path). Always confirm fields on the versioned reference before coding: https://shopify.dev/docs/api/admin-graphql/latest  

## 2.1 Orders (core)

**Scope:** `read_orders` (60 days); `read_all_orders` for older.  
**Object:** https://shopify.dev/docs/api/admin-graphql/latest/objects/Order  

| Need | GraphQL field(s) | Notes |
|------|------------------|-------|
| Line items | `lineItems` → product/variant titles, SKU, quantity, discounted price | Join to Product for type/vendor/tags |
| Created time | `createdAt`, `processedAt` | Use shop timezone awareness in analytics |
| Financial status | `displayFinancialStatus` | paid / pending / refunded / etc. |
| Tags | `tags` | Merchant-applied order tags |
| Notes / note attributes | `note`, `customAttributes` | `customAttributes` = key/value attributes (cart attributes / note attributes analogue) |
| Shipping address geo | `shippingAddress { city province countryCode zip }` | **PCD Level 2 Address**; street lines are higher sensitivity — avoid storing line1/line2 |
| Landing / referring | Prefer `customerJourneySummary { firstVisit { landingPage referrerUrl source utmParameters } lastVisit { ... } }` | Requires `read_orders`. Legacy Order fields `landingPageUrl`, `referrerUrl`, `referralCode` are **Deprecated** on Order — migrate to CustomerVisit |
| Source channel | `sourceName`, `publication`, `app` | Distinguish web / POS / draft |
| Customer link | `customer { id }` | Full customer PII gated by PCD |

**Caution:** Shopify restricts order scopes to apps with a legitimate use case.

## 2.2 Customers & protected customer data (be precise)

Official levels (https://shopify.dev/docs/apps/launch/protected-customer-data):

| Level | Data | Public app | Custom app |
|-------|------|------------|------------|
| 0 | No customer data | OK | OK |
| 1 | Customer-related data **excluding** name, address, phone, email | Requires review | Always available |
| 2 | Includes **name, address, phone, or email** | Requires review + data protection requirements + possible data protection review | Always available (admin-created: Level 2 may vary by plan) |

**Protected resource types include:** Customers, Orders (and draft orders, abandoned checkouts, refunds, transactions), shipping/fulfillment related to a customer, order-related webhooks/metafields, gift cards, etc. **Products** are not PCD.

**Behaviour without approval:** GraphQL may return `null` for unapproved fields plus an `errors` entry explaining redaction. Approved apps only receive approved fields.

**Syndicate implication:**

- Hackathon on **dev store / custom app:** you can use city/zip for personas.  
- Public App Store: ship product taxonomy + order timing first; request PCD Level 2 Address with a clear purpose (“aggregate occasion demand by region, not individual profiling”).  
- Level 1/2 requirements include minimisation, transparency, retention limits, encryption at rest/in transit; Level 2 adds backups encryption, env separation, access logs, incident response, staff access limits, etc.

## 2.3 Products, variants, collections, tags, type, vendor

**Scope:** `read_products`  
Typical fields (**verify** on Product / ProductVariant / Collection objects):

- Product: `title`, `productType`, `vendor`, `tags`, `status`, `collections` / collection membership  
- Variant: `title`, `sku`, `price`, options (size/colour)  
- Collection: `title`, `handle`, rules vs manual  

This taxonomy is the **primary** signal for occasion inference when browse data is absent.

## 2.4 Checkouts / abandoned

**Object:** `AbandonedCheckout` — https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout  

- Access is tied to **orders-related scopes** (docs and scope tables associate AbandonedCheckout with `read_orders` / `write_orders`).  
- Content is **protected customer data**.  
- Useful Tier 1+: almost-bought occasion baskets, friction before payment.  
- **Out of MVP** per `MVP_ARCHITECTURE.md`.

## 2.5 Markets & locales

Markets API supports multi-country catalogues/currencies. Request `read_markets` (confirm against current Markets queries).  
Order-level: `customerLocale`, `presentmentCurrencyCode`, `shippingAddress.countryCode` help segment UK vs EU vs US demand without full customer profiles.  
Docs hub: https://shopify.dev/docs/apps/build (Markets section) — **verify** exact queries for your API version.

## 2.6 Analytics / ShopifyQL

Apps can run ShopifyQL via Admin GraphQL `shopifyqlQuery`:

- Docs: https://shopify.dev/docs/apps/build/shopifyql/graphql-admin-api  
- Query ref: https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyqlQuery  
- **Requires** `read_reports` **and Level 2 protected customer data**.  

Useful for Tier 1 dashboards (sales by day, product leaders) but **too heavy for hackathon** (extra review + scope). Prefer raw `orders` aggregation in-app for MVP.

## 2.7 Storefront / Customer Events / Web Pixels (browse)

To observe browse (not only purchase):

1. Generate web pixel extension: `shopify app generate extension --template web_pixel`  
2. Scopes: `write_pixels`, `read_customer_events`  
3. Create pixel via `webPixelCreate`  
4. Configure `[customer_privacy]` purposes (`analytics`, `marketing`, `preferences`, `sale_of_data`) so the pixel respects cookie banners / data-sale opt-outs  

Docs: https://shopify.dev/docs/apps/build/marketing/build-web-pixels  

**Not available without:** pixel install, correct scopes, and customer **consent** for declared purposes. Without consent, pixel simply does not run.  
**MVP substitute:** infer “browse intent” from line items + collection paths agents walk.

## 2.8 Metafields

Orders, products, customers, shops can carry metafields (`HasMetafields`). Useful for merchant-defined occasion tags or Syndicate writing back `syndicate.event_id` under an app-owned namespace.  
Reading merchant metafields generally requires access to the owner resource; definitions/management may need additional setup — **verify** `read_metaobjects` / metafield definition scopes if using metaobjects heavily.

## 2.9 What is NOT available (or not without extra permissions)

| Desire | Reality |
|--------|---------|
| Full order history | Needs `read_all_orders` + approval |
| Street address / email / phone on public apps | Level 2 PCD field approval |
| True pre-purchase browse history | Web pixel + consent; not in standard Order without journey summary |
| Guaranteed `landing_site` REST-era fields | Prefer `customerJourneySummary` / `CustomerVisit`; Order landing/referrer fields deprecated |
| ShopifyQL without PCD Level 2 | Denied |
| Individual credit/wealth scores from Shopify | **Does not exist** — do not invent |
| Completing checkout as bot on production | Against demo policy / risk of real orders — stop at cart |
| Cross-merchant identity graphs | Not provided; would be a separate (regulated) enrichment product |

## 2.10 UK / EU nuance (address fields, GDPR)

- **Shipping zip / postcode** is Level 2 Address data under Shopify PCD and personal data under UK GDPR / EU GDPR when linked to an identifiable person.  
- Prefer **aggregation**: map postcode → **LSOA / MSOA** → IMD decile; store **sector** (e.g. `SW1A`) or LSOA code, not full address + name together unless necessary.  
- Lawful basis typically **legitimate interests** of the merchant (analytics) with DPA between app and merchant; document purposes; retention limits; honour erasure when merchant uninstalls / customer deletion webhooks if you store PII.  
- Automated decision-making / profiling with significant effects triggers Shopify Level 1 requirement #6 (opt-out) and UK GDPR Article 22 considerations — Syndicate should present **insights to merchants**, not refuse customers checkout.  
- EU Markets: treat country-level aggregates as default; be careful combining fine geo + sensitive inferred attributes.  
- Label UI: `AGGREGATE PROXY` vs `MOCK / HYPOTHESIS` vs `OBSERVED`.

---

# 3) Most effective model / algorithm

Two inference problems:

**A)** Events / occasions from purchase data (match day, night out, festival, …)  
**B)** Socioeconomic / behavioural **patterns by location** (area-level only)

## 3.1 Approaches compared

### A1 — Rule / heuristic calendars joined to order spikes

**Method:** Maintain calendars (Premier League fixtures, bank holidays, Pride, Black Friday, local festivals). Aggregate order counts by day × geo × collection. Score calendar events when lift vs baseline exceeds threshold.

**Sources (examples):**

- UK bank holidays JSON: https://www.gov.uk/bank-holidays.json (API catalogue: https://www.api.gov.uk/gds/bank-holidays/)  
- Football fixtures: https://www.football-data.org/documentation/api (competition codes e.g. PL)  
- Cultural calendars: hand-curated JSON for hackathon; later licensed event APIs  

| | Hackathon | Production |
|-|-----------|------------|
| Pros | Interpretable, fast, great demo narrative | Strong precision for known event types |
| Cons | Misses novel occasions; needs vertical calendars | Maintenance; geo mismatch (stadium city vs shipping city) |

### A2 — Time-series anomaly detection (order volume by geo × collection)

**Method:** For each key `(day, region, collection_or_productType)`, compute baseline (e.g. same weekday median). Flag spikes (z-score, STL residual, or simple Poisson/binomial lift). Cluster co-occurring spikes into “occasion candidates”.

| | Hackathon | Production |
|-|-----------|------------|
| Pros | Discovers unknown events | Scales; feeds calendar joining |
| Cons | Needs enough history; noisy on small stores | Cold start; multiple testing false positives |

### A3 — Clustering baskets (k-means / HDBSCAN / GMM on embeddings)

**Method:** Represent each order as a sparse bag-of-products or low-dim embedding (TF-IDF over productType/tags/vendor; later Prod2Vec / transformer product embeddings). Cluster; inspect centroids for occasion structure.

Research pointers (embeddings / basket representation — not Shopify-specific):

- Product embeddings / shopping cart vectors: https://ar5iv.labs.arxiv.org/html/1705.06338  
- Distributional product models: https://ar5iv.labs.arxiv.org/html/2012.09807  
- Dense product embeddings for bundling: https://doi.org/10.48550/arxiv.2002.00100  
- HDBSCAN: density-based clustering that does not force every point into a cluster (good for “messy” retail) — use the published HDBSCAN algorithm papers / `hdbscan` library docs when implementing  

| Algorithm | Pros | Cons |
|-----------|------|------|
| k-means | Simple, fast | Must pick k; spherical clusters |
| GMM | Soft assignment | More params; sensitive to scale |
| HDBSCAN | Finds varying density; labels noise | Needs min cluster size tuning; harder to explain |

### A4 — Sequence models / Markov journeys (later)

**Method:** Model product/collection transitions within customer journeys (`customerJourneySummary.moments` or pixel events). Markov chains or small transformers for “next touch” / path friction.

| | Hackathon | Production |
|-|-----------|------------|
| Pros | Captures path, not only basket | Powerful with pixels |
| Cons | Too heavy; sparse without pixels | Data/consent heavy |

### A5 — LLM labelling of clusters

**Method:** After clustering or spike detection, send **non-PII** summaries (top products, weekday, cities, collection mix) to an LLM to propose event/persona names and hypotheses. Always mark as model-generated.

| | Hackathon | Production |
|-|-----------|------------|
| Pros | Excellent demo UX | Scalable naming layer |
| Cons | Hallucinations | Need evaluation; never send raw PII |

### B1 — UK ONS IMD / census / postcode aggregates

**Method:** Map shipping postcode → LSOA (ONS National Statistics Postcode Lookup) → **IMD 2019** decile/rank (England). Aggregate **order counts and AOV** by IMD decile or MSOA. Report patterns such as “festival kits over-index in deciles 3–5 in Greater Manchester” — **not** “customer X is affluent”.

Official sources:

- English Indices of Deprivation 2019: https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019  
- Postcode lookup tool: https://imd-by-postcode.opendatacommunities.org/imd/2019  
- ONS Open Geography / IMD LSOA lookup (FeatureServer example on data.gov.uk): https://www.data.gov.uk/dataset/5f124118-f20e-4b28-aa24-2edda9b4e3cb/index-of-multiple-deprivation-december-2019-lookup-in-en  
- Postcode → OA/LSOA/MSOA lookups: https://geoportal.statistics.gov.uk/  

**Scotland / Wales / NI** have separate deprivation indices — do not apply English IMD UK-wide without labelling.

### B2 — US Census ACS

**Method:** For US shipping ZCTAs / counties, join ACS 5-year estimates (income, education, age bands) via Census Data API: https://www.census.gov/data/developers/data-sets/acs-5year.html  

Same rule: **area aggregates only**.

### B3 — Collaborative filtering / propensity

**Method:** Item–item CF or simple propensity models (“buyers of scarf + away shirt → match-day kit”). Use for agent goals and merchandising suggestions.

| | Hackathon | Production |
|-|-----------|------------|
| Pros | Familiar; works on products alone | Personalisation without demographics |
| Cons | Cold start | Needs evaluation vs popularity baseline |

---

## 3.2 Recommended tiered architecture

### Tier 0 — Hackathon (1 day) ← **build this**

1. Ingest ≤60d orders + products + collections.  
2. Feature each order: `{dow, hour_bucket, country, city_or_region_if_available, productTypes[], collections[], tags[], AOV_bucket}`.  
3. **Calendar join** for sport vertical (fixtures + UK bank holidays).  
4. **Rules:** e.g. “football SKU tags + match-day ±1 day + city near club” → Event candidate.  
5. **2–3 manual/heuristic personas** from top basket patterns.  
6. **LLM naming** on aggregated cluster cards (no PII).  
7. Location: city/country histograms only; any IMD join is **optional mock** labelled `MOCK / HYPOTHESIS` unless a static CSV join is preloaded.  
8. Agents replay personas; score affordance/insights.

**Accuracy limits:** High narrative fit, low statistical confidence; tiny samples; calendar collisions (Christmas + football).

### Tier 1 — v1 product

1. Baseline + anomaly detection on `day × region × collection`.  
2. Join anomalies to calendars; keep unexplained spikes as “Unknown occasion”.  
3. Lightweight clustering (k-means or HDBSCAN on TF-IDF baskets).  
4. Optional abandoned-checkout analysis.  
5. Optional ShopifyQL for merchant-facing charts (`read_reports` + PCD L2).  
6. Real **aggregate** IMD/ACS joins with suppression (k-anonymity: no cell with &lt; N orders).  
7. Web pixel behind consent for browse affordance (optional module).

**Accuracy limits:** Better recall of recurrent occasions; still weak on first-time novel events; geo is shipping address ≠ event venue.

### Tier 2 — Advanced

1. Product / basket embeddings; HDBSCAN + hierarchical occasion taxonomy.  
2. Sequence models on consented pixel journeys; friction localisation.  
3. Propensity / CF for agent goal generation and merch recommendations.  
4. Multi-nation deprivation/ACS feature store; merchant-configurable ethics policy.  
5. Human-in-the-loop event confirmation UI; feedback trains classifiers.  
6. Evaluation harness: precision@k vs merchant-labelled weekends.

**Accuracy limits:** Still correlational; embeddings inherit catalogue bias; never claim individual SES.

---

## 3.3 Ethics & accuracy (explicit)

1. **No individual wealth / credit scoring.** Area IMD/ACS is a **neighbourhood proxy**, often wrong for a given buyer.  
2. **Always label** `OBSERVED` vs `AGGREGATE PROXY` vs `MODEL HYPOTHESIS` vs `MOCK`.  
3. **Minimisation:** hash customer GIDs; drop email/phone/name from analytics warehouse; keep postcode only as long as needed to map LSOA, then store LSOA/IMD decile.  
4. **Uninstall / erasure:** wipe shop data on `app/uninstalled`; honour customer redaction webhooks if storing PII.  
5. **Bias:** fixtures calendars bias toward men’s elite sport; expand calendars deliberately.  
6. **Agents:** stop before payment; prefer preview/dev storefronts; disclose synthetic traffic to merchants.  
7. **Marketing use:** if outputs feed ads, UK PECR / GDPR consent and Shopify pixel purposes apply — do not silently turn analytics into ad retargeting.

---

## Implementation checklist (engineering)

### Day-of-hackathon

- [ ] `shopify app init` + embedded template + scopes `read_products,read_orders,read_customers`  
- [ ] Managed install on dev store; confirm offline session  
- [ ] Backfill orders (60d) + products + collections  
- [ ] Tier 0 discovery → persist Events/Personas  
- [ ] Playwright 2–3 runs → Affordance/Insights  
- [ ] Dashboard in Admin  

### Before App Store / paying merchants

- [ ] Privacy policy + DPA language  
- [ ] PCD Level 1/2 request with minimisation narrative  
- [ ] Webhooks + uninstall purge  
- [ ] Encryption, retention, access logging (Level 2)  
- [ ] Decide on `read_all_orders` / `read_reports` / pixels  
- [ ] Billing (optional)  

---

## Source index (primary)

### Shopify

- Authentication overview: https://shopify.dev/docs/apps/build/authentication-authorization  
- CLI authentication / managed install: https://shopify.dev/docs/apps/build/authentication-authorization/cli-app-authentication  
- Access tokens & token exchange: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens  
- Manage scopes: https://shopify.dev/docs/apps/build/authentication-authorization/manage-access-scopes  
- Access scopes reference: https://shopify.dev/docs/api/usage/access-scopes  
- Protected customer data: https://shopify.dev/docs/apps/launch/protected-customer-data  
- Order object: https://shopify.dev/docs/api/admin-graphql/latest/objects/Order  
- CustomerJourneySummary: https://shopify.dev/docs/api/admin-graphql/latest/objects/CustomerJourneySummary  
- CustomerVisit: https://shopify.dev/docs/api/admin-graphql/latest/objects/CustomerVisit  
- AbandonedCheckout: https://shopify.dev/docs/api/admin-graphql/latest/objects/AbandonedCheckout  
- Webhooks: https://shopify.dev/docs/apps/build/webhooks  
- Web pixels tutorial: https://shopify.dev/docs/apps/build/marketing/build-web-pixels  
- ShopifyQL for apps: https://shopify.dev/docs/apps/build/shopifyql/graphql-admin-api  
- shopifyqlQuery: https://shopify.dev/docs/api/admin-graphql/latest/queries/shopifyqlQuery  
- App APIs overview: https://shopify.dev/docs/apps/build/apis  
- Admin install/OAuth performance: https://shopify.dev/docs/apps/build/performance/admin-installation-oauth  

### UK / US stats

- IoD/IMD 2019: https://www.gov.uk/government/statistics/english-indices-of-deprivation-2019  
- IMD by postcode: https://imd-by-postcode.opendatacommunities.org/imd/2019  
- ONS IMD LSOA lookup dataset: https://www.data.gov.uk/dataset/5f124118-f20e-4b28-aa24-2edda9b4e3cb/index-of-multiple-deprivation-december-2019-lookup-in-en  
- ONS Open Geography Portal: https://geoportal.statistics.gov.uk/  
- UK bank holidays: https://www.gov.uk/bank-holidays.json  
- US ACS 5-year API: https://www.census.gov/data/developers/data-sets/acs-5year.html  

### Calendars / research

- football-data.org API: https://www.football-data.org/documentation/api  
- Basket / product embedding papers: https://ar5iv.labs.arxiv.org/html/1705.06338 · https://ar5iv.labs.arxiv.org/html/2012.09807 · https://doi.org/10.48550/arxiv.2002.00100  

### Verify-before-code (explicit)

- Exact Markets GraphQL fields/scopes for your API version  
- Whether AbandonedCheckout needs any scope beyond `read_orders` in the latest version  
- Current CLI template name (React Router vs Remix) and `shopify app init` prompts  
- Billing: managed pricing vs `appSubscriptionCreate` path for your distribution choice  
- Scotland/Wales/NI deprivation index datasets if selling UK-wide geo insights  

---

## Alignment with MVP_ARCHITECTURE.md

This deep plan **confirms** the MVP cuts: no pixels, no App Store polish, no production PCD review, heuristics over HDBSCAN, stop agents before payment, label mock enrichment. It extends the MVP with a clear **Tier 1/2 roadmap**, precise Shopify field/scope citations, and lawful aggregate-only socioeconomic methodology for post-hackathon work.

**End of report.**
