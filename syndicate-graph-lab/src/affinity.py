"""Sports / athleisure affinity dictionary and match helpers (Epic 04)."""

from __future__ import annotations

AFFINITY_KEYWORDS = {
    "kit", "jersey", "scarf", "matchday", "match_day", "home_kit", "away_kit",
    "kids_kit", "trainers", "running", "waterproof", "shell", "recovery",
    "hyrox", "grips", "leggings", "sports-bra", "bras", "layer", "layers",
    "parkrun", "race", "race_day", "hydration", "base-layer", "windproof",
    "zwift", "peloton", "challenge", "virtual", "cycling", "cycling_kit",
    "run_shoes", "kits", "shorts", "lifting_shoes", "finishers_merch",
    "athleisure", "wx_aware", "outerwear", "footwear",
}

# Category → affinity tags
CATEGORY_AFFINITY = {
    "team_fixture": {"home_kit", "away_kit", "scarf", "kids", "kids_kit", "jersey", "match_day", "matchday", "layers"},
    "race_running": {"trainers", "race_day", "running", "recovery", "layers", "run_shoes", "kits"},
    "crossfit_functional": {"hyrox", "grips", "shorts", "lifting_shoes", "athleisure"},
    "virtual_challenge": {"trainers", "recovery", "virtual", "run_shoes", "cycling_kit", "hydration"},
    "weather_driver": {"waterproof", "shell", "layers", "wx_aware", "outerwear", "windproof"},
    "season_drop_calendar": {"athleisure", "layers", "leggings", "bras"},
}

FORECAST_AFFINITY = {
    "cold_snap": {"layers", "base-layer", "outerwear"},
    "wet_weekend": {"shell", "waterproof", "wx_aware", "layers"},
    "heatwave": {"hydration", "shorts", "athleisure"},
    "high_wind": {"windproof", "layers"},
}

# Normalise product tags / types / affinity tokens into a comparable bag
ALIASES = {
    "jersey": "home_kit",
    "kids_kit": "kids",
    "run_shoes": "trainers",
    "kits": "home_kit",
    "matchday": "match_day",
}


def normalize_tag(t: str) -> str:
    t = (t or "").strip().lower().replace(" ", "_").replace("-", "_")
    return ALIASES.get(t, t)


def product_tag_bag(product: dict) -> set[str]:
    bag: set[str] = set()
    for t in product.get("tags") or []:
        bag.add(normalize_tag(t))
    pt = product.get("productType") or ""
    if pt:
        bag.add(normalize_tag(pt))
        # map product types
        low = pt.lower()
        if "jersey" in low:
            bag.update({"home_kit", "jersey"})
        if "scarf" in low:
            bag.add("scarf")
        if "layer" in low:
            bag.add("layers")
        if "footwear" in low or "trainer" in low:
            bag.add("trainers")
        if "outer" in low or "shell" in low:
            bag.update({"shell", "waterproof", "outerwear"})
        if "short" in low:
            bag.add("shorts")
    title = (product.get("title") or "").lower()
    for kw in ("shell", "waterproof", "trainer", "scarf", "shirt", "layer", "hyrox"):
        if kw in title:
            bag.add(normalize_tag(kw if kw != "shirt" else "home_kit"))
    return bag


def affinity_overlap(bag: set[str], wanted: set[str]) -> float:
    if not wanted:
        return 0.0
    wn = {normalize_tag(w) for w in wanted}
    # also accept keyword dictionary hits
    hits = bag & wn
    if not hits:
        # fuzzy: any bag token in affinity keywords that intersects wanted via alias
        for b in bag:
            if b in wn or ALIASES.get(b) in wn:
                hits.add(b)
    return len(hits) / max(len(wn), 1)


def category_wanted(category: str, extra: list[str] | None = None) -> set[str]:
    base = set(CATEGORY_AFFINITY.get(category, set()))
    if extra:
        base |= {normalize_tag(x) for x in extra}
    return base
