/**
 * One-shot: redraft missing storefront actions after dropping no-op pins.
 *   TARGET_SHOP=… npx tsx scripts/redraft-actions.ts
 */
import prisma from "../app/db.server";
import { draftActions, loadCatalogue, templateDraft } from "../app/services/actions/propose.server";
import { loadBoard } from "../app/services/board.server";
import { validateDraft } from "../app/services/actions/types";

const shopId = (process.env.TARGET_SHOP || "").trim();
if (!shopId) {
  console.error("Set TARGET_SHOP");
  process.exit(1);
}

process.env.SYNDICATE_LLM_PROVIDER = process.env.SYNDICATE_LLM_PROVIDER || "off";

const deleted = await prisma.storefrontAction.deleteMany({
  where: {
    shopId,
    actionType: "collection_feature_product",
    status: { in: ["proposed", "failed", "reverted"] },
  },
});

const board = await loadBoard(shopId);
const catalogue = await loadCatalogue(shopId);
const cards = [
  ...board.insights.map((card) => ({
    cardId: card.id,
    cardKind: "insight" as const,
    title: card.title,
    body: card.body,
    kind: card.kind,
    targetType: card.targetType,
    targetRef: card.targetRef,
    personaName: card.personaName,
    eventName: card.eventName,
  })),
  ...board.frictions.map((card) => ({
    cardId: card.id,
    cardKind: "blocker" as const,
    title: card.title,
    body: card.body,
    kind: card.kind,
    targetType: card.targetType,
    targetRef: card.targetRef,
    personaName: card.personaName,
    eventName: card.eventName,
  })),
];

const missing = [];
for (const card of cards) {
  const have = await prisma.storefrontAction.findFirst({ where: { shopId, cardId: card.cardId } });
  if (!have) missing.push(card);
}

const diagnosis = missing.map((card) => {
  const draft = templateDraft(card, catalogue);
  return {
    title: card.title,
    targetRef: card.targetRef,
    draft,
    error: draft ? validateDraft(draft, catalogue) : "null draft",
  };
});

const written = await draftActions(shopId, missing);
const raceKits = catalogue.collections.find((row) => row.handle === "race-kits");
const actions = await prisma.storefrontAction.findMany({
  where: { shopId },
  select: { headline: true, actionType: true, status: true, cardId: true },
});

console.log(
  JSON.stringify(
    {
      deleted: deleted.count,
      missing: missing.length,
      written,
      raceKitsLead: raceKits?.productHandles?.[0],
      diagnosis,
      actions: actions.map((row) => ({ headline: row.headline, type: row.actionType, status: row.status })),
    },
    null,
    2,
  ),
);
await prisma.$disconnect();
