/**
 * Re-run the live pipeline (stages a→f) for an installed shop, in this process.
 *
 *   npm run pipeline:live -- syndicate-4ghkumor.myshopify.com
 *
 * Needs SHOPIFY_API_KEY / SHOPIFY_API_SECRET in .env and an offline session
 * from a completed install (open the app in the shop admin once).
 */
import prisma from "../app/db.server";
import { enqueueLivePipeline } from "../app/services/pipeline.server";
import { drainPipelineRuns } from "../app/services/pipeline/worker.server";

const shop = process.argv[2]?.trim();
if (!shop) {
  console.error("Usage: npm run pipeline:live -- <shop>.myshopify.com");
  process.exit(1);
}

const row = await prisma.shop.findUnique({ where: { id: shop } });
if (!row || row.uninstalledAt) {
  console.error(`${shop} is not installed. Open Syndicate in that shop's admin first.`);
  process.exit(1);
}

const { pipelineRunId } = await enqueueLivePipeline(shop, "manual_refresh");
await drainPipelineRuns(undefined, { shopId: shop });
const run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: pipelineRunId } });

console.log(`\nPipelineRun ${run.id}: ${run.status}`);
for (const stage of JSON.parse(run.stagesJson) as { stage: string; status: string; detail?: unknown }[]) {
  console.log(`  ${stage.status.padEnd(8)} ${stage.stage}${stage.detail ? ` ${JSON.stringify(stage.detail)}` : ""}`);
}
if (run.status !== "success") {
  console.error(`\nFailed at ${run.failedStage}: ${run.errorMessage}`);
  process.exit(2);
}
await prisma.$disconnect();
