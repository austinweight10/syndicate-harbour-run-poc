/** Spec insight kinds — DATA_DICTIONARY / epic 06. */
export const INSIGHT_KINDS = [
  "dead_end",
  "missing_variant",
  "weak_copy",
  "ux_trap",
  "price_shock",
  "trust",
  "sizing",
] as const;

export type InsightKind = (typeof INSIGHT_KINDS)[number];

export const INSIGHT_KIND_LABELS: Record<InsightKind, string> = {
  dead_end: "Collection / path dead end",
  missing_variant: "Missing size or colour",
  weak_copy: "Weak occasion copy",
  ux_trap: "UX trap",
  price_shock: "Price or shipping shock",
  trust: "Trust gap",
  sizing: "Sizing help missing",
};
