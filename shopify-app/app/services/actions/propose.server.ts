import Anthropic from "@anthropic-ai/sdk";
import prisma from "../../db.server";
import {
  ACTION_TYPES,
  validateDraft,
  type ActionCardInput,
  type ActionDraft,
  type ActionParams,
  type CatalogueSnapshot,
} from "./types";

/**
 * Drafts one storefront action per Insights board card.
 *
 * The agent is one batched Claude call over aggregate, non-PII inputs: card
 * text plus product / collection handles. Output is schema-constrained, then
 * validated against the real catalogue — a draft naming an unknown handle is
 * dropped and the template stands in. With no ANTHROPIC_API_KEY (or
 * SYNDICATE_LLM_PROVIDER=off) templates run alone, so the demo works offline.
 */

const DEFAULT_MODEL = "claude-opus-5";
const inflight = new Set<string>();

export function isDrafting(shopId: string): boolean {
  return inflight.has(shopId);
}

export function agentEnabled(): boolean {
  if (process.env.SYNDICATE_LLM_PROVIDER === "off") return false;
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Loader hook: drafts missing actions in the background. Returns true while drafting. */
export async function kickActionDrafts(shopId: string, cards: ActionCardInput[]): Promise<boolean> {
  if (inflight.has(shopId)) return true;
  const existing = await prisma.storefrontAction.findMany({
    where: { shopId, cardId: { in: cards.map((card) => card.cardId) } },
    select: { cardId: true },
  });
  const have = new Set(existing.map((row) => row.cardId));
  const missing = cards.filter((card) => !have.has(card.cardId));
  if (missing.length === 0) return false;
  inflight.add(shopId);
  void draftActions(shopId, missing)
    .catch((error) => console.error("actions.draft_failed", error instanceof Error ? error.message : error))
    .finally(() => inflight.delete(shopId));
  return true;
}

/** Drops the proposal so the agent drafts afresh on next load. Applied actions stay. */
export async function redraftAction(shopId: string, cardId: string): Promise<void> {
  await prisma.storefrontAction.deleteMany({
    where: { shopId, cardId, status: { in: ["proposed", "failed", "reverted"] } },
  });
}

export async function draftActions(shopId: string, cards: ActionCardInput[]): Promise<number> {
  const catalogue = await loadCatalogue(shopId);
  const agentDrafts = agentEnabled() ? await askAgent(cards, catalogue) : new Map<string, ActionDraft>();
  const model = process.env.SYNDICATE_LLM_MODEL || DEFAULT_MODEL;
  let written = 0;
  for (const card of cards) {
    const fromAgent = agentDrafts.get(card.cardId);
    const agentOk = fromAgent && !validateDraft(fromAgent, catalogue) ? fromAgent : null;
    const draft = agentOk ?? templateDraft(card, catalogue);
    if (!draft) continue;
    const data = {
      cardKind: card.cardKind,
      actionType: draft.params.type,
      paramsJson: JSON.stringify(draft.params),
      headline: draft.headline.slice(0, 140),
      rationale: draft.rationale.slice(0, 600),
      source: agentOk ? "agent" : "template",
      model: agentOk ? model : null,
      status: "proposed",
      undoJson: null,
      resultJson: null,
      errorMessage: null,
    };
    await prisma.storefrontAction.upsert({
      where: { shopId_cardId: { shopId, cardId: card.cardId } },
      create: { shopId, cardId: card.cardId, ...data },
      update: data,
    });
    written += 1;
  }
  return written;
}

export async function loadCatalogue(shopId: string): Promise<CatalogueSnapshot> {
  const [products, collections] = await Promise.all([
    prisma.productRow.findMany({ where: { shopId }, orderBy: { title: "asc" } }),
    prisma.collectionRow.findMany({ where: { shopId }, orderBy: { title: "asc" } }),
  ]);
  const links = await prisma.productCollection.findMany({
    where: { collectionId: { in: collections.map((row) => row.id) } },
  });
  const handleById = new Map(products.map((row) => [row.id, row.handle ?? ""]));
  return {
    products: products
      .filter((row) => row.handle)
      .map((row) => ({
        handle: row.handle as string,
        title: row.title,
        productType: row.productType,
        tags: (row.tags ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      })),
    collections: collections
      .filter((row) => row.handle)
      .map((row) => ({
        handle: row.handle as string,
        title: row.title,
        productHandles: links
          .filter((link) => link.collectionId === row.id)
          .map((link) => handleById.get(link.productId) ?? "")
          .filter(Boolean),
      })),
  };
}

const SYSTEM_PROMPT = `You are Syndicate's merchandising agent for a Shopify sportswear shop.
For each board card you receive (an insight to lean into, or a blocker that may stop a purchase), choose exactly one storefront change the merchant can ship in one click. The change must directly address what the card says.

Available changes (all reversible):
- collection_add_product: put a product into a collection it is missing from.
- collection_feature_product: move a product that is already in a collection to the top of it.
- product_append_size_guide: append a short size guide to a product description. Write plain HTML only (<h3>, <p>, <table>, <tr>, <th>, <td>, <ul>, <li>). British sizing, cm. No scripts, styles or links.
- product_add_tags: add one to five short lowercase tags to a product (for search, filters and automated collections).

Rules:
- Use only product and collection handles that appear in the catalogue. Never invent handles.
- collection_add_product only when the product is not already in that collection; collection_feature_product only when it is.
- Set fields that do not apply to null (or an empty tags list).
- headline: an imperative button label under 70 characters naming the product and where it goes, e.g. "Add Waterproof Shell Jacket to Race Kits".
- rationale: one or two sentences in British English, merchant voice, tying the change to the card's evidence. No hype, no invented numbers.
- Return one action per card, keyed by cardId.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    actions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cardId: { type: "string" },
          type: { type: "string", enum: [...ACTION_TYPES] },
          productHandle: { type: "string" },
          collectionHandle: { anyOf: [{ type: "string" }, { type: "null" }] },
          tags: { type: "array", items: { type: "string" } },
          sizeGuideHtml: { anyOf: [{ type: "string" }, { type: "null" }] },
          headline: { type: "string" },
          rationale: { type: "string" },
        },
        required: [
          "cardId",
          "type",
          "productHandle",
          "collectionHandle",
          "tags",
          "sizeGuideHtml",
          "headline",
          "rationale",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["actions"],
  additionalProperties: false,
} as const;

type RawAgentAction = {
  cardId: string;
  type: (typeof ACTION_TYPES)[number];
  productHandle: string;
  collectionHandle: string | null;
  tags: string[];
  sizeGuideHtml: string | null;
  headline: string;
  rationale: string;
};

async function askAgent(
  cards: ActionCardInput[],
  catalogue: CatalogueSnapshot,
): Promise<Map<string, ActionDraft>> {
  const drafts = new Map<string, ActionDraft>();
  const payload = JSON.stringify({ cards, catalogue }, null, 1);
  // AI_CALL_CONTRACT PII guard: aggregate cards only, never customer data.
  if (/@/.test(payload) || payload.includes("gid://shopify/Customer")) {
    console.warn("llm.pii_guard_rejected", { purpose: "ai.storefrontAction" });
    return drafts;
  }

  try {
    const client = new Anthropic({ timeout: 90_000, maxRetries: 1 });
    const response = await client.beta.messages.create({
      model: process.env.SYNDICATE_LLM_MODEL || DEFAULT_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA as unknown as Record<string, unknown> },
      },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Draft one storefront action per card.\n\n${payload}`,
        },
      ],
    });
    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") {
      console.warn("actions.agent_stopped", { stop_reason: response.stop_reason });
      return drafts;
    }
    const text = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
    const parsed = JSON.parse(text) as { actions: RawAgentAction[] };
    for (const raw of parsed.actions ?? []) {
      const params = toParams(raw);
      if (!params) continue;
      drafts.set(raw.cardId, {
        cardId: raw.cardId,
        params,
        headline: raw.headline,
        rationale: raw.rationale,
      });
    }
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.warn("actions.agent_auth_failed — templates only");
    } else if (error instanceof Anthropic.RateLimitError) {
      console.warn("actions.agent_rate_limited — templates only");
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`actions.agent_api_error ${error.status} — templates only`);
    } else {
      console.warn("actions.agent_failed — templates only", error instanceof Error ? error.message : error);
    }
  }
  return drafts;
}

function toParams(raw: RawAgentAction): ActionParams | null {
  switch (raw.type) {
    case "collection_add_product":
    case "collection_feature_product":
      if (!raw.collectionHandle) return null;
      return { type: raw.type, collectionHandle: raw.collectionHandle, productHandle: raw.productHandle };
    case "product_append_size_guide":
      if (!raw.sizeGuideHtml) return null;
      return { type: raw.type, productHandle: raw.productHandle, sizeGuideHtml: raw.sizeGuideHtml };
    case "product_add_tags":
      return {
        type: raw.type,
        productHandle: raw.productHandle,
        tags: raw.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean),
      };
    default:
      return null;
  }
}

const YOUTH_SIZE_GUIDE = `<h3>Size guide</h3>
<table>
<tr><th>Size</th><th>Age</th><th>Chest (cm)</th><th>Height (cm)</th></tr>
<tr><td>XS</td><td>5–6</td><td>60–63</td><td>110–116</td></tr>
<tr><td>S</td><td>7–8</td><td>64–67</td><td>122–128</td></tr>
<tr><td>M</td><td>9–10</td><td>68–72</td><td>134–140</td></tr>
<tr><td>L</td><td>11–12</td><td>73–77</td><td>146–152</td></tr>
<tr><td>XL</td><td>13–14</td><td>78–82</td><td>158–164</td></tr>
</table>
<p>Between sizes? Size up for layering on cold race mornings.</p>`;

/**
 * Deterministic fallback — same shape the agent returns. Covers the Harbour Run
 * cards by target; anything else gets a tag keyed to the card's occasion.
 */
export function templateDraft(card: ActionCardInput, catalogue: CatalogueSnapshot): ActionDraft | null {
  const collection = (handle: string) => catalogue.collections.find((row) => row.handle === handle);
  const product = (handle: string) => catalogue.products.find((row) => row.handle === handle);
  const candidates: ActionDraft[] = [];
  const text = `${card.title} ${card.body}`.toLowerCase();

  if (card.targetType === "collection" && card.targetRef) {
    const target = collection(card.targetRef);
    const shell = product("waterproof-shell-jacket");
    if (target && shell && /shell|rain|waterproof|wet/.test(text)) {
      candidates.push({
        cardId: card.cardId,
        params: { type: "collection_add_product", collectionHandle: target.handle, productHandle: shell.handle },
        headline: `Add ${shell.title} to ${target.title}`,
        rationale: `Shoppers browsing ${target.title} look for rain cover next to the kit. Adding the shell removes the dead end.`,
      });
    }
  }

  if (card.targetType === "product" && card.targetRef) {
    const target = product(card.targetRef);
    if (target && /size guide|sizing/.test(text)) {
      candidates.push({
        cardId: card.cardId,
        params: { type: "product_append_size_guide", productHandle: target.handle, sizeGuideHtml: YOUTH_SIZE_GUIDE },
        headline: `Add a size guide to ${target.title}`,
        rationale: "Parents can't check fit without one. A short chest-and-height table answers the question on the page.",
      });
    }
    const home = catalogue.collections.find((row) => row.productHandles.includes(target?.handle ?? ""));
    const preferred =
      (/wet|rain|shell|waterproof/.test(text) && collection("wet-weather-training")) ||
      (/race|kit|tee/.test(text) && collection("race-kits")) ||
      home;
    if (target && preferred?.productHandles.includes(target.handle)) {
      candidates.push({
        cardId: card.cardId,
        params: { type: "collection_feature_product", collectionHandle: preferred.handle, productHandle: target.handle },
        headline: `Pin ${target.title} to the top of ${preferred.title}`,
        rationale: `${card.eventName ?? "The coming occasion"} points shoppers at ${target.title}. Lead ${preferred.title} with it so it is the first thing they see.`,
      });
    }
    if (target && card.eventName) {
      const tag = card.eventName
        .toLowerCase()
        .replace(/[—–].*$/, "")
        .replace(/[^a-z0-9 ]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .slice(0, 40);
      if (tag) {
        candidates.push({
          cardId: card.cardId,
          params: { type: "product_add_tags", productHandle: target.handle, tags: [tag] },
          headline: `Tag ${target.title} “${tag}”`,
          rationale: `Tagging lets search, filters and automated collections pick ${target.title} up for ${card.eventName}.`,
        });
      }
    }
  }

  return candidates.find((draft) => !validateDraft(draft, catalogue)) ?? null;
}
