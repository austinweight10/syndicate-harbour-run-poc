/**
 * Inspect live shop rows on Fly / local.
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npx tsx scripts/inspect-shop.ts
 */
import prisma from "../app/db.server";

const shopId = (process.env.TARGET_SHOP || process.env.SHOPIFY_STORE_DOMAIN || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=…");
  process.exit(1);
}

const [orders, products, agents, makeup, sync] = await Promise.all([
  prisma.orderRow.findMany({
    where: { shopId },
    take: 5,
    orderBy: { processedAt: "desc" },
    select: { id: true, name: true, totalAmount: true },
  }),
  prisma.productRow.findMany({
    where: { shopId },
    take: 10,
    select: { id: true, title: true, handle: true },
  }),
  prisma.agentRun.findMany({
    where: { shopId },
    orderBy: { startedAt: "desc" },
    take: 5,
    select: {
      id: true,
      status: true,
      outcome: true,
      errorMessage: true,
      progressPct: true,
      storefrontUrl: true,
    },
  }),
  prisma.storeMakeupSnapshot.findFirst({
    where: { shopId },
    orderBy: { capturedAt: "desc" },
  }),
  prisma.syncRun.findFirst({ where: { shopId }, orderBy: { startedAt: "desc" } }),
]);

console.log(
  JSON.stringify(
    {
      orderCount: await prisma.orderRow.count({ where: { shopId } }),
      liveGidOrders: await prisma.orderRow.count({
        where: { shopId, id: { startsWith: "gid://" } },
      }),
      productCount: await prisma.productRow.count({ where: { shopId } }),
      orders,
      products,
      agents,
      provenance: makeup?.provenance,
      sync,
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
