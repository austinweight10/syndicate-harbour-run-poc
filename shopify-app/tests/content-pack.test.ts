import assert from "node:assert/strict";
import test from "node:test";

process.env.DEMO_FIXTURE_SHOP = "1";
process.env.SYNDICATE_LLM_PROVIDER = "off";
delete process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;

test("marketing pack drafts blog, page, banner, email and persona segments", async () => {
  const { default: prisma } = await import("../app/db.server");
  const { runDemoPipeline } = await import("../app/services/pipeline/run-demo");
  const { DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
  const { loadEventList } = await import("../app/services/board.server");
  const { generatePack } = await import("../app/services/content-pack/generate.server");
  const { applyPack, undoPack } = await import("../app/services/content-pack/apply.server");
  const { loadPackView } = await import("../app/services/content-pack/board.server");
  const { parseAssets, TRENDING_CONFIDENCE } = await import("../app/services/content-pack/types");
  const { hasMarketingWriteScopes } = await import("../app/scopes");

  assert.equal(
    hasMarketingWriteScopes("read_orders,read_products,read_customers,write_products,write_content,write_customers"),
    true,
  );
  assert.equal(hasMarketingWriteScopes("read_orders,read_products,read_customers,write_products"), false);

  await runDemoPipeline(prisma);
  await prisma.contentPack.deleteMany({ where: { shopId: DEMO_SHOP_DOMAIN } });

  const events = await loadEventList(DEMO_SHOP_DOMAIN);
  assert.ok(events.length > 0);
  const hero = events[0]!;
  assert.ok(hero.confidence >= TRENDING_CONFIDENCE, "demo hero occasion should be trending");

  const draft = await generatePack(DEMO_SHOP_DOMAIN, hero.id);
  assert.ok(draft);
  assert.match(draft!.headline, /Launch marketing/i);
  assert.ok(draft!.assets.blog.title.length > 4);
  assert.ok(draft!.assets.page.handle.startsWith("occasion-"));
  assert.ok(draft!.assets.banner.ctaPath.includes("/collections/"));
  assert.ok(draft!.assets.email.subject.length > 4);
  assert.ok(draft!.assets.segments.length >= 1, "linked personas become segments");

  const view = await loadPackView(DEMO_SHOP_DOMAIN, hero.id);
  assert.ok(view);
  assert.equal(view!.status, "proposed");
  assert.equal(view!.preview.length, 5);

  const row = await prisma.contentPack.findUnique({
    where: { shopId_eventId: { shopId: DEMO_SHOP_DOMAIN, eventId: hero.id } },
  });
  assert.ok(row);
  const assets = parseAssets(row!.assetsJson);
  assert.equal(assets.email.personaTargets.length, draft!.assets.email.personaTargets.length);

  const applied = await applyPack(DEMO_SHOP_DOMAIN, row!.id);
  assert.equal(applied.ok, true);
  assert.equal(applied.ok && applied.simulated, true);

  // Simulated packs can be re-published once scopes/token are available.
  const again = await applyPack(DEMO_SHOP_DOMAIN, row!.id);
  assert.equal(again.ok, true);
  assert.equal(again.ok && again.simulated, true);

  const undone = await undoPack(DEMO_SHOP_DOMAIN, row!.id);
  assert.equal(undone.ok, true);
  const after = await prisma.contentPack.findUnique({ where: { id: row!.id } });
  assert.equal(after?.status, "reverted");
});

test("weather archetype pack leans into shells and wet-weather collection", async () => {
  const { templatePack } = await import("../app/services/content-pack/generate.server");
  const draft = templatePack({
    eventId: "evt_wet",
    eventName: "Wet weekend layers",
    archetype: "weather",
    confidence: 0.72,
    city: "London",
    windowLabel: "Sat–Sun",
    topSkus: [{ title: "Waterproof Shell Jacket", handle: "waterproof-shell-jacket" }],
    personas: [
      {
        id: "pers_wet_weather_trainer",
        name: "Wet-weather trainer",
        status: "ready",
        goals: ["Waterproof shell"],
        budgetMin: 60,
        budgetMax: 130,
        locationProxy: "London",
      },
    ],
    collections: [
      { handle: "race-kits", title: "Race Kits" },
      { handle: "wet-weather-training", title: "Wet Weather Training" },
    ],
  });
  assert.match(draft.assets.banner.ctaPath, /wet-weather/);
  assert.match(draft.assets.blog.title, /Wet/i);
  assert.equal(draft.assets.segments[0]?.personaName, "Wet-weather trainer");
});
