/**
 * Seed Harbour Run fixture data into a Connected live shop (hybrid until
 * Admin GraphQL ingest exists), then score events/personas/recommendations.
 *
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run pipeline:seed-shop
 */
import prisma from "../app/db.server";
import { runDemoPipeline } from "../app/services/pipeline/run-demo";

const shopId = (process.env.TARGET_SHOP || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=your-store.myshopify.com");
  process.exit(1);
}

const result = await runDemoPipeline(prisma, {
  shopId,
  preserveCredentials: true,
});
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
