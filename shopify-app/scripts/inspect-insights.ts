import prisma from "../app/db.server";

const shopId = "syndicate-4ghkumor.myshopify.com";

const insights = await prisma.insightScore.groupBy({
  by: ["insightKind"],
  where: { shopId },
  _count: true,
});
const recs = await prisma.recommendation.findMany({
  where: { shopId },
  select: { title: true, kind: true, priority: true, runId: true },
  orderBy: { createdAt: "desc" },
  take: 20,
});
const agents = await prisma.agentRun.groupBy({
  by: ["status"],
  where: { shopId },
  _count: true,
});
const actions = await prisma.storefrontAction.groupBy({
  by: ["status"],
  where: { shopId },
  _count: true,
}).catch(() => []);
const afford = await prisma.affordanceScore.count({ where: { shopId } });

console.log(JSON.stringify({ insights, agents, afford, actionStatuses: actions, recs }, null, 2));
await prisma.$disconnect();
