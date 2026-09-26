import prisma from "../db.server";

/**
 * APP_UNINSTALLED wipe. Sessions go first. PCD-bearing geo and customer
 * hashes are removed. Order commercial rows stay until a later epic decides
 * retention; the customer link does not.
 */
export async function pcdWipeShop(shopDomain: string): Promise<{ sessions: number }> {
  const sessions = await prisma.session.deleteMany({ where: { shop: shopDomain } });
  await prisma.orderRow.updateMany({
    where: { shopId: shopDomain },
    data: { customerHash: null, geoId: null },
  });
  await prisma.geo.deleteMany({ where: { shopId: shopDomain } });
  await prisma.shop.updateMany({
    where: { OR: [{ id: shopDomain }, { myshopifyDomain: shopDomain }] },
    data: { uninstalledAt: new Date(), accessToken: "" },
  });
  await prisma.pipelineRun.updateMany({
    where: { shopId: shopDomain, status: { in: ["pending", "running"] } },
    data: { status: "cancelled", finishedAt: new Date(), errorCode: "APP_UNINSTALLED" },
  });
  return { sessions: sessions.count };
}
