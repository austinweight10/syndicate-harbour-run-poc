/**
 * One-click storefront actions. Every type maps to a write_products mutation
 * with a recorded undo. Nothing here touches themes, orders or customers.
 */
export const ACTION_TYPES = [
  "collection_add_product",
  "collection_feature_product",
  "product_append_size_guide",
  "product_add_tags",
] as const;

export type ActionType = (typeof ACTION_TYPES)[number];

export type ActionParams =
  | { type: "collection_add_product"; collectionHandle: string; productHandle: string }
  | { type: "collection_feature_product"; collectionHandle: string; productHandle: string }
  | { type: "product_append_size_guide"; productHandle: string; sizeGuideHtml: string }
  | { type: "product_add_tags"; productHandle: string; tags: string[] };

export type ActionStatus = "proposed" | "applying" | "applied" | "failed" | "reverted";

/** A card the agent drafts for. Built from Recommendation / AffordanceScore rows. */
export type ActionCardInput = {
  cardId: string;
  cardKind: "insight" | "blocker";
  title: string;
  body: string;
  kind: string;
  targetType: string | null;
  targetRef: string | null;
  personaName: string | null;
  eventName: string | null;
};

export type CatalogueSnapshot = {
  products: { handle: string; title: string; productType: string | null; tags: string[] }[];
  collections: { handle: string; title: string; productHandles: string[] }[];
};

export type ActionDraft = {
  cardId: string;
  params: ActionParams;
  headline: string;
  rationale: string;
};

export const ACTION_VERB: Record<ActionType, string> = {
  collection_add_product: "Add to collection",
  collection_feature_product: "Pin to top of collection",
  product_append_size_guide: "Add size guide",
  product_add_tags: "Tag product",
};

const TAG_RE = /^[a-z0-9][a-z0-9 -]{0,39}$/i;

/** Rejects anything that names a product or collection not in the shop, or a no-op. */
export function validateDraft(draft: ActionDraft, catalogue: CatalogueSnapshot): string | null {
  const product = catalogue.products.find((row) => row.handle === draft.params.productHandle);
  if (!product) return `Unknown product "${draft.params.productHandle}".`;
  const params = draft.params;
  if (params.type === "collection_add_product" || params.type === "collection_feature_product") {
    const collection = catalogue.collections.find((row) => row.handle === params.collectionHandle);
    if (!collection) return `Unknown collection "${params.collectionHandle}".`;
    const member = collection.productHandles.includes(params.productHandle);
    if (params.type === "collection_add_product" && member) return "Product is already in that collection.";
    if (params.type === "collection_feature_product" && !member) return "Product is not in that collection.";
  }
  if (params.type === "product_append_size_guide") {
    const html = params.sizeGuideHtml.trim();
    if (html.length < 20 || html.length > 4000) return "Size guide must be 20–4000 characters.";
    if (/<\s*(script|iframe|style|object|embed)/i.test(html) || /\son\w+\s*=/i.test(html)) {
      return "Size guide HTML may only use plain markup.";
    }
  }
  if (params.type === "product_add_tags") {
    if (params.tags.length === 0 || params.tags.length > 5) return "Give one to five tags.";
    if (params.tags.some((tag) => !TAG_RE.test(tag))) return "Tags must be short plain words.";
    const fresh = params.tags.filter((tag) => !product.tags.includes(tag));
    if (fresh.length === 0) return "Product already has those tags.";
  }
  if (!draft.headline.trim()) return "Missing headline.";
  return null;
}

export function parseParams(raw: string): ActionParams {
  return JSON.parse(raw) as ActionParams;
}
