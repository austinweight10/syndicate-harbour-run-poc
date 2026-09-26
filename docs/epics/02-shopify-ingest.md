# Epic 02 — Shopify ingest (orders, products, geo)

## Goal (1 paragraph)
Pull the last ≤60 days of orders plus products/collections from the connected shop via Admin GraphQL, normalise them into SQLite (hashed customer refs, city/postcode-sector geo only), **produce a first-class `StoreMakeupSnapshot`** (collections/tags/types, order SKU mix, geo buckets, price bands, top collections), map that makeup into OBSERVED graph seed inputs, and expose sync + pipeline stage status so discovery and the Overview UI populate without re-fetching on every page load.

## Why it exists
Observed Shopify demand is the ground truth for confidence scoring. Without ingest there are no Order→SKU→Geo edges and Events remain MOCK-only theatre.

## Dependencies (other epic IDs)
- **01** Install / OAuth / shell (session + scopes).

## Out of scope
- `read_all_orders` / history beyond 60 days.
- AbandonedCheckout deep dive, ShopifyQL, inventory quantities.
- Storing street address, email, phone, or raw name.
- Web pixel browse streams.
- Event clustering (Epic 04) and catalogue crawl (Epic 03).

## User / system stories (Given/When/Then)
1. **Given** a connected shop with orders, **When** ingest job runs, **Then** ≥N Order rows and LineItems persist with `processedAt`, money totals, and product links.
2. **Given** shipping addresses available (dev store PCD), **When** ingest runs, **Then** Geo nodes store city / provinceCode / countryCodeV2 / postcode **sector** only (UK outward code), labelled OBSERVED.
3. **Given** Shopify returns 429, **When** ingest is in progress, **Then** job backs off, records error on SyncRun, and UI can show retry (Epic 09).
4. **Given** zero orders, **When** ingest completes, **Then** sync succeeds with empty catalogue flag so empty states render (not a crash).
5. **Given** merchant clicks Re-scan / **Refresh store + re-run** (Settings), **When** action fires, **Then** a new SyncRun (and preferably full PipelineRun `trigger=manual_refresh`) enqueues without blocking the Remix request thread.
6. **Given** ingest succeeds on a live shop, **When** stage a completes, **Then** a `StoreMakeupSnapshot` row exists for the PipelineRun with collections, tags, types, SKU mix, geo buckets, price bands, and totals — and PipelineRun advances to `graph_seed`.

## Data model (tables/fields or TypeScript interfaces)
```ts
model SyncRun {
  id          String   @id @default(cuid())
  shopId      String
  kind        String   // "orders_products"
  status      String   // pending|running|success|failed
  startedAt   DateTime @default(now())
  finishedAt  DateTime?
  cursor      String?  // GraphQL pagination cursor
  ordersUpserted Int   @default(0)
  productsUpserted Int @default(0)
  errorCode   String?  // e.g. "HTTP_429"
  errorMessage String?
}

model OrderRow {
  id            String   @id // Shopify GID
  shopId        String
  name          String?  // "#1234" OK
  processedAt   DateTime
  createdAt     DateTime
  currencyCode  String
  subtotalAmount Decimal
  totalAmount   Decimal
  totalShipping Decimal?
  displayFinancialStatus String?
  displayFulfillmentStatus String?
  sourceName    String?
  tags          String?  // comma-joined
  test          Boolean  @default(false)
  customerHash  String?  // sha256(customer GID) — never store email
  geoId         String?  // FK Geo
}

model LineItemRow {
  id           String @id // GID or orderId+index
  orderId      String
  shopId       String
  productId    String?
  variantId    String?
  sku          String?
  title        String
  variantTitle String?
  vendor       String?
  quantity     Int
  unitPrice    Decimal
  lineTotal    Decimal
  productType  String?
  tagsJson     String? // product tags snapshot
}

model ProductRow {
  id          String @id
  shopId      String
  title       String
  handle      String?
  productType String?
  vendor      String?
  tags        String?
  status      String?
  updatedAt   DateTime
}

model CollectionRow {
  id       String @id
  shopId   String
  title    String
  handle   String?
}

model ProductCollection {
  productId    String
  collectionId String
  @@id([productId, collectionId])
}

model Geo {
  id            String @id @default(cuid())
  shopId        String
  city          String?
  provinceCode  String?
  countryCode   String
  postalSector  String? // e.g. "M1" not full postcode
  lat           Float?
  lng           Float?
  provenance    String  // OBSERVED
}

// StoreMakeupSnapshot — first-class pipeline stage a artifact
// Full field list: scope/DATA_DICTIONARY.md + scope/AUTO_PIPELINE_ON_INSTALL.md
// Built here; consumed by epic 04 graph_seed.
```

**GraphQL fields to fetch (orders):** `id`, `name`, `processedAt`, `createdAt`, `currencyCode`, `subtotalPriceSet`, `totalPriceSet`, `totalShippingPriceSet`, `displayFinancialStatus`, `displayFulfillmentStatus`, `sourceName`, `tags`, `test`, `shippingAddress { city provinceCode countryCodeV2 zip latitude longitude }`, `lineItems(first:50) { edges { node { id sku title variantTitle vendor quantity originalUnitPriceSet discountedTotalSet product { id productType tags } variant { id } } } }`.

**Products:** `id title handle productType vendor tags status updatedAt collections(first:10){edges{node{id title handle}}}`.

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- **Job:** `ingest.shopifyFull(shopId)` — pipeline stage a (post-OAuth) + Settings Refresh; also emits `StoreMakeupSnapshot` via `pipeline.storeMakeup`.
- **Schedule (hackathon):** on boot if `SyncRun` stale (>6h); else manual.
- **Pagination:** cursor until exhausted or `MAX_ORDERS=500` hackathon cap.
- **Rate limit:** honour `Retry-After`; exponential backoff 30s → 2m → 10m.
- **Webhook (optional MVP):** `ORDERS_CREATE` / `ORDERS_UPDATED` → upsert single order (nice-if-time).
- **Action:** `POST /app/settings/resync` → enqueue job, return `{ syncRunId }`.

## UI (if any) — screens, components, copy samples British English
- Minimal: Settings connection DL shows “Last sync: 2 minutes ago · 186 orders” (Epic 09).
- Overview compliance: “Observed orders from your Admin API (last 60 days).”
- Error copy: “Shopify rate-limited the sync (HTTP 429). We’ll retry shortly — or tap Retry.”

## Algorithms / heuristics (formulas, thresholds)
- Exclude `test=true` orders from analytics counts.
- Prefer `processedAt` for demand timing.
- UK postcode → sector: split on space, take outward code; if no space, first 2–4 alnum chars heuristic.
- Geo fallback order: shipping → billing (if fetched) → skip IP for MVP unless shipping missing then optional coarse `clientIp` labelled weak OBSERVED (do not store raw IP long-term — hash or drop after city resolve).

## Ethics / provenance labels required
- All order/line/geo edges: **OBSERVED**.
- Never persist street `address1`/`address2`, email, phone, or display name.
- Customer identity = hash of GID only.
- Merchant-facing: “We use order and catalogue data from your shop. Location is city / region only.”

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Admin GraphQL via authenticated Shopify client from Remix.
- Background: in-process async or ` pedding` SyncRun polled by a simple worker script `npm run jobs:ingest` so Playwright/UI stay free.
- SQLite Prisma transactions per page of results.
- Scopes: read-only as Epic 01.

## Acceptance criteria (checkbox list, testable)
- [ ] After install, SyncRun reaches `success` with productsUpserted ≥ 1 on demo store (or fixture import path).
- [ ] OrderRow count matches fetched non-test orders (spot-check 5 GIDs).
- [ ] No column/table stores email, phone, street address.
- [ ] Geo rows use countryCode + city/sector; provenance OBSERVED.
- [ ] 429 path sets SyncRun failed with `errorCode=HTTP_429` and does not corrupt prior rows.
- [ ] Zero-order shop yields success + empty flag.
- [ ] Idempotent re-run does not duplicate OrderRow primary keys.
- [ ] Fixture CSV/JSON import available when Admin API unavailable (`npm run seed:orders`).
- [ ] `StoreMakeupSnapshot` persisted after successful live ingest (collections/tags/types/SKU mix/geo buckets/price bands/totals).
- [ ] Snapshot fields map into graph seed inputs (collections/tags/types/price bands) for epic 04 — not discarded.
- [ ] PipelineRun stage `store_makeup` marked success (or failed with resume) after this epic’s job.

## Implementation checklist for a coding agent (ordered steps)
1. Add Prisma models above; migrate SQLite.
2. Implement `services/ingest/orders.ts` GraphQL query + pagination.
3. Implement `services/ingest/products.ts` for products + collections join table.
4. Implement geo normaliser (sector, lat/lng optional).
5. Wire `ingest.shopifyFull` as PipelineRun stage a (and Settings Refresh); fire-and-forget from OAuth enqueue.
5b. Implement `pipeline.storeMakeup` — build StoreMakeupSnapshot from just-ingested rows (caps per AUTO_PIPELINE).
6. Persist SyncRun + PipelineRun stage transitions; expose `getLatestSync(shopId)` + snapshot summary for Settings.
7. Add `prisma/seed-orders.ts` fixture for offline demo (Manchester/London ship-to, kit SKUs).
8. Log only counts + duration — never tokens or PII.
9. Unit-test geo sector parsing and idempotent upsert.
10. Hand off counts to Epic 04 via shared queries.

## Fixtures / seed data required
- `fixtures/orders-demo.json`: ≥40 orders across 28 days; cities London, Manchester, Birmingham; Saturday spikes; line items: race tee, youth run tee, away jacket, trainers, waterproof shell.
- `fixtures/products-demo.json`: collections “Home kits”, “Away day”, “Match day essentials”, “Race recovery”.
- Env: none beyond Shopify session; fixture mode `USE_ORDER_FIXTURES=1`.

## Test plan
- Integration: mock Admin GraphQL → assert row counts.
- Manual: sync on dev store; Settings shows last sync meta.
- Negative: inject 429 mock; assert backoff + errorCode.
- Privacy: grep DB/schema for `email|address1|phone` — must not exist.

## Open questions
1. Dev store PCD Level 2 already enabled? → Assume yes for hackathon; if redacted, fall back to fixtures + banner “Address fields redacted — using fixture geo.”
2. Cap at 500 orders vs full 60d? → Cap 500 for day-1 speed; document.
