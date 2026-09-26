import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { applyLowNCap, confidenceValue } from "../app/services/graph/math";

process.env.DEMO_FIXTURE_SHOP = "1";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("low-n cap and prior-year weight stay inside the epic formula", () => {
  const raw = confidenceValue({ Lt: 1, G: 1, A: 1, Y: 1, R: 1 });
  assert.ok(Math.abs(raw - 1) < 1e-9);
  const capped = applyLowNCap(0.91, 4);
  assert.equal(capped.lowN, true);
  assert.equal(capped.value, 0.4);
  const kept = applyLowNCap(0.62, 8);
  assert.equal(kept.lowN, false);
  assert.equal(kept.value, 0.62);
});

test("demo pipeline writes events and recommendations from SQLite", async () => {
  const { default: prisma } = await import("../app/db.server");
  const { runDemoPipeline } = await import("../app/services/pipeline/run-demo");
  const { DEMO_SHOP_DOMAIN } = await import("../app/fixtures/seed");
  const result = await runDemoPipeline(prisma);

  assert.ok(result.events.length > 0, "expected EventCandidates");
  assert.ok(result.recommendations > 0, "expected recommendations");
  assert.equal(result.recommendationsWithRun, 0);

  const events = await prisma.eventCandidate.count({ where: { shopId: DEMO_SHOP_DOMAIN } });
  const recs = await prisma.recommendation.findMany({ where: { shopId: DEMO_SHOP_DOMAIN } });
  assert.ok(events > 0);
  assert.ok(recs.length > 0);

  const scores = await prisma.confidenceScore.findMany({
    where: { eventCandidateId: { in: (await prisma.eventCandidate.findMany({ where: { shopId: DEMO_SHOP_DOMAIN }, select: { id: true } })).map((row) => row.id) } },
  });
  assert.ok(scores.every((score) => score.Y === 0.5));
  for (const score of scores) {
    if (score.nOrders < 5) assert.ok(score.value <= 0.4, `${score.eventCandidateId} exceeded low-n cap`);
  }

  const london = result.events.find((event) => event.name.includes("London 10K"));
  assert.ok(london, "expected the London race weekend");
  assert.ok(london.nOrders >= 5);
  assert.equal(london.lowN, false);

  assert.equal(recs.some((row) => row.runId), false);
  assert.ok(recs.length >= 1);
  assert.equal(recs.some((row) => row.provenanceLabelsJson.includes("MOCK")), false);

  const social = await prisma.graphEdge.findMany({
    where: { shopId: DEMO_SHOP_DOMAIN, fromType: "SocialTrend" },
  });
  assert.ok(social.length > 0);
  assert.ok(social.every((edge) => edge.provenance !== "OBSERVED"));

  const forecasts = await prisma.weatherForecast.count();
  assert.ok(forecasts > 0);
  const personas = await prisma.persona.findMany({ where: { shopId: DEMO_SHOP_DOMAIN } });
  assert.ok(personas.some((persona) => persona.name === "Race-day taper" && persona.primaryEventId));
  assert.ok(personas.some((persona) => persona.name === "Wet-weather trainer"));

  const routes = [
    "app/routes/app._index.tsx",
    "app/routes/app.events._index.tsx",
    "app/routes/app.events.$id.tsx",
    "app/routes/app.artifacts.tsx",
  ];
  for (const rel of routes) {
    const text = readFileSync(path.join(root, rel), "utf8");
    assert.equal(text.includes("recommendations/demo"), false, rel);
    assert.equal(text.includes("sports-mock"), false, rel);
    assert.equal(text.includes("readFileSync"), false, rel);
  }
});
