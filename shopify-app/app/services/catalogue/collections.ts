import type { PrismaClient } from "@prisma/client";

/** Harbour Run collection membership. The shell is intentionally absent from Race Kits. */
const MEMBERSHIP: Record<string, string[]> = {
  col_race_kits: ["race-tee-unisex", "running-shorts", "performance-socks", "soft-flask"],
  col_wet: ["waterproof-shell-jacket", "half-zip-midlayer"],
  col_race_day: ["race-tee-unisex", "running-shorts", "soft-flask", "trail-or-road-cap"],
  col_kids: ["kids-youth-run-tee"],
};

export async function linkHarbourCollections(prisma: PrismaClient, shopId: string): Promise<number> {
  const products = await prisma.productRow.findMany({
    where: { shopId },
    select: { id: true, handle: true },
  });
  const byHandle = new Map(products.map((product) => [product.handle, product.id]));
  const productIds = products.map((product) => product.id);
  if (productIds.length > 0) {
    await prisma.productCollection.deleteMany({ where: { productId: { in: productIds } } });
  }

  let linked = 0;
  for (const [collectionId, handles] of Object.entries(MEMBERSHIP)) {
    const collection = await prisma.collectionRow.findFirst({
      where: { id: collectionId, shopId },
    });
    if (!collection) continue;
    for (const handle of handles) {
      const productId = byHandle.get(handle);
      if (!productId) continue;
      await prisma.productCollection.create({ data: { productId, collectionId } });
      linked += 1;
    }
  }
  return linked;
}
