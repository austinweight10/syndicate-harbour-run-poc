import prisma from "../db.server";
import {
  parsePersonaJson,
  parseProductMeta,
  personaBrief,
  personaFactLabels,
  personaProfileSections,
  type CatalogueProduct,
} from "./personas/attributes";

export type ProvenanceKind = "OBSERVED" | "AGGREGATE_PROXY" | "MODEL_HYPOTHESIS" | "MOCK";

export function provenanceKinds(labels: string[]): ProvenanceKind[] {
  const found = new Set<ProvenanceKind>();
  for (const label of labels) {
    const upper = label.toUpperCase();
    if (upper.includes("OBSERVED")) found.add("OBSERVED");
    if (upper.includes("AGGREGATE")) found.add("AGGREGATE_PROXY");
    if (upper.includes("HYPOTHESIS") || upper.includes("LOW N")) found.add("MODEL_HYPOTHESIS");
    if (upper.includes("MOCK")) found.add("MOCK");
  }
  return [...found];
}

function parseLabels(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "title" in item) {
          return String((item as { title: unknown }).title ?? "");
        }
        return "";
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

export type EventCard = {
  id: string;
  name: string;
  archetype: string;
  confidence: number;
  nOrders: number;
  windowLabel: string | null;
  city: string | null;
  labels: string[];
  provenance: ProvenanceKind[];
  lowN: boolean;
  blurb: string;
};

export type OverviewData = {
  kpis: { events: number; insights: number; frictions: number; personas: number; orders: number };
  hero: EventCard | null;
  secondary: EventCard[];
  personas: { id: string; name: string; status: string; initials: string; goals: string }[];
  empty: boolean;
};

export type EventDetail = EventCard & {
  Lt: number;
  G: number;
  A: number;
  Y: number;
  R: number;
  baselinePct: number;
  competing: { name?: string; eventId?: string; valuePct?: number }[];
  enrichmentSource: string;
  personas: { id: string; name: string; status: string }[];
  topSkus: { title: string; sku: string | null }[];
};

export type BoardCard = {
  id: string;
  title: string;
  body: string;
  priority: string | null;
  kind: string;
  labels: string[];
  provenance: ProvenanceKind[];
  eventId: string | null;
  eventName: string | null;
  personaName: string | null;
  runId: string | null;
  confidence: number | null;
  agentClaim: boolean;
  targetType: string | null;
  targetRef: string | null;
};

function blurbFor(name: string, confidence: number, nOrders: number, lowN: boolean): string {
  const pct = Math.round(confidence * 100);
  if (lowN) {
    return `${name} is an early signal — fewer than five orders in this window, so confidence stays at ${pct}%.`;
  }
  return `${name} scores ${pct}% from orders in the window joined to the calendar. ${nOrders} orders in evidence.`;
}

async function eventCards(shopId: string): Promise<EventCard[]> {
  const events = await prisma.eventCandidate.findMany({ where: { shopId } });
  if (events.length === 0) return [];
  const scores = await prisma.confidenceScore.findMany({
    where: { eventCandidateId: { in: events.map((event) => event.id) } },
  });
  const scoreByEvent = new Map(scores.map((score) => [score.eventCandidateId, score]));
  return events
    .map((event) => {
      const score = scoreByEvent.get(event.id);
      const labels = parseLabels(score?.provenanceLabelsJson);
      const confidence = score?.value ?? 0;
      const lowN = labels.some((label) => label.toLowerCase().includes("low n")) || (score?.nOrders ?? 0) < 5;
      return {
        id: event.id,
        name: event.name,
        archetype: event.archetype,
        confidence,
        nOrders: score?.nOrders ?? event.nOrders,
        windowLabel: event.windowLabel,
        city: event.venueCity,
        labels,
        provenance: provenanceKinds(labels),
        lowN,
        blurb: blurbFor(event.name, confidence, score?.nOrders ?? event.nOrders, lowN),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

export async function loadOverview(shopId: string): Promise<OverviewData> {
  const [cards, personaRows, frictions, affordances, orders] = await Promise.all([
    eventCards(shopId),
    prisma.persona.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
    prisma.recommendation.count({ where: { shopId } }),
    prisma.affordanceScore.count({ where: { shopId } }),
    prisma.orderRow.count({ where: { shopId, test: false } }),
  ]);
  return {
    kpis: {
      events: cards.length,
      insights: affordances,
      frictions,
      personas: personaRows.filter((persona) => persona.status !== "stub").length,
      orders,
    },
    hero: cards[0] ?? null,
    secondary: cards.slice(1, 4),
    personas: personaRows.slice(0, 4).map((persona) => ({
      id: persona.id,
      name: persona.name,
      status: persona.status,
      initials: persona.avatarInitials ?? persona.name.slice(0, 2).toUpperCase(),
      goals: parseLabels(persona.goalsJson).slice(0, 2).join(" · ") || "Goals from the order cohort",
    })),
    empty: cards.length === 0,
  };
}

export async function loadEventList(shopId: string): Promise<EventCard[]> {
  return eventCards(shopId);
}

export async function loadEventDetail(shopId: string, id: string): Promise<EventDetail | null> {
  const event = await prisma.eventCandidate.findFirst({ where: { id, shopId } });
  if (!event) return null;
  const score = await prisma.confidenceScore.findUnique({ where: { eventCandidateId: event.id } });
  const labels = parseLabels(score?.provenanceLabelsJson);
  const confidence = score?.value ?? 0;
  const lowN = labels.some((label) => label.toLowerCase().includes("low n")) || event.nOrders < 5;
  const personas = await prisma.persona.findMany({
    where: { shopId, primaryEventId: event.id },
  });
  const edges = await prisma.graphEdge.findMany({
    where: { shopId, fromId: event.id, relation: "AFFINITY", toType: "SKU" },
    take: 4,
  });
  const products = await prisma.productRow.findMany({
    where: { id: { in: edges.map((edge) => edge.toId) } },
  });
  let competing: EventDetail["competing"] = [];
  try {
    competing = JSON.parse(score?.competingJson ?? "[]") as EventDetail["competing"];
  } catch {
    competing = [];
  }
  return {
    id: event.id,
    name: event.name,
    archetype: event.archetype,
    confidence,
    nOrders: score?.nOrders ?? event.nOrders,
    windowLabel: event.windowLabel,
    city: event.venueCity,
    labels,
    provenance: provenanceKinds(labels),
    lowN,
    blurb: blurbFor(event.name, confidence, score?.nOrders ?? event.nOrders, lowN),
    Lt: score?.Lt ?? 0,
    G: score?.G ?? 0,
    A: score?.A ?? 0,
    Y: score?.Y ?? 0.5,
    R: score?.R ?? 0,
    baselinePct: score?.baselinePct ?? 0,
    competing,
    enrichmentSource: event.enrichmentSource,
    personas: personas.map((persona) => ({ id: persona.id, name: persona.name, status: persona.status })),
    topSkus: products.map((product) => ({ title: product.title, sku: null })),
  };
}

export async function loadBoard(shopId: string): Promise<{ insights: BoardCard[]; frictions: BoardCard[] }> {
  const [affordances, recommendations, events, personas] = await Promise.all([
    prisma.affordanceScore.findMany({ where: { shopId }, orderBy: { score: "desc" } }),
    prisma.recommendation.findMany({ where: { shopId } }),
    prisma.eventCandidate.findMany({ where: { shopId } }),
    prisma.persona.findMany({ where: { shopId } }),
  ]);
  const eventName = new Map(events.map((event) => [event.id, event.name]));
  const personaName = new Map(personas.map((persona) => [persona.id, persona.name]));
  const priorityRank: Record<string, number> = { P0: 0, P1: 1, P2: 2 };

  const insights: BoardCard[] = affordances.map((row) => {
    const evidence = JSON.parse(row.evidenceJson) as {
      summary?: string;
      title?: string;
      provenanceLabels?: string[];
      agentFound?: boolean;
    };
    const labels = evidence.provenanceLabels ?? [];
    const claimed = evidence.agentFound !== false && Boolean(row.runId);
    return {
      id: row.id,
      title: evidence.title ?? "Storefront affordance",
      body: evidence.summary ?? row.notes ?? "",
      priority: null,
      kind: "affordance",
      labels,
      provenance: provenanceKinds(labels),
      eventId: null,
      eventName: eventName.get(row.targetRef) ?? null,
      personaName: personaName.get(row.personaId) ?? null,
      runId: claimed ? row.runId : null,
      confidence: row.score,
      agentClaim: claimed,
      targetType: row.targetType,
      targetRef: row.targetRef,
    };
  });

  const frictions: BoardCard[] = recommendations
    .map((row) => {
      const labels = parseLabels(row.provenanceLabelsJson);
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        priority: row.priority,
        kind: row.kind,
        labels,
        provenance: provenanceKinds(labels),
        eventId: row.eventId,
        eventName: row.eventId ? eventName.get(row.eventId) ?? null : null,
        personaName: row.personaId ? personaName.get(row.personaId) ?? null : null,
        runId: row.runId,
        confidence: row.confidence,
        agentClaim: Boolean(row.runId),
        targetType: row.targetType,
        targetRef: row.targetRef,
      };
    })
    .sort((a, b) => (priorityRank[a.priority ?? "P2"] ?? 9) - (priorityRank[b.priority ?? "P2"] ?? 9));

  return { insights, frictions };
}

export async function loadPersonas(shopId: string) {
  const [personas, events, products] = await Promise.all([
    prisma.persona.findMany({ where: { shopId }, orderBy: { name: "asc" } }),
    prisma.eventCandidate.findMany({ where: { shopId } }),
    prisma.productRow.findMany({ where: { shopId } }),
  ]);
  const eventName = new Map(events.map((event) => [event.id, event.name]));
  const catalogue: CatalogueProduct[] = products.map((product) => {
    const meta = parseProductMeta(product.metafieldsJson);
    return {
      id: product.id,
      title: product.title,
      handle: product.handle,
      productType: product.productType,
      tags: product.tags ? product.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
      fromPrice: meta.fromPrice,
    };
  });
  return personas.map((persona) => {
    const eventLabel = persona.primaryEventId ? eventName.get(persona.primaryEventId) ?? null : null;
    const { constraints, behavioural, mockFlags } = parsePersonaJson(persona);
    const budgetMin = Number(persona.budgetMin);
    const budgetMax = Number(persona.budgetMax);
    const goals = parseLabels(persona.goalsJson);
    const sections =
      persona.status === "stub"
        ? []
        : personaProfileSections({
            goals,
            catalogue,
            budgetMin,
            budgetMax,
            locationProxy: persona.locationProxy,
            eventName: eventLabel,
            constraints,
            behavioural,
            mockFlags,
          });
    const facts = personaFactLabels({ constraints, behavioural });
    const likelyProducts = sections.find((section) => section.id === "products")?.products ?? [];
    const productLabels = likelyProducts.map((product) => product.title).filter(Boolean);
    return {
      id: persona.id,
      name: persona.name,
      status: persona.status,
      initials: persona.avatarInitials ?? persona.name.slice(0, 2).toUpperCase(),
      vertical: persona.vertical,
      goals,
      productLabels,
      budgetMin,
      budgetMax,
      locationProxy: persona.locationProxy,
      eventName: eventLabel,
      brief: personaBrief(constraints, behavioural),
      sections,
      likelyProducts,
      facts,
      stub: persona.status === "stub",
    };
  });
}

type TimelineStep = { id: string; ok: boolean; note?: string; at?: string };

function parseTimeline(raw: string | null): {
  pathId: string;
  headed: boolean;
  browser: { executablePath: string; pid: number | null; headless: boolean } | null;
  steps: TimelineStep[];
} {
  const empty = { pathId: "path-harbour-run-dawn", headed: false, browser: null, steps: [] as TimelineStep[] };
  if (!raw) return empty;
  const parsed = JSON.parse(raw) as
    | TimelineStep[]
    | {
        pathId?: string;
        headed?: boolean;
        browser?: { executablePath?: string; pid?: number | null; headless?: boolean };
        steps?: TimelineStep[];
      };
  if (Array.isArray(parsed)) {
    return {
      ...empty,
      steps: parsed.map((step) => ({
        id: step.id ?? "step",
        ok: step.ok !== false,
        note: step.note,
        at: step.at,
      })),
    };
  }
  const browser = parsed.browser?.executablePath
    ? {
        executablePath: parsed.browser.executablePath,
        pid: parsed.browser.pid ?? null,
        headless: Boolean(parsed.browser.headless),
      }
    : null;
  return {
    pathId: parsed.pathId ?? "path-harbour-run-dawn",
    headed: Boolean(parsed.headed),
    browser,
    steps: parsed.steps ?? [],
  };
}

export function displayRunStatus(status: string, outcome: string | null): string {
  if (status === "completed" && (outcome === "checkout_started" || outcome === "carted")) {
    return "stopped_before_payment";
  }
  return status;
}

export async function loadRuns(shopId: string) {
  const runs = await prisma.agentRun.findMany({ where: { shopId }, orderBy: { startedAt: "desc" } });
  const personas = await prisma.persona.findMany({ where: { shopId } });
  const personaName = new Map(personas.map((persona) => [persona.id, persona.name]));
  return runs.map((run) => {
    const timeline = parseTimeline(run.timelineJson);
    return {
      id: run.id,
      personaId: run.personaId,
      personaName: personaName.get(run.personaId) ?? run.personaId,
      status: displayRunStatus(run.status, run.outcome),
      rawStatus: run.status,
      outcome: run.outcome,
      progressPct: run.progressPct,
      replay: run.id.includes("mock"),
      pathId: timeline.pathId,
      headed: timeline.headed,
      browser: timeline.browser,
      steps: timeline.steps,
      errorMessage: run.errorMessage,
      storefrontUrl: run.storefrontUrl,
      startedAt: run.startedAt?.toISOString() ?? null,
      endedAt: run.endedAt?.toISOString() ?? null,
    };
  });
}
