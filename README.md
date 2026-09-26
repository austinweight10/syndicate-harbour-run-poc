# Syndicate

Occasion-commerce intelligence for Shopify Admin. Primary demo vertical: **running** / brand **Harbour Run** / store `harbour-run-demo`.

Austin greenlit the runnable app on 24 Sep 2026. This repo now has two surfaces:

| Surface | What it is |
|---------|------------|
| [`shopify-app/`](shopify-app/) | **The app.** Shopify React Router scaffold (the current Remix successor) with Prisma/SQLite, OAuth scopes, and a `DEMO_FIXTURE_SHOP=1` shell. |
| [`src/`](src/) | Earlier Vite Admin prototype. It still paints the Harbour Athletic fixture. It is not the OAuth app. |

The React Router app is greenfield beside `src/` because the Vite prototype has no Shopify session, App Bridge, or webhook runtime. Route paths stay `/app/*`.

## Run the Shopify app locally (no Partner token)

From the repo root:

```bash
cd shopify-app
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run pipeline:demo
npm run dev:demo
```

Open [Syndicate overview](http://127.0.0.1:44731/app). Events and Insights load from SQLite after `pipeline:demo`. See [`shopify-app/README.md`](shopify-app/README.md).

`DEMO_FIXTURE_SHOP=1` is set by `dev:demo`. The shell shows **Connected** for `harbour-run-demo.myshopify.com` and uses the same Prisma loaders as a live shop. It does **not** enqueue a live Partner `PipelineRun`.

Equivalent root scripts, after `npm install` inside `shopify-app`:

```bash
npm run db:setup
npm run db:seed
npm run dev:shopify
```

Smoke (fixture parse, seed, scopes, uninstall wipe):

```bash
cd shopify-app && npm run smoke
```

## What a live Partner install still needs

Do not invent tokens. Leave `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` empty until Austin creates the Partner app and the `harbour-run-demo` development store.

1. Partner app whose scopes are exactly `read_orders,read_products,read_customers` (`shopify-app/shopify.app.toml`).
2. `shopify app config link` so `client_id` is real.
3. `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, and `SHOPIFY_APP_URL` in `shopify-app/.env`.
4. Unset `DEMO_FIXTURE_SHOP` and run `npm run dev` (`shopify app dev`) so OAuth can complete.
5. On that live session the shell calls `pipelineEnqueue(shop, "install")`. The demo scorer is `npm run pipeline:demo` (fixture shop). A Partner install still leaves the live run `pending` until a worker drains it.

Uninstall (`app/uninstalled`) verifies Shopify HMAC, then `pcdWipeShop` deletes sessions, customer hashes, and geo rows.

## Phase 0 data

Prisma schema: [`shopify-app/prisma/schema.prisma`](shopify-app/prisma/schema.prisma) (also linked from `prisma/schema.prisma`). SQLite file: `shopify-app/prisma/dev.db` (gitignored).

`npm run db:seed` loads `docs/fixtures/**` for Harbour Run: snake_case orders, 48 orders, `HR-*` SKUs, running vertical. Street addresses and emails are not stored. Social trends are never seeded as OBSERVED.

Weekend Harbour Run confidence bands are [`docs/fixtures/graph/expected-scores-running.json`](docs/fixtures/graph/expected-scores-running.json). The football-era [`docs/fixtures/graph/expected-scores.json`](docs/fixtures/graph/expected-scores.json) is superseded and still schema-checked. [`docs/fixtures/graph/expected-scores.running.proposed.json`](docs/fixtures/graph/expected-scores.running.proposed.json) is the earlier lab proposal.

## Demo wire (epics 02–04, thin 05, 07, 08)

`npm run pipeline:demo` inside `shopify-app` seeds fixtures, scores running occasions, and writes Insights. The Admin UI reads those rows from Prisma. Run agents are Playwright shoppers that stop before payment. Graph reads Prisma `GraphEdge`. Neo4j is out of scope. See [`docs/scope/LIVE_DEMO_GATE.md`](docs/scope/LIVE_DEMO_GATE.md) and [`shopify-app/README.md`](shopify-app/README.md).

## Vite prototype (unchanged)

```bash
npm install && npm run dev
```

Open [Admin prototype](http://127.0.0.1:43123). OAuth is not connected there.

## Specs

Start at [`docs/scope/AGENT_KICKOFF.md`](docs/scope/AGENT_KICKOFF.md). Harbour Run context: [`docs/live-demo-store/PIVOT_RUNNING.md`](docs/live-demo-store/PIVOT_RUNNING.md).
