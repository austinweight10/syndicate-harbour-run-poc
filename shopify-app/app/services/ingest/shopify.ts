import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { AdminQueryError, type AdminGraphql } from "./admin-client";

/** Stage a ingest: products, collections, and ≤60d orders from a live shop. */

const WINDOW_DAYS = 60;
// Spec says "cap ~500"; the demo store holds 500+ seeded orders, so leave headroom.
const ORDER_CAP = 2500;

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.5074, lng: -0.1278 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
};

type Money = { shopMoney: { amount: string } } | null;
type Page<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

type ShopNode = {
  name: string;
  currencyCode: string;
  ianaTimezone: string;
};

type CollectionNode = { id: string; title: string; handle: string };

type ProductNode = {
  id: string;
  title: string;
  handle: string;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  status: string;
  updatedAt: string;
  collections: { nodes: { id: string }[] };
};

type OrderNode = {
  id: string;
  name: string | null;
  processedAt: string;
  createdAt: string;
  currencyCode: string;
  test: boolean;
  tags: string[];
  sourceName: string | null;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  subtotalPriceSet: Money;
  totalPriceSet: Money;
  totalShippingPriceSet: Money;
  customer?: { id: string } | null;
  shippingAddress?: {
    city: string | null;
    provinceCode: string | null;
    countryCodeV2: string | null;
    zip: string | null;
  } | null;
  lineItems: {
    nodes: {
      id: string;
      sku: string | null;
      title: string;
      variantTitle: string | null;
      vendor: string | null;
      quantity: number;
      product: { id: string; productType: string | null } | null;
      variant: { id: string } | null;
      originalUnitPriceSet: Money;
    }[];
  };
};

const SHOP_QUERY = `#graphql
  query SyndicateShop { shop { name currencyCode ianaTimezone } }
`;

const COLLECTIONS_QUERY = `#graphql
  query SyndicateCollections($after: String) {
    collections(first: 100, after: $after) {
      nodes { id title handle }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

const PRODUCTS_QUERY = `#graphql
  query SyndicateProducts($after: String) {
    products(first: 100, after: $after) {
      nodes {
        id title handle productType vendor tags status updatedAt
        collections(first: 25) { nodes { id } }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

// City / province / country / postcode only. No street, name, email, or phone.
const PCD_FIELDS = `
        customer { id }
        shippingAddress { city provinceCode countryCodeV2 zip }`;

function ordersQuery(withPcd: boolean): string {
  return `#graphql
  query SyndicateOrders($after: String, $query: String!) {
    orders(first: 50, after: $after, query: $query, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id name processedAt createdAt currencyCode test tags sourceName
        displayFinancialStatus displayFulfillmentStatus
        subtotalPriceSet { shopMoney { amount } }
        totalPriceSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }${withPcd ? PCD_FIELDS : ""}
        lineItems(first: 50) {
          nodes {
            id sku title variantTitle vendor quantity
            product { id productType }
            variant { id }
            originalUnitPriceSet { shopMoney { amount } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;
}

export type IngestResult = {
  syncRunId: string;
  orders: number;
  lineItems: number;
  products: number;
  collections: number;
  geos: number;
  /** True when protected customer data was refused, so orders have no geo or customer hash. */
  pcdRedacted: boolean;
};

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function amount(money: Money): number {
  return money ? Number(money.shopMoney.amount) : 0;
}

/** UK outward code ("W2 2UH" → "W2"). Other countries keep no sector. */
function postalSector(zip: string | null | undefined, country: string): string | null {
  if (!zip || country !== "GB") return null;
  const outward = zip.trim().toUpperCase().split(/\s+/)[0];
  return outward || null;
}

async function pages<T>(
  admin: AdminGraphql,
  query: string,
  key: string,
  variables: Record<string, unknown> = {},
  cap = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  const out: T[] = [];
  let after: string | null = null;
  do {
    const data: Record<string, Page<T>> = await admin(query, { ...variables, after });
    const page: Page<T> = data[key];
    out.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after && out.length < cap);
  return out.slice(0, cap);
}

function isPcdRefusal(error: unknown): boolean {
  if (!(error instanceof AdminQueryError)) return false;
  return /protected customer data|not approved to access|access denied|ACCESS_DENIED/i.test(error.message);
}

async function fetchOrders(admin: AdminGraphql, since: Date): Promise<{ orders: OrderNode[]; pcdRedacted: boolean }> {
  const variables = { query: `processed_at:>=${since.toISOString().slice(0, 10)}` };
  try {
    return { orders: await pages<OrderNode>(admin, ordersQuery(true), "orders", variables, ORDER_CAP), pcdRedacted: false };
  } catch (error) {
    if (!isPcdRefusal(error)) throw error;
    return { orders: await pages<OrderNode>(admin, ordersQuery(false), "orders", variables, ORDER_CAP), pcdRedacted: true };
  }
}

export async function ingestLiveShop(
  prisma: PrismaClient,
  shopId: string,
  admin: AdminGraphql,
  pipelineRunId: string | null = null,
): Promise<IngestResult> {
  const sync = await prisma.syncRun.create({
    data: { shopId, kind: "full_60d", status: "running", pipelineRunId },
  });

  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const { shop } = await admin<{ shop: ShopNode }>(SHOP_QUERY);
    const collections = await pages<CollectionNode>(admin, COLLECTIONS_QUERY, "collections");
    const products = await pages<ProductNode>(admin, PRODUCTS_QUERY, "products");
    const { orders, pcdRedacted } = await fetchOrders(admin, since);

    await prisma.shop.update({
      where: { id: shopId },
      data: { name: shop.name, currencyCode: shop.currencyCode, timezone: shop.ianaTimezone },
    });

    // Replace the shop's store rows. Catalogue, personas, and runs are untouched.
    const priorProducts = await prisma.productRow.findMany({ where: { shopId }, select: { id: true } });
    if (priorProducts.length > 0) {
      await prisma.productCollection.deleteMany({
        where: { productId: { in: priorProducts.map((row) => row.id) } },
      });
    }
    await prisma.lineItemRow.deleteMany({ where: { shopId } });
    await prisma.orderRow.deleteMany({ where: { shopId } });
    await prisma.productRow.deleteMany({ where: { shopId } });
    await prisma.collectionRow.deleteMany({ where: { shopId } });
    await prisma.geo.deleteMany({ where: { shopId } });

    await prisma.collectionRow.createMany({
      data: collections.map((collection) => ({
        id: collection.id,
        shopId,
        title: collection.title,
        handle: collection.handle,
      })),
    });

    const collectionIds = new Set(collections.map((collection) => collection.id));
    const productById = new Map(products.map((product) => [product.id, product]));
    await prisma.productRow.createMany({
      data: products.map((product) => ({
        id: product.id,
        shopId,
        title: product.title,
        handle: product.handle,
        productType: product.productType || null,
        vendor: product.vendor || null,
        tags: product.tags.length > 0 ? product.tags.join(",") : null,
        status: product.status,
        updatedAt: new Date(product.updatedAt),
      })),
    });
    await prisma.productCollection.createMany({
      data: products.flatMap((product) =>
        product.collections.nodes
          .filter((collection) => collectionIds.has(collection.id))
          .map((collection) => ({ productId: product.id, collectionId: collection.id })),
      ),
    });

    const geos = new Map<string, { id: string; shopId: string; city: string | null; provinceCode: string | null; countryCode: string; postalSector: string | null; lat: number | null; lng: number | null; provenance: string }>();
    const orderRows = [];
    const lineRows = [];
    for (const order of orders) {
      let geoId: string | null = null;
      const address = order.shippingAddress;
      if (address) {
        const countryCode = address.countryCodeV2 ?? "GB";
        const city = address.city?.trim() || null;
        const sector = postalSector(address.zip, countryCode);
        geoId = sha([shopId, countryCode, city ?? "", sector ?? ""].join("|")).slice(0, 32);
        if (!geos.has(geoId)) {
          const coords = city ? CITY_COORDS[city] : undefined;
          geos.set(geoId, {
            id: geoId,
            shopId,
            city,
            provinceCode: address.provinceCode ?? null,
            countryCode,
            postalSector: sector,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            provenance: "OBSERVED",
          });
        }
      }

      orderRows.push({
        id: order.id,
        shopId,
        name: order.name,
        processedAt: new Date(order.processedAt),
        createdAt: new Date(order.createdAt),
        currencyCode: order.currencyCode,
        subtotalAmount: amount(order.subtotalPriceSet).toFixed(2),
        totalAmount: amount(order.totalPriceSet).toFixed(2),
        totalShipping: order.totalShippingPriceSet ? amount(order.totalShippingPriceSet).toFixed(2) : null,
        displayFinancialStatus: order.displayFinancialStatus,
        displayFulfillmentStatus: order.displayFulfillmentStatus,
        sourceName: order.sourceName,
        tags: order.tags.length > 0 ? order.tags.join(",") : null,
        test: order.test,
        customerHash: order.customer?.id ? sha(order.customer.id) : null,
        geoId,
      });

      for (const line of order.lineItems.nodes) {
        const product = line.product ? productById.get(line.product.id) : undefined;
        const unit = amount(line.originalUnitPriceSet);
        lineRows.push({
          id: line.id,
          orderId: order.id,
          shopId,
          productId: line.product?.id ?? null,
          variantId: line.variant?.id ?? null,
          sku: line.sku,
          title: line.title,
          variantTitle: line.variantTitle,
          vendor: line.vendor,
          quantity: line.quantity,
          unitPrice: unit.toFixed(2),
          lineTotal: (unit * line.quantity).toFixed(2),
          productType: line.product?.productType || product?.productType || null,
          tagsJson: JSON.stringify(product?.tags ?? []),
        });
      }
    }

    await prisma.geo.createMany({ data: [...geos.values()] });
    await prisma.orderRow.createMany({ data: orderRows });
    await prisma.lineItemRow.createMany({ data: lineRows });

    await prisma.syncRun.update({
      where: { id: sync.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        ordersUpserted: orderRows.length,
        productsUpserted: products.length,
        errorCode: pcdRedacted ? "pcd_redacted" : null,
      },
    });

    return {
      syncRunId: sync.id,
      orders: orderRows.length,
      lineItems: lineRows.length,
      products: products.length,
      collections: collections.length,
      geos: geos.size,
      pcdRedacted,
    };
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: sync.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorCode: "ingest_failed",
        errorMessage: error instanceof Error ? error.message.slice(0, 500) : "ingest failed",
      },
    });
    throw error;
  }
}
