/**
 * Enqueue a live pipeline refresh (ingest → score → optional agents).
 *
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run pipeline:refresh
 */
import prisma from "../app/db.server";
import { drainLivePipeline } from "../app/services/pipeline/drain-live";
import { PIPELINE_STAGE_ORDER } from "../app/services/pipeline.server";

const shopId = (process.env.TARGET_SHOP || process.env.SHOPIFY_STORE_DOMAIN || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=your-store.myshopify.com");
  process.exit(1);
}

const settings = await prisma.shopSettings.findUnique({ where: { shopId } });
const created = await prisma.pipelineRun.create({
  data: {
    shopId,
    mode: "live",
    trigger: "manual_refresh",
    status: "pending",
    currentStage: "store_makeup",
    stagesJson: JSON.stringify(
      PIPELINE_STAGE_ORDER.map((stage) => ({ stage, status: "pending" })),
    ),
    agentsAutoRunSnapshot: settings?.agentsAutoRun ?? true,
    idempotencyKey: `${shopId}:manual_refresh:${Date.now()}`,
  },
});

console.log(`Running ${created.id}…`);
await drainLivePipeline(prisma, created.id);

const run = await prisma.pipelineRun.findUnique({ where: { id: created.id } });
const agents = await prisma.agentRun.findMany({
  where: { shopId },
  orderBy: { startedAt: "desc" },
  take: 5,
  select: { id: true, status: true, outcome: true, errorMessage: true },
});

console.log(
  JSON.stringify(
    {
      pipelineRunId: created.id,
      status: run?.status,
      lastSuccessfulStage: run?.lastSuccessfulStage,
      errorMessage: run?.errorMessage,
      orders: await prisma.orderRow.count({ where: { shopId } }),
      products: await prisma.productRow.count({ where: { shopId } }),
      liveGidOrders: await prisma.orderRow.count({
        where: { shopId, id: { startsWith: "gid://" } },
      }),
      sync: await prisma.syncRun.findFirst({
        where: { shopId },
        orderBy: { startedAt: "desc" },
      }),
      recentAgents: agents,
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
