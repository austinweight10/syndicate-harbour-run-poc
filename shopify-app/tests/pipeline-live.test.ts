import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

process.env.DEMO_FIXTURE_SHOP = "1";
delete process.env.SHOP_STOREFRONT_URL;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { default: prisma } = await import("../app/db.server");
const { AdminQueryError } = await import("../app/services/ingest/admin-client");
const { enqueueLivePipeline } = await import("../app/services/pipeline.server");
const { drainPipelineRuns } = await import("../app/services/pipeline/worker.server");
const { DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
const { personaIdFor } = await import("../app/services/personas/ids");

type AdminGraphql = import("../app/services/ingest/admin-client").AdminGraphql;
type Json = Record<string, any>;

const LIVE_SHOP = "live-pipeline-test.myshopify.com";

function fixture(rel: string): Json {
  return JSON.parse(readFileSync(path.resolve(root, "../docs/fixtures", rel), "utf8"));
}

// Same manual membership the seed script creates on the dev store.
const MEMBERSHIP: Record<string, string[]> = {
  "race-kits": ["race-tee-unisex", "running-shorts", "performance-socks", "soft-flask"],
  "wet-weather-training": ["waterproof-shell-jacket", "half-zip-midlayer", "recovery-joggers"],
  "kids-youth": ["kids-youth-run-tee"],
};

function page(nodes: unknown[]) {
  return { nodes, pageInfo: { hasNextPage: false, endCursor: null } };
}

function money(amount: string | number) {
  return { shopMoney: { amount: String(amount) } };
}

/** Harbour Run fixture data served in Admin GraphQL shapes. */
function fakeShop(options: { refusePcd?: boolean } = {}) {
  const productsDoc = fixture("products/products-demo.json");
  const ordersDoc = fixture("orders/orders-demo.json");
  const gid = (type: string, id: string) => `gid://shopify/${type}/${id}`;
  const collections = productsDoc.collections.map((c: Json) => ({ id: gid("Collection", c.id), title: c.title, handle: c.handle }));
  const productByHandle = new Map<string, Json>();
  const products = productsDoc.products.map((p: Json) => {
    const node = {
      id: gid("Product", p.id),
      title: p.title,
      handle: p.handle,
      productType: p.productType ?? null,
      vendor: p.vendor ?? null,
      tags: p.tags ?? [],
      status: "ACTIVE",
      updatedAt: "2026-09-20T10:00:00Z",
      collections: page(
        collections.filter((c: Json) => (MEMBERSHIP[c.handle] ?? []).includes(p.handle)).map((c: Json) => ({ id: c.id })),
      ),
    };
    productByHandle.set(p.handle, node);
    return node;
  });
  const orders = ordersDoc.orders.map((o: Json, index: number) => ({
    id: gid("Order", o.id),
    name: o.name,
    processedAt: o.created_at,
    createdAt: "2026-09-26T09:00:00Z",
    currencyCode: "GBP",
    test: false,
    tags: o.tags ?? [],
    sourceName: "web",
    displayFinancialStatus: "PAID",
    displayFulfillmentStatus: "FULFILLED",
    subtotalPriceSet: money(o.subtotal),
    totalPriceSet: money(o.subtotal),
    totalShippingPriceSet: money(0),
    customer: { id: gid("Customer", String(1000 + (index % 25))) },
    shippingAddress: {
      city: o.shipping.city,
      provinceCode: "ENG",
      countryCodeV2: o.shipping.country_code,
      zip: o.shipping.zip,
    },
    lineItems: page(
      o.line_items.map((line: Json, lineIndex: number) => {
        const product = productByHandle.get(line.handle);
        return {
          id: gid("LineItem", `${o.id}-${lineIndex}`),
          sku: line.sku,
          title: line.title,
          variantTitle: line.variantTitle ?? null,
          vendor: "Harbour Run",
          quantity: line.quantity,
          product: product ? { id: product.id, productType: product.productType } : null,
          variant: null,
          originalUnitPriceSet: money(line.price),
        };
      }),
    ),
  }));

  const queries: string[] = [];
  const admin: AdminGraphql = async <T,>(query: string) => {
    queries.push(query);
    if (query.includes("SyndicateShop")) {
      return { shop: { name: "Harbour Run (live test)", currencyCode: "GBP", ianaTimezone: "Europe/London" } } as T;
    }
    if (query.includes("SyndicateCollections")) return { collections: page(collections) } as T;
    if (query.includes("SyndicateProducts")) return { products: page(products) } as T;
    if (query.includes("SyndicateOrders")) {
      if (options.refusePcd && query.includes("shippingAddress")) {
        throw new AdminQueryError("Admin GraphQL error: This app is not approved to access the Customer object.", null);
      }
      const strip = !query.includes("shippingAddress");
      return {
        orders: page(strip ? orders.map(({ customer: _c, shippingAddress: _s, ...rest }: Json) => rest) : orders),
      } as T;
    }
    throw new Error(`Unexpected query: ${query.slice(0, 80)}`);
  };
  return { admin, queries, orderCount: orders.length };
}

async function wipe(shopId: string) {
  const events = await prisma.eventCandidate.findMany({ where: { shopId }, select: { id: true } });
  await prisma.confidenceScore.deleteMany({ where: { eventCandidateId: { in: events.map((e) => e.id) } } });
  const products = await prisma.productRow.findMany({ where: { shopId }, select: { id: true } });
  await prisma.productCollection.deleteMany({ where: { productId: { in: products.map((p) => p.id) } } });
  for (const model of [
    prisma.eventCandidate, prisma.graphEdge, prisma.recommendation, prisma.insightScore, prisma.affordanceScore,
    prisma.agentRun, prisma.persona, prisma.storeMakeupSnapshot, prisma.pipelineRun, prisma.syncRun,
    prisma.lineItemRow, prisma.orderRow, prisma.productRow, prisma.collectionRow, prisma.geo,
  ] as unknown as { deleteMany: (args: { where: { shopId: string } }) => Promise<unknown> }[]) {
    await model.deleteMany({ where: { shopId } });
  }
  await prisma.shopSettings.deleteMany({ where: { shopId } });
  await prisma.shop.deleteMany({ where: { id: shopId } });
}

async function installShop(shopId: string) {
  await wipe(shopId);
  await prisma.shop.create({
    data: { id: shopId, myshopifyDomain: shopId, accessToken: "test-offline-token", scopes: "read_orders,read_products,read_customers" },
  });
  // Pause agents so stage f never launches Playwright in tests.
  await prisma.shopSettings.create({ data: { shopId, agentsAutoRun: false, modeOverride: "live" } });
}

test("live pipeline ingests the shop and runs stages a→f", async () => {
  await installShop(LIVE_SHOP);
  const demoPersonasBefore = await prisma.persona.count({ where: { shopId: DEMO_SHOP_DOMAIN } });
  const shop = fakeShop();
  const { pipelineRunId } = await enqueueLivePipeline(LIVE_SHOP, "install");

  const processed = await drainPipelineRuns(async () => shop.admin, { shopId: LIVE_SHOP });
  assert.deepEqual(processed, [pipelineRunId]);

  const run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: pipelineRunId } });
  assert.equal(run.status, "success", run.errorMessage ?? "");
  const stages = JSON.parse(run.stagesJson) as { stage: string; status: string }[];
  assert.deepEqual(
    stages.map((s) => `${s.stage}:${s.status}`),
    ["store_makeup", "graph_seed", "catalogue_refresh", "score_link", "personas", "agents_queue"].map((s) => `${s}:success`),
  );

  assert.equal(await prisma.orderRow.count({ where: { shopId: LIVE_SHOP } }), shop.orderCount);
  assert.equal((await prisma.shop.findUniqueOrThrow({ where: { id: LIVE_SHOP } })).name, "Harbour Run (live test)");
  assert.ok(await prisma.storeMakeupSnapshot.findUnique({ where: { pipelineRunId } }));
  assert.ok((await prisma.productCollection.count({ where: { collectionId: "gid://shopify/Collection/col_race_kits" } })) === 4);

  const events = await prisma.eventCandidate.findMany({ where: { shopId: LIVE_SHOP } });
  assert.ok(events.some((e) => e.name.includes("London 10K")), "expected the London race weekend");
  assert.ok((await prisma.recommendation.count({ where: { shopId: LIVE_SHOP } })) > 0);

  const personas = await prisma.persona.findMany({ where: { shopId: LIVE_SHOP } });
  assert.ok(personas.some((p) => p.id === personaIdFor(LIVE_SHOP, "race_day_taper") && p.status === "ready"));
  assert.ok(personas.every((p) => !p.id.endsWith("_taper") && !p.id.endsWith("_trainer")), "live ids must be shop-scoped");
  assert.equal(await prisma.persona.count({ where: { shopId: DEMO_SHOP_DOMAIN } }), demoPersonasBefore);

  // PCD: sector-level geo, hashed customer id, no email or street anywhere.
  const geos = await prisma.geo.findMany({ where: { shopId: LIVE_SHOP } });
  assert.ok(geos.some((g) => g.postalSector === "W2" && g.city === "London"));
  const orders = await prisma.orderRow.findMany({ where: { shopId: LIVE_SHOP } });
  assert.ok(orders.every((o) => o.customerHash && !o.customerHash.includes("@")));
  const dump = JSON.stringify({ orders, geos });
  assert.equal(dump.includes("@"), false);
  assert.equal(dump.includes("Queensway"), false);
  const email = fixture("orders/orders-demo.json").orders[0].customer_email as string;
  assert.equal(orders.some((o) => o.customerHash === createHash("sha256").update(email).digest("hex")), false);

  await wipe(LIVE_SHOP);
});

test("live pipeline degrades when protected customer data is refused", async () => {
  await installShop(LIVE_SHOP);
  const shop = fakeShop({ refusePcd: true });
  const { pipelineRunId } = await enqueueLivePipeline(LIVE_SHOP, "install");
  await drainPipelineRuns(async () => shop.admin, { shopId: LIVE_SHOP });

  const run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: pipelineRunId } });
  assert.equal(run.status, "success", run.errorMessage ?? "");
  const store = (JSON.parse(run.stagesJson) as { stage: string; detail?: Json }[]).find((s) => s.stage === "store_makeup");
  assert.equal(store?.detail?.pcdRedacted, true);
  assert.equal(await prisma.geo.count({ where: { shopId: LIVE_SHOP } }), 0);
  assert.equal(await prisma.orderRow.count({ where: { shopId: LIVE_SHOP, customerHash: { not: null } } }), 0);
  assert.equal(await prisma.orderRow.count({ where: { shopId: LIVE_SHOP } }), shop.orderCount);

  await wipe(LIVE_SHOP);
});

test("a failed stage is recorded and does not run later stages", async () => {
  await installShop(LIVE_SHOP);
  const broken: AdminGraphql = async () => {
    throw new AdminQueryError("Admin GraphQL request failed: boom", null);
  };
  const { pipelineRunId } = await enqueueLivePipeline(LIVE_SHOP, "install");
  await drainPipelineRuns(async () => broken, { shopId: LIVE_SHOP });

  const run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: pipelineRunId } });
  assert.equal(run.status, "failed");
  assert.equal(run.failedStage, "store_makeup");
  assert.match(run.errorMessage ?? "", /boom/);
  const sync = await prisma.syncRun.findFirstOrThrow({ where: { shopId: LIVE_SHOP } });
  assert.equal(sync.status, "failed");
  assert.equal(await prisma.eventCandidate.count({ where: { shopId: LIVE_SHOP } }), 0);

  await wipe(LIVE_SHOP);
});

test("demo pipeline keeps the fixture persona ids", async () => {
  assert.equal(personaIdFor(DEMO_SHOP_DOMAIN, "race_day_taper"), "pers_race_day_taper");
  assert.notEqual(personaIdFor(LIVE_SHOP, "race_day_taper"), "pers_race_day_taper");
});

test("granted scopes are accepted in Shopify's alphabetical order", async () => {
  const { assertExactScopes } = await import("../app/scopes");
  assert.doesNotThrow(() => assertExactScopes("read_customers,read_orders,read_products"));
  assert.throws(() => assertExactScopes("read_customers,read_orders"));
  assert.throws(() => assertExactScopes("read_customers,read_orders,read_products,write_orders"));
});
