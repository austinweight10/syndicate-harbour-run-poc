import prisma from "../../db.server";
import type { BoardCard } from "../board.server";
import { agentEnabled, kickActionDrafts } from "./propose.server";
import { ACTION_VERB, parseParams, type ActionCardInput, type ActionStatus, type ActionType } from "./types";

export type ActionView = {
  id: string;
  type: ActionType;
  verb: string;
  headline: string;
  rationale: string;
  source: "agent" | "template";
  model: string | null;
  status: ActionStatus;
  errorMessage: string | null;
  simulated: boolean;
  resultMessage: string | null;
  appliedAt: string | null;
  preview: { label: string; value: string }[];
};

export type BoardActions = {
  byCard: Record<string, ActionView>;
  drafting: boolean;
  agentOn: boolean;
};

export async function loadBoardActions(
  shopId: string,
  board: { insights: BoardCard[]; frictions: BoardCard[] },
): Promise<BoardActions> {
  const cards: ActionCardInput[] = [
    ...board.insights.map((card) => toInput(card, "insight")),
    ...board.frictions.map((card) => toInput(card, "blocker")),
  ];
  const drafting = await kickActionDrafts(shopId, cards);
  const rows = await prisma.storefrontAction.findMany({
    where: { shopId, cardId: { in: cards.map((card) => card.cardId) } },
  });
  const [products, collections] = await Promise.all([
    prisma.productRow.findMany({ where: { shopId }, select: { handle: true, title: true } }),
    prisma.collectionRow.findMany({ where: { shopId }, select: { handle: true, title: true } }),
  ]);
  const productTitle = new Map(products.map((row) => [row.handle, row.title]));
  const collectionTitle = new Map(collections.map((row) => [row.handle, row.title]));

  const byCard: Record<string, ActionView> = {};
  for (const row of rows) {
    const params = parseParams(row.paramsJson);
    const preview: ActionView["preview"] = [
      { label: "Product", value: productTitle.get(params.productHandle) ?? params.productHandle },
    ];
    if ("collectionHandle" in params) {
      preview.push({
        label: "Collection",
        value: collectionTitle.get(params.collectionHandle) ?? params.collectionHandle,
      });
    }
    if (params.type === "collection_feature_product") preview.push({ label: "Position", value: "First" });
    if (params.type === "product_add_tags") preview.push({ label: "Tags", value: params.tags.join(", ") });
    if (params.type === "product_append_size_guide") {
      preview.push({ label: "Adds", value: "Size table to the product description" });
    }
    let result: { simulated?: boolean; message?: string } = {};
    try {
      result = row.resultJson ? (JSON.parse(row.resultJson) as typeof result) : {};
    } catch {
      result = {};
    }
    byCard[row.cardId] = {
      id: row.id,
      type: row.actionType as ActionType,
      verb: ACTION_VERB[row.actionType as ActionType] ?? "Apply",
      headline: row.headline,
      rationale: row.rationale,
      source: row.source === "agent" ? "agent" : "template",
      model: row.model,
      status: row.status as ActionStatus,
      errorMessage: row.errorMessage,
      simulated: Boolean(result.simulated),
      resultMessage: result.message ?? null,
      appliedAt: row.appliedAt?.toISOString() ?? null,
      preview,
    };
  }
  return { byCard, drafting, agentOn: agentEnabled() };
}

function toInput(card: BoardCard, cardKind: ActionCardInput["cardKind"]): ActionCardInput {
  return {
    cardId: card.id,
    cardKind,
    title: card.title,
    body: card.body,
    kind: card.kind,
    targetType: card.targetType,
    targetRef: card.targetRef,
    personaName: card.personaName,
    eventName: card.eventName,
  };
}
