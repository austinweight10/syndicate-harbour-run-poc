# Syndicate Shopify app

Harbour Run admin: Events and Insights are read from Prisma/SQLite. The demo pipeline seeds fixtures, scores occasions, and writes recommendation rows. Route loaders do not import recommendation or sports JSON.

Scopes stay `read_orders,read_products,read_customers`.

## See live Events and Insights

From `shopify-app`:

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run pipeline:demo
npm run dev:demo
```

Open [Syndicate overview](http://127.0.0.1:44731/app).

`pipeline:demo` is the wire:

1. Seed Harbour Run orders, products, and the running catalogue into SQLite (48 `HR-*` orders).
2. Load the saved London Open-Meteo forecast (`london-runner-demo/london-weather.json`) as weather rows, plus a wet-weekend driver.
3. Build graph edges, EventCandidates, and confidence (`Y = 0.5`, low-n cap `0.40`, social edges never `OBSERVED`).
4. Link Race-day taper and Wet-weather trainer to those occasions.
5. Write graph Insights only. Agent-found cards are not invented here. A MOCK replay is not created.

## Run agents (Playwright)

Pause starts **on**. Without `SHOP_STOREFRONT_URL`, **Run agents** stays disabled and the page shows the missing-URL banner. That is a hard stop. It does not hydrate `demo-completed-run.json`.

Prove the shopper against the local Dawn stub (or point the same variable at a Partner storefront):

```bash
npm run storefront:stub
# second shell
SHOP_STOREFRONT_URL=http://127.0.0.1:44741 AGENTS_HEADED=0 npm run agents:prove
SHOP_STOREFRONT_URL=http://127.0.0.1:44741 AGENTS_HEADED=0 npm run dev:demo
```

`agents:prove` creates a Prisma `AgentRun` for Race-day taper, drives `path-harbour-run-dawn.json` in Chromium, stops before payment, and writes the youth size-guide card with **that** run id. `AGENTS_HEADED=1` opens a visible window when a display exists. Manual **Run agents** is headed by default on a desktop; this machine falls back to headless when `DISPLAY` is unset.

While pause is on, use **Force headed demo run** (or clear Pause in Settings and save). A second click while a run is queued returns “Agents already running”. Cap is 3 Ready personas, concurrency 1. The runner never clicks Pay now, Complete order, Buy it now, or Shop Pay, and it does not change EventCandidate confidence.

Then, in the browser:

- [Overview](http://127.0.0.1:44731/app) — KPI counts, lead occasion, Run agents
- [Events](http://127.0.0.1:44731/app/events) — confidence and provenance from `EventCandidate`
- [Insights](http://127.0.0.1:44731/app/artifacts) — graph cards, plus shopper cards only after a real run
- [Agent runs](http://127.0.0.1:44731/app/runs) — polls Prisma about every 2 seconds

`dev:demo` sets `DEMO_FIXTURE_SHOP=1` and listens on port **44731**. That flag uses the same loaders as a connected shop. It does not call Partner OAuth.

## Checks

```bash
npm test
npm run smoke
```

The pipeline test asserts EventCandidate count &gt; 0 and Recommendation count &gt; 0 after `pipeline:demo`, with no agent-attributed card until Playwright runs. `tests/agents-run.test.ts` walks the stub storefront headlessly and asserts stop-before-pay.

## What is still fixture-backed

Orders, the race calendar, and catalogue rows are seeded. Weather payloads are a saved Open-Meteo file, labelled Observed on the forecast row and Aggregate proxy on the wet-weekend driver. The shopper is real Playwright. Without a storefront URL it does not run. A Partner shop is optional: set `SHOP_STOREFRONT_URL` to that Dawn store instead of the stub.
