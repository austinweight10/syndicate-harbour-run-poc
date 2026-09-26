import assert from "node:assert/strict";
import test from "node:test";
import {
  personaProfileSections,
  parseConstraints,
  parseBehavioural,
  resolveLikelyProducts,
  type CatalogueProduct,
} from "../app/services/personas/attributes";

const CATALOGUE: CatalogueProduct[] = [
  {
    id: "prod_shell",
    title: "Waterproof Shell Jacket",
    handle: "waterproof-shell-jacket",
    productType: "Outerwear",
    tags: ["waterproof", "wet_weather"],
    fromPrice: 65,
  },
  {
    id: "prod_hz",
    title: "Half-Zip Midlayer",
    handle: "half-zip-midlayer",
    productType: "Apparel",
    tags: ["layers", "wet_weather"],
    fromPrice: 55,
  },
  {
    id: "prod_race_tee",
    title: "Race Tee — Unisex",
    handle: "race-tee-unisex",
    productType: "Apparel",
    tags: ["race_day"],
    fromPrice: 38,
  },
];

test("resolveLikelyProducts matches goals to catalogue titles", () => {
  const likes = resolveLikelyProducts(
    ["Waterproof Shell Jacket", "Half-Zip Midlayer", "Race Tee — Unisex"],
    CATALOGUE,
  );
  assert.equal(likes.length, 3);
  assert.equal(likes[0]?.title, "Waterproof Shell Jacket");
  assert.equal(likes[0]?.fromPrice, 65);
  assert.equal(likes[0]?.matched, true);
  assert.equal(likes[0]?.why, "Top purchase in this shopper’s order pattern");
});

test("personaProfileSections groups products, behaviours and predictions", () => {
  const constraints = parseConstraints(
    JSON.stringify({
      sizes: ["M", "L"],
      colours: ["black", "olive"],
      mobileFirst: true,
      timePressure: false,
      weatherAware: true,
    }),
  );
  const behavioural = parseBehavioural(
    JSON.stringify({
      impulseVsDeliberate: "deliberate",
      collectionFirstVsSearch: "search",
      brief: "Midweek London rain.",
    }),
  );
  const sections = personaProfileSections({
    goals: ["Waterproof Shell Jacket", "Half-Zip Midlayer"],
    catalogue: CATALOGUE,
    budgetMin: 60,
    budgetMax: 130,
    locationProxy: "London metro",
    eventName: "Wet weekend layers",
    constraints,
    behavioural,
    mockFlags: ["weather_proxy_narrative"],
  });

  assert.deepEqual(
    sections.map((section) => section.id),
    ["products", "behaviours", "predictions"],
  );
  assert.equal(sections[0]?.title, "Most likely to like");
  assert.equal(sections[0]?.products?.[0]?.title, "Waterproof Shell Jacket");
  assert.equal(sections[0]?.products?.[0]?.fromPrice, 65);
  assert.equal(sections[1]?.title, "Typical behaviours");
  assert.ok(sections[1]?.items.some((item) => item.value === "Starts with search"));
  assert.equal(sections[2]?.title, "Predictions");
  assert.ok(sections[2]?.items.some((item) => item.value.includes("£60–£130")));
  assert.ok(sections[2]?.items.some((item) => item.value.includes("rain is forecast")));
});
