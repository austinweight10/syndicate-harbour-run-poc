import assert from "node:assert/strict";
import test from "node:test";

process.env.DEMO_FIXTURE_SHOP = "1";

const { default: prisma } = await import("../app/db.server");
const { DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
const { personaIdFor } = await import("../app/services/personas/ids");
const { derivePersonas } = await import("../app/services/personas/derive");
const { assertExactScopes } = await import("../app/scopes");

const LIVE_SHOP = "persona-ids-test.myshopify.com";

test("demo shop keeps fixture persona ids; other shops get their own", () => {
  assert.equal(personaIdFor(DEMO_SHOP_DOMAIN, "race_day_taper"), "pers_race_day_taper");
  const live = personaIdFor(LIVE_SHOP, "race_day_taper");
  assert.notEqual(live, "pers_race_day_taper");
  assert.equal(live, personaIdFor(LIVE_SHOP, "race_day_taper"), "stable per shop");
  assert.notEqual(live, personaIdFor("other.myshopify.com", "race_day_taper"));
});

test("deriving personas for a second shop does not collide with the demo shop", async () => {
  await prisma.persona.deleteMany({ where: { shopId: LIVE_SHOP } });
  const demoBefore = await prisma.persona.findMany({ where: { shopId: DEMO_SHOP_DOMAIN }, select: { id: true } });
  await derivePersonas(prisma, LIVE_SHOP, []);
  const live = await prisma.persona.findMany({ where: { shopId: LIVE_SHOP } });
  assert.ok(live.some((p) => p.id === personaIdFor(LIVE_SHOP, "race_day_taper")));
  const demoAfter = await prisma.persona.findMany({ where: { shopId: DEMO_SHOP_DOMAIN }, select: { id: true } });
  assert.deepEqual(demoAfter.map((p) => p.id).sort(), demoBefore.map((p) => p.id).sort());
  await prisma.persona.deleteMany({ where: { shopId: LIVE_SHOP } });
});

test("granted scopes are accepted in Shopify's alphabetical order", () => {
  assert.doesNotThrow(() => assertExactScopes("read_customers,read_orders,read_products"));
  assert.throws(() => assertExactScopes("read_customers,read_orders"));
  assert.throws(() => assertExactScopes("read_customers,read_orders,read_products,write_orders"));
});
