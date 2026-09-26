import type { PrismaClient } from "@prisma/client";

function topCounts(values: string[], limit: number): { key: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const key = value.trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export async function writeStoreMakeup(
  prisma: PrismaClient,
  shopId: string,
  pipelineRunId: string,
  opts: { provenance?: "OBSERVED" | "MOCK" } = {},
): Promise<{ orders: number; emptyOrders: boolean }> {
  const provenance = opts.provenance ?? "MOCK";
  const [orders, lines, products, collections, geos] = await Promise.all([
    prisma.orderRow.findMany({ where: { shopId, test: false } }),
    prisma.lineItemRow.findMany({ where: { shopId } }),
    prisma.productRow.findMany({ where: { shopId } }),
    prisma.collectionRow.findMany({ where: { shopId } }),
    prisma.geo.findMany({ where: { shopId } }),
  ]);

  const geoById = new Map(geos.map((geo) => [geo.id, geo]));
  const linesByOrder = new Map<string, typeof lines>();
  for (const line of lines) {
    const bucket = linesByOrder.get(line.orderId) ?? [];
    bucket.push(line);
    linesByOrder.set(line.orderId, bucket);
  }

  const totals = orders.map((order) => Number(order.totalAmount));
  const sorted = [...totals].sort((a, b) => a - b);
  const bands = [
    { band: "0-25", min: 0, max: 25, orderCount: totals.filter((value) => value < 25).length },
    { band: "25-50", min: 25, max: 50, orderCount: totals.filter((value) => value >= 25 && value < 50).length },
    { band: "50-100", min: 50, max: 100, orderCount: totals.filter((value) => value >= 50 && value < 100).length },
    { band: "100+", min: 100, max: null, orderCount: totals.filter((value) => value >= 100).length },
  ];

  const skuMix = new Map<string, { title: string; sku: string | null; units: number; revenue: number }>();
  const sizeOptionCounts = new Map<string, number>();
  for (const line of lines) {
    const key = line.sku ?? line.title;
    const current = skuMix.get(key) ?? { title: line.title, sku: line.sku, units: 0, revenue: 0 };
    current.units += line.quantity;
    current.revenue += Number(line.lineTotal);
    skuMix.set(key, current);

    if (line.selectedOptionsJson) {
      try {
        const options = JSON.parse(line.selectedOptionsJson) as { name?: string; value?: string }[];
        for (const option of options) {
          if (!option.name || !option.value) continue;
          if (!/size/i.test(option.name)) continue;
          sizeOptionCounts.set(option.value, (sizeOptionCounts.get(option.value) ?? 0) + line.quantity);
        }
      } catch {
        /* ignore */
      }
    }
  }

  const geoBuckets = new Map<
    string,
    { city: string | null; countryCode: string; postalSector: string | null; orderCount: number }
  >();
  const dayBuckets = new Map<string, number>();
  const hourBuckets = new Map<string, number>();
  const channelBuckets = new Map<string, number>();
  let lineCounts = 0;
  let multiSkuOrders = 0;
  let discountedOrders = 0;

  for (const order of orders) {
    const dow = DOW[order.processedAt.getUTCDay()];
    dayBuckets.set(dow, (dayBuckets.get(dow) ?? 0) + 1);
    const hour = String(order.processedAt.getUTCHours()).padStart(2, "0");
    hourBuckets.set(hour, (hourBuckets.get(hour) ?? 0) + 1);
    const channel = (order.sourceName || "unknown").trim() || "unknown";
    channelBuckets.set(channel, (channelBuckets.get(channel) ?? 0) + 1);

    const orderLines = linesByOrder.get(order.id) ?? [];
    lineCounts += orderLines.length;
    const distinctSkus = new Set(orderLines.map((line) => line.sku ?? line.productId ?? line.title));
    if (distinctSkus.size >= 2) multiSkuOrders += 1;
    if (order.totalDiscounts && Number(order.totalDiscounts) > 0) discountedOrders += 1;

    const geo = order.geoId ? geoById.get(order.geoId) : undefined;
    if (!geo) continue;
    const key = `${geo.countryCode}|${geo.city ?? ""}|${geo.postalSector ?? ""}`;
    const current = geoBuckets.get(key) ?? {
      city: geo.city,
      countryCode: geo.countryCode,
      postalSector: geo.postalSector,
      orderCount: 0,
    };
    current.orderCount += 1;
    geoBuckets.set(key, current);
  }

  const tags = products.flatMap((product) => (product.tags ?? "").split(",").map((tag) => tag.trim()));
  const types = products.map((product) => product.productType ?? "").filter(Boolean);

  const dayOfWeek = DOW.map((day) => ({ day, orderCount: dayBuckets.get(day) ?? 0 }));
  const hours = [...hourBuckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([hour, orderCount]) => ({ hour: `${hour}:00`, orderCount }));

  await prisma.storeMakeupSnapshot.upsert({
    where: { pipelineRunId },
    create: {
      shopId,
      pipelineRunId,
      windowDays: 60,
      collectionsJson: JSON.stringify(
        collections.slice(0, 10).map((collection) => ({
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
        })),
      ),
      productTypesJson: JSON.stringify(topCounts(types, 10).map((row) => ({ type: row.key, count: row.count }))),
      tagsJson: JSON.stringify(topCounts(tags, 15).map((row) => ({ tag: row.key, count: row.count }))),
      orderSkuMixJson: JSON.stringify(
        [...skuMix.values()]
          .sort((a, b) => b.units - a.units)
          .slice(0, 20),
      ),
      priceBandsJson: JSON.stringify(bands),
      topCollectionsJson: JSON.stringify(
        collections.slice(0, 10).map((collection) => ({ collectionId: collection.id, title: collection.title })),
      ),
      geoBucketsJson: JSON.stringify([...geoBuckets.values()].slice(0, 15)),
      totalsJson: JSON.stringify({
        ordersInWindow: orders.length,
        productsActive: products.length,
        collections: collections.length,
        distinctSkusSold: skuMix.size,
        aovP25: Math.round(percentile(sorted, 0.25)),
        aovP50: Math.round(percentile(sorted, 0.5)),
        aovP75: Math.round(percentile(sorted, 0.75)),
        currencyCode: "GBP",
        basketShape: {
          avgLineItems: orders.length ? Number((lineCounts / orders.length).toFixed(2)) : 0,
          multiSkuOrderShare: orders.length ? Number((multiSkuOrders / orders.length).toFixed(2)) : 0,
          discountedOrderShare: orders.length ? Number((discountedOrders / orders.length).toFixed(2)) : 0,
        },
        dayOfWeek,
        hourBucketsUtc: hours,
        channels: topCounts(
          [...channelBuckets.entries()].flatMap(([key, count]) => Array(count).fill(key)),
          8,
        ),
        sizeMix: [...sizeOptionCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([size, units]) => ({ size, units })),
      }),
      emptyOrders: orders.length === 0,
      provenance,
    },
    update: {
      emptyOrders: orders.length === 0,
      provenance,
      collectionsJson: JSON.stringify(
        collections.slice(0, 10).map((collection) => ({
          id: collection.id,
          title: collection.title,
          handle: collection.handle,
        })),
      ),
      productTypesJson: JSON.stringify(topCounts(types, 10).map((row) => ({ type: row.key, count: row.count }))),
      tagsJson: JSON.stringify(topCounts(tags, 15).map((row) => ({ tag: row.key, count: row.count }))),
      orderSkuMixJson: JSON.stringify(
        [...skuMix.values()]
          .sort((a, b) => b.units - a.units)
          .slice(0, 20),
      ),
      priceBandsJson: JSON.stringify(bands),
      topCollectionsJson: JSON.stringify(
        collections.slice(0, 10).map((collection) => ({ collectionId: collection.id, title: collection.title })),
      ),
      geoBucketsJson: JSON.stringify([...geoBuckets.values()].slice(0, 15)),
      totalsJson: JSON.stringify({
        ordersInWindow: orders.length,
        productsActive: products.length,
        collections: collections.length,
        distinctSkusSold: skuMix.size,
        aovP25: Math.round(percentile(sorted, 0.25)),
        aovP50: Math.round(percentile(sorted, 0.5)),
        aovP75: Math.round(percentile(sorted, 0.75)),
        currencyCode: "GBP",
        basketShape: {
          avgLineItems: orders.length ? Number((lineCounts / orders.length).toFixed(2)) : 0,
          multiSkuOrderShare: orders.length ? Number((multiSkuOrders / orders.length).toFixed(2)) : 0,
          discountedOrderShare: orders.length ? Number((discountedOrders / orders.length).toFixed(2)) : 0,
        },
        dayOfWeek,
        hourBucketsUtc: hours,
        channels: topCounts(
          [...channelBuckets.entries()].flatMap(([key, count]) => Array(count).fill(key)),
          8,
        ),
        sizeMix: [...sizeOptionCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 12)
          .map(([size, units]) => ({ size, units })),
      }),
    },
  });

  return { orders: orders.length, emptyOrders: orders.length === 0 };
}
