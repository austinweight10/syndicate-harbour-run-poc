import type { PrismaClient } from "@prisma/client";

/** Harbour Run collection membership. The shell is intentionally absent from Race Kits. */
const MEMBERSHIP: Record<string, string[]> = {
  col_race_kits: ["race-tee-unisex", "running-shorts", "performance-socks", "soft-flask"],
  col_wet: ["waterproof-shell-jacket", "half-zip-midlayer"],
  col_race_day: ["race-tee-unisex", "running-shorts", "soft-flask", "trail-or-road-cap"],
  col_kids: ["kids-youth-run-tee"],
};

/** Storefront sort order by collection handle — first handle is already leading. */
export const COLLECTION_LEAD_ORDER: Record<string, string[]> = {
  "race-kits": MEMBERSHIP.col_race_kits,
  "wet-weather-training": MEMBERSHIP.col_wet,
  "race-day-essentials": MEMBERSHIP.col_race_day,
  "kids-youth": MEMBERSHIP.col_kids,
};

/** Prefer known merch order so "pin to top" can detect an already-leading product. */
export function orderCollectionHandles(collectionHandle: string, handles: string[]): string[] {
  const preferred = COLLECTION_LEAD_ORDER[collectionHandle];
  if (!preferred?.length) return handles;
  const set = new Set(handles);
  const leading = preferred.filter((handle) => set.has(handle));
  const rest = handles.filter((handle) => !preferred.includes(handle));
  return [...leading, ...rest];
}

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
