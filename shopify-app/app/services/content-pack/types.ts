/**
 * One-click marketing pack for a trending occasion.
 * Deploys blog + marketing page + banner metafield + email draft page + customer segments.
 */

export type PackStatus = "proposed" | "applying" | "applied" | "failed" | "reverted";

export type BlogAsset = {
  title: string;
  handle: string;
  summary: string;
  bodyHtml: string;
};

export type PageAsset = {
  title: string;
  handle: string;
  bodyHtml: string;
};

export type BannerAsset = {
  headline: string;
  body: string;
  ctaLabel: string;
  ctaPath: string;
};

export type EmailAsset = {
  subject: string;
  previewText: string;
  bodyHtml: string;
  personaTargets: string[];
};

export type SegmentAsset = {
  personaId: string;
  personaName: string;
  name: string;
  query: string;
  description: string;
};

export type ContentPackAssets = {
  blog: BlogAsset;
  page: PageAsset;
  banner: BannerAsset;
  email: EmailAsset;
  segments: SegmentAsset[];
};

export type PackGenerateInput = {
  eventId: string;
  eventName: string;
  archetype: string;
  confidence: number;
  city: string | null;
  windowLabel: string | null;
  topSkus: { title: string; handle?: string | null }[];
  personas: {
    id: string;
    name: string;
    status: string;
    goals: string[];
    budgetMin: number;
    budgetMax: number;
    locationProxy: string | null;
  }[];
  collections: { handle: string; title: string }[];
};

export type ContentPackDraft = {
  eventId: string;
  headline: string;
  rationale: string;
  assets: ContentPackAssets;
  personaIds: string[];
};

/** Minimum confidence (0–1) for an occasion to count as “trending well”. */
export const TRENDING_CONFIDENCE = 0.45;

export function parseAssets(raw: string): ContentPackAssets {
  return JSON.parse(raw) as ContentPackAssets;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[—–].*$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "occasion";
}
