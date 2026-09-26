import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import { FIXTURE_ACCESS_TOKEN } from "../fixture-token";
import { assertExactScopes } from "../scopes";
import { FIXTURE_FILES, fixturePath } from "./paths";
import { validateFixtures } from "./validate";

type Json = Record<string, unknown>;

function readJson(rel: string): Json {
  return JSON.parse(readFileSync(fixturePath(rel), "utf8")) as Json;
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return fallback;
}

function money(value: unknown): string {
  return asNumber(value, 0).toFixed(2);
}

function dateOr(value: unknown, fallback: Date): Date {
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.5074, lng: -0.1278 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
};

function inferVenue(event: Json): { city: string | null; lat: number | null; lng: number | null } {
  const named = asString(event.venueCity);
  if (named && CITY_COORDS[named]) return { city: named, ...CITY_COORDS[named] };
  if (named) return { city: named, lat: null, lng: null };
  const blob = `${asString(event.venue)} ${asString(event.title)}`.toLowerCase();
  if (
    /hyde|battersea|clapham|hackney|victoria park|kingston|royal parks|kensington|london|\bw2\b|\bsw11\b|\bsw4\b|\be9\b/.test(
      blob,
    )
  ) {
    return { city: "London", ...CITY_COORDS.London };
  }
  return { city: null, lat: null, lng: null };
}

export const DEMO_SHOP_DOMAIN = "harbour-run-demo.myshopify.com";

export type SeedCounts = {
  orders: number;
  lineItems: number;
  products: number;
  collections: number;
  geos: number;
  catalogueEvents: number;
  hashtags: number;
  socialTrends: number;
  virtualEvents: number;
  challenges: number;
  personas: number;
  recommendations: number;
};

export async function seedFixtures(prisma: PrismaClient): Promise<SeedCounts> {
  const issues = validateFixtures();
  if (issues.length > 0) {
    const detail = issues.map((issue) => `${issue.file}: ${issue.message}`).join("\n");
    throw new Error(`Fixture validation failed\n${detail}`);
  }

  const sessionDoc = readJson(FIXTURE_FILES.session);
  const shopDoc = sessionDoc.shop as Json;
  const connection = sessionDoc.connection as Json;
  const flags = sessionDoc.flags as Json;
  const scopes = (connection.scopes as string[]).join(",");
  assertExactScopes(scopes);

  const shopId = DEMO_SHOP_DOMAIN;
  const now = new Date();

  await prisma.shop.upsert({
    where: { myshopifyDomain: shopId },
    create: {
      id: shopId,
      myshopifyDomain: shopId,
      name: asString(shopDoc.name, "Harbour Run"),
      accessToken: FIXTURE_ACCESS_TOKEN,
      scopes,
      primaryLocale: "en-GB",
      currencyCode: asString(shopDoc.currencyCode, "GBP"),
      timezone: asString(shopDoc.ianaTimezone, "Europe/London"),
      storefrontUrl: process.env.SHOP_STOREFRONT_URL?.trim() || null,
    },
    update: {
      name: asString(shopDoc.name, "Harbour Run"),
      accessToken: FIXTURE_ACCESS_TOKEN,
      scopes,
      currencyCode: asString(shopDoc.currencyCode, "GBP"),
      timezone: asString(shopDoc.ianaTimezone, "Europe/London"),
      ...(process.env.SHOP_STOREFRONT_URL?.trim()
        ? { storefrontUrl: process.env.SHOP_STOREFRONT_URL.trim() }
        : {}),
      uninstalledAt: null,
    },
  });

  await prisma.shopSettings.upsert({
    where: { shopId },
    create: {
      shopId,
      agentsAutoRun: flags.agentsAutoRun === true,
      modeOverride: "demo",
    },
    update: {
      agentsAutoRun: flags.agentsAutoRun === true,
      modeOverride: "demo",
    },
  });

  await prisma.session.upsert({
    where: { id: `offline_${shopId}` },
    create: {
      id: `offline_${shopId}`,
      shop: shopId,
      state: "fixture",
      isOnline: false,
      scope: scopes,
      accessToken: FIXTURE_ACCESS_TOKEN,
      accountOwner: false,
      locale: "en-GB",
    },
    update: {
      scope: scopes,
      accessToken: FIXTURE_ACCESS_TOKEN,
      state: "fixture",
    },
  });

  await prisma.affordanceScore.deleteMany({ where: { shopId } });
  await prisma.insightScore.deleteMany({ where: { shopId } });
  await prisma.recommendation.deleteMany({ where: { shopId } });
  await prisma.agentRun.deleteMany({ where: { shopId } });
  await prisma.graphEdge.deleteMany({ where: { shopId } });
  const priorEvents = await prisma.eventCandidate.findMany({
    where: { shopId },
    select: { id: true },
  });
  if (priorEvents.length > 0) {
    await prisma.confidenceScore.deleteMany({
      where: { eventCandidateId: { in: priorEvents.map((row) => row.id) } },
    });
  }
  await prisma.eventCandidate.deleteMany({ where: { shopId } });
  await prisma.storeMakeupSnapshot.deleteMany({ where: { shopId } });
  await prisma.pipelineRun.deleteMany({ where: { shopId } });
  await prisma.persona.deleteMany({ where: { shopId } });
  await prisma.lineItemRow.deleteMany({ where: { shopId } });
  await prisma.orderRow.deleteMany({ where: { shopId } });
  await prisma.productRow.deleteMany({ where: { shopId } });
  await prisma.collectionRow.deleteMany({ where: { shopId } });
  await prisma.geo.deleteMany({ where: { shopId } });

  const productsDoc = readJson(FIXTURE_FILES.products);
  const products = productsDoc.products as Json[];
  const collections = productsDoc.collections as Json[];
  const productByHandle = new Map<string, Json>();

  for (const collection of collections) {
    await prisma.collectionRow.create({
      data: {
        id: asString(collection.id),
        shopId,
        title: asString(collection.title),
        handle: asString(collection.handle),
      },
    });
  }

  for (const product of products) {
    const handle = asString(product.handle);
    productByHandle.set(handle, product);
    const tags = Array.isArray(product.tags) ? (product.tags as string[]).join(",") : null;
    await prisma.productRow.create({
      data: {
        id: asString(product.id),
        shopId,
        title: asString(product.title),
        handle,
        productType: asString(product.productType) || null,
        vendor: asString(product.vendor, "Harbour Run"),
        tags,
        status: "ACTIVE",
        updatedAt: now,
      },
    });
  }

  const ordersDoc = readJson(FIXTURE_FILES.orders);
  const orders = ordersDoc.orders as Json[];
  const geoIds = new Set<string>();
  let lineItems = 0;

  for (const order of orders) {
    const shipping = (order.shipping ?? {}) as Json;
    const geo = (order.geo ?? {}) as Json;
    const city = asString(shipping.city) || null;
    const countryCode = asString(shipping.country_code, "GB");
    const postalSector = asString(shipping.postal_sector) || null;
    const province = asString(shipping.province) || null;
    const geoKey = [shopId, countryCode, city ?? "", postalSector ?? ""].join("|");
    const geoId = sha(geoKey).slice(0, 32);
    if (!geoIds.has(geoId)) {
      geoIds.add(geoId);
      await prisma.geo.create({
        data: {
          id: geoId,
          shopId,
          city,
          provinceCode: province,
          countryCode,
          postalSector,
          lat: typeof geo.lat === "number" ? geo.lat : null,
          lng: typeof geo.lng === "number" ? geo.lng : null,
          provenance: "MOCK",
        },
      });
    }

    const email = asString(order.customer_email);
    const createdAt = dateOr(order.created_at, now);
    const subtotal = money(order.subtotal);
    const tags = Array.isArray(order.tags) ? (order.tags as string[]).join(",") : null;

    await prisma.orderRow.create({
      data: {
        id: asString(order.id),
        shopId,
        name: asString(order.name) || null,
        processedAt: createdAt,
        createdAt,
        currencyCode: asString(order.currency, "GBP"),
        subtotalAmount: subtotal,
        totalAmount: subtotal,
        totalShipping: null,
        displayFinancialStatus: asString(order.financial_status) || null,
        displayFulfillmentStatus: asString(order.fulfillment_status) || null,
        sourceName: asString(order.source_name) || null,
        tags,
        test: false,
        customerHash: email ? sha(email) : null,
        geoId,
      },
    });

    const lines = (order.line_items as Json[]) ?? [];
    for (const [index, line] of lines.entries()) {
      const handle = asString(line.handle);
      const product = productByHandle.get(handle);
      const quantity = asNumber(line.quantity, 1);
      const unit = asNumber(line.price, 0);
      const productTags = product && Array.isArray(product.tags) ? product.tags : [];
      await prisma.lineItemRow.create({
        data: {
          id: `${asString(order.id)}:${asString(line.sku)}:${index}`,
          orderId: asString(order.id),
          shopId,
          productId: product ? asString(product.id) : null,
          variantId: null,
          sku: asString(line.sku),
          title: asString(line.title),
          variantTitle: asString(line.variantTitle) || null,
          vendor: product ? asString(product.vendor, "Harbour Run") : "Harbour Run",
          quantity,
          unitPrice: unit.toFixed(2),
          lineTotal: (unit * quantity).toFixed(2),
          productType: product ? asString(product.productType) || null : null,
          tagsJson: JSON.stringify(productTags),
        },
      });
      lineItems += 1;
    }
  }

  const sports = readJson(FIXTURE_FILES.sports);
  let catalogueEvents = 0;
  for (const event of sports.events as Json[]) {
    const naturalKey = asString(event.naturalKey) || asString(event.id);
    const startAt = dateOr(event.startAt ?? event.startsAt, now);
    const endAt = dateOr(event.endAt, new Date(startAt.getTime() + 4 * 60 * 60 * 1000));
    const mode = asString(event.mode, "physical");
    const category =
      asString(event.category) ||
      (event.sport === "running" ? "race_running" : "race_running");
    const audience = event.affinityTags ?? event.audienceTags ?? [];
    const venueName = asString(event.venue) || asString(event.venueCity) || null;
    const venue = inferVenue(event);
    await prisma.catalogueEvent.upsert({
      where: { naturalKey },
      create: {
        naturalKey,
        title: asString(event.title),
        category,
        mode,
        audienceJson: JSON.stringify(audience),
        city: venue.city,
        region: venue.city === "London" ? "Greater London" : null,
        countryCode: "GB",
        lat: venue.lat,
        lng: venue.lng,
        venueName,
        virtualFlag: mode !== "physical",
        startAt,
        endAt,
        recurrence: asString(event.recurring).includes("weekly") ? "weekly" : "none",
        sourceUrl: asString(event.sourceUrl) || null,
        sourceType: asString(event.sourceType, "curated_json"),
        sourceExternalId: asString(event.id) || null,
        lastCrawledAt: now,
        freshnessConfidence: 1,
        provenance: asString(event.provenance, "MOCK"),
        stale: false,
        rawPayloadHash: sha(JSON.stringify(event)).slice(0, 32),
      },
      update: {
        title: asString(event.title),
        category,
        mode,
        audienceJson: JSON.stringify(audience),
        city: venue.city,
        region: venue.city === "London" ? "Greater London" : null,
        countryCode: "GB",
        lat: venue.lat,
        lng: venue.lng,
        venueName,
        virtualFlag: mode !== "physical",
        startAt,
        endAt,
        provenance: asString(event.provenance, "MOCK"),
        lastCrawledAt: now,
      },
    });
    catalogueEvents += 1;
  }

  const hashtags = readJson(FIXTURE_FILES.hashtags);
  const hashtagIds = new Map<string, string>();
  let hashtagCount = 0;
  for (const row of hashtags.watchlist as Json[]) {
    const tag = asString(row.tag);
    const naturalKey = tag.toLowerCase();
    const saved = await prisma.hashtagWatch.upsert({
      where: { naturalKey },
      create: {
        tag,
        naturalKey,
        geoHint: asString(row.geoHint) || null,
        catalogueAffinityJson: JSON.stringify(row.affinity ?? []),
        sourceType: "curated_json",
        enabled: true,
        provenance: "CURATED",
        updatedAt: now,
      },
      update: {
        tag,
        geoHint: asString(row.geoHint) || null,
        catalogueAffinityJson: JSON.stringify(row.affinity ?? []),
        updatedAt: now,
      },
    });
    hashtagIds.set(tag.toLowerCase(), saved.id);
    hashtagCount += 1;
  }

  const trends = readJson(FIXTURE_FILES.socialTrends);
  let socialTrends = 0;
  for (const trend of trends.trends as Json[]) {
    if (trend.provenance === "OBSERVED") {
      throw new Error("Refusing to seed OBSERVED social demand");
    }
    const tag = asString(trend.tag);
    const start = dateOr(trend.timeBucket, now);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const geoHint = asString(trend.geoHint) || null;
    const naturalKey = sha([tag, start.toISOString(), geoHint ?? ""].join("|")).slice(0, 32);
    await prisma.socialTrend.upsert({
      where: { naturalKey },
      create: {
        naturalKey,
        hashtagWatchId: hashtagIds.get(tag.toLowerCase()) ?? null,
        tag,
        timeBucketStart: start,
        timeBucketEnd: end,
        score: asNumber(trend.score),
        volumeProxy: typeof trend.volumeProxy === "number" ? trend.volumeProxy : null,
        geoHint,
        sourceType: "mock_json",
        provenance: asString(trend.provenance, "MOCK"),
        lastCrawledAt: now,
        stale: false,
        payloadJson: JSON.stringify({ affinity: trend.affinity ?? [] }),
      },
      update: {
        score: asNumber(trend.score),
        provenance: asString(trend.provenance, "MOCK"),
        lastCrawledAt: now,
      },
    });
    socialTrends += 1;
  }

  const virtuals = readJson(FIXTURE_FILES.virtualEvents);
  let virtualEvents = 0;
  for (const row of virtuals.events as Json[]) {
    const window = (row.window ?? {}) as Json;
    const startAt = dateOr(
      typeof window.start === "string" ? `${window.start}T00:00:00+01:00` : window.start,
      now,
    );
    const endAt = dateOr(
      typeof window.end === "string" ? `${window.end}T23:59:59+01:00` : window.end,
      startAt,
    );
    const naturalKey = asString(row.naturalKey);
    await prisma.virtualEvent.upsert({
      where: { naturalKey },
      create: {
        naturalKey,
        title: asString(row.title),
        category: asString(row.category, "virtual_challenge"),
        mode: asString(row.mode, "virtual"),
        audienceJson: JSON.stringify(row.affinity ?? []),
        globalVirtual: true,
        streamOrAppHint: asString(row.streamOrAppHint) || null,
        startAt,
        endAt,
        sourceType: "mock_json",
        provenance: asString(row.provenance, "MOCK"),
        lastCrawledAt: now,
        stale: false,
      },
      update: {
        title: asString(row.title),
        mode: asString(row.mode, "virtual"),
        provenance: asString(row.provenance, "MOCK"),
        lastCrawledAt: now,
      },
    });
    virtualEvents += 1;
  }

  const challengesDoc = readJson(FIXTURE_FILES.activity);
  let challenges = 0;
  for (const row of challengesDoc.challenges as Json[]) {
    const window = (row.window ?? {}) as Json;
    const naturalKey = asString(row.naturalKey);
    await prisma.activityChallenge.upsert({
      where: { naturalKey },
      create: {
        naturalKey,
        title: asString(row.title),
        platform: asString(row.platform, "mock"),
        mode: asString(row.mode, "virtual"),
        windowStart: dateOr(
          typeof window.start === "string" ? `${window.start}T00:00:00+01:00` : null,
          now,
        ),
        windowEnd: dateOr(
          typeof window.end === "string" ? `${window.end}T23:59:59+01:00` : null,
          now,
        ),
        catalogueAffinityJson: JSON.stringify(row.affinity ?? []),
        volumeProxy: typeof row.volumeProxy === "number" ? row.volumeProxy : null,
        sourceType: "mock_json",
        provenance: asString(row.provenance, "MOCK"),
        lastCrawledAt: now,
        stale: false,
      },
      update: {
        title: asString(row.title),
        provenance: asString(row.provenance, "MOCK"),
        lastCrawledAt: now,
      },
    });
    challenges += 1;
  }

  const personasDoc = readJson(FIXTURE_FILES.personas);
  let personas = 0;
  for (const row of personasDoc.personas as Json[]) {
    await prisma.persona.create({
      data: {
        id: asString(row.id),
        shopId,
        name: asString(row.name),
        status: asString(row.status, "draft"),
        vertical: asString(row.vertical, "running"),
        goalsJson: JSON.stringify(row.goals ?? []),
        budgetMin: money(row.budgetMin),
        budgetMax: money(row.budgetMax),
        currencyCode: asString(row.currencyCode, "GBP"),
        constraintsJson: JSON.stringify(row.constraints ?? {}),
        behaviouralJson: JSON.stringify(row.behavioural ?? {}),
        locationProxy: asString(row.locationProxy) || null,
        mockFlagsJson: JSON.stringify(row.mockFlags ?? []),
        successCriteriaJson: JSON.stringify(row.successCriteria ?? {}),
        avatarInitials: asString(row.avatarInitials) || null,
      },
    });
    personas += 1;
  }

  await prisma.catalogueJobRun.create({
    data: {
      job: "fixture.seed",
      status: "success",
      finishedAt: new Date(),
      upserted: catalogueEvents + hashtagCount + socialTrends + virtualEvents + challenges,
    },
  });

  return {
    orders: orders.length,
    lineItems,
    products: products.length,
    collections: collections.length,
    geos: geoIds.size,
    catalogueEvents,
    hashtags: hashtagCount,
    socialTrends,
    virtualEvents,
    challenges,
    personas,
    recommendations: 0,
  };
}
