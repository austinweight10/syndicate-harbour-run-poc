/**
 * ingest.shopifyFull — Admin GraphQL → SQLite (orders ≤60d, products, collections, geo L2).
 * Never stores street address, email, phone, or customer display name.
 */
import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { adminGraphql, ShopifyGraphqlError } from "./admin-graphql";

const MAX_ORDERS = 500;
const WINDOW_DAYS = 60;
const PAGE = 50;

type MoneySet = { shopMoney?: { amount?: string; currencyCode?: string } | null } | null;

type SelectedOption = { name: string; value: string };

type GqlOrder = {
  id: string;
  name: string | null;
  processedAt: string | null;
  createdAt: string;
  currencyCode: string;
  subtotalPriceSet: MoneySet;
  totalPriceSet: MoneySet;
  totalShippingPriceSet: MoneySet;
  totalDiscountsSet: MoneySet;
  displayFinancialStatus: string | null;
  displayFulfillmentStatus: string | null;
  sourceName: string | null;
  tags: string[];
  test: boolean;
  customer: { id: string } | null;
  shippingLine: { title: string | null } | null;
  shippingAddress: {
    city: string | null;
    provinceCode: string | null;
    countryCodeV2: string | null;
    zip: string | null;
    latitude: number | null;
    longitude: number | null;
  } | null;
  lineItems: {
    edges: {
      node: {
        id: string;
        sku: string | null;
        title: string;
        variantTitle: string | null;
        vendor: string | null;
        quantity: number;
        originalUnitPriceSet: MoneySet;
        discountedTotalSet: MoneySet;
        product: { id: string; productType: string | null; tags: string[] } | null;
        variant: {
          id: string;
          compareAtPrice: string | null;
          selectedOptions: SelectedOption[];
        } | null;
      };
    }[];
  };
};

type GqlProduct = {
  id: string;
  title: string;
  handle: string | null;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  status: string | null;
  updatedAt: string;
  options: { name: string; values: string[] }[];
  collections: {
    edges: { node: { id: string; title: string; handle: string | null } }[];
  };
  variants: {
    edges: {
      node: {
        id: string;
        compareAtPrice: string | null;
        selectedOptions: SelectedOption[];
      };
    }[];
  };
  metafields: {
    edges: { node: { namespace: string; key: string; value: string; type: string } }[];
  };
};

const ORDERS_QUERY = `#graphql
  query OrdersWindow($q: String!, $cursor: String) {
    orders(first: ${PAGE}, after: $cursor, query: $q, sortKey: CREATED_AT, reverse: true) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          name
          processedAt
          createdAt
          currencyCode
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalPriceSet { shopMoney { amount currencyCode } }
          totalShippingPriceSet { shopMoney { amount currencyCode } }
          totalDiscountsSet { shopMoney { amount currencyCode } }
          displayFinancialStatus
          displayFulfillmentStatus
          sourceName
          tags
          test
          customer { id }
          shippingLine { title }
          shippingAddress {
            city
            provinceCode
            countryCodeV2
            zip
            latitude
            longitude
          }
          lineItems(first: 50) {
            edges {
              node {
                id
                sku
                title
                variantTitle
                vendor
                quantity
                originalUnitPriceSet { shopMoney { amount currencyCode } }
                discountedTotalSet { shopMoney { amount currencyCode } }
                product { id productType tags }
                variant {
                  id
                  compareAtPrice
                  selectedOptions { name value }
                }
              }
            }
          }
        }
      }
    }
  }
`;

const PRODUCTS_QUERY = `#graphql
  query ProductsPage($cursor: String) {
    products(first: ${PAGE}, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          handle
          productType
          vendor
          tags
          status
          updatedAt
          options { name values }
          collections(first: 10) {
            edges { node { id title handle } }
          }
          variants(first: 40) {
            edges {
              node {
                id
                compareAtPrice
                selectedOptions { name value }
              }
            }
          }
          metafields(first: 20) {
            edges { node { namespace key value type } }
          }
        }
      }
    }
  }
`;

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function money(set: MoneySet, fallback = "0.00"): string {
  const amount = set?.shopMoney?.amount;
  if (typeof amount === "string" && amount.length > 0) {
    const n = Number(amount);
    return Number.isFinite(n) ? n.toFixed(2) : fallback;
  }
  return fallback;
}

/** UK outward code / postal sector — never store the full postcode. */
export function postalSectorFromZip(zip: string | null | undefined): string | null {
  if (!zip) return null;
  const trimmed = zip.trim().toUpperCase();
  if (!trimmed) return null;
  const spaced = trimmed.split(/\s+/)[0];
  if (spaced && spaced.length >= 2 && spaced.length <= 4) return spaced;
  const match = trimmed.match(/^([A-Z]{1,2}\d[A-Z\d]?)/);
  return match?.[1] ?? spaced?.slice(0, 4) ?? null;
}

function sinceQuery(): string {
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return `created_at:>=${since.toISOString().slice(0, 10)}`;
}

export type IngestResult = {
  syncRunId: string;
  ordersUpserted: number;
  productsUpserted: number;
  collectionsUpserted: number;
  emptyOrders: boolean;
  errorCode?: string;
  errorMessage?: string;
};

export async function ingestShopifyFull(
  prisma: PrismaClient,
  shopId: string,
  opts: { maxOrders?: number; pipelineRunId?: string } = {},
): Promise<IngestResult> {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop?.accessToken) {
    throw new Error(`Shop ${shopId} has no access token — reconnect OAuth first.`);
  }

  const maxOrders = opts.maxOrders ?? MAX_ORDERS;
  const sync = await prisma.syncRun.create({
    data: {
      shopId,
      kind: "orders_products",
      status: "running",
      pipelineRunId: opts.pipelineRunId ?? null,
    },
  });

  let ordersUpserted = 0;
  let productsUpserted = 0;
  let collectionsUpserted = 0;

  try {
    const collectionIds = new Set<string>();

    // Products + collections first so line items can link.
    type ProductsPage = {
      products: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: { node: GqlProduct }[];
      };
    };
    let productCursor: string | null = null;
    do {
      const productPage: ProductsPage = await adminGraphql<ProductsPage>(
        shop.myshopifyDomain,
        shop.accessToken,
        PRODUCTS_QUERY,
        { cursor: productCursor },
      );

      for (const { node: product } of productPage.products.edges) {
        const tags = Array.isArray(product.tags) ? product.tags.join(",") : null;
        const optionsJson = JSON.stringify(product.options ?? []);
        const metafieldsJson = JSON.stringify(
          (product.metafields?.edges ?? []).map(({ node }) => ({
            namespace: node.namespace,
            key: node.key,
            value: node.value,
            type: node.type,
          })),
        );
        const compareAts = (product.variants?.edges ?? [])
          .map(({ node }) => node.compareAtPrice)
          .filter((value): value is string => Boolean(value))
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value));
        const compareAtPrice =
          compareAts.length > 0 ? Math.min(...compareAts).toFixed(2) : null;

        await prisma.productRow.upsert({
          where: { id: product.id },
          create: {
            id: product.id,
            shopId,
            title: product.title,
            handle: product.handle,
            productType: product.productType || null,
            vendor: product.vendor || null,
            tags,
            status: product.status,
            optionsJson,
            compareAtPrice,
            metafieldsJson,
            updatedAt: new Date(product.updatedAt),
          },
          update: {
            title: product.title,
            handle: product.handle,
            productType: product.productType || null,
            vendor: product.vendor || null,
            tags,
            status: product.status,
            optionsJson,
            compareAtPrice,
            metafieldsJson,
            updatedAt: new Date(product.updatedAt),
          },
        });
        productsUpserted += 1;

        for (const { node: collection } of product.collections.edges) {
          if (!collectionIds.has(collection.id)) {
            collectionIds.add(collection.id);
            await prisma.collectionRow.upsert({
              where: { id: collection.id },
              create: {
                id: collection.id,
                shopId,
                title: collection.title,
                handle: collection.handle,
              },
              update: {
                title: collection.title,
                handle: collection.handle,
              },
            });
            collectionsUpserted += 1;
          }
          await prisma.productCollection.upsert({
            where: {
              productId_collectionId: {
                productId: product.id,
                collectionId: collection.id,
              },
            },
            create: { productId: product.id, collectionId: collection.id },
            update: {},
          });
        }
      }

      productCursor = productPage.products.pageInfo.hasNextPage
        ? productPage.products.pageInfo.endCursor
        : null;
    } while (productCursor);

    // Orders ≤60d, cap maxOrders.
    type OrdersPage = {
      orders: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        edges: { node: GqlOrder }[];
      };
    };
    let orderCursor: string | null = null;
    const q = sinceQuery();

    do {
      const orderPage: OrdersPage = await adminGraphql<OrdersPage>(
        shop.myshopifyDomain,
        shop.accessToken,
        ORDERS_QUERY,
        { q, cursor: orderCursor },
      );

      for (const { node: order } of orderPage.orders.edges) {
        if (ordersUpserted >= maxOrders) break;

        const ship = order.shippingAddress;
        let geoId: string | null = null;
        if (ship?.countryCodeV2 || ship?.city || ship?.zip) {
          const countryCode = ship.countryCodeV2 || "GB";
          const city = ship.city || null;
          const sector = postalSectorFromZip(ship.zip);
          const geoKey = [shopId, countryCode, city ?? "", sector ?? ""].join("|");
          geoId = sha(geoKey).slice(0, 32);
          await prisma.geo.upsert({
            where: { id: geoId },
            create: {
              id: geoId,
              shopId,
              city,
              provinceCode: ship.provinceCode || null,
              countryCode,
              postalSector: sector,
              lat: typeof ship.latitude === "number" ? ship.latitude : null,
              lng: typeof ship.longitude === "number" ? ship.longitude : null,
              provenance: "OBSERVED",
            },
            update: {
              city,
              provinceCode: ship.provinceCode || null,
              postalSector: sector,
              lat: typeof ship.latitude === "number" ? ship.latitude : null,
              lng: typeof ship.longitude === "number" ? ship.longitude : null,
              provenance: "OBSERVED",
            },
          });
        }

        const processedAt = order.processedAt
          ? new Date(order.processedAt)
          : new Date(order.createdAt);
        const createdAt = new Date(order.createdAt);
        const subtotal = money(order.subtotalPriceSet);
        const total = money(order.totalPriceSet, subtotal);
        const shipping = order.totalShippingPriceSet?.shopMoney?.amount
          ? money(order.totalShippingPriceSet)
          : null;
        const discounts = order.totalDiscountsSet?.shopMoney?.amount
          ? money(order.totalDiscountsSet)
          : null;
        const customerHash = order.customer?.id ? sha(order.customer.id) : null;
        const tags =
          Array.isArray(order.tags) && order.tags.length > 0 ? order.tags.join(",") : null;
        const shippingMethod = order.shippingLine?.title || null;

        await prisma.orderRow.upsert({
          where: { id: order.id },
          create: {
            id: order.id,
            shopId,
            name: order.name,
            processedAt,
            createdAt,
            currencyCode: order.currencyCode || "GBP",
            subtotalAmount: subtotal,
            totalAmount: total,
            totalShipping: shipping,
            totalDiscounts: discounts,
            displayFinancialStatus: order.displayFinancialStatus,
            displayFulfillmentStatus: order.displayFulfillmentStatus,
            sourceName: order.sourceName,
            shippingMethod,
            tags,
            test: order.test === true,
            customerHash,
            geoId,
          },
          update: {
            name: order.name,
            processedAt,
            createdAt,
            currencyCode: order.currencyCode || "GBP",
            subtotalAmount: subtotal,
            totalAmount: total,
            totalShipping: shipping,
            totalDiscounts: discounts,
            displayFinancialStatus: order.displayFinancialStatus,
            displayFulfillmentStatus: order.displayFulfillmentStatus,
            sourceName: order.sourceName,
            shippingMethod,
            tags,
            test: order.test === true,
            customerHash,
            geoId,
          },
        });

        await prisma.lineItemRow.deleteMany({ where: { orderId: order.id } });
        for (const { node: line } of order.lineItems.edges) {
          const qty = line.quantity || 1;
          const unit = money(line.originalUnitPriceSet);
          const lineTotal = money(line.discountedTotalSet, (Number(unit) * qty).toFixed(2));
          const productTags = line.product?.tags ?? [];
          const compareAt =
            line.variant?.compareAtPrice && Number.isFinite(Number(line.variant.compareAtPrice))
              ? Number(line.variant.compareAtPrice).toFixed(2)
              : null;
          const selectedOptionsJson = JSON.stringify(line.variant?.selectedOptions ?? []);
          await prisma.lineItemRow.create({
            data: {
              id: line.id,
              orderId: order.id,
              shopId,
              productId: line.product?.id ?? null,
              variantId: line.variant?.id ?? null,
              sku: line.sku,
              title: line.title,
              variantTitle: line.variantTitle,
              vendor: line.vendor,
              quantity: qty,
              unitPrice: unit,
              lineTotal,
              compareAtUnitPrice: compareAt,
              selectedOptionsJson,
              productType: line.product?.productType || null,
              tagsJson: JSON.stringify(productTags),
            },
          });
        }

        ordersUpserted += 1;
      }

      if (ordersUpserted >= maxOrders) break;
      orderCursor = orderPage.orders.pageInfo.hasNextPage
        ? orderPage.orders.pageInfo.endCursor
        : null;
    } while (orderCursor);

    // Drop hybrid fixture rows once we have live Shopify GIDs.
    if (ordersUpserted > 0) {
      await prisma.lineItemRow.deleteMany({
        where: { shopId, orderId: { not: { startsWith: "gid://" } } },
      });
      await prisma.orderRow.deleteMany({
        where: { shopId, id: { not: { startsWith: "gid://" } } },
      });
    }
    if (productsUpserted > 0) {
      const fixtureProducts = await prisma.productRow.findMany({
        where: { shopId, id: { not: { startsWith: "gid://" } } },
        select: { id: true },
      });
      if (fixtureProducts.length > 0) {
        const ids = fixtureProducts.map((row) => row.id);
        await prisma.productCollection.deleteMany({ where: { productId: { in: ids } } });
        await prisma.productRow.deleteMany({ where: { id: { in: ids } } });
      }
      await prisma.collectionRow.deleteMany({
        where: { shopId, id: { not: { startsWith: "gid://" } } },
      });
    }

    await prisma.syncRun.update({
      where: { id: sync.id },
      data: {
        status: "success",
        finishedAt: new Date(),
        ordersUpserted,
        productsUpserted,
        cursor: orderCursor,
      },
    });

    // Sync storefront URL from env when present.
    if (process.env.SHOP_STOREFRONT_URL?.trim()) {
      await prisma.shop.update({
        where: { id: shopId },
        data: { storefrontUrl: process.env.SHOP_STOREFRONT_URL.trim() },
      });
    }

    return {
      syncRunId: sync.id,
      ordersUpserted,
      productsUpserted,
      collectionsUpserted,
      emptyOrders: ordersUpserted === 0,
    };
  } catch (error) {
    const code =
      error instanceof ShopifyGraphqlError
        ? error.code
        : error instanceof Error
          ? "INGEST_FAILED"
          : "INGEST_FAILED";
    const message = error instanceof Error ? error.message : "ingest failed";
    await prisma.syncRun.update({
      where: { id: sync.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        ordersUpserted,
        productsUpserted,
        errorCode: code,
        errorMessage: message,
      },
    });
    throw error;
  }
}
