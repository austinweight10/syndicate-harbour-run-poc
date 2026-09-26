export type ProvenanceTone = "observed" | "aggregate" | "hypothesis" | "proxy" | "mock";

export type PersonaAttribute = {
  label: string;
  value: string;
  source?: string;
  tone?: ProvenanceTone;
  icon?: "search" | "zap" | "clock" | "target" | "card" | "pin" | "flag" | "trend" | "shield" | "bag";
};

export type LikelyProduct = {
  title: string;
  handle: string | null;
  productType: string | null;
  fromPrice: number | null;
  why: string;
  matched: boolean;
};

export type PersonaProfileSection = {
  id: "products" | "behaviours" | "predictions";
  title: string;
  intro: string;
  items: PersonaAttribute[];
  products?: LikelyProduct[];
};

export type PersonaConstraints = {
  sizes?: string[];
  colours?: string[];
  mobileFirst?: boolean;
  timePressure?: boolean;
  weatherAware?: boolean;
  avoidKidsAisle?: boolean;
  deliveryBy?: string;
  brief?: string;
};

export type PersonaBehavioural = {
  impulseVsDeliberate?: "impulse" | "deliberate" | string;
  collectionFirstVsSearch?: "collection" | "search" | string;
  brief?: string;
};

export type CatalogueProduct = {
  id: string;
  title: string;
  handle: string | null;
  productType: string | null;
  tags: string[];
  fromPrice: number | null;
};

function asRecord(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function parseConstraints(raw: string | null | undefined): PersonaConstraints {
  const row = asRecord(raw);
  return {
    sizes: asStringList(row.sizes),
    colours: asStringList(row.colours),
    mobileFirst: typeof row.mobileFirst === "boolean" ? row.mobileFirst : undefined,
    timePressure: typeof row.timePressure === "boolean" ? row.timePressure : undefined,
    weatherAware: typeof row.weatherAware === "boolean" ? row.weatherAware : undefined,
    avoidKidsAisle: typeof row.avoidKidsAisle === "boolean" ? row.avoidKidsAisle : undefined,
    deliveryBy: typeof row.deliveryBy === "string" ? row.deliveryBy : undefined,
    brief: typeof row.brief === "string" ? row.brief : undefined,
  };
}

export function parseBehavioural(raw: string | null | undefined): PersonaBehavioural {
  const row = asRecord(raw);
  return {
    impulseVsDeliberate: typeof row.impulseVsDeliberate === "string" ? row.impulseVsDeliberate : undefined,
    collectionFirstVsSearch:
      typeof row.collectionFirstVsSearch === "string" ? row.collectionFirstVsSearch : undefined,
    brief: typeof row.brief === "string" ? row.brief : undefined,
  };
}

function parseMockFlags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseProductMeta(raw: string | null | undefined): { fromPrice: number | null } {
  const row = asRecord(raw);
  const price = row.fromPrice;
  if (typeof price === "number" && Number.isFinite(price)) return { fromPrice: price };
  if (typeof price === "string" && price.trim() !== "" && Number.isFinite(Number(price))) {
    return { fromPrice: Number(price) };
  }
  return { fromPrice: null };
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function deliveryLabel(value: string): string {
  if (value === "race-morning") return "Needs kit delivered before race morning";
  return titleCase(value);
}

function hasFlag(flags: string[], needle: string): boolean {
  return flags.some((flag) => flag.toLowerCase().includes(needle.toLowerCase()));
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !["the", "and", "for", "with", "unisex"].includes(token));
}

function scoreGoalAgainstProduct(goal: string, product: CatalogueProduct): number {
  const goalLower = goal.toLowerCase();
  const titleLower = product.title.toLowerCase();
  if (goalLower === titleLower) return 100;
  if (titleLower.includes(goalLower) || goalLower.includes(titleLower)) return 80;
  const goalTokens = tokens(goal);
  const hay = `${product.title} ${product.handle ?? ""} ${product.tags.join(" ")}`.toLowerCase();
  const hits = goalTokens.filter((token) => hay.includes(token)).length;
  if (hits === 0) return 0;
  return Math.min(75, 20 + hits * 15);
}

const WHY_BY_RANK = [
  "Top purchase in this shopper’s order pattern",
  "Often in the same baskets",
  "Common add-on for this shopper",
];

/** Map persona goals onto catalogue products where we can. */
export function resolveLikelyProducts(goals: string[], catalogue: CatalogueProduct[]): LikelyProduct[] {
  const used = new Set<string>();
  const likes: LikelyProduct[] = [];

  for (let index = 0; index < goals.length; index += 1) {
    const goal = goals[index]!;
    let best: { product: CatalogueProduct; score: number } | null = null;
    for (const product of catalogue) {
      if (used.has(product.id)) continue;
      const score = scoreGoalAgainstProduct(goal, product);
      if (score < 25) continue;
      if (!best || score > best.score) best = { product, score };
    }

    if (best) {
      used.add(best.product.id);
      likes.push({
        title: best.product.title,
        handle: best.product.handle,
        productType: best.product.productType,
        fromPrice: best.product.fromPrice,
        why: WHY_BY_RANK[Math.min(index, WHY_BY_RANK.length - 1)]!,
        matched: true,
      });
    } else {
      likes.push({
        title: goal,
        handle: null,
        productType: null,
        fromPrice: null,
        why: WHY_BY_RANK[Math.min(index, WHY_BY_RANK.length - 1)]!,
        matched: false,
      });
    }
  }

  return likes;
}

const FROM_ORDERS = "From your orders";
const ESTIMATE = "Our estimate";

/** Three merchant-facing blocks: products they like, how they shop, what we predict next. */
export function personaProfileSections(input: {
  goals: string[];
  catalogue?: CatalogueProduct[];
  budgetMin: number;
  budgetMax: number;
  locationProxy: string | null;
  eventName: string | null;
  constraints: PersonaConstraints;
  behavioural: PersonaBehavioural;
  mockFlags?: string[];
}): PersonaProfileSection[] {
  const flags = input.mockFlags ?? [];
  const weatherIsProxy = hasFlag(flags, "weather") || Boolean(input.constraints.weatherAware);
  const products = resolveLikelyProducts(input.goals, input.catalogue ?? []);

  const productExtras: PersonaAttribute[] = [];
  if (input.constraints.sizes && input.constraints.sizes.length > 0) {
    productExtras.push({
      label: "Likely size",
      value: `Usually picks size ${input.constraints.sizes.join(" or ")}`,
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "target",
    });
  }
  if (input.constraints.colours && input.constraints.colours.length > 0) {
    productExtras.push({
      label: "Colour lean",
      value: `Drawn to ${input.constraints.colours.map(titleCase).join(" or ")}`,
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "bag",
    });
  }
  if (input.constraints.avoidKidsAisle) {
    productExtras.push({
      label: "Skips",
      value: "Kids’ products",
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "shield",
    });
  }

  const behaviours: PersonaAttribute[] = [];
  if (input.behavioural.collectionFirstVsSearch) {
    behaviours.push({
      label: "How they shop",
      value:
        input.behavioural.collectionFirstVsSearch === "search"
          ? "Starts with search"
          : input.behavioural.collectionFirstVsSearch === "collection"
            ? "Browses collections first"
            : titleCase(input.behavioural.collectionFirstVsSearch),
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "search",
    });
  }
  if (input.behavioural.impulseVsDeliberate) {
    behaviours.push({
      label: "Decision style",
      value:
        input.behavioural.impulseVsDeliberate === "impulse"
          ? "Decides quickly and moves on"
          : input.behavioural.impulseVsDeliberate === "deliberate"
            ? "Takes time to compare options"
            : titleCase(input.behavioural.impulseVsDeliberate),
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "target",
    });
  }
  if (input.constraints.mobileFirst != null) {
    behaviours.push({
      label: "Shops on",
      value: input.constraints.mobileFirst ? "Mostly on a phone" : "Happy on phone or desktop",
      source: ESTIMATE,
      tone: hasFlag(flags, "device") || hasFlag(flags, "mobile") ? "mock" : "hypothesis",
      icon: "zap",
    });
  }
  if (input.constraints.timePressure != null) {
    behaviours.push({
      label: "In a hurry?",
      value: input.constraints.timePressure
        ? "Yes — leaves if sizing or delivery is unclear"
        : "No — happy to browse and compare",
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "clock",
    });
  }

  const predictions: PersonaAttribute[] = [
    {
      label: "Typical spend",
      value: `Likely to spend £${input.budgetMin.toFixed(0)}–£${input.budgetMax.toFixed(0)} this visit`,
      source: FROM_ORDERS,
      tone: "aggregate",
      icon: "card",
    },
  ];
  if (input.eventName) {
    predictions.push({
      label: "Occasion",
      value: `Shopping for ${input.eventName}`,
      source: FROM_ORDERS,
      tone: "observed",
      icon: "flag",
    });
  }
  if (input.locationProxy) {
    predictions.push({
      label: "Area",
      value: `Most orders ship to ${input.locationProxy}`,
      source: FROM_ORDERS,
      tone: "proxy",
      icon: "pin",
    });
  }
  if (input.constraints.weatherAware) {
    predictions.push({
      label: "Weather",
      value: "More likely to buy when rain is forecast",
      source: weatherIsProxy ? "Weather signal" : ESTIMATE,
      tone: weatherIsProxy ? "proxy" : "hypothesis",
      icon: "trend",
    });
  }
  if (input.constraints.deliveryBy) {
    predictions.push({
      label: "Needs by",
      value: deliveryLabel(input.constraints.deliveryBy),
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "clock",
    });
  }
  if (input.constraints.timePressure) {
    predictions.push({
      label: "Risk",
      value: "May abandon if size guide or delivery is hard to find",
      source: ESTIMATE,
      tone: "hypothesis",
      icon: "shield",
    });
  }

  const sections: PersonaProfileSection[] = [
    {
      id: "products",
      title: "Most likely to like",
      intro: "Products this shopper usually goes for — matched to your catalogue where we can.",
      products,
      items: productExtras,
    },
    {
      id: "behaviours",
      title: "Typical behaviours",
      intro: "How they tend to move around your shop.",
      items: behaviours,
    },
    {
      id: "predictions",
      title: "Predictions",
      intro: "What we expect on their next visit — some from orders, some estimated.",
      items: predictions,
    },
  ];

  return sections.filter((section) => (section.products?.length ?? 0) > 0 || section.items.length > 0);
}

/** Short facts for list cards — keep scannable. */
export function personaFactLabels(input: {
  behavioural: PersonaBehavioural;
  constraints: PersonaConstraints;
}): { shopStyle: string | null; device: string | null } {
  const shopStyle =
    input.behavioural.collectionFirstVsSearch === "search"
      ? "Starts with search"
      : input.behavioural.collectionFirstVsSearch === "collection"
        ? "Browses collections"
        : null;
  const device =
    input.constraints.mobileFirst === true
      ? "Shops on phone"
      : input.constraints.mobileFirst === false
        ? "Phone or desktop"
        : null;
  return { shopStyle, device };
}

export function personaBrief(constraints: PersonaConstraints, behavioural: PersonaBehavioural): string | null {
  return behavioural.brief ?? constraints.brief ?? null;
}

export function parsePersonaJson(raw: {
  constraintsJson: string;
  behaviouralJson: string;
  mockFlagsJson: string;
}) {
  return {
    constraints: parseConstraints(raw.constraintsJson),
    behavioural: parseBehavioural(raw.behaviouralJson),
    mockFlags: parseMockFlags(raw.mockFlagsJson),
  };
}
