/**
 * Impact dashboard demo scenario.
 *
 * Seeds two insights and two occasions as "deployed to storefront" on dates
 * that sit before real shifts in the shop's orders, plus shopper runs before
 * and after each deployment. Sales figures on the Impact page are then
 * computed from the shop's real (ingested) orders; the deployments and runs
 * are demo data and show a MOCK chip.
 *
 * Nothing is written to Shopify. Rows carry source "demo_scenario" (actions,
 * packs) or ids starting "run_demo_" (runs), so --clear removes exactly them.
 * The youth tee size guide is left out on purpose: the live shopper still
 * finds that friction on stage.
 *
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run impact:demo
 *   TARGET_SHOP=syndicate-4ghkumor.myshopify.com npm run impact:demo -- --clear
 *   … -- --force   also replace real actions/packs that are not live (proposed, failed, undone)
 */
import { createHash } from "node:crypto";
import prisma from "../app/db.server";
import { recId } from "../app/services/agents/playwright-run";
import { loadDawnPath } from "../app/services/agents/path";
import type { ActionParams } from "../app/services/actions/types";
import { loadPackInput, templatePack } from "../app/services/content-pack/generate.server";
import { DEMO_SOURCE } from "../app/services/impact/board.server";

const shopId = (process.env.TARGET_SHOP || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP=your-store.myshopify.com");
  process.exit(1);
}
const clearOnly = process.argv.includes("--clear");
// --force replaces a real action/pack that is only proposed, failed or undone (never a live one).
const force = process.argv.includes("--force");
const shopTag = createHash("sha1").update(shopId).digest("hex").slice(0, 6);

const at = (iso: string) => new Date(`${iso}+01:00`);

const FRICTION = {
  xl: "Race tee has no XL size",
  copy: "Race tee copy misses the race occasion",
  shipping: "Shipping cost only appears at checkout",
  reviews: "Race tee has no visible reviews",
  raceKitsShell: "Race Kits is missing the waterproof shell",
  cookie: "Cookie banner interrupts the browse path",
} as const;

type InsightSpec = {
  title: string;
  kind: string;
  targetRef: string;
  fromShopperRun: boolean;
  persona: string;
  deployedAt: string;
  params: ActionParams;
  headline: string;
  rationale: string;
};

const INSIGHTS: InsightSpec[] = [
  {
    title: "Pin waterproof shells before the wet weekend",
    kind: "merch",
    targetRef: "waterproof-shell-jacket",
    fromShopperRun: false,
    persona: "Wet-weather trainer",
    deployedAt: "2026-09-12T09:00:00",
    params: { type: "collection_feature_product", collectionHandle: "wet-weather-training", productHandle: "waterproof-shell-jacket" },
    headline: "Pin Waterproof Shell Jacket to the top of Wet-weather training",
    rationale: "Rain is forecast and shells already sit in training baskets, so the shell leads the collection.",
  },
  {
    title: FRICTION.copy,
    kind: "insight",
    targetRef: "race-tee-unisex",
    fromShopperRun: true,
    persona: "Race-day taper",
    deployedAt: "2026-09-09T09:00:00",
    params: { type: "product_add_tags", productHandle: "race-tee-unisex", tags: ["race-day", "race-weekend"] },
    headline: "Tag Race Tee — Unisex for race-day search",
    rationale: "The shopper read the race tee as a generic tee. Race tags surface it in race-day search and filters.",
  },
];

type OccasionSpec = { name: string; deployedAt: string };

const OCCASIONS: OccasionSpec[] = [
  { name: "Race weekend — London 10K", deployedAt: "2026-09-13T08:00:00" },
  { name: "Wet weekend layers", deployedAt: "2026-09-07T08:00:00" },
];

type RunSpec = { persona: string; startedAt: string; seconds: number; frictions: string[]; failSteps?: string[]; event?: string };

// Before/after shopper runs around each deployment (compared by the dashboard).
const RUNS: RunSpec[] = [
  // Race-day taper: tags (9 Sep) do not fix the copy friction; the race pack (13 Sep) removes two.
  { persona: "Race-day taper", startedAt: "2026-09-08T19:10:00", seconds: 171, frictions: [FRICTION.xl, FRICTION.copy, FRICTION.shipping, FRICTION.reviews], failSteps: ["open_shorts"], event: "Race weekend — London 10K" },
  { persona: "Race-day taper", startedAt: "2026-09-11T19:40:00", seconds: 166, frictions: [FRICTION.xl, FRICTION.copy, FRICTION.shipping, FRICTION.reviews], event: "Race weekend — London 10K" },
  { persona: "Race-day taper", startedAt: "2026-09-16T08:20:00", seconds: 118, frictions: [FRICTION.xl, FRICTION.shipping], event: "Race weekend — London 10K" },
  // Wet-weather trainer: the wet pack (7 Sep) lands the shell via the banner; pinning (12 Sep) makes it faster.
  { persona: "Wet-weather trainer", startedAt: "2026-09-06T18:30:00", seconds: 184, frictions: [FRICTION.raceKitsShell, FRICTION.shipping, FRICTION.cookie], failSteps: ["select_size_l_shorts"], event: "Wet weekend layers" },
  { persona: "Wet-weather trainer", startedAt: "2026-09-09T18:50:00", seconds: 131, frictions: [FRICTION.raceKitsShell, FRICTION.shipping], event: "Wet weekend layers" },
  { persona: "Wet-weather trainer", startedAt: "2026-09-14T09:15:00", seconds: 94, frictions: [FRICTION.raceKitsShell, FRICTION.shipping], event: "Wet weekend layers" },
];

async function clear() {
  const actions = await prisma.storefrontAction.deleteMany({ where: { shopId, source: DEMO_SOURCE } });
  const packs = await prisma.contentPack.deleteMany({ where: { shopId, source: DEMO_SOURCE } });
  const runs = await prisma.agentRun.deleteMany({ where: { shopId, id: { startsWith: "run_demo_" } } });
  console.log(`Cleared demo scenario: ${actions.count} insights, ${packs.count} occasions, ${runs.count} shopper runs.`);
}

async function main() {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  if (!shop) throw new Error(`${shopId} is not in the database. Install or seed it first.`);
  await clear();
  if (clearOnly) return;

  const personas = await prisma.persona.findMany({ where: { shopId } });
  const personaId = (name: string) => {
    const persona = personas.find((row) => row.name === name);
    if (!persona) throw new Error(`Persona "${name}" missing for ${shopId}. Run the pipeline first.`);
    return persona.id;
  };
  const events = await prisma.eventCandidate.findMany({ where: { shopId } });
  const eventId = (name: string) => {
    const event = events.find((row) => row.name === name);
    if (!event) throw new Error(`Occasion "${name}" missing for ${shopId}. Run the pipeline first.`);
    return event.id;
  };

  for (const spec of INSIGHTS) {
    const product = await prisma.productRow.findFirst({ where: { shopId, handle: spec.params.productHandle } });
    if (!product) throw new Error(`Product ${spec.params.productHandle} missing for ${shopId}.`);
    const cardId = recId(shopId, spec.kind, spec.targetRef, spec.title);
    const existing = await prisma.storefrontAction.findUnique({ where: { shopId_cardId: { shopId, cardId } } });
    if (existing) {
      if (existing.status === "applied" || !force) {
        console.warn(`SKIP  insight "${spec.title}": a real action (${existing.status}) exists for that card${existing.status === "applied" ? "" : " — --force replaces it"}.`);
        continue;
      }
      await prisma.storefrontAction.delete({ where: { id: existing.id } });
    }
    await prisma.storefrontAction.create({
      data: {
        shopId,
        cardId,
        cardKind: spec.fromShopperRun ? "blocker" : "insight",
        actionType: spec.params.type,
        paramsJson: JSON.stringify(spec.params),
        headline: spec.headline,
        rationale: spec.rationale,
        source: DEMO_SOURCE,
        status: "applied",
        appliedAt: at(spec.deployedAt),
        createdAt: at(spec.deployedAt),
        resultJson: JSON.stringify({
          simulated: true,
          message: "Demo scenario — Shopify was not changed.",
          insightTitle: spec.title,
          frictionTitle: spec.fromShopperRun ? spec.title : undefined,
          personaId: personaId(spec.persona),
        }),
      },
    });
    console.log(`OK    insight   ${spec.deployedAt.slice(0, 10)}  ${spec.title}`);
  }

  for (const spec of OCCASIONS) {
    const id = eventId(spec.name);
    const existing = await prisma.contentPack.findUnique({ where: { shopId_eventId: { shopId, eventId: id } } });
    if (existing) {
      if (existing.status === "applied" || !force) {
        console.warn(`SKIP  occasion "${spec.name}": a real marketing pack (${existing.status}) exists for it${existing.status === "applied" ? "" : " — --force replaces it"}.`);
        continue;
      }
      await prisma.contentPack.delete({ where: { id: existing.id } });
    }
    const input = await loadPackInput(shopId, id);
    if (!input) throw new Error(`Could not build a pack for "${spec.name}".`);
    const draft = templatePack(input);
    await prisma.contentPack.create({
      data: {
        shopId,
        eventId: id,
        headline: draft.headline,
        rationale: draft.rationale,
        source: DEMO_SOURCE,
        status: "applied",
        assetsJson: JSON.stringify(draft.assets),
        personaIdsJson: JSON.stringify(draft.personaIds),
        resultJson: JSON.stringify({ simulated: true, message: "Demo scenario — Shopify was not changed." }),
        appliedAt: at(spec.deployedAt),
        createdAt: at(spec.deployedAt),
      },
    });
    console.log(`OK    occasion  ${spec.deployedAt.slice(0, 10)}  ${spec.name}`);
  }

  const path = loadDawnPath();
  const storefront = shop.storefrontUrl ?? process.env.SHOP_STOREFRONT_URL ?? null;
  for (const [index, spec] of RUNS.entries()) {
    const startedAt = at(spec.startedAt);
    const stepGap = (spec.seconds * 1000) / path.steps.length;
    const steps = path.steps.map((step, i) => ({
      id: step.id,
      ok: !(spec.failSteps ?? []).includes(step.id),
      at: new Date(startedAt.getTime() + stepGap * (i + 1)).toISOString(),
      note: step.note,
    }));
    await prisma.agentRun.create({
      data: {
        id: `run_demo_${shopTag}_${index + 1}_${spec.startedAt.slice(0, 10).replaceAll("-", "")}`,
        shopId,
        personaId: personaId(spec.persona),
        eventId: spec.event ? eventId(spec.event) : null,
        status: "stopped_before_payment",
        outcome: "checkout_started",
        startedAt,
        endedAt: new Date(startedAt.getTime() + spec.seconds * 1000),
        progressPct: 100,
        storefrontUrl: storefront,
        timelineJson: JSON.stringify({
          pathId: path.pathId,
          demoScenario: true,
          headed: false,
          steps,
          frictions: spec.frictions.map((title) => ({ kind: "demo", targetRef: "", title })),
        }),
      },
    });
  }
  console.log(`OK    ${RUNS.length} shopper runs (demo)`);
}

await main().finally(() => prisma.$disconnect());
