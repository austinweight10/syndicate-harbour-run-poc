import prisma from "../../db.server";
import { ACTION_VERB, parseParams, type ActionParams, type ActionType } from "../actions/types";
import { provenanceKinds, type ProvenanceKind } from "../board.server";
import { parseAssets } from "../content-pack/types";
import { commercialImpact, type Commercial, type OrderLite, type Traffic } from "./metrics";

/** Rows written by scripts/impact-demo.ts carry this source and show a MOCK chip. */
export const DEMO_SOURCE = "demo_scenario";

export type ImpactTile = {
  id: string;
  kind: "insight" | "occasion";
  title: string;
  eyebrow: string;
  href: string;
  deployedAt: string;
  undone: boolean;
  demo: boolean;
  provenance: ProvenanceKind[];
  rationale: string;
  changes: { label: string; detail: string }[];
  targets: string[];
  commercial: Commercial;
};

export type ImpactBoard = {
  tiles: ImpactTile[];
  summary: {
    live: number;
    incrementalRevenue: number;
    measuredTiles: number;
    /** Mean conversion change across live tiles that have traffic, or null. */
    conversionChange: number | null;
    measuring: number;
  };
};

type ResultMeta = { insightTitle?: string; demoTraffic?: Traffic };

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Every non-test order for the shop, as the impact maths expects them. */
export async function loadShopOrders(shopId: string): Promise<OrderLite[]> {
  const [orderRows, lineRows] = await Promise.all([
    prisma.orderRow.findMany({ where: { shopId, test: false }, select: { id: true, processedAt: true } }),
    prisma.lineItemRow.findMany({
      where: { shopId },
      select: { orderId: true, productId: true, quantity: true, lineTotal: true },
    }),
  ]);
  const linesByOrder = new Map<string, OrderLite["lines"]>();
  for (const line of lineRows) {
    const bucket = linesByOrder.get(line.orderId) ?? [];
    bucket.push({ productId: line.productId, quantity: line.quantity, lineTotal: Number(line.lineTotal) });
    linesByOrder.set(line.orderId, bucket);
  }
  return orderRows.map((order) => ({ at: order.processedAt, lines: linesByOrder.get(order.id) ?? [] }));
}

/** Products a storefront action is about. */
export async function actionTargets(shopId: string, params: ActionParams): Promise<Set<string>> {
  const rows = await prisma.productRow.findMany({ where: { shopId, handle: params.productHandle }, select: { id: true } });
  return new Set(rows.map((row) => row.id));
}

/** Products an occasion's pack is about: its top SKUs plus the collection its banner links to. */
export async function packTargets(shopId: string, eventId: string, bannerCtaPath: string): Promise<Set<string>> {
  const edges = await prisma.graphEdge.findMany({
    where: { shopId, fromType: "EventCandidate", fromId: eventId, relation: "AFFINITY", toType: "SKU" },
    select: { toId: true },
  });
  const targets = new Set(edges.map((edge) => edge.toId));
  const handle = bannerCtaPath.match(/\/collections\/([^/?#]+)/)?.[1];
  if (handle) {
    const collection = await prisma.collectionRow.findFirst({ where: { shopId, handle } });
    if (collection) {
      const links = await prisma.productCollection.findMany({ where: { collectionId: collection.id } });
      for (const link of links) targets.add(link.productId);
    }
  }
  return targets;
}

export async function loadImpactBoard(shopId: string, now = new Date()): Promise<ImpactBoard> {
  const [actions, packs] = await Promise.all([
    prisma.storefrontAction.findMany({
      where: { shopId, status: { in: ["applied", "reverted"] }, appliedAt: { not: null } },
      orderBy: { appliedAt: "desc" },
    }),
    prisma.contentPack.findMany({
      where: { shopId, status: { in: ["applied", "reverted"] }, appliedAt: { not: null } },
      orderBy: { appliedAt: "desc" },
    }),
  ]);
  if (actions.length === 0 && packs.length === 0) {
    return { tiles: [], summary: { live: 0, incrementalRevenue: 0, measuredTiles: 0, conversionChange: null, measuring: 0 } };
  }

  const [orders, productRows] = await Promise.all([
    loadShopOrders(shopId),
    prisma.productRow.findMany({ where: { shopId }, select: { id: true, handle: true, title: true } }),
  ]);
  const titleById = new Map(productRows.map((product) => [product.id, product.title]));
  const titleByHandle = new Map(productRows.filter((p) => p.handle).map((product) => [product.handle as string, product.title]));
  const names = (ids: Set<string>) => [...ids].map((id) => titleById.get(id) ?? id);

  const tiles: ImpactTile[] = [];

  // --- Insights deployed to the storefront -------------------------------- //
  const recs = await prisma.recommendation.findMany({
    where: { shopId, id: { in: actions.map((action) => action.cardId) } },
  });
  const recById = new Map(recs.map((rec) => [rec.id, rec]));
  for (const action of actions) {
    const rec = recById.get(action.cardId);
    const meta = parseJson<ResultMeta>(action.resultJson, {});
    const params = parseParams(action.paramsJson);
    const demo = action.source === DEMO_SOURCE;
    const targets = await actionTargets(shopId, params);
    const product = titleByHandle.get(params.productHandle) ?? params.productHandle;
    const detail =
      params.type === "collection_add_product" || params.type === "collection_feature_product"
        ? `${product} → ${params.collectionHandle}`
        : params.type === "product_add_tags"
          ? `${product}: ${params.tags.join(", ")}`
          : product;
    tiles.push({
      id: `insight:${action.cardId}`,
      kind: "insight",
      title: rec?.title ?? meta.insightTitle ?? action.headline,
      eyebrow: rec?.priority ? `Insight · ${rec.priority}` : "Insight",
      href: "/app/artifacts",
      deployedAt: action.appliedAt!.toISOString(),
      undone: action.status === "reverted",
      demo,
      provenance: withMock(["OBSERVED", ...provenanceKinds(parseJson<string[]>(rec?.provenanceLabelsJson, []))], demo),
      rationale: action.rationale,
      changes: [{ label: ACTION_VERB[params.type as ActionType] ?? "Change", detail: `${action.headline} (${detail})` }],
      targets: names(targets),
      commercial: commercialImpact(orders, targets, action.appliedAt!, now, meta.demoTraffic ?? null),
    });
  }

  // --- Occasions with a marketing pack deployed --------------------------- //
  const events = await prisma.eventCandidate.findMany({
    where: { shopId, id: { in: packs.map((pack) => pack.eventId) } },
  });
  const eventById = new Map(events.map((event) => [event.id, event]));
  for (const pack of packs) {
    const event = eventById.get(pack.eventId);
    const assets = parseAssets(pack.assetsJson);
    const meta = parseJson<ResultMeta>(pack.resultJson, {});
    const demo = pack.source === DEMO_SOURCE;
    const targets = await packTargets(shopId, pack.eventId, assets.banner.ctaPath);
    tiles.push({
      id: `occasion:${pack.eventId}`,
      kind: "occasion",
      title: event?.name ?? pack.headline,
      eyebrow: event ? `Occasion · ${event.archetype.replaceAll("_", " ")}` : "Occasion",
      href: `/app/events/${pack.eventId}`,
      deployedAt: pack.appliedAt!.toISOString(),
      undone: pack.status === "reverted",
      demo,
      provenance: withMock(["OBSERVED"], demo),
      rationale: pack.rationale,
      changes: [
        { label: "Blog post", detail: assets.blog.title },
        { label: "Landing page", detail: assets.page.title },
        { label: "Homepage banner", detail: assets.banner.headline },
        { label: "Email draft", detail: assets.email.subject },
        { label: "Customer segments", detail: assets.segments.map((segment) => segment.name).join(", ") || "None" },
      ],
      targets: names(targets),
      commercial: commercialImpact(orders, targets, pack.appliedAt!, now, meta.demoTraffic ?? null),
    });
  }

  tiles.sort((a, b) => Number(a.undone) - Number(b.undone) || b.deployedAt.localeCompare(a.deployedAt));
  const live = tiles.filter((tile) => !tile.undone);
  const measured = live.filter((tile) => tile.commercial.status === "ok");
  const withConversion = live.filter((tile) => tile.commercial.conversionChange !== null);
  return {
    tiles,
    summary: {
      live: live.length,
      incrementalRevenue: measured.reduce((sum, tile) => sum + (tile.commercial.incrementalRevenue ?? 0), 0),
      measuredTiles: measured.length,
      conversionChange: withConversion.length
        ? withConversion.reduce((sum, tile) => sum + (tile.commercial.conversionChange ?? 0), 0) / withConversion.length
        : null,
      measuring: live.filter((tile) => tile.commercial.status === "measuring" || tile.commercial.status === "early").length,
    },
  };
}

function withMock(kinds: ProvenanceKind[], demo: boolean): ProvenanceKind[] {
  const unique = [...new Set(kinds)];
  return demo && !unique.includes("MOCK") ? [...unique, "MOCK"] : unique;
}
