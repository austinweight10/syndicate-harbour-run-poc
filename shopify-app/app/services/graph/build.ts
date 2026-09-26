import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  addDays,
  applyLowNCap,
  clip01,
  confidenceValue,
  formatLondon,
  geoBandWeight,
  haversineKm,
  londonCalendar,
  median,
  softmax,
} from "./math";
import {
  affinityOverlap,
  categoryWanted,
  forecastWetWanted,
  matchesAffinity,
  tagBag,
} from "./affinity";

type Edge = {
  shopId: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  relation: string;
  weight: number;
  provenance: string;
  payloadJson?: string;
};

type OrderLite = {
  id: string;
  at: Date;
  city: string | null;
  country: string;
  lat: number | null;
  lng: number | null;
  subtotal: number;
  lines: {
    productId: string | null;
    title: string;
    sku: string | null;
    quantity: number;
    bag: Set<string>;
  }[];
};

type CatalogueLite = {
  id: string;
  naturalKey: string;
  title: string;
  category: string;
  mode: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  startAt: Date;
  endAt: Date;
  tags: string[];
  provenance: string;
};

type Spec = {
  key: string;
  name: string;
  archetype: string;
  category: string;
  mode: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  start: Date;
  end: Date;
  catalogueEventId: string | null;
  extraTags: string[];
  labels: string[];
  enrichment: string;
  driverIds: string[];
  virtual: boolean;
};

export type ScoredEvent = {
  id: string;
  name: string;
  value: number;
  nOrders: number;
  lowN: boolean;
  labels: string[];
};

const CITY: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.5074, lng: -0.1278 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
};

function stableId(prefix: string, ...parts: string[]): string {
  const hash = createHash("sha1").update(parts.join("|")).digest("hex").slice(0, 16);
  return `${prefix}_${hash}`;
}

function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch {
    return raw.split(",").map((tag) => tag.trim()).filter(Boolean);
  }
  return [];
}

function inRange(at: Date, start: Date, end: Date): boolean {
  return at.getTime() >= start.getTime() && at.getTime() <= end.getTime();
}

function windowFor(spec: Spec): { start: Date; end: Date; label: string } {
  if (spec.category === "race_running") {
    return {
      start: addDays(spec.start, -7),
      end: addDays(spec.end, 2),
      label: `Race window ${formatLondon(addDays(spec.start, -7))}–${formatLondon(addDays(spec.end, 2))}`,
    };
  }
  if (spec.virtual || spec.category === "virtual_challenge") {
    return {
      start: addDays(spec.start, -2),
      end: addDays(spec.end, 1),
      label: "Virtual window",
    };
  }
  return {
    start: addDays(spec.start, -2),
    end: addDays(spec.end, 1),
    label: `Event window ${formatLondon(addDays(spec.start, -2))}–${formatLondon(addDays(spec.end, 1))}`,
  };
}

function pointFor(order: OrderLite): { lat: number; lng: number } | null {
  if (order.lat != null && order.lng != null) return { lat: order.lat, lng: order.lng };
  if (order.city && CITY[order.city]) return CITY[order.city];
  return null;
}

export async function buildAndScore(
  prisma: PrismaClient,
  shopId: string,
  weather: { driverId: string | null; wetStart: Date | null; wetEnd: Date | null },
): Promise<ScoredEvent[]> {
  const [orders, lines, products, geos, catalogue, trends, challenges, virtuals, forecasts] =
    await Promise.all([
      prisma.orderRow.findMany({ where: { shopId, test: false } }),
      prisma.lineItemRow.findMany({ where: { shopId } }),
      prisma.productRow.findMany({ where: { shopId } }),
      prisma.geo.findMany({ where: { shopId } }),
      prisma.catalogueEvent.findMany(),
      prisma.socialTrend.findMany(),
      prisma.activityChallenge.findMany(),
      prisma.virtualEvent.findMany(),
      prisma.weatherForecast.findMany({ where: { geoCity: "London" } }),
    ]);

  const geoById = new Map(geos.map((geo) => [geo.id, geo]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const linesByOrder = new Map<string, typeof lines>();
  for (const line of lines) {
    const bucket = linesByOrder.get(line.orderId) ?? [];
    bucket.push(line);
    linesByOrder.set(line.orderId, bucket);
  }

  const orderLites: OrderLite[] = orders.map((order) => {
    const geo = order.geoId ? geoById.get(order.geoId) : undefined;
    return {
      id: order.id,
      at: order.processedAt,
      city: geo?.city ?? null,
      country: geo?.countryCode ?? "GB",
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      subtotal: Number(order.subtotalAmount),
      lines: (linesByOrder.get(order.id) ?? []).map((line) => {
        const product = line.productId ? productById.get(line.productId) : undefined;
        return {
          productId: line.productId,
          title: line.title,
          sku: line.sku,
          quantity: line.quantity,
          bag: tagBag({
            tags: parseTags(line.tagsJson ?? product?.tags),
            productType: line.productType ?? product?.productType,
            title: line.title,
          }),
        };
      }),
    };
  });

  const catalogueLites: CatalogueLite[] = catalogue.map((event) => ({
    id: event.id,
    naturalKey: event.naturalKey,
    title: event.title,
    category: event.category,
    mode: event.mode,
    city: event.city,
    lat: event.lat,
    lng: event.lng,
    startAt: event.startAt,
    endAt: event.endAt,
    tags: parseTags(event.audienceJson),
    provenance: event.provenance,
  }));

  const prior = await prisma.eventCandidate.findMany({ where: { shopId }, select: { id: true } });
  if (prior.length > 0) {
    await prisma.confidenceScore.deleteMany({
      where: { eventCandidateId: { in: prior.map((row) => row.id) } },
    });
  }
  await prisma.eventCandidate.deleteMany({ where: { shopId } });
  await prisma.graphEdge.deleteMany({ where: { shopId } });

  const edges: Edge[] = [];
  const push = (edge: Edge) => edges.push(edge);

  for (const order of orderLites) {
    const geo = orders.find((row) => row.id === order.id)?.geoId;
    if (geo) {
      push({
        shopId,
        fromType: "Order",
        fromId: order.id,
        toType: "Geo",
        toId: geo,
        relation: "SHIPPED_TO",
        weight: 1,
        provenance: "OBSERVED",
      });
    }
    for (const line of order.lines) {
      if (!line.productId) continue;
      push({
        shopId,
        fromType: "Order",
        fromId: order.id,
        toType: "SKU",
        toId: line.productId,
        relation: "CONTAINS",
        weight: line.quantity,
        provenance: "OBSERVED",
        payloadJson: JSON.stringify({ sku: line.sku, title: line.title }),
      });
    }
  }

  for (const event of catalogueLites) {
    if (!event.city) continue;
    const geo = geos.find((row) => row.city === event.city);
    if (!geo) continue;
    push({
      shopId,
      fromType: "Event",
      fromId: event.id,
      toType: "Geo",
      toId: geo.id,
      relation: "VENUE_IN",
      weight: 1,
      provenance: event.provenance === "OBSERVED" ? "OBSERVED" : "AGGREGATE_PROXY",
    });
  }

  for (const forecast of forecasts) {
    const geo = geos.find((row) => row.city === "London");
    if (!geo) continue;
    push({
      shopId,
      fromType: "WeatherForecast",
      fromId: forecast.id,
      toType: "Geo",
      toId: geo.id,
      relation: "FORECAST_FOR",
      weight: 1,
      provenance: "OBSERVED",
      payloadJson: JSON.stringify({ precipMm: forecast.precipMm, city: "London" }),
    });
  }

  for (const trend of trends) {
    if (trend.provenance === "OBSERVED") {
      throw new Error("Refusing SocialTrend provenance OBSERVED");
    }
    const city = trend.geoHint ?? "London";
    const geo = geos.find((row) => row.city === city) ?? geos.find((row) => row.city === "London");
    if (geo) {
      push({
        shopId,
        fromType: "SocialTrend",
        fromId: trend.id,
        toType: "Geo",
        toId: geo.id,
        relation: "TRENDING_IN",
        weight: trend.score,
        provenance: trend.provenance,
      });
    }
    const wanted = new Set(trendAffinity(trend.payloadJson));
    if (trend.score >= 0.5) {
      for (const product of products) {
        const bag = tagBag({
          tags: parseTags(product.tags),
          productType: product.productType,
          title: product.title,
        });
        if (wanted.size > 0 && matchesAffinity(bag, wanted, 0.2)) {
          push({
            shopId,
            fromType: "SocialTrend",
            fromId: trend.id,
            toType: "SKU",
            toId: product.id,
            relation: "AFFINITY",
            weight: trend.score,
            provenance: trend.provenance,
          });
        }
      }
    }
  }

  for (const challenge of challenges) {
    const wanted = categoryWanted("race_running", parseTags(challenge.catalogueAffinityJson));
    for (const product of products) {
      const bag = tagBag({
        tags: parseTags(product.tags),
        productType: product.productType,
        title: product.title,
      });
      if (matchesAffinity(bag, wanted, 0.2)) {
        push({
          shopId,
          fromType: "ActivityChallenge",
          fromId: challenge.id,
          toType: "SKU",
          toId: product.id,
          relation: "AFFINITY",
          weight: challenge.volumeProxy ?? 0.4,
          provenance: challenge.provenance === "OBSERVED" ? "MOCK" : challenge.provenance,
        });
      }
    }
  }

  const specs = buildSpecs(catalogueLites, virtuals, weather);

  type Row = Spec & {
    w0: Date;
    w1: Date;
    wlabel: string;
    nOrders: number;
    Lt: number;
    G: number;
    A: number;
    Y: number;
    R: number;
    evidence: OrderLite[];
  };

  const rows: Row[] = specs.map((spec) => {
    const window = windowFor(spec);
    const wanted = categoryWanted(spec.category, spec.extraTags);
    let evidence = orderLites.filter((order) => inRange(order.at, window.start, window.end));
    if (spec.virtual) {
      evidence = evidence.filter((order) =>
        order.lines.some((line) => matchesAffinity(line.bag, wanted, 0.15)),
      );
    }
    const nOrders = evidence.length;
    const Lt = computeLt(orderLites, evidence, spec.start);
    const G = computeG(spec, evidence, orderLites);
    let socialBoost = 0;
    let activityBoost = 0;
    const socialLabels: string[] = [];
    for (const trend of trends) {
      if (trend.score < 0.5) continue;
      if (!overlaps(trend.timeBucketStart, trend.timeBucketEnd, window.start, window.end)) continue;
      const hint = (trend.geoHint ?? "").toLowerCase();
      if (spec.city && hint && hint !== spec.city.toLowerCase()) continue;
      socialBoost += 0.08;
      socialLabels.push(trend.provenance === "MOCK" ? "MOCK social" : "AGGREGATE_PROXY hashtag buzz");
    }
    for (const challenge of challenges) {
      if (overlaps(challenge.windowStart, challenge.windowEnd, window.start, window.end)) {
        activityBoost += 0.06;
      }
    }
    const buzz = Math.min(0.2, socialBoost + activityBoost);
    let forecastBoost = 0;
    if (spec.category === "weather_driver") forecastBoost = 0.12;
    const A = clip01(lineAffinity(evidence.length ? evidence : [], wanted) + buzz + Math.min(0.15, forecastBoost));
    const labels = [...spec.labels];
    if (nOrders > 0) labels.push("OBSERVED orders");
    for (const label of socialLabels) {
      if (!labels.includes(label)) labels.push(label);
    }
    if (activityBoost > 0) labels.push("MOCK activity challenge");
    labels.push("MODEL_HYPOTHESIS prior-year neutral");
    return {
      ...spec,
      w0: window.start,
      w1: window.end,
      wlabel: window.label,
      nOrders,
      Lt,
      G,
      A,
      Y: 0.5,
      R: 0.8,
      evidence,
      labels,
    };
  });

  const byDay = new Map<string, number[]>();
  rows.forEach((row, index) => {
    const day = londonCalendar(row.start).iso;
    const bucket = byDay.get(day) ?? [];
    bucket.push(index);
    byDay.set(day, bucket);
  });
  for (const indexes of byDay.values()) {
    if (indexes.length < 2) continue;
    const shares = softmax(indexes.map((index) => rows[index].A + rows[index].Lt));
    indexes.forEach((index, shareIndex) => {
      rows[index].R = clip01(0.55 + 0.35 * shares[shareIndex]);
    });
  }

  const scored: ScoredEvent[] = [];
  for (const row of rows) {
    const raw = confidenceValue(row);
    const capped = applyLowNCap(raw, row.nOrders);
    if (capped.lowN) row.labels.push("MODEL_HYPOTHESIS (low n)");
    const day = londonCalendar(row.start).iso;
    const rivals = rows.filter((other) => other.key !== row.key && londonCalendar(other.start).iso === day);
    const rivalValues = rivals.map((other) => applyLowNCap(confidenceValue(other), other.nOrders).value);
    const shares = softmax([capped.value, ...rivalValues]);
    const competing = rivals.map((other, index) => ({
      eventId: other.key,
      name: other.name,
      valuePct: Math.round(1000 * (shares[index + 1] ?? 0)) / 10,
    }));
    const eventShare = shares[0] ?? 1;
    const baselinePct = Math.round(1000 * Math.max(0, 1 - eventShare) * (rivals.length ? 1 : 1 - capped.value)) / 10;

    const id = stableId("ec", shopId, row.key);
    await prisma.eventCandidate.create({
      data: {
        id,
        shopId,
        catalogueEventId: row.catalogueEventId,
        name: row.name,
        archetype: row.archetype,
        timeStart: row.w0,
        timeEnd: row.w1,
        venueCity: row.city,
        venueCountry: row.city ? "GB" : null,
        driverIdsJson: JSON.stringify(row.driverIds),
        enrichmentSource: row.enrichment,
        nOrders: row.nOrders,
        windowLabel: row.wlabel,
      },
    });
    await prisma.confidenceScore.create({
      data: {
        eventCandidateId: id,
        valuePct: Math.round(capped.value * 1000) / 10,
        value: capped.value,
        Lt: row.Lt,
        G: row.G,
        A: row.A,
        Y: 0.5,
        R: row.R,
        baselinePct: rivals.length ? baselinePct : Math.round((1 - capped.value) * 1000) / 10,
        competingJson: JSON.stringify(competing),
        provenanceLabelsJson: JSON.stringify(unique(row.labels)),
        nOrders: row.nOrders,
        windowStart: row.w0,
        windowEnd: row.w1,
      },
    });

    const liftProvenance = row.labels.includes("OBSERVED orders") ? "OBSERVED" : "MODEL_HYPOTHESIS";
    if (row.catalogueEventId) {
      push({
        shopId,
        fromType: "EventCandidate",
        fromId: id,
        toType: "Event",
        toId: row.catalogueEventId,
        relation: "TEMPORAL_LIFT",
        weight: row.Lt,
        provenance: liftProvenance,
      });
    }
    const geo = row.city ? geos.find((item) => item.city === row.city) : undefined;
    if (geo) {
      push({
        shopId,
        fromType: "EventCandidate",
        fromId: id,
        toType: "Geo",
        toId: geo.id,
        relation: "GEO_OVERLAP",
        weight: row.G,
        provenance: liftProvenance === "OBSERVED" ? "OBSERVED" : "AGGREGATE_PROXY",
      });
    }
    if (weather.driverId && row.category === "weather_driver") {
      push({
        shopId,
        fromType: "EventCandidate",
        fromId: id,
        toType: "Driver",
        toId: weather.driverId,
        relation: "DRIVEN_BY",
        weight: 0.7,
        provenance: "AGGREGATE_PROXY",
      });
    }
    const skuWeights = new Map<string, number>();
    for (const order of row.evidence) {
      for (const line of order.lines) {
        if (!line.productId) continue;
        skuWeights.set(line.productId, (skuWeights.get(line.productId) ?? 0) + line.quantity);
      }
    }
    for (const [productId, weight] of [...skuWeights.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
      push({
        shopId,
        fromType: "EventCandidate",
        fromId: id,
        toType: "SKU",
        toId: productId,
        relation: "AFFINITY",
        weight,
        provenance: liftProvenance,
      });
    }

    scored.push({
      id,
      name: row.name,
      value: capped.value,
      nOrders: row.nOrders,
      lowN: capped.lowN,
      labels: unique(row.labels),
    });
  }

  for (let offset = 0; offset < edges.length; offset += 80) {
    await prisma.graphEdge.createMany({
      data: edges.slice(offset, offset + 80).map((edge) => ({
        ...edge,
        payloadJson: edge.payloadJson ?? null,
      })),
    });
  }

  return scored.sort((a, b) => b.value - a.value);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function overlaps(a0: Date, a1: Date, b0: Date, b1: Date): boolean {
  return a0.getTime() <= b1.getTime() && b0.getTime() <= a1.getTime();
}

function lineAffinity(orders: OrderLite[], wanted: Set<string>): number {
  let hits = 0;
  let total = 0;
  for (const order of orders) {
    for (const line of order.lines) {
      total += 1;
      if (matchesAffinity(line.bag, wanted, 0.15)) hits += 1;
    }
  }
  if (total === 0) return 0;
  return hits / total;
}

function computeLt(all: OrderLite[], windowOrders: OrderLite[], eventStart: Date): number {
  const byDay = new Map<string, number>();
  for (const order of all) {
    const day = londonCalendar(order.at).iso;
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const target = londonCalendar(eventStart).dow;
  const sameDow: number[] = [];
  for (const [day, count] of byDay) {
    const parsed = new Date(`${day}T12:00:00+01:00`);
    if (londonCalendar(parsed).dow === target) sameDow.push(count);
  }
  const baseline = sameDow.length ? median(sameDow) : median([...byDay.values()]) || 1;
  const nW = windowOrders.length;
  const lift = (nW - baseline) / Math.max(baseline, 1);
  if (lift <= 0) return 0;
  if (lift >= 1) return 1;
  return lift;
}

function computeG(spec: Spec, evidence: OrderLite[], all: OrderLite[]): number {
  if (spec.virtual || spec.mode === "virtual") return 0.2;
  const venue =
    spec.lat != null && spec.lng != null
      ? { lat: spec.lat, lng: spec.lng }
      : spec.city && CITY[spec.city]
        ? CITY[spec.city]
        : null;
  if (!venue) return 0.2;
  const sample = evidence.length ? evidence : all.filter((order) => order.city);
  if (sample.length === 0) return 0.2;
  let total = 0;
  for (const order of sample) {
    const point = pointFor(order);
    if (!point) {
      total += order.country === "GB" ? 0.2 : 0;
      continue;
    }
    total += geoBandWeight(haversineKm(point, venue), order.country === "GB");
  }
  return clip01(total / sample.length);
}

function buildSpecs(
  catalogue: CatalogueLite[],
  virtuals: { naturalKey: string; title: string; category: string; mode: string; startAt: Date; endAt: Date; audienceJson: string; provenance: string; id: string }[],
  weather: { driverId: string | null; wetStart: Date | null; wetEnd: Date | null },
): Spec[] {
  const specs: Spec[] = [];
  const weekend = catalogue.filter((event) => {
    if (event.category !== "race_running" || event.city !== "London") return false;
    if (event.naturalKey.toLowerCase().includes("parkrun") || event.title.toLowerCase().includes("parkrun")) {
      return false;
    }
    const day = londonCalendar(event.startAt).iso;
    return day === "2026-09-26" || day === "2026-09-27";
  });
  if (weekend.length > 0) {
    const start = new Date(Math.min(...weekend.map((event) => event.startAt.getTime())));
    const end = new Date(Math.max(...weekend.map((event) => event.endAt.getTime())));
    const anchor = weekend.find((event) => event.naturalKey.includes("hyde")) ?? weekend[0];
    specs.push({
      key: "race-weekend-london-10k",
      name: "Race weekend — London 10K",
      archetype: "race_weekend",
      category: "race_running",
      mode: "physical",
      city: "London",
      lat: anchor.lat ?? CITY.London.lat,
      lng: anchor.lng ?? CITY.London.lng,
      start,
      end,
      catalogueEventId: anchor.id,
      extraTags: weekend.flatMap((event) => event.tags),
      labels: ["AGGREGATE_PROXY race calendar"],
      enrichment: "orders_plus_calendar",
      driverIds: [],
      virtual: false,
    });
  }

  for (const event of catalogue) {
    if (weekend.some((item) => item.id === event.id)) continue;
    if (event.category === "team_fixture" || event.category === "season_drop_calendar") continue;
    const name = nameFor(event);
    if (!name) continue;
    if (specs.some((spec) => spec.name === name)) continue;
    specs.push({
      key: event.naturalKey,
      name,
      archetype: archetypeFor(event),
      category: event.category,
      mode: event.mode,
      city: event.city,
      lat: event.lat,
      lng: event.lng,
      start: event.startAt,
      end: event.endAt,
      catalogueEventId: event.id,
      extraTags: event.tags,
      labels: event.mode === "virtual" ? ["MOCK virtual calendar"] : ["AGGREGATE_PROXY race calendar"],
      enrichment: "orders_plus_calendar",
      driverIds: [],
      virtual: event.mode === "virtual" || event.category === "virtual_challenge",
    });
  }

  const sofa = virtuals.find((event) => event.naturalKey.toLowerCase().includes("sofa"));
  if (sofa && !specs.some((spec) => spec.name === "Sofa-to-5K virtual")) {
    specs.push({
      key: sofa.naturalKey,
      name: "Sofa-to-5K virtual",
      archetype: "virtual",
      category: "virtual_challenge",
      mode: "virtual",
      city: null,
      lat: null,
      lng: null,
      start: sofa.startAt,
      end: sofa.endAt,
      catalogueEventId: null,
      extraTags: parseTags(sofa.audienceJson),
      labels: ["MOCK virtual calendar"],
      enrichment: "orders_plus_mock",
      driverIds: [],
      virtual: true,
    });
  }

  if (weather.wetStart && weather.wetEnd) {
    specs.push({
      key: "wet-weekend-london",
      name: "Wet weekend layers",
      archetype: "weather",
      category: "weather_driver",
      mode: "hybrid",
      city: "London",
      lat: CITY.London.lat,
      lng: CITY.London.lng,
      start: weather.wetStart,
      end: weather.wetEnd,
      catalogueEventId: null,
      extraTags: [...forecastWetWanted()],
      labels: ["OBSERVED weather forecast", "AGGREGATE_PROXY weather driver"],
      enrichment: "orders_plus_calendar",
      driverIds: weather.driverId ? [weather.driverId] : [],
      virtual: false,
    });
  }

  return specs;
}

function nameFor(event: CatalogueLite): string | null {
  const blob = `${event.naturalKey} ${event.title}`.toLowerCase();
  if (blob.includes("parkrun")) return "Hackney Marshes parkrun";
  if (blob.includes("sofa")) return "Sofa-to-5K virtual";
  if (blob.includes("hyrox")) return "Hyrox-style meet";
  if (event.category === "race_running" && event.city === "Manchester") return "Race weekend — Manchester 10K";
  if (event.category === "race_running") return event.title;
  if (event.category === "virtual_challenge") return event.title;
  if (event.category === "crossfit_functional") return "Hyrox-style meet";
  return null;
}

function archetypeFor(event: CatalogueLite): string {
  if (event.category === "race_running") return "race_weekend";
  if (event.category === "virtual_challenge" || event.mode === "virtual") return "virtual";
  if (event.category === "crossfit_functional") return "functional_meet";
  if (event.category === "weather_driver") return "weather";
  return "other";
}

function trendAffinity(payloadJson: string | null): string[] {
  if (!payloadJson) return [];
  try {
    const parsed = JSON.parse(payloadJson) as { affinity?: unknown };
    return Array.isArray(parsed.affinity) ? parsed.affinity.map(String) : [];
  } catch {
    return [];
  }
}
