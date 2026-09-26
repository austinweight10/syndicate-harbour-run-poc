import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import prisma from "../app/db.server";
import { isDeniedLabel, isDeniedUrl } from "../app/services/agents/deny";
import { resolveStorefrontUrl } from "../app/services/agents/storefront";
import { enqueueAgentRuns } from "../app/services/agents/enqueue";
import { executeAgentRun } from "../app/services/agents/playwright-run";
import { runDemoPipeline } from "../app/services/pipeline/run-demo";
import { startStub } from "../stub-storefront/server";

const shopId = "harbour-run-demo.myshopify.com";

test("demo-completed-run.json is not written as an AgentRun", () => {
  const root = path.resolve(".");
  const writers = [
    "app/fixtures/seed.ts",
    "app/services/recommendations/build.ts",
    "app/services/agents/enqueue.ts",
    "app/services/agents/playwright-run.ts",
    "app/routes/app.runs.tsx",
  ];
  for (const rel of writers) {
    const text = readFileSync(path.join(root, rel), "utf8");
    assert.equal(text.includes("demo-completed-run"), false, rel);
  }
});

test("placeholder storefront url is not treated as live", () => {
  const previous = process.env.SHOP_STOREFRONT_URL;
  delete process.env.SHOP_STOREFRONT_URL;
  try {
    assert.equal(resolveStorefrontUrl("https://harbour-run-demo.myshopify.com"), null);
    assert.equal(resolveStorefrontUrl("https://YOUR-STORE.myshopify.com"), null);
    assert.equal(resolveStorefrontUrl(null), null);
    assert.equal(resolveStorefrontUrl("http://127.0.0.1:44741"), "http://127.0.0.1:44741");
  } finally {
    if (previous === undefined) delete process.env.SHOP_STOREFRONT_URL;
    else process.env.SHOP_STOREFRONT_URL = previous;
  }
});

test("deny-list blocks payment labels and urls", () => {
  assert.equal(isDeniedLabel("Pay now"), true);
  assert.equal(isDeniedLabel("Complete order"), true);
  assert.equal(isDeniedLabel("Buy it now"), true);
  assert.equal(isDeniedLabel("Buy with Shop Pay"), true);
  assert.equal(isDeniedLabel("Check out"), false);
  assert.equal(isDeniedLabel("Add to cart"), false);
  assert.equal(isDeniedUrl("https://shop.example/checkouts/1/payment"), true);
  assert.equal(isDeniedUrl("https://shop.example/checkout"), false);
});

test("enqueue respects pause, cap 3, and in-flight", async () => {
  process.env.SHOP_STOREFRONT_URL = "http://127.0.0.1:9";
  await runDemoPipeline(prisma);
  const blocked = await enqueueAgentRuns({ shopId, forceHeadedDemo: false, kick: false });
  assert.equal(blocked.block, "paused");
  assert.equal(blocked.created.length, 0);

  const source = await prisma.persona.findFirstOrThrow({ where: { shopId, id: "pers_race_day_taper" } });
  const extra: string[] = [];
  for (let i = 0; i < 4; i += 1) {
    const id = `pers_cap_${i}`;
    extra.push(id);
    await prisma.persona.create({
      data: {
        id,
        shopId,
        name: `Cap ${i}`,
        status: "ready",
        vertical: source.vertical,
        goalsJson: source.goalsJson,
        budgetMin: source.budgetMin,
        budgetMax: source.budgetMax,
        currencyCode: source.currencyCode,
        constraintsJson: source.constraintsJson,
        behaviouralJson: source.behaviouralJson,
        mockFlagsJson: source.mockFlagsJson,
        successCriteriaJson: source.successCriteriaJson,
      },
    });
  }

  const first = await enqueueAgentRuns({ shopId, forceHeadedDemo: true, kick: false });
  assert.equal(first.created.length, 3);
  const second = await enqueueAgentRuns({ shopId, forceHeadedDemo: true, kick: false });
  assert.equal(second.toast, "t02");
  assert.equal(second.block, "inflight");

  await prisma.agentRun.deleteMany({ where: { shopId, status: "queued" } });
  await prisma.persona.deleteMany({ where: { id: { in: extra } } });
});

test("playwright walks the dawn path and cites the AgentRun", { timeout: 180_000 }, async () => {
  const edgesBefore = await prisma.graphEdge.count({ where: { shopId } });
  const confidenceBefore = await prisma.confidenceScore.findMany({ orderBy: { eventCandidateId: "asc" } });
  const stub = await startStub();
  const previousUrl = process.env.SHOP_STOREFRONT_URL;
  const previousHeaded = process.env.AGENTS_HEADED;
  process.env.SHOP_STOREFRONT_URL = stub.url;
  process.env.AGENTS_HEADED = "0";
  try {
    const result = await enqueueAgentRuns({
      shopId,
      personaIds: ["pers_race_day_taper"],
      forceHeadedDemo: true,
      kick: false,
    });
    assert.equal(result.toast, "t01");
    assert.equal(result.created.length, 1);
    const runId = result.created[0].id;
    await executeAgentRun(runId, prisma);
    const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: runId } });
    assert.equal(run.status, "stopped_before_payment");
    assert.equal(run.outcome, "checkout_started");
    assert.equal(run.id.includes("mock"), false);

    const card = await prisma.recommendation.findFirstOrThrow({
      where: { runId, targetRef: "kids-youth-run-tee" },
    });
    assert.equal(card.provenanceLabelsJson.includes("MOCK"), false);
    assert.match(card.provenanceLabelsJson, /OBSERVED/);
    const shellCard = await prisma.recommendation.findFirstOrThrow({
      where: { runId, targetRef: "race-kits" },
    });
    assert.match(shellCard.title, /Race Kits/i);
    assert.equal(shellCard.runId, runId);
    const affordance = await prisma.affordanceScore.findFirstOrThrow({ where: { runId } });
    assert.equal(affordance.runId, runId);
    const insight = await prisma.insightScore.findFirstOrThrow({ where: { runId } });
    assert.equal(insight.insightKind, "sizing");
    const shellInsight = await prisma.insightScore.findFirstOrThrow({
      where: { runId, targetRef: "race-kits" },
    });
    assert.equal(shellInsight.insightKind, "dead_end");
    const missingXl = await prisma.insightScore.findFirstOrThrow({
      where: { runId, insightKind: "missing_variant" },
    });
    assert.equal(missingXl.targetRef, "race-tee-unisex");
    const weakCopy = await prisma.insightScore.findFirstOrThrow({
      where: { runId, insightKind: "weak_copy" },
    });
    assert.equal(weakCopy.targetRef, "race-tee-unisex");
    const priceShock = await prisma.insightScore.findFirstOrThrow({
      where: { runId, insightKind: "price_shock" },
    });
    assert.equal(priceShock.targetRef, "checkout");
    const trust = await prisma.insightScore.findFirstOrThrow({
      where: { runId, insightKind: "trust" },
    });
    assert.equal(trust.targetRef, "race-tee-unisex");

    assert.equal(stub.hits().some((path) => path.includes("/payment")), false);
    assert.equal(await prisma.graphEdge.count({ where: { shopId } }), edgesBefore);
    const confidenceAfter = await prisma.confidenceScore.findMany({ orderBy: { eventCandidateId: "asc" } });
    assert.deepEqual(
      confidenceAfter.map((row) => [row.eventCandidateId, row.value]),
      confidenceBefore.map((row) => [row.eventCandidateId, row.value]),
    );
  } finally {
    if (previousUrl === undefined) delete process.env.SHOP_STOREFRONT_URL;
    else process.env.SHOP_STOREFRONT_URL = previousUrl;
    if (previousHeaded === undefined) delete process.env.AGENTS_HEADED;
    else process.env.AGENTS_HEADED = previousHeaded;
    await stub.close();
  }
});
