"""Load fixtures and seed GraphEdge / nodes (Epic 04 graph_seed)."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .affinity import category_wanted, product_tag_bag, normalize_tag
from .ids import new_id, stable_id

# Canonical fixtures live next to this lab: <repo>/docs/fixtures
FIXTURES = Path(__file__).resolve().parents[2] / "docs" / "fixtures"

_LONDON_VENUE_HINTS = (
    "hyde park",
    "battersea",
    "clapham",
    "victoria park",
    "hackney",
    "kingston",
    "royal parks",
    "parkrun",
    "serpentine",
    "regent",
    "kensington",
)


def _venue_city(venue: str | None) -> str | None:
    text = (venue or "").lower()
    if not text:
        return None
    for city in CITY_COORDS:
        if city.lower() in text:
            return city
    if any(hint in text for hint in _LONDON_VENUE_HINTS):
        return "London"
    return None


def adapt_harbour_run_fixtures(shop: dict, orders_doc: dict, products_doc: dict, sports: dict) -> None:
    """Map Harbour Run fixture fields onto the names this lab already scores.

    The synced orders/products/events use seed-pack keys (`created_at`, `line_items`,
    `venue`). Scoring still reads `createdAt`, `lineItems`, `naturalKey`, `venueCity`.
    """
    if "domain" not in shop:
        shop["domain"] = shop.get("myshopifyDomain") or shop.get("primaryDomain") or ""

    handle_to_id = {
        p["handle"]: p["id"] for p in products_doc["products"] if p.get("handle")
    }
    sku_to_product: dict[str, str] = {}
    sku_to_variant: dict[str, str] = {}
    for product in products_doc["products"]:
        for variant in product.get("variants") or []:
            sku = variant.get("sku")
            if sku:
                sku_to_product[sku] = product["id"]
                if variant.get("id"):
                    sku_to_variant[sku] = variant["id"]

    for order in orders_doc["orders"]:
        if "createdAt" not in order and order.get("created_at"):
            order["createdAt"] = order["created_at"]
        if "shippingCity" not in order:
            shipping = order.get("shipping") or {}
            if shipping.get("city"):
                order["shippingCity"] = shipping["city"]
            if shipping.get("postal_sector") and "shippingPostalSector" not in order:
                order["shippingPostalSector"] = shipping["postal_sector"]
        if "cohortHint" not in order and order.get("cohort_hint"):
            order["cohortHint"] = order["cohort_hint"]
        if "lineItems" not in order and order.get("line_items") is not None:
            order["lineItems"] = order["line_items"]
        for line in order.get("lineItems") or []:
            if line.get("productId"):
                continue
            product_id = sku_to_product.get(line.get("sku")) or handle_to_id.get(line.get("handle"))
            if product_id:
                line["productId"] = product_id
            if not line.get("variantId") and line.get("sku") in sku_to_variant:
                line["variantId"] = sku_to_variant[line["sku"]]

    for event in sports["events"]:
        if not event.get("naturalKey"):
            event["naturalKey"] = event.get("id") or event.get("title")
        if not event.get("startAt") and event.get("startsAt"):
            event["startAt"] = event["startsAt"]
        if not event.get("venueCity"):
            event["venueCity"] = _venue_city(event.get("venue"))
        if not event.get("category"):
            sport = (event.get("sport") or "").lower()
            title = (event.get("title") or "").lower()
            if sport == "running" or any(
                token in title for token in ("parkrun", "race", "marathon", "5k", "10k", "half")
            ):
                event["category"] = "race_running"
            else:
                event["category"] = sport or "race_running"
        if not event.get("audienceTags"):
            event["audienceTags"] = list(event.get("affinityTags") or [])

CITY_COORDS = {
    "London": (51.51, -0.13),
    "Manchester": (53.48, -2.24),
    "Liverpool": (53.41, -2.99),
    "Birmingham": (52.48, -1.90),
    "Leeds": (53.80, -1.55),
    "Newcastle": (54.98, -1.61),
}


def load_json(rel: str) -> dict:
    path = FIXTURES / rel
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1 = a
    lat2, lon2 = b
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def geo_band_weight(dist_km: float, same_country: bool = True) -> float:
    if dist_km <= 25:
        return 1.0
    if dist_km <= 80:
        return 0.7
    if dist_km <= 250:
        return 0.4  # region-ish
    if same_country:
        return 0.2
    return 0.0


def insert_edge(
    conn,
    shop_id: str,
    from_type: str,
    from_id: str,
    to_type: str,
    to_id: str,
    relation: str,
    weight: float,
    provenance: str,
    payload: dict | None = None,
) -> str:
    eid = stable_id("ge", shop_id, from_type, from_id, to_type, to_id, relation)
    conn.execute(
        """
        INSERT OR REPLACE INTO graph_edges
          (id, shop_id, from_type, from_id, to_type, to_id, relation, weight, provenance, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        """,
        (
            eid,
            shop_id,
            from_type,
            from_id,
            to_type,
            to_id,
            relation,
            weight,
            provenance,
            json.dumps(payload) if payload else None,
        ),
    )
    return eid


def upsert_node(conn, shop_id: str, node_type: str, node_id: str, label: str, payload: dict | None = None):
    conn.execute(
        """
        INSERT OR REPLACE INTO nodes (id, shop_id, node_type, label, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        """,
        (node_id, shop_id, node_type, label, json.dumps(payload) if payload else None),
    )


def seed_all(conn) -> dict[str, Any]:
    """Build the demo graph from fixtures. Returns stats + notes."""
    notes: list[str] = []
    shop = load_json("session/demo-shop.json")["shop"]
    orders_doc = load_json("orders/orders-demo.json")
    products_doc = load_json("products/products-demo.json")
    sports = load_json("catalogue/sports-mock.json")
    adapt_harbour_run_fixtures(shop, orders_doc, products_doc, sports)
    shop_id = shop["id"]
    domain = shop["domain"]
    virtuals = load_json("catalogue/virtual-events-mock.json")
    challenges = load_json("catalogue/activity-challenges.json")
    watchlist = load_json("catalogue/hashtag-watchlist.json")
    trends = load_json("catalogue/social-trends-mock.json")
    personas = load_json("personas/demo.json")

    # Weather: not in fixtures — skip FORECAST_FOR with note
    weather_path = FIXTURES / "catalogue" / "weather-mock.json"
    has_weather = weather_path.exists()
    if not has_weather:
        notes.append(
            "Weather MOCK Driver / FORECAST_FOR skipped — no weather fixture under fixtures/catalogue/."
        )

    products_by_id = {p["id"]: p for p in products_doc["products"]}
    collections = products_doc.get("collections") or []

    # --- Nodes: shop, products/SKUs, collections, geos ---
    upsert_node(conn, shop_id, "Shop", shop_id, shop["name"], {"domain": domain})

    for p in products_doc["products"]:
        upsert_node(conn, shop_id, "SKU", p["id"], p["title"], {
            "productType": p.get("productType"),
            "tags": p.get("tags"),
            "bag": sorted(product_tag_bag(p)),
        })
        for v in p.get("variants") or []:
            upsert_node(conn, shop_id, "SKU", v["id"], f"{p['title']} · {v['title']}", {
                "sku": v.get("sku"),
                "productId": p["id"],
            })

    for c in collections:
        upsert_node(conn, shop_id, "Collection", c["id"], c["title"], c)

    geos_seen: set[str] = set()
    for city, (lat, lng) in CITY_COORDS.items():
        gid = stable_id("geo", shop_id, "GB", city)
        geos_seen.add(city)
        upsert_node(conn, shop_id, "Geo", gid, city, {"city": city, "country": "GB", "lat": lat, "lng": lng})

    # global/virtual geo for virtual events
    virt_geo = stable_id("geo", shop_id, "global", "virtual")
    upsert_node(conn, shop_id, "Geo", virt_geo, "global/virtual", {"key": "global/virtual"})

    def geo_id(city: str | None) -> str | None:
        if not city:
            return None
        return stable_id("geo", shop_id, "GB", city)

    # --- Orders: CONTAINS + SHIPPED_TO ---
    for o in orders_doc["orders"]:
        oid = o["id"]
        upsert_node(conn, shop_id, "Order", oid, o.get("name") or oid, {
            "createdAt": o["createdAt"],
            "city": o.get("shippingCity"),
            "cohortHint": o.get("cohortHint"),
        })
        city = o.get("shippingCity")
        gid = geo_id(city)
        if gid:
            insert_edge(
                conn, shop_id, "Order", oid, "Geo", gid, "SHIPPED_TO",
                1.0, "OBSERVED",
                {"city": city, "postalSector": o.get("shippingPostalSector")},
            )
        for li in o.get("lineItems") or []:
            pid = li.get("productId")
            if not pid:
                continue
            insert_edge(
                conn, shop_id, "Order", oid, "SKU", pid, "CONTAINS",
                float(li.get("quantity") or 1), "OBSERVED",
                {"variantId": li.get("variantId"), "title": li.get("title"), "price": li.get("price")},
            )
            # also variant if present
            if li.get("variantId"):
                insert_edge(
                    conn, shop_id, "Order", oid, "SKU", li["variantId"], "CONTAINS",
                    float(li.get("quantity") or 1), "OBSERVED",
                    {"productId": pid},
                )

    # --- Catalogue events: VENUE_IN + AFFINITY to SKUs ---
    for ev in sports["events"]:
        eid = ev["naturalKey"]
        upsert_node(conn, shop_id, "Event", eid, ev["title"], ev)
        city = ev.get("venueCity")
        if city and geo_id(city):
            insert_edge(
                conn, shop_id, "Event", eid, "Geo", geo_id(city), "VENUE_IN",
                1.0, ev.get("provenance") or "MOCK",
                {"mode": ev.get("mode")},
            )
        elif ev.get("mode") == "virtual":
            insert_edge(
                conn, shop_id, "Event", eid, "Geo", virt_geo, "VENUE_IN",
                0.2, ev.get("provenance") or "MOCK",
                {"mode": "virtual", "cap": "national"},
            )
        wanted = category_wanted(ev.get("category") or "", ev.get("audienceTags"))
        for p in products_doc["products"]:
            bag = product_tag_bag(p)
            score = affinity_overlap_local(bag, wanted)
            if score >= 0.15:
                insert_edge(
                    conn, shop_id, "SKU", p["id"], "Event", eid, "AFFINITY",
                    min(1.0, score), "MOCK",
                    {"category": ev.get("category"), "overlap": round(score, 3)},
                )
        for c in collections:
            title_bag = {normalize_tag(x) for x in c["title"].lower().replace("&", " ").split()}
            title_bag |= {normalize_tag(c.get("handle") or "")}
            score = affinity_overlap_local(title_bag, wanted)
            if score >= 0.1 or any(k in c["title"].lower() for k in ("kit", "match", "run", "race")):
                insert_edge(
                    conn, shop_id, "Collection", c["id"], "Event", eid, "AFFINITY",
                    max(score, 0.4), "MOCK",
                    {"collection": c["title"]},
                )

    # --- Virtual events ---
    for ve in virtuals["events"]:
        vid = ve["naturalKey"]
        upsert_node(conn, shop_id, "VirtualEvent", vid, ve["title"], ve)
        insert_edge(
            conn, shop_id, "VirtualEvent", vid, "Geo", virt_geo, "VENUE_IN",
            0.2, ve.get("provenance") or "MOCK",
            {"mode": ve.get("mode")},
        )
        wanted = {normalize_tag(a) for a in (ve.get("affinity") or [])}
        wanted |= category_wanted(ve.get("category") or "")
        for p in products_doc["products"]:
            score = affinity_overlap_local(product_tag_bag(p), wanted)
            if score >= 0.12:
                insert_edge(
                    conn, shop_id, "SKU", p["id"], "VirtualEvent", vid, "AFFINITY",
                    min(1.0, score), "MOCK",
                    {"affinity": list(wanted), "overlap": round(score, 3)},
                )

    # --- Activity challenges ---
    for ch in challenges["challenges"]:
        cid = ch["naturalKey"]
        upsert_node(conn, shop_id, "ActivityChallenge", cid, ch["title"], ch)
        # TRENDING_IN national / virt geo (no city) — AGGREGATE_PROXY or MOCK
        insert_edge(
            conn, shop_id, "ActivityChallenge", cid, "Geo", virt_geo, "TRENDING_IN",
            float(ch.get("volumeProxy") or 0.5), ch.get("provenance") or "MOCK",
            {"platform": ch.get("platform")},
        )
        wanted = {normalize_tag(a) for a in (ch.get("affinity") or [])}
        for p in products_doc["products"]:
            score = affinity_overlap_local(product_tag_bag(p), wanted)
            if score >= 0.1:
                insert_edge(
                    conn, shop_id, "ActivityChallenge", cid, "SKU", p["id"], "AFFINITY",
                    min(1.0, max(score, float(ch.get("volumeProxy") or 0) * 0.5)),
                    ch.get("provenance") or "MOCK",
                    {"overlap": round(score, 3)},
                )
        # optional AMPLIFIES related virtual/catalogue
        for ve in virtuals["events"]:
            if any(a in (ve.get("affinity") or []) for a in (ch.get("affinity") or [])):
                insert_edge(
                    conn, shop_id, "ActivityChallenge", cid, "VirtualEvent", ve["naturalKey"],
                    "AMPLIFIES", float(ch.get("volumeProxy") or 0.4), "MOCK", None,
                )

    # --- Social trends + watchlist ---
    watch_by_tag = {w["tag"].lower(): w for w in watchlist["watchlist"]}
    for tr in trends["trends"]:
        tid = stable_id("st", tr["tag"], tr.get("timeBucket") or "", tr.get("geoHint") or "")
        upsert_node(conn, shop_id, "SocialTrend", tid, tr["tag"], tr)
        city = tr.get("geoHint")
        if city and geo_id(city):
            insert_edge(
                conn, shop_id, "SocialTrend", tid, "Geo", geo_id(city), "TRENDING_IN",
                float(tr.get("score") or 0.5),
                "AGGREGATE_PROXY" if tr.get("provenance") == "MOCK" else (tr.get("provenance") or "AGGREGATE_PROXY"),
                {"tag": tr["tag"], "volumeProxy": tr.get("volumeProxy")},
            )
        else:
            insert_edge(
                conn, shop_id, "SocialTrend", tid, "Geo", virt_geo, "TRENDING_IN",
                float(tr.get("score") or 0.5), "AGGREGATE_PROXY",
                {"tag": tr["tag"]},
            )
        aff = list(tr.get("affinity") or [])
        wl = watch_by_tag.get(tr["tag"].lower())
        if wl:
            aff = list(set(aff) | set(wl.get("affinity") or []))
            # HashtagWatch node
            hid = stable_id("hw", wl["tag"])
            upsert_node(conn, shop_id, "HashtagWatch", hid, wl["tag"], wl)
        wanted = {normalize_tag(a) for a in aff}
        for p in products_doc["products"]:
            score = affinity_overlap_local(product_tag_bag(p), wanted)
            if score >= 0.12 and float(tr.get("score") or 0) >= 0.5:
                insert_edge(
                    conn, shop_id, "SocialTrend", tid, "SKU", p["id"], "AFFINITY",
                    min(1.0, score * float(tr.get("score") or 0.5)),
                    "AGGREGATE_PROXY",
                    {"tag": tr["tag"], "note": "social affinity — not OBSERVED demand"},
                )
        # AMPLIFIES matching catalogue fixtures
        for ev in sports["events"]:
            if _social_matches_event(tr, ev):
                insert_edge(
                    conn, shop_id, "SocialTrend", tid, "Event", ev["naturalKey"],
                    "AMPLIFIES", float(tr.get("score") or 0.5), "AGGREGATE_PROXY",
                    {"tag": tr["tag"]},
                )

    # Watchlist-only AFFINITY when trend missing
    for w in watchlist["watchlist"]:
        hid = stable_id("hw", w["tag"])
        upsert_node(conn, shop_id, "HashtagWatch", hid, w["tag"], w)
        wanted = {normalize_tag(a) for a in (w.get("affinity") or [])}
        for p in products_doc["products"]:
            score = affinity_overlap_local(product_tag_bag(p), wanted)
            if score >= 0.2:
                insert_edge(
                    conn, shop_id, "HashtagWatch", hid, "SKU", p["id"], "AFFINITY",
                    score, "MOCK",
                    {"tag": w["tag"], "from": "watchlist"},
                )

    # --- Weather skip (already noted) — optional synthetic wet Driver for shells ---
    # Create a MOCK Driver node for wet weekend layers narrative (no FORECAST_FOR claim of OBSERVED weather)
    if not has_weather:
        driver_id = "driver:wet_weekend:demo"
        upsert_node(conn, shop_id, "Driver", driver_id, "Wet weekend layers (synthetic MOCK)", {
            "kind": "weather_driver",
            "synthetic": True,
        })
        for city in ("Manchester", "London"):
            insert_edge(
                conn, shop_id, "Driver", driver_id, "Geo", geo_id(city), "AMPLIFIES",
                0.55, "MOCK",
                {"note": "No weather fixture — synthetic driver for demo scoring only"},
            )
        for p in products_doc["products"]:
            bag = product_tag_bag(p)
            if bag & {"shell", "waterproof", "layers", "wx_aware", "outerwear"}:
                insert_edge(
                    conn, shop_id, "SKU", p["id"], "Driver", driver_id, "AFFINITY",
                    0.7, "MOCK",
                    {"forecastMap": "wet_weekend"},
                )
        notes.append(
            "Synthetic MOCK Driver 'Wet weekend layers' seeded for demo scoring; "
            "no FORECAST_FOR / OBSERVED weather forecast edges."
        )

    # --- Personas ---
    for pers in personas["personas"]:
        if pers.get("status") == "stub":
            continue
        pid = pers["id"]
        upsert_node(conn, shop_id, "Persona", pid, pers["name"], pers)
        # GOALS_INCLUDE SKU tags from goals / tags
        goal_tags = set()
        for g in pers.get("goals") or []:
            gl = g.lower()
            for kw in ("shirt", "scarf", "kit", "waterproof", "layer", "trainer", "race"):
                if kw in gl:
                    goal_tags.add(normalize_tag("home_kit" if kw == "shirt" else kw))
        for t in pers.get("tags") or []:
            if ":" in t:
                goal_tags.add(normalize_tag(t.split(":", 1)[1].strip().split("·")[0].strip()))
            else:
                goal_tags.add(normalize_tag(t))
        for p in products_doc["products"]:
            score = affinity_overlap_local(product_tag_bag(p), goal_tags)
            if score >= 0.1 or any(
                k in (p.get("title") or "").lower()
                for k in ("shirt", "scarf", "shell", "layer", "trainer")
                if any(k in (g or "").lower() for g in (pers.get("goals") or ["x"]))
            ):
                # looser match from goals text
                title_l = (p.get("title") or "").lower()
                goals_blob = " ".join(pers.get("goals") or []).lower()
                if score < 0.1:
                    if ("shirt" in goals_blob and "shirt" in title_l) or (
                        "scarf" in goals_blob and "scarf" in title_l
                    ) or ("waterproof" in goals_blob and ("shell" in title_l or "waterproof" in title_l)):
                        score = 0.5
                    else:
                        continue
                insert_edge(
                    conn, shop_id, "Persona", pid, "SKU", p["id"], "GOALS_INCLUDE",
                    max(score, 0.4),
                    (pers.get("provenanceLabels") or ["MODEL_HYPOTHESIS"])[0],
                    {"persona": pers["name"]},
                )

    conn.commit()

    edge_count = conn.execute("SELECT COUNT(*) FROM graph_edges").fetchone()[0]
    node_count = conn.execute("SELECT COUNT(*) FROM nodes").fetchone()[0]
    by_rel = {
        r["relation"]: r["c"]
        for r in conn.execute(
            "SELECT relation, COUNT(*) AS c FROM graph_edges GROUP BY relation ORDER BY c DESC"
        )
    }

    return {
        "shop_id": shop_id,
        "domain": domain,
        "nodes": node_count,
        "edges": edge_count,
        "edges_by_relation": by_rel,
        "products": products_by_id,
        "orders": orders_doc["orders"],
        "sports_events": sports["events"],
        "virtuals": virtuals["events"],
        "challenges": challenges["challenges"],
        "trends": trends["trends"],
        "personas": personas["personas"],
        "notes": notes,
        "city_coords": CITY_COORDS,
    }


def affinity_overlap_local(bag: set[str], wanted: set[str]) -> float:
    if not wanted:
        return 0.0
    wn = {normalize_tag(w) for w in wanted}
    # expand kids_kit ↔ kids, home_kit ↔ jersey
    expand = set(wn)
    if "kids" in wn or "kids_kit" in wn:
        expand.update({"kids", "kids_kit", "scarf"})
    if "home_kit" in wn or "jersey" in wn:
        expand.update({"home_kit", "jersey", "match_day"})
    if "trainers" in wn or "run_shoes" in wn:
        expand.update({"trainers", "run_shoes", "race_day"})
    if "layers" in wn:
        expand.update({"layers", "wx_aware"})
    hits = bag & expand
    return min(1.0, len(hits) / max(len(wn), 1))


def _social_matches_event(tr: dict, ev: dict) -> bool:
    tag = (tr.get("tag") or "").lower()
    title = (ev.get("title") or "").lower()
    key = (ev.get("naturalKey") or "").lower()
    city = (ev.get("venueCity") or "")
    geo = tr.get("geoHint")
    if geo and city and geo.lower() != city.lower():
        # still allow national tags
        if tag not in ("#matchday", "#parkrun", "#hyrox", "#sofato5k", "#athleisure"):
            pass
    if "mufc" in tag and ("manchester united" in title or "mufc" in key):
        return True
    if "arsenal" in tag and "arsenal" in title:
        return True
    if "matchday" in tag and ev.get("category") == "team_fixture":
        return geo is None or (city and geo.lower() == city.lower())
    if "hyrox" in tag and "hyrox" in title:
        return True
    if "sofato5k" in tag and "sofa" in title:
        return True
    if "londonmarathon" in tag and "london" in title and "race" in (ev.get("category") or ""):
        return True
    return False
