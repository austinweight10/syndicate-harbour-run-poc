#!/usr/bin/env python3
"""
Harbour Run — generate the extended order and customer seed.

Reads the committed original 48 orders (ord_seed_001–048) and 25 customers and
writes ONLY the generated extras to data/generated/ (gitignored). seed_store.py
appends those to the originals when present; orders are matched on their id tag
and customers on email, so re-seeding pushes only what is new.

Deterministic: the same SEED and catalogue give the same files.

Shape (so Syndicate's occasion scoring has something real to find):
  - 60-day window ending the morning of ANCHOR (Syndicate reads ≤60 days).
  - Saturday spikes, Tue/Thu club-night bumps, autumn ramp towards late September.
  - Race-taper week before the 26–27 Sep London races: race kit surges.
  - Historical wet spells: shells, windbreakers and layers.
  - Hot early August: vests, singlets, split shorts, hot-weather tees.
  - Repeat customers (loyal minority), London-heavy with some other UK cities.

Usage (repo root):
  python3 docs/live-demo-store/scripts/generate_orders.py            # writes files
  DRY_RUN=1 python3 docs/live-demo-store/scripts/generate_orders.py  # summary only
  NEW_ORDERS=460 NEW_CUSTOMERS=125 SEED=26 python3 …                 # overrides
"""
from __future__ import annotations

import csv
import io
import json
import os
import random
import zlib
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ORDERS_PATH = DATA / "orders-seed.json"
CUSTOMERS_PATH = DATA / "customers.csv"
# Generated rows are not committed (data/generated/ is gitignored); seed_store.py
# appends them to the committed originals when present.
GENERATED = DATA / "generated"
GEN_ORDERS_PATH = GENERATED / "orders-seed.generated.json"
GEN_CUSTOMERS_PATH = GENERATED / "customers.generated.csv"
PRODUCTS_PATH = DATA / "products.csv"

ORIGINAL_ORDERS = 48
ORIGINAL_CUSTOMERS = 25
NEW_ORDERS = int(os.environ.get("NEW_ORDERS", "460"))
NEW_CUSTOMERS = int(os.environ.get("NEW_CUSTOMERS", "125"))
SEED = int(os.environ.get("SEED", "26"))

BST = timezone(timedelta(hours=1))
ANCHOR = datetime(2026, 9, 26, 9, 0, tzinfo=BST)  # latest order time (≤ "now")
WINDOW_START = datetime(2026, 7, 31, 0, 0, tzinfo=BST)

RACE_TAPER = (datetime(2026, 9, 19, tzinfo=BST), datetime(2026, 9, 26, 23, 59, tzinfo=BST))
WET_SPELLS = [
    (datetime(2026, 8, 18, tzinfo=BST), datetime(2026, 8, 21, 23, 59, tzinfo=BST)),
    (datetime(2026, 9, 8, tzinfo=BST), datetime(2026, 9, 12, 23, 59, tzinfo=BST)),
    (datetime(2026, 9, 22, tzinfo=BST), datetime(2026, 9, 25, 23, 59, tzinfo=BST)),
]
HOT_SPELL = (datetime(2026, 7, 31, tzinfo=BST), datetime(2026, 8, 14, 23, 59, tzinfo=BST))

# --------------------------------------------------------------------------- #
# Places (sector level; street is a plausible public street, no real person)
# --------------------------------------------------------------------------- #

LONDON = [
    # sector, zip, street, lat, lng, weight
    ("W2", "W2 2UH", "Queensway", 51.512, -0.187, 6),
    ("SW11", "SW11 4NJ", "Battersea Park Road", 51.474, -0.160, 6),
    ("E9", "E9 6LT", "Well Street", 51.543, -0.047, 5),
    ("N1", "N1 1QP", "Upper Street", 51.538, -0.103, 5),
    ("SE1", "SE1 7PB", "Lower Marsh", 51.500, -0.113, 4),
    ("SW4", "SW4 7AA", "Clapham High Street", 51.462, -0.138, 5),
    ("E8", "E8 3PH", "Mare Street", 51.543, -0.056, 4),
    ("NW1", "NW1 8NH", "Parkway", 51.537, -0.145, 3),
    ("SE22", "SE22 8HQ", "Lordship Lane", 51.452, -0.074, 3),
    ("N16", "N16 0PH", "Church Street", 51.562, -0.078, 3),
    ("W12", "W12 8LB", "Uxbridge Road", 51.506, -0.225, 2),
    ("SW18", "SW18 4AQ", "Garratt Lane", 51.454, -0.192, 3),
    ("E1", "E1 6QL", "Brick Lane", 51.521, -0.072, 2),
    ("SW6", "SW6 1RR", "Fulham Road", 51.477, -0.199, 3),
    ("N7", "N7 6PL", "Holloway Road", 51.556, -0.117, 2),
    ("SE15", "SE15 4QN", "Rye Lane", 51.470, -0.069, 2),
    ("KT1", "KT1 1HL", "Eden Street", 51.410, -0.301, 2),
    ("TW9", "TW9 1TN", "Hill Street", 51.460, -0.305, 2),
]
ELSEWHERE = [
    ("Manchester", "M20", "M20 6RN", "Burton Road", 53.420, -2.238, 4),
    ("Manchester", "M1", "M1 1AD", "Oldham Street", 53.483, -2.234, 2),
    ("Birmingham", "B13", "B13 9LS", "Alcester Road", 52.435, -1.889, 2),
    ("Bristol", "BS8", "BS8 2UB", "Whiteladies Road", 51.467, -2.609, 2),
    ("Leeds", "LS6", "LS6 1LT", "Otley Road", 53.822, -1.575, 2),
    ("Edinburgh", "EH9", "EH9 1LG", "Causewayside", 55.936, -3.180, 1),
    ("Brighton", "BN1", "BN1 4GD", "Gardner Street", 50.824, -0.139, 1),
]
LONDON_SHARE = 0.82

FIRST = ("Alfie Amara Ava Ben Beth Callum Charlotte Chloe Dan Daisy Eleanor Elliot Emily Erin Finn Freya "
         "George Georgia Hannah Harvey Imogen Isaac Isabel Jacob Jas Jess Joe Josh Kate Kiran Laura Liam "
         "Lucy Luke Maya Megan Millie Nathan Niamh Noah Olivia Omar Ollie Phoebe Priya Rhys Rosie Ruby "
         "Ryan Sam Sophie Tara Theo Tom Will Zara Zoe Aisha Arjun Caitlin Dev Fatima Hamza Kwame Leah "
         "Nia Rafael Sanjay Yusuf Anya Bea Conor Esme Felix Gemma Hugo Iris Jamal Lottie Marcus Nadia").split()
LAST = ("Adams Ahmed Allen Bailey Baker Bell Bennett Brooks Carter Chapman Clarke Collins Cooper Cox "
        "Davies Dixon Edwards Ellis Evans Fisher Foster Graham Gray Green Hall Harris Hill Holmes Hughes "
        "Hunt Jackson James Jenkins Johnson Jones Kelly Khan Knight Lee Lewis Marshall Mason Miller "
        "Mitchell Moore Morgan Murphy Nelson Owen Palmer Parker Patel Phillips Price Reid Richards "
        "Roberts Robinson Rogers Russell Scott Shaw Simpson Smith Stevens Taylor Thomas Turner Walker "
        "Ward Watson White Wilson Wood Wright Young Okafor Mensah Novak Silva Rossi Nowak Kowalski").split()

# --------------------------------------------------------------------------- #
# Catalogue → cohort pools
# --------------------------------------------------------------------------- #

COHORTS = ["race_day_taper", "wet_weather_trainer", "club_social", "wx_athleisure", "hot_weather", "trail", "family"]
BASE_MIX = {
    "race_day_taper": 0.30, "wet_weather_trainer": 0.14, "club_social": 0.17, "wx_athleisure": 0.15,
    "hot_weather": 0.07, "trail": 0.11, "family": 0.06,
}


def load_products() -> dict[str, dict]:
    products: dict[str, dict] = {}
    with open(PRODUCTS_PATH, encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            handle = row["Handle"]
            if row["Title"]:
                products[handle] = {
                    "handle": handle,
                    "title": row["Title"],
                    "type": row["Type"],
                    "tags": {t.strip() for t in row["Tags"].split(",") if t.strip()},
                    "options": [row[f"Option{i} Name"] for i in (1, 2, 3) if row[f"Option{i} Name"]],
                    "variants": [],
                }
            if row["Variant SKU"]:
                p = products[handle]
                values = [row[f"Option{i} Value"] for i in range(1, len(p["options"]) + 1)]
                p["variants"].append({"sku": row["Variant SKU"], "price": row["Variant Price"], "values": values})
    return products


def pools(products: dict[str, dict]) -> dict[str, dict[str, list[tuple[str, float]]]]:
    """cohort → {'core': [(handle, weight)], 'addon': [...]}."""
    def has(p, *tags):
        return any(t in p["tags"] for t in tags)

    out: dict[str, dict[str, list[tuple[str, float]]]] = {c: {"core": [], "addon": []} for c in COHORTS}
    for h, p in products.items():
        if h == "kids-youth-run-tee":
            out["family"]["core"].append((h, 3.0))
            continue
        accessory = p["type"] in ("Accessories", "Hydration")
        # race-day taper: race kit, vests, marathon/speed shorts, race socks, flask, cap
        if has(p, "race_kit") or (has(p, "race_day") and p["type"] in ("Vests", "Shorts")):
            out["race_day_taper"]["addon" if accessory else "core"].append((h, 3.0 if h in ("race-tee-unisex", "running-shorts") else 1.5))
        elif has(p, "race_day") and accessory:
            out["race_day_taper"]["addon"].append((h, 1.0))
        # wet weather: shells and waterproofs first, then windproof layers
        if has(p, "waterproof", "shell"):
            out["wet_weather_trainer"]["core"].append((h, 3.0 if h == "waterproof-shell-jacket" else 2.0))
        elif has(p, "wet_weather", "windproof"):
            out["wet_weather_trainer"]["core"].append((h, 1.2))
        elif has(p, "layers", "wx_aware") and p["type"] in ("Base Layers", "Tights", "Accessories", "Apparel"):
            out["wet_weather_trainer"]["addon"].append((h, 1.0))
        # club social: eco tees, long sleeves, joggers, trousers, caps
        if has(p, "club_social", "recovery", "athleisure"):
            out["club_social"]["addon" if accessory else "core"].append((h, 1.5))
        elif h in ("mens-long-sleeve-tech-tee", "womens-long-sleeve-tech-tee", "mens-run-shorts"):
            out["club_social"]["core"].append((h, 1.0))
        # weather-aware athleisure: base layers, tights, gilets, merino accessories
        if p["type"] in ("Base Layers", "Tights", "Jackets") or (has(p, "wx_aware", "layers") and accessory):
            out["wx_athleisure"]["addon" if accessory else "core"].append((h, 1.2))
        # hot weather: vests, singlets, split/speed shorts, hot-weather tees
        if "hot-weather" in h or p["type"] == "Vests" or h in ("mens-split-shorts", "womens-split-shorts", "womens-speed-shorts"):
            out["hot_weather"]["core"].append((h, 1.5 if "hot-weather" in h else 1.0))
        elif h in ("ankle-socks", "run-cap", "headband", "soft-flask"):
            out["hot_weather"]["addon"].append((h, 1.0))
        # trail
        if "trail" in h:
            out["trail"]["core" if not accessory else "addon"].append((h, 2.0))
        elif h in ("merino-crew-socks", "soft-flask", "arm-sleeves", "mens-run-shorts"):
            out["trail"]["addon" if accessory else "core"].append((h, 1.0))
    # family also buys an adult item for the parent
    out["family"]["addon"] = [(h, 1.0) for h in ("race-tee-unisex", "womens-race-tee", "mens-race-tee", "run-cap", "soft-flask") if h in products]
    return out


def weighted(rng: random.Random, items: list[tuple[str, float]]) -> str:
    total = sum(w for _, w in items)
    pick = rng.uniform(0, total)
    for item, w in items:
        pick -= w
        if pick <= 0:
            return item
    return items[-1][0]


# --------------------------------------------------------------------------- #
# Calendar
# --------------------------------------------------------------------------- #

def within(at: datetime, span: tuple[datetime, datetime]) -> bool:
    return span[0] <= at <= span[1]


def day_weight(day: datetime) -> float:
    dow = day.weekday()  # Mon=0
    w = {0: 0.8, 1: 1.2, 2: 1.0, 3: 1.2, 4: 0.9, 5: 2.4, 6: 1.4}[dow]
    progress = (day - WINDOW_START).days / max(1, (ANCHOR - WINDOW_START).days)
    w *= 0.75 + 0.6 * progress  # autumn ramp
    if within(day, RACE_TAPER):
        w *= 1.8
    if any(within(day, span) for span in WET_SPELLS):
        w *= 1.3
    return w


def cohort_mix(day: datetime) -> dict[str, float]:
    mix = dict(BASE_MIX)
    if within(day, RACE_TAPER):
        mix["race_day_taper"] *= 2.4
    if day.weekday() == 5:
        mix["race_day_taper"] *= 1.5
    if any(within(day, span) for span in WET_SPELLS):
        mix["wet_weather_trainer"] *= 3.0
        mix["wx_athleisure"] *= 1.4
        mix["hot_weather"] *= 0.2
    if within(day, HOT_SPELL):
        mix["hot_weather"] *= 3.5
        mix["wet_weather_trainer"] *= 0.3
    if day.month == 9:
        mix["wx_athleisure"] *= 1.3
        mix["hot_weather"] *= 0.5
    total = sum(mix.values())
    return {k: v / total for k, v in mix.items()}


def order_time(rng: random.Random, day: datetime, cohort: str) -> datetime:
    if day.weekday() == 5 and cohort == "race_day_taper":
        hour = rng.choice([7, 8, 8, 9, 9, 10, 10, 11, 12])
    elif day.weekday() >= 5:
        hour = rng.choice([8, 9, 10, 11, 13, 15, 17, 19, 20])
    else:
        hour = rng.choice([7, 12, 13, 18, 19, 19, 20, 20, 21, 22])
    return day.replace(hour=hour, minute=rng.choice(range(0, 60, 5)))


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #

def read_csv(path: Path) -> tuple[list[str], list[dict]]:
    with open(path, encoding="utf-8", newline="") as fh:
        reader = csv.DictReader(fh)
        return list(reader.fieldnames or []), list(reader)


def make_customers(rng: random.Random, existing: list[dict]) -> list[dict]:
    used = {r["Email"] for r in existing}
    rows = []
    for i in range(ORIGINAL_CUSTOMERS + 1, ORIGINAL_CUSTOMERS + NEW_CUSTOMERS + 1):
        first, last = rng.choice(FIRST), rng.choice(LAST)
        email = f"{first.lower()}.{last.lower()}{i}@harbour-run-demo.test"
        assert email not in used
        used.add(email)
        if rng.random() < LONDON_SHARE:
            sector, zip_, street, *_ = weighted(rng, [(p, p[5]) for p in LONDON])
            city = "London"
        else:
            city, sector, zip_, street, *_ = weighted(rng, [(p, p[6]) for p in ELSEWHERE])
        cohort = weighted(rng, list(BASE_MIX.items()))
        rows.append({
            "First Name": first, "Last Name": last, "Email": email, "Accepts Marketing": "no",
            "Address1": f"{rng.randint(2, 180)} {street}", "Address2": "", "City": city,
            "Province": "Scotland" if city == "Edinburgh" else "England", "Province Code": "",
            "Country": "United Kingdom", "Country Code": "GB", "Zip": zip_, "Phone": "",
            "Tags": cohort, "Note": "Demo seed — not a real person", "Tax Exempt": "no",
        })
    return rows


def geo_for(customer: dict) -> tuple[str, float, float]:
    sector = customer["Zip"].split()[0]
    for s, _z, _st, lat, lng, _w in LONDON:
        if s == sector:
            return sector, lat, lng
    for _c, s, _z, _st, lat, lng, _w in ELSEWHERE:
        if s == sector:
            return sector, lat, lng
    return sector, 51.5074, -0.1278


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #

SIZE_PREF = ["S", "M", "M", "M", "L", "L", "L", "XL", "XS"]


def pick_variant(rng: random.Random, product: dict, size: str) -> dict:
    variants = product["variants"]
    if product["options"] and product["options"][0] == "Size":
        sized = [v for v in variants if v["values"][0] == size]
        if sized:
            return rng.choice(sized)
    return rng.choice(variants)


def build_order(rng, idx, when, customer, cohort, products, pool, size) -> dict:
    lines: dict[str, dict] = {}
    n_core = 1 if rng.random() < 0.55 else 2
    n_addon = rng.choice([0, 0, 1, 1, 2]) if pool["addon"] else 0
    picks = [weighted(rng, pool["core"]) for _ in range(n_core)] + [weighted(rng, pool["addon"]) for _ in range(n_addon)]
    for handle in picks:
        product = products[handle]
        variant = pick_variant(rng, product, "YM" if handle == "kids-youth-run-tee" else size)
        key = variant["sku"]
        if key in lines:
            continue
        qty = 2 if (handle in ("performance-socks", "race-socks", "ankle-socks") and rng.random() < 0.2) else 1
        lines[key] = {
            "sku": variant["sku"],
            "title": f"{product['title']} — {' / '.join(variant['values'])}",
            "handle": handle,
            "variantTitle": " / ".join(variant["values"]),
            "quantity": qty,
            "price": f"{float(variant['price']):.2f}",
        }
    line_items = list(lines.values())
    subtotal = sum(float(li["price"]) * li["quantity"] for li in line_items)
    sector, lat, lng = geo_for(customer)
    tags = [cohort, "seed"]
    if cohort == "wet_weather_trainer":
        tags.append("wx_proxy_narrative")
    return {
        "id": f"ord_seed_{idx:03d}",
        "name": f"#{1000 + idx}",
        "created_at": when.isoformat(),
        "customer_email": customer["Email"],
        "currency": "GBP",
        "subtotal": f"{subtotal:.2f}",
        "financial_status": "paid",
        "fulfillment_status": "fulfilled",
        "source_name": "web",
        "shipping": {
            "city": customer["City"],
            "zip": customer["Zip"],
            "postal_sector": sector,
            "country_code": "GB",
            "province": customer["Province"],
            "address1": customer["Address1"],
        },
        "geo": {"lat": round(lat + (zlib.crc32(customer["Email"].encode()) % 7 - 3) * 0.002, 3), "lng": round(lng, 3)},
        "line_items": line_items,
        "cohort_hint": cohort,
        "tags": tags,
    }


def main() -> None:
    rng = random.Random(SEED)
    dry = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes")
    products = load_products()
    cohort_pools = pools(products)
    for cohort, pool in cohort_pools.items():
        assert pool["core"], f"empty core pool for {cohort}"

    payload = json.loads(ORDERS_PATH.read_text(encoding="utf-8"))
    original_orders = [o for o in payload["orders"] if int(o["id"].rsplit("_", 1)[1]) <= ORIGINAL_ORDERS]
    fields, customers = read_csv(CUSTOMERS_PATH)
    original_customers = customers[:ORIGINAL_CUSTOMERS]
    new_customers = make_customers(rng, original_customers)
    all_customers = original_customers + new_customers

    # Loyalty: a minority of runners order again and again.
    loyalty = {c["Email"]: rng.paretovariate(1.6) for c in all_customers}
    home_cohort = {c["Email"]: (c["Tags"].split(",")[0].strip() or "club_social") for c in all_customers}
    for email, cohort in list(home_cohort.items()):
        if cohort not in COHORTS:
            home_cohort[email] = "club_social"
    size_of = {c["Email"]: rng.choice(SIZE_PREF) for c in all_customers}
    by_cohort: dict[str, list[str]] = defaultdict(list)
    for email, cohort in home_cohort.items():
        by_cohort[cohort].append(email)
    by_email = {c["Email"]: c for c in all_customers}

    # Spread NEW_ORDERS over the days by weight.
    days = []
    day = WINDOW_START
    while day.date() <= ANCHOR.date():
        days.append(day)
        day += timedelta(days=1)
    weights = [day_weight(d) for d in days]
    total_w = sum(weights)
    counts = [int(NEW_ORDERS * w / total_w) for w in weights]
    remainder = NEW_ORDERS - sum(counts)
    for i in sorted(range(len(days)), key=lambda i: -(NEW_ORDERS * weights[i] / total_w - counts[i]))[:remainder]:
        counts[i] += 1

    # Every new customer orders at least once; the rest by loyalty.
    first_order_queue = [c["Email"] for c in new_customers]
    rng.shuffle(first_order_queue)

    new_orders = []
    idx = ORIGINAL_ORDERS
    for day, count in zip(days, counts):
        mix = cohort_mix(day)
        for _ in range(count):
            cohort = weighted(rng, list(mix.items()))
            candidates = [e for e in first_order_queue if home_cohort[e] == cohort]
            if candidates and rng.random() < 0.6:
                email = candidates[0]
                first_order_queue.remove(email)
            else:
                pool = by_cohort.get(cohort) or list(by_email)
                # 70% home-cohort buyers, otherwise anyone (cross-shopping).
                if rng.random() > 0.7:
                    pool = list(by_email)
                email = weighted(rng, [(e, loyalty[e]) for e in pool])
            when = order_time(rng, day, cohort)
            if when > ANCHOR:
                when = ANCHOR - timedelta(minutes=rng.randint(5, 600))
            idx += 1
            new_orders.append(build_order(rng, idx, when, by_email[email], cohort, products,
                                          cohort_pools[cohort], size_of[email]))
    # Anyone still without an order gets one on a random weekday evening.
    for email in first_order_queue:
        day = rng.choice(days[:-1])
        cohort = home_cohort[email]
        idx += 1
        new_orders.append(build_order(rng, idx, order_time(rng, day, cohort), by_email[email], cohort,
                                      products, cohort_pools[cohort], size_of[email]))

    new_orders.sort(key=lambda o: o["created_at"])
    for n, order in enumerate(new_orders, ORIGINAL_ORDERS + 1):
        order["id"] = f"ord_seed_{n:03d}"
        order["name"] = f"#{1000 + n}"

    orders = original_orders + new_orders
    buyers = Counter(o["customer_email"] for o in orders)
    summary = {
        "orders_total": len(orders),
        "orders_new": len(new_orders),
        "customers_total": len(all_customers),
        "customers_with_orders": len(buyers),
        "repeat_customers": sum(1 for n in buyers.values() if n > 1),
        "max_orders_one_customer": max(buyers.values()),
        "cohorts_new": dict(Counter(o["cohort_hint"] for o in new_orders)),
        "saturday_share_new": round(sum(1 for o in new_orders if datetime.fromisoformat(o["created_at"]).weekday() == 5) / len(new_orders), 2),
        "race_taper_week_new": sum(1 for o in new_orders if within(datetime.fromisoformat(o["created_at"]), RACE_TAPER)),
        "first": min(o["created_at"] for o in orders),
        "last": max(o["created_at"] for o in orders),
        "revenue_new": round(sum(float(o["subtotal"]) for o in new_orders), 2),
    }
    print(json.dumps(summary, indent=2))
    if dry:
        return

    GENERATED.mkdir(exist_ok=True)
    GEN_ORDERS_PATH.write_text(json.dumps({
        "_meta": {
            "generator": f"scripts/generate_orders.py SEED={SEED} NEW_ORDERS={NEW_ORDERS} NEW_CUSTOMERS={NEW_CUSTOMERS}",
            "extends": "orders-seed.json",
            "order_count": len(new_orders),
            "window_days": (ANCHOR - WINDOW_START).days,
            "anchor_date": ANCHOR.date().isoformat(),
            "cohort_counts": dict(Counter(o["cohort_hint"] for o in new_orders)),
        },
        "orders": new_orders,
    }, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")

    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fields, lineterminator="\r\n")
    writer.writeheader()
    writer.writerows(new_customers)
    GEN_CUSTOMERS_PATH.write_bytes(buf.getvalue().encode("utf-8"))
    print(f"\nWrote {GEN_ORDERS_PATH.relative_to(ROOT.parent.parent)} and {GEN_CUSTOMERS_PATH.relative_to(ROOT.parent.parent)}")


if __name__ == "__main__":
    main()
