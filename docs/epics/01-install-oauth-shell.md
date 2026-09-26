# Epic 01 — Install / OAuth / App shell

> **SUPERSEDED primary vertical (26 Sep 2026):** Demo shop SoT is **Harbour Run** (`harbour-run-demo.myshopify.com`) — running apparel. `demo-football-merch` / football kit catalogue is **OPTIONAL secondary** fixture label only. Weekend SoT: `scope/WEEKEND_BUILD_SPEC.md` · `live-demo-store/`.

## Goal (1 paragraph)
Stand up a Remix Shopify embedded app that a sports/athleisure merchant can install in one click, complete OAuth with `read_orders,read_products,read_customers`, persist a Shop session, **enqueue the live auto PipelineRun** (store makeup → graph → personas → capped agents — see `scope/AUTO_PIPELINE_ON_INSTALL.md`), and land inside a Polaris Admin chrome (charcoal top bar, kit-stripe mark, left nav) matching the HTML prototype — **not** an empty fixture Overview after a real connect.

## Why it exists
Without install + OAuth + shell there is no demo: no shop domain, no Admin API token, no place to render Events/Personas. This is the foundation every other epic depends on.

## Dependencies (other epic IDs)
- None (first epic).

## Out of scope
- Billing / Shopify App Store listing polish.
- Theme app extensions / storefront embeds.
- Web pixels / Customer Events.
- `write_*` scopes, `read_all_orders`, `read_reports`.
- Full Settings sync rules UI (see Epic 09).
- Implementing ingest/catalogue/graph/agent **workers** (those are epics 02–06) — **but** OAuth success **must** call `pipelineEnqueue(shopId, "install")` so the merchant is never left on empty fixtures.

## User / system stories (Given/When/Then)
1. **Given** a Partner app configured for a dev store, **When** the merchant clicks Install, **Then** Shopify OAuth completes and redirects to `/app` with a valid offline session.
2. **Given** a connected shop, **When** the merchant opens any `/app/*` route, **Then** the top bar shows `shop.myshopify.com` and a green-dot **Connected** pill.
3. **Given** no session / expired session, **When** the merchant hits `/app`, **Then** they are re-prompted to authenticate (no blank crash).
4. **Given** the app is embedded, **When** nav items are clicked, **Then** App Bridge / `ui-nav-menu` navigates without full Shopify chrome reload issues.
5. **Given** uninstall webhook fires, **When** Shopify sends `app/uninstalled`, **Then** shop sessions and PCD-bearing rows for that shop are purged or marked deleted.
6. **Given** OAuth succeeds on a real shop (mode=`live`), **When** Shop+Session upsert completes, **Then** a `PipelineRun` with `trigger=install` is enqueued (idempotent) and Overview shows “Ingesting store makeup…” — **not** a silent fixture-only shell.
7. **Given** `DEMO_FIXTURE_SHOP=1` / no live token (mode=`demo`), **When** shell loads, **Then** fixtures may render **without** creating a live PipelineRun.

## Data model (tables/fields or TypeScript interfaces)
```ts
// Prisma / SQLite
model Shop {
  id            String   @id // shop domain e.g. harbour-run-demo.myshopify.com
  myshopifyDomain String @unique
  name          String?
  accessToken   String   // encrypted at rest if possible; never log
  scopes        String   // "read_orders,read_products,read_customers"
  installedAt   DateTime @default(now())
  uninstalledAt DateTime?
  primaryLocale String?  @default("en-GB")
  currencyCode  String?  @default("GBP")
  timezone      String?  @default("Europe/London")
  storefrontUrl String?  // Online Store URL for Playwright later
}

// Shopify session table from template (Session) retained as-is.
```

## APIs / jobs / webhooks (endpoints, schedules, payloads)
- **OAuth:** Shopify managed auth via Remix template (`authenticate.admin`).
- **Scopes** in `shopify.app.toml`:
  ```toml
  [access_scopes]
  scopes = "read_orders,read_products,read_customers"
  ```
- **Webhooks:**
  - `APP_UNINSTALLED` → purge shop sessions + schedule PCD wipe.
  - Optional stub: `SHOP_UPDATE` (ignore fields we do not store).
- **Health:** `GET /app` loader returns `{ shop, connected: true }`.

## UI (if any) — screens, components, copy samples British English
- App shell only (full screens in Epic 08). Visual ref: `ui/index.html` topbar + sidenav.
- Top bar: brand mark **SY** with kit stripe · **Syndicate** · shop domain · **Connected**.
- Left nav labels: Overview | Events | Personas | **Insights** | Agent runs | Settings (route may stay `/app/artifacts`; never label “Artifacts” in chrome — D29).
- Sample Connected empty Overview subtitle: “Connect complete — syncing your catalogue next.”
- Compliance strip placeholder: “Enrichment is labelled · agents stop before payment.”

## Algorithms / heuristics (formulas, thresholds)
- None beyond Shopify session validation.

## Ethics / provenance labels required
- Do not request scopes beyond MVP.
- Never log access tokens or raw customer PII.
- On uninstall: delete or anonymise shop-linked order/customer hashes (PCD hygiene).

## Tech constraints (Remix Shopify app, SQLite for hackathon, Playwright stop before pay, scopes read_orders/products/customers)
- Remix (or React Router Shopify template) + App Bridge + Polaris.
- SQLite via Prisma for hackathon.
- Embedded only; `shopify app dev` tunnel for demo.
- Scopes exactly as above.

## Acceptance criteria (checkbox list, testable)
- [ ] `shopify app init` (or existing scaffold) runs; app starts with `shopify app dev`.
- [ ] Fresh install on a dev store completes OAuth without manual token paste.
- [ ] Session persists across reloads; Connected pill visible.
- [ ] `shopify.app.toml` scopes match `read_orders,read_products,read_customers`.
- [ ] NavMenu registers all six destinations (even if target routes are stubs).
- [ ] Uninstall webhook handler removes/invalidates sessions for that shop.
- [ ] Top bar visual matches prototype tokens (charcoal bar, kit stripe, cream canvas behind content).
- [ ] No write scopes requested; no payment / billing UI.
- [ ] After live OAuth success, `pipelineEnqueue(shopId, "install")` runs; a `PipelineRun` row exists with status `pending` or `running` (DoD — do **not** leave merchant on empty fixture UI).
- [ ] Overview Connected state shows pipeline stage strip (or “Ingesting store makeup…”) when PipelineRun active.
- [ ] Demo mode does **not** create a live PipelineRun.

## Implementation checklist for a coding agent (ordered steps)
1. Scaffold Shopify Remix app in repo root (or `app/`); confirm TypeScript + Prisma SQLite.
2. Set scopes in `shopify.app.toml`; run `shopify app deploy` / config push as needed for Partner app.
3. Ensure `authenticate.admin` on all `/app/*` loaders/actions.
4. Add `Shop` model; upsert on first successful auth (domain, scopes, storefront URL from Shop GraphQL `primaryDomain` / `url`).
4b. On live auth success: call `pipelineEnqueue(shopId, "install")` (see `scope/AUTO_PIPELINE_ON_INSTALL.md` + CONTRACTS). Create `ShopSettings` with `agentsAutoRun=true` default.
4c. Overview loader returns `pipeline` progress when a run is active.
5. Register App Bridge `ui-nav-menu` / NavMenu with routes: `/app`, `/app/events`, `/app/personas`, `/app/artifacts`, `/app/runs`, `/app/settings`.
6. Build shared `AppShell` layout: charcoal topbar + cream canvas + sidenav styling (port CSS variables from `ui/styles.css`).
7. Stub each route with `Page` title matching prototype; return shop domain from loader.
8. Implement `APP_UNINSTALLED` webhook → delete Session rows + set `Shop.uninstalledAt`.
9. Smoke-test install → Overview stub on tunnel URL.
10. Document env vars: `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SCOPES`, `SHOPIFY_APP_URL`.

## Fixtures / seed data required
- Partner app + one Shopify **dev store** — **Harbour Run** running catalogue (`live-demo-store/`). Football kit shop = optional secondary only.
- If no store: fixture session `fixtures/session/demo-shop.json` domain `harbour-run-demo.myshopify.com` with `DEMO_FIXTURE_SHOP=1` (seed → Prisma; not Vite theatre).

## Test plan
- Manual: install, refresh, navigate each nav link, uninstall, reinstall.
- Automated: loader unit test that unauthenticated request redirects; webhook handler deletes session.
- Visual: screenshot topbar vs `ui/shots/index.png` (charcoal + kit stripe present).

## Open questions
1. Prefer official Remix template vs React Router Shopify template if CLI defaults change? → Use whatever `shopify app init` currently scaffolds; keep route paths `/app/*`.
2. Encrypt access tokens at rest? → Nice-to-have; plaintext SQLite acceptable for hackathon if `.gitignore` covers DB.
