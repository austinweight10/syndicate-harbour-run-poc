import prisma from "../../db.server";
import { ACTION_VERB, parseParams, type ActionType } from "../actions/types";
import { provenanceKinds, type ProvenanceKind } from "../board.server";
import { parseAssets } from "../content-pack/types";
import {
  commercialImpact,
  journeyImpact,
  type Commercial,
  type Journey,
  type OrderLite,
  type RunLite,
} from "./metrics";

/** Rows written by scripts/impact-demo.ts carry this source and show a MOCK chip. */
export const DEMO_SOURCE = "demo_scenario";

export type RunView = {
  id: string;
  mock: boolean;
  startedAt: string;
  reachedCheckout: boolean;
  stepsOk: number;
  stepsTotal: number;
  durationMs: number | null;
  frictions: string[] | null;
};

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
  commercial: Commercial & { series: { day: string; revenue: number }[] };
  journey: Omit<Journey, "before" | "after"> & { before: RunView | null; after: RunView | null; fromRun: boolean };
};

export type ImpactBoard = {
  tiles: ImpactTile[];
  summary: {
    live: number;
    incrementalRevenue: number;
    measuredTiles: number;
    journeysImproved: number;
    measuring: number;
  };
};

type ResultMeta = { insightTitle?: string; frictionTitle?: string; personaId?: string };

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type Timeline = {
  steps?: { ok?: boolean; at?: string }[];
  frictions?: { title: string }[];
  demoScenario?: boolean;
};

function toRunLite(run: {
  id: string;
  personaId: string;
  status: string;
  outcome: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  timelineJson: string | null;
}): RunLite | null {
  if (!run.startedAt) return null;
  const timeline = parseJson<Timeline>(run.timelineJson, {});
  const steps = timeline.steps ?? [];
  const stamps = steps.map((step) => (step.at ? Date.parse(step.at) : NaN)).filter((t) => !Number.isNaN(t));
  const durationMs =
    run.endedAt && run.startedAt
      ? run.endedAt.getTime() - run.startedAt.getTime()
      : stamps.length > 1
        ? Math.max(...stamps) - Math.min(...stamps)
        : null;
  return {
    id: run.id,
    personaId: run.personaId,
    startedAt: run.startedAt,
    status: run.status,
    reachedCheckout: run.outcome === "checkout_started" || run.status === "stopped_before_payment",
    stepsOk: steps.filter((step) => step.ok).length,
    stepsTotal: steps.length,
    durationMs,
    frictions: timeline.frictions ? timeline.frictions.map((friction) => friction.title) : null,
    mock: timeline.demoScenario === true,
  };
}

function toRunView(run: RunLite | null): RunView | null {
  if (!run) return null;
  return {
    id: run.id,
    mock: run.mock,
    startedAt: run.startedAt.toISOString(),
    reachedCheckout: run.reachedCheckout,
    stepsOk: run.stepsOk,
    stepsTotal: run.stepsTotal,
    durationMs: run.durationMs,
    frictions: run.frictions,
  };
}

function journeyView(journey: Journey, fromRun: boolean): ImpactTile["journey"] {
  return { ...journey, before: toRunView(journey.before), after: toRunView(journey.after), fromRun };
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
    return { tiles: [], summary: { live: 0, incrementalRevenue: 0, measuredTiles: 0, journeysImproved: 0, measuring: 0 } };
  }

  const [orderRows, lineRows, productRows, agentRuns] = await Promise.all([
    prisma.orderRow.findMany({ where: { shopId, test: false }, select: { id: true, processedAt: true } }),
    prisma.lineItemRow.findMany({
      where: { shopId },
      select: { orderId: true, productId: true, quantity: true, lineTotal: true },
    }),
    prisma.productRow.findMany({ where: { shopId }, select: { id: true, handle: true, title: true } }),
    prisma.agentRun.findMany({
      where: { shopId },
      select: { id: true, personaId: true, status: true, outcome: true, startedAt: true, endedAt: true, timelineJson: true },
    }),
  ]);

  const linesByOrder = new Map<string, OrderLite["lines"]>();
  for (const line of lineRows) {
    const bucket = linesByOrder.get(line.orderId) ?? [];
    bucket.push({ productId: line.productId, quantity: line.quantity, lineTotal: Number(line.lineTotal) });
    linesByOrder.set(line.orderId, bucket);
  }
  const orders: OrderLite[] = orderRows.map((order) => ({ at: order.processedAt, lines: linesByOrder.get(order.id) ?? [] }));
  const productsByHandle = new Map<string, { id: string; title: string }[]>();
  const titleById = new Map<string, string>();
  for (const product of productRows) {
    titleById.set(product.id, product.title);
    if (!product.handle) continue;
    const bucket = productsByHandle.get(product.handle) ?? [];
    bucket.push({ id: product.id, title: product.title });
    productsByHandle.set(product.handle, bucket);
  }
  const runs = agentRuns.map(toRunLite).filter((run): run is RunLite => run !== null);
  // Demo-scenario tiles compare only demo runs; real tiles only real runs.
  const runsFor = (personaIds: string[], demo: boolean) => {
    const pool = runs.filter((run) => run.mock === demo);
    const scoped = pool.filter((run) => personaIds.includes(run.personaId));
    return scoped.length > 0 ? scoped : pool;
  };

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
    const deployedAt = action.appliedAt!;
    const targetIds = new Set((productsByHandle.get(params.productHandle) ?? []).map((product) => product.id));
    const frictionTitle = rec && rec.kind === "insight" && rec.runId ? rec.title : meta.frictionTitle ?? null;
    const personaIds = [rec?.personaId ?? meta.personaId].filter((id): id is string => Boolean(id));
    const labels = parseJson<string[]>(rec?.provenanceLabelsJson, []);
    const detail =
      params.type === "collection_add_product" || params.type === "collection_feature_product"
        ? `${titleFor(productsByHandle, params.productHandle)} → ${params.collectionHandle}`
        : params.type === "product_add_tags"
          ? `${titleFor(productsByHandle, params.productHandle)}: ${params.tags.join(", ")}`
          : titleFor(productsByHandle, params.productHandle);
    tiles.push({
      id: `insight:${action.cardId}`,
      kind: "insight",
      title: rec?.title ?? meta.insightTitle ?? action.headline,
      eyebrow: rec?.priority ? `Insight · ${rec.priority}` : "Insight",
      href: "/app/artifacts",
      deployedAt: deployedAt.toISOString(),
      undone: action.status === "reverted",
      demo,
      provenance: withMock(["OBSERVED", ...provenanceKinds(labels)], demo),
      rationale: action.rationale,
      changes: [{ label: ACTION_VERB[params.type as ActionType] ?? "Change", detail: `${action.headline} (${detail})` }],
      targets: [...targetIds].map((id) => titleById.get(id) ?? id),
      commercial: commercialImpact(orders, targetIds, deployedAt, now),
      journey: journeyView(journeyImpact(runsFor(personaIds, demo), deployedAt, frictionTitle), Boolean(frictionTitle)),
    });
  }

  // --- Occasions with a marketing pack deployed --------------------------- //
  const events = await prisma.eventCandidate.findMany({
    where: { shopId, id: { in: packs.map((pack) => pack.eventId) } },
  });
  const eventById = new Map(events.map((event) => [event.id, event]));
  const skuEdges = await prisma.graphEdge.findMany({
    where: { shopId, fromType: "EventCandidate", relation: "AFFINITY", toType: "SKU", fromId: { in: packs.map((pack) => pack.eventId) } },
    select: { fromId: true, toId: true },
  });
  for (const pack of packs) {
    const event = eventById.get(pack.eventId);
    const assets = parseAssets(pack.assetsJson);
    const demo = pack.source === DEMO_SOURCE;
    const deployedAt = pack.appliedAt!;
    const targetIds = new Set(skuEdges.filter((edge) => edge.fromId === pack.eventId).map((edge) => edge.toId));
    const collectionHandle = assets.banner.ctaPath.match(/\/collections\/([^/?#]+)/)?.[1];
    if (collectionHandle) {
      const collection = await prisma.collectionRow.findFirst({ where: { shopId, handle: collectionHandle } });
      if (collection) {
        const links = await prisma.productCollection.findMany({ where: { collectionId: collection.id } });
        for (const link of links) targetIds.add(link.productId);
      }
    }
    let personaIds = parseJson<string[]>(pack.personaIdsJson, []);
    if (personaIds.length === 0 && event) {
      personaIds = (await prisma.persona.findMany({ where: { shopId, primaryEventId: event.id }, select: { id: true } })).map(
        (persona) => persona.id,
      );
    }
    tiles.push({
      id: `occasion:${pack.eventId}`,
      kind: "occasion",
      title: event?.name ?? pack.headline,
      eyebrow: event ? `Occasion · ${event.archetype.replaceAll("_", " ")}` : "Occasion",
      href: `/app/events/${pack.eventId}`,
      deployedAt: deployedAt.toISOString(),
      undone: pack.status === "reverted",
      demo,
      provenance: withMock(["OBSERVED"], demo),
      rationale: pack.rationale,
      changes: [
        { label: "Blog post", detail: assets.blog.title },
        { label: "Landing page", detail: assets.page.title },
        { label: "Homepage banner", detail: assets.banner.headline },
        { label: "Email draft", detail: assets.email.subject },
        {
          label: "Customer segments",
          detail: assets.segments.map((segment) => segment.name).join(", ") || "None",
        },
      ],
      targets: [...targetIds].map((id) => titleById.get(id) ?? id),
      commercial: commercialImpact(orders, targetIds, deployedAt, now),
      journey: journeyView(journeyImpact(runsFor(personaIds, demo), deployedAt, null), false),
    });
  }

  tiles.sort((a, b) => Number(a.undone) - Number(b.undone) || b.deployedAt.localeCompare(a.deployedAt));
  const live = tiles.filter((tile) => !tile.undone);
  const measured = live.filter((tile) => tile.commercial.status === "ok");
  return {
    tiles,
    summary: {
      live: live.length,
      incrementalRevenue: measured.reduce((sum, tile) => sum + (tile.commercial.incrementalRevenue ?? 0), 0),
      measuredTiles: measured.length,
      journeysImproved: live.filter((tile) => tile.journey.status === "improved").length,
      measuring: live.filter((tile) => tile.commercial.status === "measuring" || tile.commercial.status === "early").length,
    },
  };
}

function titleFor(byHandle: Map<string, { id: string; title: string }[]>, handle: string): string {
  return byHandle.get(handle)?.[0]?.title ?? handle;
}

function withMock(kinds: ProvenanceKind[], demo: boolean): ProvenanceKind[] {
  const unique = [...new Set(kinds)];
  return demo && !unique.includes("MOCK") ? [...unique, "MOCK"] : unique;
}
