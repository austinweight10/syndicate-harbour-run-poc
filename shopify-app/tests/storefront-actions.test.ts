import assert from "node:assert/strict";
import test from "node:test";

process.env.DEMO_FIXTURE_SHOP = "1";
process.env.SYNDICATE_LLM_PROVIDER = "off";
delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

const { assertExactScopes, hasWriteScope, normalizeScopes } = await import("../app/scopes");

test("scopes accept the read set with optional product/content/customer writes", () => {
  assert.doesNotThrow(() => assertExactScopes("read_orders,read_products,read_customers"));
  assert.doesNotThrow(() => assertExactScopes("write_products,read_customers,read_orders,read_products"));
  // Shopify session tokens omit read_products when write_products is granted.
  assert.doesNotThrow(() => assertExactScopes("read_customers,read_orders,write_products"));
  assert.doesNotThrow(() =>
    assertExactScopes("read_customers,read_orders,read_products,write_products,write_content,write_customers"),
  );
  assert.equal(
    normalizeScopes("read_customers,read_orders,write_products"),
    "read_customers,read_orders,read_products,write_products",
  );
  assert.throws(() => assertExactScopes("read_orders,read_products,read_customers,write_themes"));
  assert.throws(() => assertExactScopes("read_orders,read_products,write_products"));
  assert.equal(hasWriteScope("read_orders,write_products"), true);
  assert.equal(hasWriteScope("read_orders,read_products"), false);
});

test("APP_SCOPES includes marketing writes for live publish", async () => {
  const { APP_SCOPES } = await import("../app/scopes");
  assert.match(APP_SCOPES, /write_content/);
  assert.match(APP_SCOPES, /write_customers/);
  assert.match(APP_SCOPES, /write_products/);
});

test("every board card gets a one-click action; deploy and undo round-trip", async () => {
  const { default: prisma } = await import("../app/db.server");
  const { runDemoPipeline } = await import("../app/services/pipeline/run-demo");
  const { DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
  const { loadBoard } = await import("../app/services/board.server");
  const { draftActions, loadCatalogue } = await import("../app/services/actions/propose.server");
  const { applyAction, undoAction } = await import("../app/services/actions/apply.server");
  const { validateDraft, parseParams } = await import("../app/services/actions/types");

  await runDemoPipeline(prisma);
  await prisma.storefrontAction.deleteMany({ where: { shopId: DEMO_SHOP_DOMAIN } });
  const board = await loadBoard(DEMO_SHOP_DOMAIN);
  const cards = [
    ...board.insights.map((card) => ({ ...card, cardId: card.id, cardKind: "insight" as const })),
    ...board.frictions.map((card) => ({ ...card, cardId: card.id, cardKind: "blocker" as const })),
  ];
  assert.ok(cards.length > 0);

  const written = await draftActions(DEMO_SHOP_DOMAIN, cards);
  assert.equal(written, cards.length, "each card should get an action");

  const catalogue = await loadCatalogue(DEMO_SHOP_DOMAIN);
  const rows = await prisma.storefrontAction.findMany({ where: { shopId: DEMO_SHOP_DOMAIN } });
  for (const row of rows) {
    assert.equal(row.source, "template");
    assert.equal(row.status, "proposed");
  }

  const raceKits = rows.find((row) => row.actionType === "collection_add_product");
  assert.ok(raceKits, "Race Kits blocker should propose adding the shell");
  const params = parseParams(raceKits.paramsJson);
  assert.deepEqual(params, {
    type: "collection_add_product",
    collectionHandle: "race-kits",
    productHandle: "waterproof-shell-jacket",
  });
  assert.equal(validateDraft({ cardId: raceKits.cardId, params, headline: "x", rationale: "" }, catalogue), null);

  const applied = await applyAction(DEMO_SHOP_DOMAIN, raceKits.id);
  assert.equal(applied.ok, true);
  assert.equal(applied.ok && applied.simulated, true, "demo shop without a token is simulated");
  const again = await applyAction(DEMO_SHOP_DOMAIN, raceKits.id);
  assert.equal(again.ok, false, "double deploy is refused");

  const after = await loadCatalogue(DEMO_SHOP_DOMAIN);
  assert.ok(after.collections.find((row) => row.handle === "race-kits")?.productHandles.includes("waterproof-shell-jacket"));
  const rec = await prisma.recommendation.findUnique({ where: { id: raceKits.cardId } });
  assert.equal(rec?.status, "actioned");

  const undone = await undoAction(DEMO_SHOP_DOMAIN, raceKits.id);
  assert.equal(undone.ok, true);
  const reverted = await loadCatalogue(DEMO_SHOP_DOMAIN);
  assert.equal(
    reverted.collections.find((row) => row.handle === "race-kits")?.productHandles.includes("waterproof-shell-jacket"),
    false,
  );
  const row = await prisma.storefrontAction.findUnique({ where: { id: raceKits.id } });
  assert.equal(row?.status, "reverted");
});

test("validation rejects invented handles and unsafe size-guide HTML", async () => {
  const { validateDraft } = await import("../app/services/actions/types");
  const catalogue = {
    products: [{ handle: "kids-youth-run-tee", title: "Youth tee", productType: null, tags: [] }],
    collections: [{ handle: "kids-youth", title: "Kids", productHandles: ["kids-youth-run-tee"] }],
  };
  const base = { cardId: "c", headline: "h", rationale: "r" };
  assert.match(
    validateDraft({ ...base, params: { type: "product_add_tags", productHandle: "made-up", tags: ["x"] } }, catalogue) ?? "",
    /Unknown product/,
  );
  assert.match(
    validateDraft(
      {
        ...base,
        params: {
          type: "product_append_size_guide",
          productHandle: "kids-youth-run-tee",
          sizeGuideHtml: "<p>Sizes</p><script>alert(1)</script>",
        },
      },
      catalogue,
    ) ?? "",
    /plain markup/,
  );
  assert.match(
    validateDraft(
      {
        ...base,
        params: { type: "collection_add_product", collectionHandle: "kids-youth", productHandle: "kids-youth-run-tee" },
      },
      catalogue,
    ) ?? "",
    /already in/,
  );
  assert.match(
    validateDraft(
      {
        ...base,
        params: {
          type: "collection_feature_product",
          collectionHandle: "kids-youth",
          productHandle: "kids-youth-run-tee",
        },
      },
      catalogue,
    ) ?? "",
    /already first/i,
  );
});
