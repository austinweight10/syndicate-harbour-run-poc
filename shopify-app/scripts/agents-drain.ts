/**
 * Execute queued/running agent runs for a shop (Fly SSH / local).
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npx tsx scripts/agents-drain.ts
 */
import prisma from "../app/db.server";
import { executeAgentRun } from "../app/services/agents/playwright-run";
import { enqueueAgentRuns } from "../app/services/agents/enqueue";

const shopId = (process.env.TARGET_SHOP || process.env.SHOPIFY_STORE_DOMAIN || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=…");
  process.exit(1);
}

process.env.AGENTS_HEADED = process.env.AGENTS_HEADED ?? "0";
if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "/ms-playwright";
}

let queued = await prisma.agentRun.findMany({
  where: { shopId, status: "queued" },
  orderBy: { startedAt: "asc" },
});

if (queued.length === 0) {
  console.log("No queued runs — enqueueing up to 1 ready persona…");
  const enq = await enqueueAgentRuns({
    shopId,
    forceHeadedDemo: false,
    kick: false,
  });
  console.log(enq);
  queued = await prisma.agentRun.findMany({
    where: { shopId, status: "queued" },
    orderBy: { startedAt: "asc" },
  });
}

for (const run of queued.slice(0, 1)) {
  console.log(`Executing ${run.id}…`);
  await executeAgentRun(run.id, prisma);
  const done = await prisma.agentRun.findUnique({ where: { id: run.id } });
  const card = await prisma.recommendation.findFirst({ where: { runId: run.id } });
  console.log(
    JSON.stringify(
      {
        id: done?.id,
        status: done?.status,
        outcome: done?.outcome,
        errorMessage: done?.errorMessage,
        storefrontUrl: done?.storefrontUrl,
        recommendation: card?.title ?? null,
      },
      null,
      2,
    ),
  );
}

await prisma.$disconnect();
