/**
 * Impact maths for deployed insights and occasions. Pure functions so the
 * dashboard loader stays thin and the numbers are unit-tested.
 *
 * Commercial impact is correlational: sales of the targeted products in equal
 * windows before and after deployment, relative to the rest of the store over
 * the same windows (so a store-wide spike is not counted as impact).
 */

const DAY = 24 * 60 * 60 * 1000;

/** Compare up to this many days either side of the deployment. */
export const WINDOW_DAYS = 10;
/** Fewer days than this after deployment → still measuring. */
export const MIN_DAYS = 7;
/** Same low-n rule as occasion scoring: under five orders is an early signal. */
export const LOW_N = 5;

export type OrderLite = {
  at: Date;
  lines: { productId: string | null; quantity: number; lineTotal: number }[];
};

export type WindowStats = { orders: number; units: number; revenue: number; aov: number };

export type CommercialStatus = "no_targets" | "measuring" | "early" | "ok";

export type Commercial = {
  status: CommercialStatus;
  windowDays: number;
  daysLive: number;
  before: WindowStats;
  after: WindowStats;
  /** Rest-of-store revenue in the same windows (the baseline). */
  baselineBefore: number;
  baselineAfter: number;
  /** (target after / before) ÷ (store after / before) − 1, or null when not computable. */
  uplift: number | null;
  /** Target revenue above what the store trend alone predicts. */
  incrementalRevenue: number | null;
  /** Daily target revenue from −windowDays to +windowDays (deployment day = index windowDays). */
  series: { day: string; revenue: number }[];
};

function emptyWindow(): WindowStats {
  return { orders: 0, units: 0, revenue: 0, aov: 0 };
}

function isoDay(at: Date): string {
  return at.toISOString().slice(0, 10);
}

export function commercialImpact(
  orders: OrderLite[],
  targetProductIds: Set<string>,
  deployedAt: Date,
  now: Date,
): Commercial {
  const daysLive = Math.max(0, Math.floor((now.getTime() - deployedAt.getTime()) / DAY));
  const windowDays = Math.min(WINDOW_DAYS, daysLive);
  const start = deployedAt.getTime() - Math.max(windowDays, 1) * DAY;
  const end = deployedAt.getTime() + windowDays * DAY;

  const before = emptyWindow();
  const after = emptyWindow();
  let baselineBefore = 0;
  let baselineAfter = 0;
  const seriesDays = Math.max(windowDays, 1);
  const series = Array.from({ length: seriesDays * 2 }, (_, index) => ({
    day: isoDay(new Date(deployedAt.getTime() + (index - seriesDays) * DAY)),
    revenue: 0,
  }));

  for (const order of orders) {
    const t = order.at.getTime();
    if (t < start || t >= Math.max(end, deployedAt.getTime())) continue;
    const bucket = t < deployedAt.getTime() ? before : after;
    let hit = false;
    let targetRevenue = 0;
    for (const line of order.lines) {
      if (line.productId && targetProductIds.has(line.productId)) {
        hit = true;
        bucket.units += line.quantity;
        targetRevenue += line.lineTotal;
      } else if (t < deployedAt.getTime()) {
        baselineBefore += line.lineTotal;
      } else {
        baselineAfter += line.lineTotal;
      }
    }
    if (!hit) continue;
    bucket.orders += 1;
    bucket.revenue += targetRevenue;
    const index = Math.floor((t - (deployedAt.getTime() - seriesDays * DAY)) / DAY);
    if (index >= 0 && index < series.length) series[index].revenue += targetRevenue;
  }
  before.aov = before.orders ? before.revenue / before.orders : 0;
  after.aov = after.orders ? after.revenue / after.orders : 0;

  let uplift: number | null = null;
  let incrementalRevenue: number | null = null;
  if (windowDays > 0 && before.revenue > 0 && baselineBefore > 0 && baselineAfter > 0) {
    const storeTrend = baselineAfter / baselineBefore;
    uplift = after.revenue / before.revenue / storeTrend - 1;
    incrementalRevenue = after.revenue - before.revenue * storeTrend;
  }

  let status: CommercialStatus;
  if (targetProductIds.size === 0) status = "no_targets";
  else if (daysLive < MIN_DAYS) status = "measuring";
  else if (before.orders < LOW_N || after.orders < LOW_N || uplift === null) status = "early";
  else status = "ok";

  return {
    status,
    windowDays,
    daysLive,
    before,
    after,
    baselineBefore,
    baselineAfter,
    uplift,
    incrementalRevenue,
    series,
  };
}

// --------------------------------------------------------------------------- //
// Shopper journeys
// --------------------------------------------------------------------------- //

export type RunLite = {
  id: string;
  personaId: string;
  startedAt: Date;
  status: string;
  reachedCheckout: boolean;
  stepsOk: number;
  stepsTotal: number;
  durationMs: number | null;
  /** Friction titles the run recorded; null for runs from before frictions were saved. */
  frictions: string[] | null;
  mock: boolean;
};

export type JourneyStatus = "no_runs" | "awaiting_after" | "improved" | "unchanged" | "worse";

export type Journey = {
  status: JourneyStatus;
  before: RunLite | null;
  after: RunLite | null;
  /** The insight's own friction, when it came from a shopper run. */
  friction: { title: string; before: boolean | null; after: boolean | null } | null;
};

const TERMINAL = new Set(["stopped_before_payment", "failed", "abandoned"]);

/**
 * Latest finished run before deployment vs the first finished run after it
 * (the one closest to the change).
 * Improved when the insight's own friction is gone, or (without one) when the
 * after run has fewer frictions, reaches checkout where the before run did not,
 * or reaches it at least 10% faster.
 */
export function journeyImpact(runs: RunLite[], deployedAt: Date, frictionTitle: string | null): Journey {
  const done = runs.filter((run) => TERMINAL.has(run.status)).sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const before = [...done].reverse().find((run) => run.startedAt < deployedAt) ?? null;
  const after = done.find((run) => run.startedAt >= deployedAt) ?? null;
  const has = (run: RunLite | null) =>
    run && run.frictions && frictionTitle ? run.frictions.includes(frictionTitle) : null;
  const friction = frictionTitle ? { title: frictionTitle, before: has(before), after: has(after) } : null;

  if (!before && !after) return { status: "no_runs", before, after, friction };
  if (!after) return { status: "awaiting_after", before, after, friction };
  if (!before) return { status: "unchanged", before, after, friction };

  if (friction && friction.before !== null && friction.after !== null) {
    if (friction.before && !friction.after) return { status: "improved", before, after, friction };
    if (!friction.before && friction.after) return { status: "worse", before, after, friction };
  }
  const score = (run: RunLite) => ({
    frictions: run.frictions?.length ?? null,
    checkout: run.reachedCheckout,
    duration: run.durationMs,
  });
  const b = score(before);
  const a = score(after);
  if (a.checkout && !b.checkout) return { status: "improved", before, after, friction };
  if (!a.checkout && b.checkout) return { status: "worse", before, after, friction };
  if (a.frictions !== null && b.frictions !== null && a.frictions !== b.frictions) {
    return { status: a.frictions < b.frictions ? "improved" : "worse", before, after, friction };
  }
  if (a.duration && b.duration) {
    if (a.duration <= b.duration * 0.9) return { status: "improved", before, after, friction };
    if (a.duration >= b.duration * 1.1) return { status: "worse", before, after, friction };
  }
  return { status: "unchanged", before, after, friction };
}
