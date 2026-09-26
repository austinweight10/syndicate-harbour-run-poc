import type { PrismaClient } from "@prisma/client";
import { chipType, emptyGraphView, type GraphLink, type GraphNode, type GraphView } from "./graph-types";

const NODE_CAP = 150;
const EDGE_CAP = 300;

const TYPE_LABEL: Record<string, string> = {
  Order: "Order",
  SKU: "SKU",
  Geo: "Geo",
  CatalogueEvent: "Catalogue event",
  Driver: "Driver",
  Weather: "Weather",
  Social: "Social",
  EventCandidate: "Occasion",
  Persona: "Persona",
  ActivityChallenge: "Challenge",
  VirtualEvent: "Virtual event",
  Recommendation: "Insight",
};

const SCORED_STAGES = new Set(["score_link", "personas", "agents_queue"]);

const PATH_RELATIONS = new Set([
  "SHIPPED_TO",
  "VENUE_IN",
  "GEO_OVERLAP",
  "TEMPORAL_LIFT",
  "FORECAST_FOR",
  "DRIVEN_BY",
  "AFFINITY",
]);

type RawEdge = {
  id: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  relation: string;
  weight: number;
  provenance: string;
};

function key(type: string, id: string): string {
  return `${type}:${id}`;
}

export async function loadGraphView(prisma: PrismaClient, shopId: string): Promise<GraphView> {
  const raw = await prisma.graphEdge.findMany({
    where: { shopId },
    orderBy: { weight: "desc" },
  });
  if (raw.length === 0) return emptyFromPipeline(prisma, shopId);

  const candidates = await prisma.eventCandidate.findMany({ where: { shopId } });
  const scores = candidates.length
    ? await prisma.confidenceScore.findMany({
        where: { eventCandidateId: { in: candidates.map((row) => row.id) } },
      })
    : [];
  const scoreOf = new Map(scores.map((row) => [row.eventCandidateId, row.value]));
  const anchor =
    candidates.find((row) => row.name.includes("London 10K")) ??
    candidates.find((row) => row.name.startsWith("Race weekend")) ??
    [...candidates].sort((a, b) => (scoreOf.get(b.id) ?? 0) - (scoreOf.get(a.id) ?? 0))[0];
  const anchorKey = anchor ? key("EventCandidate", anchor.id) : null;
  const candidateIds = new Set(candidates.map((row) => row.id));

  const ranked = [...raw].sort((a, b) => rankEdge(b, anchor?.id, candidateIds) - rankEdge(a, anchor?.id, candidateIds));
  const kept: RawEdge[] = [];
  const nodeIds = new Set<string>();
  for (const edge of ranked) {
    const from = key(edge.fromType, edge.fromId);
    const to = key(edge.toType, edge.toId);
    const nextNodes = new Set(nodeIds);
    nextNodes.add(from);
    nextNodes.add(to);
    if (kept.length >= EDGE_CAP || nextNodes.size > NODE_CAP) continue;
    kept.push(edge);
    nodeIds.add(from);
    nodeIds.add(to);
  }

  const labels = await resolveLabels(prisma, shopId, kept);
  const edges: GraphLink[] = kept.map((edge) => {
    const from = key(edge.fromType, edge.fromId);
    const to = key(edge.toType, edge.toId);
    return {
      id: edge.id,
      from,
      to,
      fromId: from,
      toId: to,
      relation: edge.relation,
      provenance: edge.provenance,
      weight: edge.weight,
    };
  });
  const nodes: GraphNode[] = [...nodeIds].map((id) => {
    const split = id.indexOf(":");
    const stored = id.slice(0, split);
    const type = chipType(stored);
    const ref = id.slice(split + 1);
    return {
      id,
      type,
      typeLabel: TYPE_LABEL[type] ?? type,
      label: labels.get(id) ?? ref,
      ref,
      provenance: nodeProvenance(id, stored, edges),
    };
  });

  const allNodeCount = new Set(raw.flatMap((edge) => [key(edge.fromType, edge.fromId), key(edge.toType, edge.toId)])).size;
  const capped = kept.length < raw.length || nodes.length < allNodeCount;
  return {
    nodes,
    edges,
    highlightIds: raceDayPath(edges, anchorKey),
    preset: "race_day_evidence",
    capped,
    truncated: capped,
    totals: { nodes: allNodeCount, edges: raw.length },
    totalNodes: allNodeCount,
    totalEdges: raw.length,
    shownNodes: nodes.length,
    shownEdges: edges.length,
    error: null,
  };
}

async function emptyFromPipeline(prisma: PrismaClient, shopId: string): Promise<GraphView> {
  const latest = await prisma.pipelineRun.findFirst({
    where: { shopId },
    orderBy: { startedAt: "desc" },
  });
  if (!latest) return emptyGraphView({ emptyReason: "no_edges_after_pipeline" });
  if (latest.status === "failed") return emptyGraphView({ error: "score_failed" });
  const stillScoring =
    (latest.status === "pending" || latest.status === "running") &&
    !SCORED_STAGES.has(latest.lastSuccessfulStage ?? "");
  if (stillScoring) return emptyGraphView({ emptyReason: "pipeline_incomplete" });
  return emptyGraphView({ emptyReason: "no_edges_after_pipeline" });
}

function nodeProvenance(id: string, stored: string, edges: GraphLink[]): string | undefined {
  const touching = edges.filter((edge) => edge.from === id || edge.to === id);
  if (touching.length === 0) return undefined;
  const best = [...touching].sort((a, b) => b.weight - a.weight)[0];
  if (stored === "SocialTrend" && best.provenance === "OBSERVED") return "AGGREGATE_PROXY";
  return best.provenance;
}

function rankEdge(edge: RawEdge, anchorId: string | undefined, candidateIds: Set<string>): number {
  let score = edge.weight;
  if (anchorId && (edge.fromId === anchorId || edge.toId === anchorId)) score += 100;
  if (candidateIds.has(edge.fromId) || candidateIds.has(edge.toId)) score += 40;
  if (PATH_RELATIONS.has(edge.relation)) score += 25;
  if (edge.fromType === "Order" || edge.toType === "Order") score -= 15;
  return score;
}

function raceDayPath(edges: GraphLink[], anchorKey: string | null): string[] {
  if (!anchorKey) return [];
  const ids = new Set<string>([anchorKey]);
  const geos = new Set<string>();
  const skus = new Set<string>();
  for (const edge of edges) {
    if (edge.from !== anchorKey && edge.to !== anchorKey) continue;
    if (edge.relation === "GEO_OVERLAP" || edge.relation === "TEMPORAL_LIFT" || edge.relation === "DRIVEN_BY") {
      ids.add(edge.from);
      ids.add(edge.to);
      if (edge.from.startsWith("Geo:") || edge.to.startsWith("Geo:")) {
        geos.add(edge.from.startsWith("Geo:") ? edge.from : edge.to);
      }
    }
    if (edge.relation === "AFFINITY" && (edge.from.startsWith("SKU:") || edge.to.startsWith("SKU:"))) {
      skus.add(edge.from.startsWith("SKU:") ? edge.from : edge.to);
    }
  }
  for (const edge of edges) {
    const geo = geos.has(edge.from) ? edge.from : geos.has(edge.to) ? edge.to : null;
    if (!geo) continue;
    if (edge.relation === "VENUE_IN") {
      const event = edge.from.startsWith("Event:") || edge.from.startsWith("CatalogueEvent:") ? edge.from : edge.to;
      if (ids.has(event)) {
        ids.add(edge.from);
        ids.add(edge.to);
      }
    }
    if (edge.relation === "FORECAST_FOR") {
      const forecast = edge.from.startsWith("WeatherForecast:") ? edge.from : edge.to;
      if ([...ids].filter((id) => id.startsWith("WeatherForecast:")).length < 2) ids.add(forecast);
      ids.add(geo);
    }
  }
  for (const edge of edges) {
    if (edge.relation !== "DRIVEN_BY") continue;
    const candidate = edge.from.startsWith("EventCandidate:") ? edge.from : edge.to;
    const sharesGeo = edges.some(
      (other) =>
        other.relation === "GEO_OVERLAP" &&
        (other.from === candidate || other.to === candidate) &&
        (geos.has(other.from) || geos.has(other.to)),
    );
    if (sharesGeo) {
      ids.add(edge.from);
      ids.add(edge.to);
    }
  }
  const orders: string[] = [];
  for (const edge of edges) {
    if (edge.relation !== "SHIPPED_TO") continue;
    const geo = geos.has(edge.to) ? edge.to : geos.has(edge.from) ? edge.from : null;
    if (!geo) continue;
    const order = edge.from.startsWith("Order:") ? edge.from : edge.to;
    const containsSku = edges.some(
      (other) =>
        other.relation === "CONTAINS" &&
        (other.from === order || other.to === order) &&
        (skus.has(other.from) || skus.has(other.to)),
    );
    if (containsSku) orders.push(order);
  }
  for (const order of orders.slice(0, 8)) {
    ids.add(order);
    for (const edge of edges) {
      if (edge.relation === "CONTAINS" && (edge.from === order || edge.to === order)) {
        if (skus.has(edge.from) || skus.has(edge.to)) {
          ids.add(edge.from);
          ids.add(edge.to);
        }
      }
    }
  }
  return [...ids];
}

async function resolveLabels(prisma: PrismaClient, shopId: string, edges: RawEdge[]): Promise<Map<string, string>> {
  const ids = (type: string) =>
    [...new Set(edges.flatMap((edge) => {
      const found: string[] = [];
      if (edge.fromType === type) found.push(edge.fromId);
      if (edge.toType === type) found.push(edge.toId);
      return found;
    }))];

  const rows = async <T>(list: string[], load: (list: string[]) => Promise<T[]>): Promise<T[]> =>
    list.length === 0 ? [] : load(list);

  const [orders, products, geos, events, drivers, forecasts, trends, candidates, personas, challenges, virtuals, recs] =
    await Promise.all([
      rows(ids("Order"), (list) => prisma.orderRow.findMany({ where: { shopId, id: { in: list } }, select: { id: true, name: true } })),
      rows(ids("SKU"), (list) => prisma.productRow.findMany({ where: { shopId, id: { in: list } }, select: { id: true, title: true } })),
      rows([...ids("Geo"), ...ids("GeoBucket")], (list) => prisma.geo.findMany({ where: { shopId, id: { in: list } } })),
      rows([...ids("Event"), ...ids("CatalogueEvent")], (list) => prisma.catalogueEvent.findMany({ where: { id: { in: list } }, select: { id: true, title: true } })),
      rows(ids("Driver"), (list) => prisma.driver.findMany({ where: { id: { in: list } }, select: { id: true, label: true } })),
      rows(ids("WeatherForecast"), (list) => prisma.weatherForecast.findMany({
        where: { id: { in: list } },
        select: { id: true, geoCity: true, forecastDate: true, precipMm: true },
      })),
      rows(ids("SocialTrend"), (list) => prisma.socialTrend.findMany({ where: { id: { in: list } }, select: { id: true, tag: true } })),
      rows(ids("EventCandidate"), (list) => prisma.eventCandidate.findMany({ where: { shopId, id: { in: list } }, select: { id: true, name: true } })),
      rows(ids("Persona"), (list) => prisma.persona.findMany({ where: { shopId, id: { in: list } }, select: { id: true, name: true } })),
      rows(ids("ActivityChallenge"), (list) => prisma.activityChallenge.findMany({ where: { id: { in: list } }, select: { id: true, title: true } })),
      rows(ids("VirtualEvent"), (list) => prisma.virtualEvent.findMany({ where: { id: { in: list } }, select: { id: true, title: true } })),
      rows(ids("Recommendation"), (list) => prisma.recommendation.findMany({ where: { shopId, id: { in: list } }, select: { id: true, title: true } })),
    ]);

  const labels = new Map<string, string>();
  for (const row of orders) labels.set(key("Order", row.id), row.name ?? row.id);
  for (const row of products) labels.set(key("SKU", row.id), row.title);
  for (const row of geos) {
    const label = [row.city, row.postalSector, row.countryCode].filter(Boolean).join(" · ");
    labels.set(key("Geo", row.id), label);
    labels.set(key("GeoBucket", row.id), label);
  }
  for (const row of events) {
    labels.set(key("Event", row.id), row.title);
    labels.set(key("CatalogueEvent", row.id), row.title);
  }
  for (const row of drivers) labels.set(key("Driver", row.id), row.label);
  for (const row of forecasts) {
    const day = row.forecastDate.toISOString().slice(0, 10);
    const rain = row.precipMm != null ? `${row.precipMm.toFixed(1)} mm` : "forecast";
    labels.set(key("WeatherForecast", row.id), `${row.geoCity ?? "Forecast"} ${day} · ${rain}`);
  }
  for (const row of trends) labels.set(key("SocialTrend", row.id), row.tag);
  for (const row of candidates) labels.set(key("EventCandidate", row.id), row.name);
  for (const row of personas) labels.set(key("Persona", row.id), row.name);
  for (const row of challenges) labels.set(key("ActivityChallenge", row.id), row.title);
  for (const row of virtuals) labels.set(key("VirtualEvent", row.id), row.title);
  for (const row of recs) labels.set(key("Recommendation", row.id), row.title);
  return labels;
}
