import prisma from "../app/db.server";
import { enqueueAgentRuns } from "../app/services/agents/enqueue";
import { executeAgentRun } from "../app/services/agents/playwright-run";
import { runDemoPipeline } from "../app/services/pipeline/run-demo";

const shopId = "harbour-run-demo.myshopify.com";

const url = process.env.SHOP_STOREFRONT_URL?.trim();
if (!url) {
  console.error("SHOP_STOREFRONT_URL is missing. Refusing to hydrate a mock AgentRun.");
  process.exit(1);
}
process.env.AGENTS_HEADED = process.env.AGENTS_HEADED ?? "0";

const ready = await prisma.persona.count({ where: { shopId, status: "ready" } });
if (ready === 0) {
  console.log("No Ready persona. Running pipeline:demo first.");
  await runDemoPipeline(prisma);
}

const result = await enqueueAgentRuns({
  shopId,
  personaIds: ["pers_race_day_taper"],
  forceHeadedDemo: true,
  kick: false,
});
if (result.created.length === 0) {
  console.error(result);
  process.exit(1);
}

for (const created of result.created) {
  await executeAgentRun(created.id, prisma);
  const run = await prisma.agentRun.findUnique({ where: { id: created.id } });
  const card = await prisma.recommendation.findFirst({ where: { runId: created.id } });
  console.log(JSON.stringify({
    id: run?.id,
    status: run?.status,
    outcome: run?.outcome,
    recommendation: card?.title ?? null,
    provenance: card?.provenanceLabelsJson ?? null,
  }, null, 2));
  if (run?.status !== "stopped_before_payment") process.exit(1);
}

await prisma.$disconnect();
