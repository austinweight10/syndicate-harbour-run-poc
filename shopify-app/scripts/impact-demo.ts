/**
 * Impact dashboard demo scenario.
 *
 * Seeds two insights and two occasions as "deployed to storefront". Each
 * deployment date is chosen from the shop's real (ingested) orders: a day
 * where sales of the targeted products rose relative to the rest of the
 * store, with enough orders either side to count as measured. The dashboard
 * then computes those figures from the real orders.
 *
 * Conversion rate needs session counts, which Syndicate cannot read today, so
 * the scenario stores demo traffic alongside each deployment, sized so that
 * orders ÷ sessions gives a realistic product conversion rate.
 *
 * Nothing is written to Shopify. Rows carry source "demo_scenario" and show a
 * MOCK chip; --clear removes exactly them. The youth tee size guide is left
 * out on purpose: the live shopper still finds that friction on stage.
 *
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run impact:demo
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run impact:demo -- --clear
 *   … -- --force   also replace real actions/packs that are not live (proposed, failed, undone)
 */
import { createHash } from "node:crypto";
import prisma from "../app/db.server";
import type { ActionParams } from "../app/services/actions/types";
import { loadPackInput, templatePack } from "../app/services/content-pack/generate.server";
import { DEMO_SOURCE, actionTargets, loadShopOrders, packTargets } from "../app/services/impact/board.server";
import { commercialImpact, type OrderLite, type Traffic } from "../app/services/impact/metrics";

const shopId = (process.env.TARGET_SHOP || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=your-store.myshopify.com");
  process.exit(1);
}
const clearOnly = process.argv.includes("--clear");
const force = process.argv.includes("--force");

const DAY = 24 * 60 * 60 * 1000;
const at = (iso: string) => new Date(`${iso}+01:00`);

/** Same card id the app uses for recommendations and shopper findings. */
function recId(kind: string, targetRef: string, title: string): string {
  return createHash("sha256").update([shopId, kind, targetRef, title].join("|")).digest("hex").slice(0, 24);
}

type Aim = {
  /** Preferred deployment day; the closest good day to it wins ties. */
  near: string;
  /** Sales uplift to aim for (vs rest of store). */
  uplift: number;
  /** Product conversion before, and relative lift after. */
  conversionBefore: number;
  conversionLift: number;
};

type InsightSpec = {
  title: string;
  kind: string;
  targetRef: string;
  params: ActionParams;
  headline: string;
  rationale: string;
  aim: Aim;
};

const INSIGHTS: InsightSpec[] = [
  {
    title: "Pin waterproof shells before the wet weekend",
    kind: "merch",
    targetRef: "waterproof-shell-jacket",
    params: { type: "collection_feature_product", collectionHandle: "wet-weather-training", productHandle: "waterproof-shell-jacket" },
    headline: "Pin Waterproof Shell Jacket to the top of Wet-weather training",
    rationale: "Rain is forecast and shells already sit in training baskets, so the shell leads the collection.",
    aim: { near: "2026-09-12", uplift: 0.35, conversionBefore: 0.024, conversionLift: 0.28 },
  },
  {
    title: "Race tee copy misses the race occasion",
    kind: "insight",
    targetRef: "race-tee-unisex",
    params: { type: "product_add_tags", productHandle: "race-tee-unisex", tags: ["race-day", "race-weekend"] },
    headline: "Tag Race Tee — Unisex for race-day search",
    rationale: "The shopper read the race tee as a generic tee. Race tags surface it in race-day search and filters.",
    aim: { near: "2026-09-09", uplift: 0.2, conversionBefore: 0.031, conversionLift: 0.16 },
  },
];

type OccasionSpec = { name: string; aim: Aim };

const OCCASIONS: OccasionSpec[] = [
  { name: "Race weekend — London 10K", aim: { near: "2026-09-13", uplift: 0.3, conversionBefore: 0.027, conversionLift: 0.24 } },
  { name: "Wet weekend layers", aim: { near: "2026-09-07", uplift: 0.45, conversionBefore: 0.019, conversionLift: 0.33 } },
];

const SEARCH_FROM = "2026-08-20";
const MIN_UPLIFT = 0.1;
const MAX_UPLIFT = 0.9;

/**
 * Pick a deployment day (09:00 London) where the targets' sales rose vs the
 * store with enough orders to be "measured", closest to the aimed uplift and
 * then to the preferred day.
 */
function chooseDeployment(orders: OrderLite[], targets: Set<string>, aim: Aim, now: Date) {
  const latest = Math.max(...orders.map((order) => order.at.getTime()));
  const last = new Date(Math.min(latest, now.getTime()) - 10 * DAY);
  const near = at(`${aim.near}T09:00:00`).getTime();
  let best: { date: Date; uplift: number; score: number; measured: boolean } | null = null;
  for (let day = at(`${SEARCH_FROM}T09:00:00`); day <= last; day = new Date(day.getTime() + DAY)) {
    const c = commercialImpact(orders, targets, day, now);
    if (c.uplift === null) continue;
    const measured = c.status === "ok";
    const inRange = c.uplift >= MIN_UPLIFT && c.uplift <= MAX_UPLIFT;
    // Measured and in range first; then closeness to the aim; then to the preferred day.
    const score =
      (measured ? 0 : 10) + (inRange ? 0 : 5) + Math.abs(c.uplift - aim.uplift) + Math.abs(day.getTime() - near) / (30 * DAY);
    if (!best || score < best.score) best = { date: day, uplift: c.uplift, score, measured };
  }
  return best;
}

/** Sessions either side so that orders ÷ sessions reads as the aimed conversion rates. */
function demoTraffic(orders: OrderLite[], targets: Set<string>, deployedAt: Date, now: Date, aim: Aim): Traffic {
  const c = commercialImpact(orders, targets, deployedAt, now);
  const after = aim.conversionBefore * (1 + aim.conversionLift);
  return {
    sessionsBefore: Math.max(c.before.orders + 1, Math.round(c.before.orders / aim.conversionBefore)),
    sessionsAfter: Math.max(c.after.orders + 1, Math.round(c.after.orders / after)),
  };
}

async function clear() {
  const actions = await prisma.storefrontAction.deleteMany({ where: { shopId, source: DEMO_SOURCE } });
  const packs = await prisma.contentPack.deleteMany({ where: { shopId, source: DEMO_SOURCE } });
  // Earlier versions of this scenario also seeded shopper runs.
  await prisma.agentRun.deleteMany({ where: { shopId, id: { startsWith: "run_demo_" } } });
  console.log(`Cleared demo scenario: ${actions.count} insights, ${packs.count} occasions.`);
}

async function main() {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error(`${shopId} is not in the database. Install or seed it first.`);
  await clear();
  if (clearOnly) return;

  const now = new Date();
  const orders = await loadShopOrders(shopId);
  if (orders.length === 0) throw new Error(`${shopId} has no orders. Run ingest / the pipeline first.`);
  const events = await prisma.eventCandidate.findMany({ where: { shopId } });
  const report = (label: string, choice: NonNullable<ReturnType<typeof chooseDeployment>>) =>
    console.log(
      `OK    ${label.padEnd(9)} ${choice.date.toISOString().slice(0, 10)}  ${choice.uplift >= 0 ? "+" : ""}${Math.round(choice.uplift * 100)}% vs store${choice.measured ? "" : " (early signal)"}`,
    );

  for (const spec of INSIGHTS) {
    const cardId = recId(spec.kind, spec.targetRef, spec.title);
    const existing = await prisma.storefrontAction.findUnique({ where: { shopId_cardId: { shopId, cardId } } });
    if (existing) {
      if (existing.status === "applied" || !force) {
        console.warn(`SKIP  insight "${spec.title}": a real action (${existing.status}) exists${existing.status === "applied" ? "" : " — --force replaces it"}.`);
        continue;
      }
      await prisma.storefrontAction.delete({ where: { id: existing.id } });
    }
    const targets = await actionTargets(shopId, spec.params);
    if (targets.size === 0) throw new Error(`Product ${spec.params.productHandle} missing for ${shopId}.`);
    const choice = chooseDeployment(orders, targets, spec.aim, now);
    if (!choice) throw new Error(`No usable deployment day for "${spec.title}".`);
    await prisma.storefrontAction.create({
      data: {
        shopId,
        cardId,
        cardKind: spec.kind === "insight" ? "blocker" : "insight",
        actionType: spec.params.type,
        paramsJson: JSON.stringify(spec.params),
        headline: spec.headline,
        rationale: spec.rationale,
        source: DEMO_SOURCE,
        status: "applied",
        appliedAt: choice.date,
        createdAt: choice.date,
        resultJson: JSON.stringify({
          simulated: true,
          message: "Demo scenario — Shopify was not changed.",
          insightTitle: spec.title,
          demoTraffic: demoTraffic(orders, targets, choice.date, now, spec.aim),
        }),
      },
    });
    report("insight", choice);
  }

  for (const spec of OCCASIONS) {
    const event = events.find((row) => row.name === spec.name);
    if (!event) throw new Error(`Occasion "${spec.name}" missing for ${shopId}. Run the pipeline first.`);
    const existing = await prisma.contentPack.findUnique({ where: { shopId_eventId: { shopId, eventId: event.id } } });
    if (existing) {
      if (existing.status === "applied" || !force) {
        console.warn(`SKIP  occasion "${spec.name}": a real pack (${existing.status}) exists${existing.status === "applied" ? "" : " — --force replaces it"}.`);
        continue;
      }
      await prisma.contentPack.delete({ where: { id: existing.id } });
    }
    const input = await loadPackInput(shopId, event.id);
    if (!input) throw new Error(`Could not build a pack for "${spec.name}".`);
    const draft = templatePack(input);
    const targets = await packTargets(shopId, event.id, draft.assets.banner.ctaPath);
    const choice = chooseDeployment(orders, targets, spec.aim, now);
    if (!choice) throw new Error(`No usable deployment day for "${spec.name}".`);
    await prisma.contentPack.create({
      data: {
        shopId,
        eventId: event.id,
        headline: draft.headline,
        rationale: draft.rationale,
        source: DEMO_SOURCE,
        status: "applied",
        assetsJson: JSON.stringify(draft.assets),
        personaIdsJson: JSON.stringify(draft.personaIds),
        resultJson: JSON.stringify({
          simulated: true,
          message: "Demo scenario — Shopify was not changed.",
          demoTraffic: demoTraffic(orders, targets, choice.date, now, spec.aim),
        }),
        appliedAt: choice.date,
        createdAt: choice.date,
      },
    });
    report("occasion", choice);
  }
}

await main().finally(() => prisma.$disconnect());
