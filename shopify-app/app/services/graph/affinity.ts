/** Sports / running affinity. Social and weather tags never imply OBSERVED demand. */

const ALIASES: Record<string, string> = {
  jersey: "home_kit",
  kids_kit: "kids",
  run_shoes: "trainers",
  kits: "race_kit",
  matchday: "match_day",
  "sports-bra": "bras",
  "base-layer": "layers",
  race_kit: "race_day",
  wet_weather: "waterproof",
};

export function normalizeTag(value: string): string {
  const token = value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  return ALIASES[token] ?? token;
}

const CATEGORY_AFFINITY: Record<string, string[]> = {
  team_fixture: ["home_kit", "away_kit", "scarf", "kids", "jersey", "match_day", "layers"],
  race_running: ["trainers", "race_day", "running", "recovery", "layers", "hydration", "socks"],
  crossfit_functional: ["hyrox", "grips", "shorts", "athleisure"],
  virtual_challenge: ["trainers", "recovery", "virtual", "hydration", "race_day"],
  weather_driver: ["waterproof", "shell", "layers", "wx_aware", "outerwear", "windproof"],
  season_drop_calendar: ["athleisure", "layers"],
};

const FORECAST_WET = ["shell", "waterproof", "wx_aware", "layers"];

export function tagBag(input: {
  tags: string[];
  productType?: string | null;
  title?: string | null;
}): Set<string> {
  const bag = new Set<string>();
  for (const tag of input.tags) bag.add(normalizeTag(tag));
  const type = (input.productType ?? "").toLowerCase();
  if (type) bag.add(normalizeTag(type));
  if (type.includes("outer") || type.includes("shell")) {
    bag.add("shell");
    bag.add("waterproof");
    bag.add("outerwear");
  }
  if (type.includes("short")) bag.add("shorts");
  if (type.includes("hydration")) bag.add("hydration");
  const title = (input.title ?? "").toLowerCase();
  if (title.includes("shell") || title.includes("waterproof")) {
    bag.add("shell");
    bag.add("waterproof");
  }
  if (title.includes("layer")) bag.add("layers");
  if (title.includes("jogger") || title.includes("recovery")) bag.add("recovery");
  if (title.includes("sock")) bag.add("socks");
  if (title.includes("flask")) bag.add("hydration");
  if (title.includes("tee") || title.includes("short")) bag.add("race_day");
  return bag;
}

export function categoryWanted(category: string, extra: string[] = []): Set<string> {
  const wanted = new Set((CATEGORY_AFFINITY[category] ?? []).map(normalizeTag));
  for (const tag of extra) wanted.add(normalizeTag(tag));
  return wanted;
}

export function forecastWetWanted(): Set<string> {
  return new Set(FORECAST_WET);
}

/** Fraction of wanted tags present on the product. */
export function affinityOverlap(bag: Set<string>, wanted: Set<string>): number {
  if (wanted.size === 0) return 0;
  let hits = 0;
  for (const tag of wanted) {
    if (bag.has(tag)) hits += 1;
  }
  return hits / wanted.size;
}

export function matchesAffinity(bag: Set<string>, wanted: Set<string>, threshold = 0.15): boolean {
  return affinityOverlap(bag, wanted) >= threshold;
}
