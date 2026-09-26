import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

process.env.DEMO_FIXTURE_SHOP = "1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { validateFixtures } = await import("../app/fixtures/validate");
const { seedFixtures, DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
const { MVP_SCOPES, APP_SCOPES } = await import("../app/scopes");
const { FIXTURE_ACCESS_TOKEN } = await import("../app/fixture-token");
const { default: prisma } = await import("../app/db.server");
const { loadShell } = await import("../app/services/shop-context.server");
const { pipelineEnqueue, enqueueLivePipeline, DemoPipelineRefusedError } = await import(
  "../app/services/pipeline.server"
);
const { pcdWipeShop } = await import("../app/services/pcd.server");

test("fixtures parse and golden score schema is valid", () => {
  const issues = validateFixtures();
  assert.deepEqual(issues, []);
  const golden = readFileSync(
    path.resolve(root, "../docs/fixtures/graph/expected-scores.json"),
    "utf8",
  );
  assert.match(golden, /Match-day home kit rush/);
});

test("shopify.app.toml — reads required; write scopes optional for Deploy", () => {
  const toml = readFileSync(path.join(root, "shopify.app.toml"), "utf8");
  const match = toml.match(/scopes\s*=\s*"([^"]+)"/);
  assert.ok(match);
  assert.equal(match[1], APP_SCOPES);
  assert.deepEqual(
    match[1].split(",").filter((scope) => scope.startsWith("write_")),
    [],
  );
  assert.match(toml, /write_products/);
  assert.match(toml, /write_content/);
  assert.match(toml, /write_customers/);
  assert.match(toml, /optional_scopes\s*=/);
});

test("app source does not fetch twitter or parkrun", () => {
  const banned = /https?:\/\/([^/"']*\.)?(twitter\.com|x\.com|t\.co|parkrun\.org\.uk)/;
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "build" || entry === ".react-router") continue;
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry)) files.push(full);
    }
  };
  walk(path.join(root, "app"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.equal(banned.test(text), false, file);
  }
});

test("seed loads Harbour Run orders without street or email", async () => {
  const counts = await seedFixtures(prisma);
  assert.equal(counts.orders, 48);
  assert.equal(counts.products, 9);
  assert.ok(counts.lineItems > 48);
  assert.ok(counts.hashtags >= 8);
  assert.ok(counts.personas >= 3);

  const shop = await prisma.shop.findUnique({ where: { id: DEMO_SHOP_DOMAIN } });
  assert.equal(shop?.myshopifyDomain, DEMO_SHOP_DOMAIN);
  assert.equal(shop?.scopes, MVP_SCOPES);
  assert.equal(shop?.currencyCode, "GBP");
  assert.equal(shop?.timezone, "Europe/London");
  assert.equal(shop?.accessToken, FIXTURE_ACCESS_TOKEN);

  const orders = await prisma.orderRow.findMany({ where: { shopId: DEMO_SHOP_DOMAIN } });
  const lines = await prisma.lineItemRow.findMany({ where: { shopId: DEMO_SHOP_DOMAIN } });
  assert.equal(orders.length, 48);
  assert.ok(lines.every((line) => line.sku?.startsWith("HR-")));

  const fixture = JSON.parse(
    readFileSync(path.resolve(root, "../docs/fixtures/orders/orders-demo.json"), "utf8"),
  ) as {
    orders: { customer_email: string; shipping: { address1: string } }[];
  };
  const stored = JSON.stringify({ orders, geos: await prisma.geo.findMany({ where: { shopId: DEMO_SHOP_DOMAIN } }) });
  assert.equal(stored.includes(fixture.orders[0].customer_email), false);
  assert.equal(stored.includes(fixture.orders[0].shipping.address1), false);
  assert.match(orders[0].customerHash ?? "", /^[a-f0-9]{64}$/);

  const observed = await prisma.socialTrend.count({ where: { provenance: "OBSERVED" } });
  assert.equal(observed, 0);
  const pipelines = await prisma.pipelineRun.count({ where: { shopId: DEMO_SHOP_DOMAIN } });
  assert.equal(pipelines, 0);
});

test("demo shell connects without a live pipeline", async () => {
  const shell = await loadShell(new Request("http://127.0.0.1:44731/app"));
  assert.equal(shell.shop.connected, true);
  assert.equal(shell.shop.mode, "demo");
  assert.equal(shell.shop.domain, DEMO_SHOP_DOMAIN);
  assert.equal(shell.shop.name, "Harbour Run");
  assert.equal(shell.scopes, MVP_SCOPES);
  assert.equal(shell.pipeline, null);
  assert.equal(shell.seed.orders, 48);
  const serialised = JSON.stringify(shell);
  assert.equal(serialised.includes(FIXTURE_ACCESS_TOKEN), false);
  assert.equal(serialised.includes("accessToken"), false);
  await assert.rejects(() => pipelineEnqueue(DEMO_SHOP_DOMAIN, "install"), DemoPipelineRefusedError);
  assert.equal(await prisma.pipelineRun.count({ where: { shopId: DEMO_SHOP_DOMAIN } }), 0);
});

test("live enqueue is idempotent and uninstall wipes sessions and PCD", async () => {
  const shopId = "wipe-test.myshopify.com";
  await prisma.pipelineRun.deleteMany({ where: { shopId } });
  await prisma.session.deleteMany({ where: { shop: shopId } });
  await prisma.orderRow.deleteMany({ where: { shopId } });
  await prisma.geo.deleteMany({ where: { shopId } });
  await prisma.shopSettings.deleteMany({ where: { shopId } });
  await prisma.shop.deleteMany({ where: { id: shopId } });

  await prisma.shop.create({
    data: {
      id: shopId,
      myshopifyDomain: shopId,
      name: "Wipe test",
      accessToken: "live-test-token-not-partner",
      scopes: MVP_SCOPES,
    },
  });
  await prisma.shopSettings.create({ data: { shopId, agentsAutoRun: true, modeOverride: "live" } });
  await prisma.session.create({
    data: {
      id: `offline_${shopId}`,
      shop: shopId,
      state: "test",
      isOnline: false,
      scope: MVP_SCOPES,
      accessToken: "live-test-token-not-partner",
    },
  });
  const geo = await prisma.geo.create({
    data: {
      id: "geo_wipe_test",
      shopId,
      city: "London",
      countryCode: "GB",
      postalSector: "W2",
      provenance: "MOCK",
    },
  });
  await prisma.orderRow.create({
    data: {
      id: "ord_wipe_test",
      shopId,
      processedAt: new Date(),
      createdAt: new Date(),
      currencyCode: "GBP",
      subtotalAmount: "10.00",
      totalAmount: "10.00",
      customerHash: "abc123",
      geoId: geo.id,
    },
  });

  const first = await enqueueLivePipeline(shopId, "install");
  const second = await enqueueLivePipeline(shopId, "install");
  assert.equal(first.pipelineRunId, second.pipelineRunId);

  const wiped = await pcdWipeShop(shopId);
  assert.equal(wiped.sessions, 1);
  assert.equal(await prisma.session.count({ where: { shop: shopId } }), 0);
  assert.equal(await prisma.geo.count({ where: { shopId } }), 0);
  const order = await prisma.orderRow.findUnique({ where: { id: "ord_wipe_test" } });
  assert.equal(order?.customerHash, null);
  assert.equal(order?.geoId, null);
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  assert.ok(shop?.uninstalledAt);
  assert.equal(shop?.accessToken, "");
  const run = await prisma.pipelineRun.findUnique({ where: { id: first.pipelineRunId } });
  assert.equal(run?.status, "cancelled");
});
