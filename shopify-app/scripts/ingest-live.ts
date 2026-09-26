/**
 * Run Admin GraphQL ingest for a connected shop (local / Fly SSH).
 *
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run ingest:live
 */
import prisma from "../app/db.server";
import { ingestShopifyFull } from "../app/services/ingest/shopify-full";

const shopId = (process.env.TARGET_SHOP || process.env.SHOPIFY_STORE_DOMAIN || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=your-store.myshopify.com");
  process.exit(1);
}

const shop = await prisma.shop.findUnique({ where: { id: shopId } });
if (!shop) {
  console.error(`Shop ${shopId} not found — install the app first.`);
  process.exit(1);
}

const result = await ingestShopifyFull(prisma, shopId, { maxOrders: 500 });
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
