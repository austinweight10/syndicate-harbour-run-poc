#!/usr/bin/env python3
"""
Harbour Run — full development-store seed (SEED APP ONLY).

One command replaces SETUP_RUNBOOK §5–8 and §11 (CSV imports, manual
collections, order seed, main menu). Stages, in order:

  products     data/products.csv   → productSet, published to Online Store
  collections  COLLECTIONS below   → manual collections with exact handles
  images       images/manifest.json → staged upload of the local PNGs, attached
                                    as product media, colour variants linked,
                                    placehold.co media removed
  customers    data/customers.csv  → customerCreate
  orders       data/orders-seed.json → orderCreate, associated to customers
  menu         main-menu           → Home + the four MENU_HANDLES collections (best effort)

Every stage skips what already exists, so re-running is safe. Orders are
matched on a per-order tag (e.g. `ord_seed_001`).

IMPORTANT
---------
- Syndicate stays read-only (read_orders, read_products, read_customers).
  Run this with a SEPARATE seed app. Never add write_* to Syndicate.
- Store settings (GBP, Europe/London), the Dawn theme, and the storefront
  password are Admin clicks — SETUP_RUNBOOK §2–4.

Auth (pick one):
  SHOPIFY_SEED_ADMIN_TOKEN            Admin API token (shpat_…) from the seed app
  SEED_CLIENT_ID + SEED_CLIENT_SECRET Dev Dashboard seed app in the same
                                      organisation as the store; exchanged via
                                      the client credentials grant (24h token)

Required env:
  SHOPIFY_STORE_DOMAIN   e.g. syndicate-4ghkumor.myshopify.com

Optional:
  ONLY=products,collections   run a subset of stages
  DRY_RUN=1                   print the plan, no network calls
  LIMIT=N                     seed only the first N orders
  ORDER_INTERVAL=12.5         seconds between orders (dev stores: 5 orders/min)
  FORCE_IMAGES=1              re-upload product images even if already present
  IMAGE_TIMEOUT=240           seconds to wait for uploaded media to be READY

Images: images/<handle>/*.png + images/manifest.json come from
scripts/render_product_images.mjs. Products listed in the manifest are created
WITHOUT the CSV's placehold.co image (the images stage attaches the real ones);
anything not in the manifest keeps its placehold.co Image Src.

Seed-app scopes:
  write_products, write_inventory, read_locations, write_publications,
  write_customers, write_orders, write_online_store_navigation, write_files

Usage (from repo root):
  export SHOPIFY_STORE_DOMAIN=syndicate-4ghkumor.myshopify.com
  export SEED_CLIENT_ID=… SEED_CLIENT_SECRET=…
  DRY_RUN=1 python3 docs/live-demo-store/scripts/seed_store.py
  python3 docs/live-demo-store/scripts/seed_store.py
"""
from __future__ import annotations

import csv
import json
import os
import sys
import time
import uuid
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seed_orders import build_order_input  # noqa: E402

API_VERSION = "2025-10"
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
IMAGES = ROOT / "images"
STAGES = ["products", "collections", "images", "customers", "orders", "menu"]

STAGE_SCOPES = {
    "products": ["write_products", "write_inventory", "read_locations", "write_publications"],
    "collections": ["write_products", "write_publications"],
    # productUpdate(media:) / productVariantsBulkUpdate / productReorderMedia need
    # write_products; fileUpdate (detaching the old placehold.co media — the
    # documented replacement for the deprecated productDeleteMedia) needs write_files.
    "images": ["write_products", "write_files"],
    "customers": ["write_customers"],
    "orders": ["write_orders", "read_customers", "read_products"],
    "menu": ["write_online_store_navigation"],
}

# Keep in sync with data/collections.md. Race Kits deliberately excludes the
# shell (P1 friction); the youth tee deliberately has no size guide (P0).
COLLECTIONS = [
    {
        "title": "Race Kits",
        "handle": "race-kits",
        "description": "Race-day kit for 5K–half weekends. Tee, shorts, socks, and hydration.",
        "products": ["race-tee-unisex", "running-shorts", "performance-socks", "soft-flask"],
    },
    {
        "title": "Wet-weather training",
        "handle": "wet-weather-training",
        "description": "Packable shell and layers for London midweek rain and cool starts.",
        "products": ["waterproof-shell-jacket", "half-zip-midlayer", "recovery-joggers"],
    },
    {
        "title": "Race-day essentials",
        "handle": "race-day-essentials",
        "description": (
            "What you need before Hyde Park, Battersea, or parkrun — without digging "
            "through the whole catalogue."
        ),
        "products": [
            "race-tee-unisex",
            "running-shorts",
            "performance-socks",
            "trail-or-road-cap",
            "soft-flask",
        ],
    },
    {
        "title": "Kids & Youth",
        "handle": "kids-youth",
        "description": (
            "Junior run picks. (Demo catalogue is tee-first — size guide intentionally "
            "absent on the youth tee PDP.)"
        ),
        "products": ["kids-youth-run-tee"],
    },
    # ---- Catalogue expansion (data/catalogue-expansion.md) --------------------
    # Category / activity collections modelled on a UK premium running brand's
    # range. NOT in the main menu (see MENU_HANDLES). Never add a waterproof /
    # shell product to race-kits above.
    {
        "title": "Men's",
        "handle": "mens",
        "description": "Men's running kit — race, everyday training and cold-weather layers.",
        "products": [
            "mens-race-tee",
            "mens-eco-tech-tee",
            "mens-hot-weather-tee",
            "mens-race-vest-2",
            "mens-training-singlet",
            "mens-elite-race-vest",
            "mens-long-sleeve-tech-tee",
            "mens-tempo-top",
            "mens-merino-silk-base-layer-ls",
            "mens-thermal-top",
            "mens-all-weather-jacket",
            "mens-packable-rain-shell",
            "mens-windbreaker",
            "mens-showerproof-gilet",
            "mens-insulated-run-jacket",
            "mens-marathon-shorts",
            "mens-run-shorts",
            "mens-split-shorts",
            "mens-trail-shorts",
            "mens-half-tights",
            "mens-session-tights",
            "mens-run-trousers",
        ],
    },
    {
        "title": "Women's",
        "handle": "womens",
        "description": "Women's running kit — race, everyday training and cold-weather layers.",
        "products": [
            "womens-race-tee",
            "womens-eco-tech-tee",
            "womens-hot-weather-tee",
            "womens-race-vest",
            "womens-crop-race-vest",
            "womens-long-sleeve-tech-tee",
            "womens-merino-silk-base-layer-ls",
            "womens-packable-rain-shell",
            "womens-windbreaker",
            "womens-marathon-shorts",
            "womens-split-shorts",
            "womens-speed-shorts",
            "womens-trail-shorts",
            "womens-merino-half-tights",
            "womens-run-tights",
        ],
    },
    {
        "title": "T-Shirts",
        "handle": "t-shirts",
        "description": "Short sleeve running tees for race day, hot days and everyday miles.",
        "products": [
            "race-tee-unisex",
            "mens-race-tee",
            "womens-race-tee",
            "mens-eco-tech-tee",
            "womens-eco-tech-tee",
            "mens-hot-weather-tee",
            "womens-hot-weather-tee",
        ],
    },
    {
        "title": "Singlets & Vests",
        "handle": "singlets-vests",
        "description": "Race vests, crop vests and training singlets.",
        "products": [
            "mens-race-vest-2",
            "womens-race-vest",
            "womens-crop-race-vest",
            "mens-training-singlet",
            "mens-elite-race-vest",
        ],
    },
    {
        "title": "Long Sleeve Tops",
        "handle": "long-sleeve-tops",
        "description": "Long sleeve tops and half-zips for cool starts.",
        "products": [
            "half-zip-midlayer",
            "mens-long-sleeve-tech-tee",
            "womens-long-sleeve-tech-tee",
            "mens-tempo-top",
        ],
    },
    {
        "title": "Baselayers",
        "handle": "baselayers",
        "description": "Merino, silk and thermal base layers for winter running.",
        "products": [
            "mens-merino-silk-base-layer-ls",
            "womens-merino-silk-base-layer-ls",
            "mens-thermal-top",
        ],
    },
    {
        "title": "Jackets & Gilets",
        "handle": "jackets-gilets",
        "description": "Waterproof shells, windbreakers, gilets and insulated jackets.",
        "products": [
            "waterproof-shell-jacket",
            "mens-all-weather-jacket",
            "mens-packable-rain-shell",
            "womens-packable-rain-shell",
            "mens-windbreaker",
            "womens-windbreaker",
            "mens-showerproof-gilet",
            "mens-insulated-run-jacket",
        ],
    },
    {
        "title": "Shorts",
        "handle": "shorts",
        "description": "Race, everyday, split and trail running shorts.",
        "products": [
            "running-shorts",
            "mens-marathon-shorts",
            "womens-marathon-shorts",
            "mens-run-shorts",
            "mens-split-shorts",
            "womens-split-shorts",
            "womens-speed-shorts",
            "mens-trail-shorts",
            "womens-trail-shorts",
        ],
    },
    {
        "title": "Half Tights",
        "handle": "half-tights",
        "description": "Supportive half tights for long runs and race day.",
        "products": [
            "mens-half-tights",
            "womens-merino-half-tights",
        ],
    },
    {
        "title": "Tights & Trousers",
        "handle": "tights-trousers",
        "description": "Full-length tights and running trousers.",
        "products": [
            "mens-session-tights",
            "womens-run-tights",
            "mens-run-trousers",
            "recovery-joggers",
        ],
    },
    {
        "title": "Socks",
        "handle": "socks",
        "description": "Race, merino and everyday running socks.",
        "products": [
            "performance-socks",
            "race-socks",
            "merino-crew-socks",
            "ankle-socks",
        ],
    },
    {
        "title": "Caps & Beanies",
        "handle": "caps-beanies",
        "description": "Run caps, beanies, neck warmers and headbands.",
        "products": [
            "trail-or-road-cap",
            "run-cap",
            "merino-silk-beanie",
            "merino-silk-neck-warmer",
            "headband",
        ],
    },
    {
        "title": "Sleeves & Gloves",
        "handle": "sleeves-gloves",
        "description": "Arm sleeves and running gloves.",
        "products": [
            "arm-sleeves",
            "winter-gloves",
        ],
    },
    {
        "title": "Accessories",
        "handle": "accessories",
        "description": "Socks, headwear, sleeves, gloves and hydration.",
        "products": [
            "performance-socks",
            "trail-or-road-cap",
            "soft-flask",
            "race-socks",
            "merino-crew-socks",
            "ankle-socks",
            "run-cap",
            "merino-silk-beanie",
            "merino-silk-neck-warmer",
            "headband",
            "arm-sleeves",
            "winter-gloves",
            "trail-race-pack",
        ],
    },
    {
        "title": "Race",
        "handle": "race",
        "description": "Race-day vests, tees, shorts and accessories for 5K to marathon.",
        "products": [
            "mens-race-tee",
            "womens-race-tee",
            "mens-race-vest-2",
            "womens-race-vest",
            "womens-crop-race-vest",
            "mens-elite-race-vest",
            "mens-marathon-shorts",
            "womens-marathon-shorts",
            "womens-speed-shorts",
            "mens-half-tights",
            "race-socks",
            "arm-sleeves",
            "trail-race-pack",
        ],
    },
    {
        "title": "Trail",
        "handle": "trail",
        "description": "Tough shorts, packs and layers for off-road running.",
        "products": [
            "mens-trail-shorts",
            "womens-trail-shorts",
            "trail-race-pack",
            "mens-insulated-run-jacket",
            "merino-silk-beanie",
            "merino-silk-neck-warmer",
            "winter-gloves",
            "headband",
            "soft-flask",
        ],
    },
    {
        "title": "Hot Weather",
        "handle": "hot-weather",
        "description": "Airy tees, singlets and split shorts for summer running.",
        "products": [
            "mens-hot-weather-tee",
            "womens-hot-weather-tee",
            "mens-training-singlet",
            "mens-split-shorts",
            "womens-split-shorts",
            "run-cap",
        ],
    },
    {
        "title": "Cold Weather",
        "handle": "cold-weather",
        "description": "Merino, thermals, tights and jackets for winter miles.",
        "products": [
            "mens-tempo-top",
            "mens-merino-silk-base-layer-ls",
            "womens-merino-silk-base-layer-ls",
            "mens-thermal-top",
            "mens-all-weather-jacket",
            "mens-windbreaker",
            "womens-windbreaker",
            "mens-insulated-run-jacket",
            "mens-session-tights",
            "womens-run-tights",
            "womens-merino-half-tights",
            "merino-crew-socks",
            "merino-silk-beanie",
            "merino-silk-neck-warmer",
            "winter-gloves",
            "arm-sleeves",
            "half-zip-midlayer",
        ],
    },
]

# The storefront main menu is a demo contract (Playwright shopper path): Home +
# exactly these four collections, in this order. New collections stay off-menu.
MENU_HANDLES = ["race-kits", "wet-weather-training", "race-day-essentials", "kids-youth"]


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def warn(msg: str) -> None:
    print(f"WARN  {msg}")


# --------------------------------------------------------------------------- #
# HTTP
# --------------------------------------------------------------------------- #


def client_credentials_token(domain: str, client_id: str, client_secret: str) -> str:
    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        f"https://{domain}/admin/oauth/access_token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        die(
            f"Client credentials grant failed (HTTP {e.code}): {detail}\n"
            "The seed app must be installed on this store and belong to the same "
            "organisation as the store."
        )
    token = payload.get("access_token")
    if not token:
        die(f"No access_token in client credentials response: {payload}")
    return token


class Shopify:
    def __init__(self, domain: str, token: str):
        self.url = f"https://{domain}/admin/api/{API_VERSION}/graphql.json"
        self.token = token

    def gql(self, query: str, variables: dict | None = None, retry_network: bool = True) -> dict:
        """retry_network=False raises NetworkError instead of retrying, for
        non-idempotent writes (orderCreate) that the caller must re-check."""
        body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
        for attempt in range(6):
            req = urllib.request.Request(
                self.url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": self.token,
                },
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    payload = json.loads(resp.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                if e.code == 429 or (e.code >= 500 and retry_network):
                    time.sleep(2 * (attempt + 1))
                    continue
                detail = e.read().decode("utf-8", errors="replace")
                die(f"HTTP {e.code}: {detail}")
            except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
                if not retry_network:
                    raise NetworkError(str(e)) from e
                warn(f"network error ({e}); retrying in {5 * (attempt + 1)}s")
                time.sleep(5 * (attempt + 1))
                continue
            errors = payload.get("errors") or []
            if any((err.get("extensions") or {}).get("code") == "THROTTLED" for err in errors):
                time.sleep(2 * (attempt + 1))
                continue
            if errors:
                die(f"GraphQL errors: {json.dumps(errors, indent=2)}")
            return payload["data"]
        die("Still throttled or unreachable after retries. Wait a minute and re-run (it resumes).")
        return {}


class NetworkError(Exception):
    """The request may or may not have reached Shopify."""


def user_errors(result: dict) -> list:
    return result.get("userErrors") or []


# --------------------------------------------------------------------------- #
# Preflight
# --------------------------------------------------------------------------- #

PREFLIGHT = """
{
  shop { myshopifyDomain currencyCode ianaTimezone }
  currentAppInstallation { accessScopes { handle } }
}
"""


def preflight(api: Shopify, stages: list[str]) -> None:
    data = api.gql(PREFLIGHT)
    shop = data["shop"]
    granted = {s["handle"] for s in data["currentAppInstallation"]["accessScopes"]}
    print(f"Store: {shop['myshopifyDomain']} · {shop['currencyCode']} · {shop['ianaTimezone']}")
    if shop["currencyCode"] != "GBP":
        warn("Shop currency is not GBP. Set Settings → Store details → Currency to GBP first (runbook §2).")
    if shop["ianaTimezone"] != "Europe/London":
        warn("Shop timezone is not Europe/London (runbook §2). Saturday clustering may shift.")

    def has(scope: str) -> bool:
        if scope in granted:
            return True
        return scope.startswith("read_") and f"write_{scope[5:]}" in granted

    missing = sorted({s for stage in stages for s in STAGE_SCOPES[stage] if not has(s)})
    if missing:
        die(
            "Seed app is missing scopes: "
            + ", ".join(missing)
            + "\nAdd them to the seed app, reinstall it on the store, and re-run."
        )
    print(f"Scopes OK for: {', '.join(stages)}\n")


# --------------------------------------------------------------------------- #
# Products
# --------------------------------------------------------------------------- #


def load_products() -> list[dict]:
    products: dict[str, dict] = {}
    with open(DATA / "products.csv", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            handle = row["Handle"].strip()
            product = products.get(handle)
            if product is None:
                product = products[handle] = {
                    "handle": handle,
                    "title": row["Title"],
                    "descriptionHtml": row["Body (HTML)"],
                    "vendor": row["Vendor"],
                    "productType": row["Type"],
                    "tags": [t.strip() for t in row["Tags"].split(",") if t.strip()],
                    "status": (row["Status"] or "active").upper(),
                    "optionNames": [
                        row[f"Option{i} Name"] for i in (1, 2, 3) if row[f"Option{i} Name"]
                    ],
                    "variants": [],
                    "images": [],
                }
            if row["Image Src"]:
                product["images"].append(
                    {"src": row["Image Src"], "alt": row["Image Alt Text"] or product["title"]}
                )
            if not row["Variant SKU"]:
                continue
            values = [
                row[f"Option{i} Value"]
                for i in range(1, len(product["optionNames"]) + 1)
            ]
            product["variants"].append(
                {
                    "sku": row["Variant SKU"],
                    "values": values,
                    "price": row["Variant Price"],
                    "compareAtPrice": row["Variant Compare At Price"] or None,
                    "grams": float(row["Variant Grams"] or 0),
                    "tracked": row["Variant Inventory Tracker"] == "shopify",
                    "qty": int(row["Variant Inventory Qty"] or 0),
                    "policy": (row["Variant Inventory Policy"] or "deny").upper(),
                    "requiresShipping": row["Variant Requires Shipping"].upper() != "FALSE",
                    "taxable": row["Variant Taxable"].upper() != "FALSE",
                }
            )
    return list(products.values())


def product_set_input(product: dict, location_id: str, with_files: bool = True) -> dict:
    options = []
    for idx, name in enumerate(product["optionNames"]):
        seen: list[str] = []
        for variant in product["variants"]:
            if variant["values"][idx] not in seen:
                seen.append(variant["values"][idx])
        options.append({"name": name, "position": idx + 1, "values": [{"name": v} for v in seen]})

    variants = []
    for variant in product["variants"]:
        entry = {
            "sku": variant["sku"],
            "price": variant["price"],
            "optionValues": [
                {"optionName": name, "name": variant["values"][idx]}
                for idx, name in enumerate(product["optionNames"])
            ],
            "inventoryPolicy": variant["policy"],
            "taxable": variant["taxable"],
            "inventoryItem": {
                "tracked": variant["tracked"],
                "requiresShipping": variant["requiresShipping"],
                "measurement": {"weight": {"value": variant["grams"], "unit": "GRAMS"}},
            },
            "inventoryQuantities": [
                {"locationId": location_id, "name": "available", "quantity": variant["qty"]}
            ],
        }
        if variant["compareAtPrice"]:
            entry["compareAtPrice"] = variant["compareAtPrice"]
        variants.append(entry)

    data = {
        "title": product["title"],
        "handle": product["handle"],
        "descriptionHtml": product["descriptionHtml"],
        "vendor": product["vendor"],
        "productType": product["productType"],
        "tags": product["tags"],
        "status": product["status"],
        "productOptions": options,
        "variants": variants,
    }
    # Products with rendered images get them from the images stage instead of
    # a placehold.co placeholder first.
    if with_files:
        data["files"] = [
            {"originalSource": img["src"], "alt": img["alt"], "contentType": "IMAGE"}
            for img in product["images"]
        ]
    return data


FIND_PRODUCT = """
query ($q: String!) {
  products(first: 1, query: $q) { nodes { id handle } }
}
"""

LOCATIONS_AND_PUBLICATIONS = """
{
  locations(first: 5) { nodes { id name isActive } }
  publications(first: 20) { nodes { id name } }
}
"""

PRODUCT_SET = """
mutation ($input: ProductSetInput!, $identifier: ProductSetIdentifiers) {
  productSet(input: $input, identifier: $identifier, synchronous: true) {
    product { id handle variants(first: 50) { nodes { id sku } } }
    userErrors { field message code }
  }
}
"""

PUBLISH = """
mutation ($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    userErrors { field message }
  }
}
"""


def online_store_publication(api: Shopify) -> tuple[str, str]:
    data = api.gql(LOCATIONS_AND_PUBLICATIONS)
    locations = [loc for loc in data["locations"]["nodes"] if loc["isActive"]]
    if not locations:
        die("No active location on the store.")
    publication = next(
        (p for p in data["publications"]["nodes"] if p["name"] == "Online Store"), None
    )
    if not publication:
        die("No 'Online Store' publication. Is the Online Store sales channel enabled?")
    return locations[0]["id"], publication["id"]


def publish(api: Shopify, resource_id: str, publication_id: str, label: str) -> None:
    data = api.gql(PUBLISH, {"id": resource_id, "input": [{"publicationId": publication_id}]})
    errors = user_errors(data["publishablePublish"])
    if errors:
        warn(f"publish {label}: {errors}")


def seed_products(api: Shopify | None, dry: bool) -> dict[str, str]:
    products = load_products()
    local_images = load_image_manifest()
    print(f"== products ({len(products)} products, "
          f"{sum(len(p['variants']) for p in products)} variants)")
    if dry:
        for p in products:
            src = "local images (images stage)" if p["handle"] in local_images else "placehold.co"
            print(f"[DRY] {p['handle']}: {[v['sku'] for v in p['variants']]} · image: {src}")
        return {p["handle"]: f"gid://shopify/Product/DRY-{p['handle']}" for p in products}

    location_id, publication_id = online_store_publication(api)
    ids: dict[str, str] = {}
    for product in products:
        handle = product["handle"]
        found = api.gql(FIND_PRODUCT, {"q": f'handle:"{handle}"'})["products"]["nodes"]
        if found:
            ids[handle] = found[0]["id"]
            print(f"SKIP  {handle} (exists)")
        else:
            data = api.gql(
                PRODUCT_SET,
                {
                    "input": product_set_input(
                        product, location_id, with_files=handle not in local_images
                    ),
                    "identifier": {"handle": handle},
                },
            )
            result = data["productSet"]
            if user_errors(result):
                die(f"productSet {handle}: {user_errors(result)}")
            ids[handle] = result["product"]["id"]
            print(f"OK    {handle} → {len(result['product']['variants']['nodes'])} variants")
        publish(api, ids[handle], publication_id, handle)
    return ids


# --------------------------------------------------------------------------- #
# Collections
# --------------------------------------------------------------------------- #

FIND_COLLECTION = """
query ($q: String!) {
  collections(first: 1, query: $q) {
    nodes { id handle products(first: 250) { nodes { id } } }
  }
}
"""

COLLECTION_CREATE = """
mutation ($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle }
    userErrors { field message }
  }
}
"""

COLLECTION_ADD = """
mutation ($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    userErrors { field message }
  }
}
"""


def product_ids_by_handle(api: Shopify, handles: set[str]) -> dict[str, str]:
    ids = {}
    for handle in sorted(handles):
        found = api.gql(FIND_PRODUCT, {"q": f'handle:"{handle}"'})["products"]["nodes"]
        if not found:
            die(f"Product {handle} not found. Run the products stage first.")
        ids[handle] = found[0]["id"]
    return ids


def seed_collections(api: Shopify | None, dry: bool, product_ids: dict[str, str]) -> dict[str, str]:
    print(f"\n== collections ({len(COLLECTIONS)})")
    if dry:
        for c in COLLECTIONS:
            print(f"[DRY] {c['handle']}: {c['products']}")
        return {c["handle"]: f"gid://shopify/Collection/DRY-{c['handle']}" for c in COLLECTIONS}

    needed = {h for c in COLLECTIONS for h in c["products"]} - set(product_ids)
    if needed:
        product_ids = {**product_ids, **product_ids_by_handle(api, needed)}
    _, publication_id = online_store_publication(api)

    ids: dict[str, str] = {}
    for c in COLLECTIONS:
        wanted = [product_ids[h] for h in c["products"]]
        found = api.gql(FIND_COLLECTION, {"q": f'handle:"{c["handle"]}"'})["collections"]["nodes"]
        if found:
            collection = found[0]
            ids[c["handle"]] = collection["id"]
            present = {p["id"] for p in collection["products"]["nodes"]}
            missing = [pid for pid in wanted if pid not in present]
            if missing:
                data = api.gql(COLLECTION_ADD, {"id": collection["id"], "productIds": missing})
                if user_errors(data["collectionAddProducts"]):
                    die(f"collectionAddProducts {c['handle']}: {user_errors(data['collectionAddProducts'])}")
                print(f"OK    {c['handle']} (exists, added {len(missing)} products)")
            else:
                print(f"SKIP  {c['handle']} (exists)")
        else:
            data = api.gql(
                COLLECTION_CREATE,
                {
                    "input": {
                        "title": c["title"],
                        "handle": c["handle"],
                        "descriptionHtml": f"<p>{c['description']}</p>",
                        "products": wanted,
                    }
                },
            )
            result = data["collectionCreate"]
            if user_errors(result):
                die(f"collectionCreate {c['handle']}: {user_errors(result)}")
            ids[c["handle"]] = result["collection"]["id"]
            print(f"OK    {c['handle']} → {len(wanted)} products")
        publish(api, ids[c["handle"]], publication_id, c["handle"])
    return ids


# --------------------------------------------------------------------------- #
# Images
# --------------------------------------------------------------------------- #
#
# Flow per product (Admin GraphQL 2025-10):
#   1. stagedUploadsCreate(resource: IMAGE, httpMethod: POST) → signed target
#   2. multipart POST of the PNG to that target (form fields, then `file` last)
#   3. productUpdate(product: {id}, media: [CreateMediaInput]) with the staged
#      resourceUrl as originalSource
#   4. poll product.media until every new image is READY
#   5. fileUpdate(referencesToRemove: [productId]) on the old placehold.co media
#      (productDeleteMedia is deprecated in favour of fileUpdate)
#   6. productVariantsBulkUpdate(variants: [{id, mediaId}]) links each colour
#   7. productReorderMedia so the first colour's image is the featured image
#
# Our media carry IMAGE_MARKER at the end of their alt text; that is how
# re-runs recognise work already done (FORCE_IMAGES=1 re-uploads anyway).

IMAGE_MARKER = " · hr-img-v1"
IMAGE_TIMEOUT = float(os.environ.get("IMAGE_TIMEOUT", "240"))
COLOUR_OPTION = "Colour"


def load_image_manifest() -> dict[str, dict]:
    path = IMAGES / "manifest.json"
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))["products"]


def image_plan(product: dict, entry: dict) -> list[dict]:
    """Images for one product, in display order, each with the SKUs it maps to."""
    colour_idx = (
        product["optionNames"].index(COLOUR_OPTION)
        if COLOUR_OPTION in product["optionNames"]
        else None
    )
    plan = []
    for img in entry["images"]:
        path = IMAGES / img["file"]
        if not path.exists():
            die(f"Missing image file {path}. Re-run scripts/render_product_images.mjs.")
        if img["colour"] is None:
            skus = [v["sku"] for v in product["variants"]]
        else:
            if colour_idx is None:
                die(f"{product['handle']}: manifest has colour images but the CSV has no Colour option")
            skus = [v["sku"] for v in product["variants"] if v["values"][colour_idx] == img["colour"]]
        plan.append(
            {
                "colour": img["colour"],
                "path": path,
                "alt": img["alt"] + IMAGE_MARKER,
                "skus": skus,
            }
        )
    if colour_idx is not None:
        colours = {v["values"][colour_idx] for v in product["variants"]}
        mapped = {p["colour"] for p in plan}
        missing = sorted(colours - mapped)
        if missing:
            die(f"{product['handle']}: no image for colour(s) {missing}. Re-render images.")
    return plan


def multipart_body(
    fields: list[tuple[str, str]], file_field: str, filename: str, content: bytes, content_type: str
) -> tuple[bytes, str]:
    """multipart/form-data body (stdlib only). The file part goes LAST — the
    signed-POST targets ignore any field sent after the file."""
    boundary = f"----hrseed{uuid.uuid4().hex}"
    out = []
    for name, value in fields:
        out.append(
            f'--{boundary}\r\nContent-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode("utf-8")
        )
    out.append(
        (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"\r\n'
            f"Content-Type: {content_type}\r\n\r\n"
        ).encode("utf-8")
        + content
        + b"\r\n"
    )
    out.append(f"--{boundary}--\r\n".encode("utf-8"))
    return b"".join(out), f"multipart/form-data; boundary={boundary}"


def upload_to_target(target: dict, filename: str, content: bytes, content_type: str) -> None:
    fields = [(p["name"], p["value"]) for p in target["parameters"]]
    body, ctype = multipart_body(fields, "file", filename, content, content_type)
    for attempt in range(4):
        req = urllib.request.Request(
            target["url"],
            data=body,
            headers={"Content-Type": ctype, "Content-Length": str(len(body))},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                if 200 <= resp.status < 300:
                    return
                detail = resp.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="replace")
            if e.code < 500 and e.code != 429:
                die(f"Staged upload of {filename} failed (HTTP {e.code}): {detail[:500]}")
        except urllib.error.URLError as e:
            detail = str(e)
        time.sleep(2 * (attempt + 1))
    die(f"Staged upload of {filename} failed after retries: {detail[:500]}")


STAGED_UPLOADS_CREATE = """
mutation ($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}
"""

PRODUCT_MEDIA = """
query ($id: ID!) {
  product(id: $id) {
    id
    handle
    media(first: 100) {
      nodes {
        id
        alt
        mediaContentType
        status
        mediaErrors { code details message }
        ... on MediaImage { image { url } }
      }
    }
    variants(first: 100) {
      nodes { id sku media(first: 1) { nodes { id } } }
    }
  }
}
"""

PRODUCT_ADD_MEDIA = """
mutation ($product: ProductUpdateInput!, $media: [CreateMediaInput!]) {
  productUpdate(product: $product, media: $media) {
    product { id }
    userErrors { field message }
  }
}
"""

FILE_DETACH = """
mutation ($files: [FileUpdateInput!]!) {
  fileUpdate(files: $files) {
    files { id }
    userErrors { field message code }
  }
}
"""

VARIANTS_LINK_MEDIA = """
mutation ($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    productVariants { id }
    userErrors { field message }
  }
}
"""

REORDER_MEDIA = """
mutation ($id: ID!, $moves: [MoveInput!]!) {
  productReorderMedia(id: $id, moves: $moves) {
    job { id }
    mediaUserErrors { field message code }
  }
}
"""


def product_media(api: Shopify, product_id: str) -> dict:
    product = api.gql(PRODUCT_MEDIA, {"id": product_id})["product"]
    if not product:
        die(f"Product {product_id} disappeared")
    return product


def is_placeholder(media: dict, old_alts: set[str]) -> bool:
    if media["mediaContentType"] != "IMAGE" or (media.get("alt") or "").endswith(IMAGE_MARKER):
        return False
    url = ((media.get("image") or {}).get("url") or "").lower()
    return (media.get("alt") or "") in old_alts or "placehold" in url


def wait_ready(api: Shopify, product_id: str, alts: set[str], handle: str) -> dict:
    deadline = time.time() + IMAGE_TIMEOUT
    while True:
        product = product_media(api, product_id)
        ours = [m for m in product["media"]["nodes"] if (m.get("alt") or "") in alts]
        failed = [m for m in ours if m["status"] == "FAILED"]
        if failed:
            die(f"{handle}: media processing failed: {[m['mediaErrors'] for m in failed]}")
        if len(ours) >= len(alts) and all(m["status"] == "READY" for m in ours):
            return product
        if time.time() > deadline:
            die(
                f"{handle}: media not READY after {IMAGE_TIMEOUT:.0f}s "
                f"({[(m['alt'], m['status']) for m in ours]}). Re-run later; uploads are kept."
            )
        time.sleep(3)


def seed_images(api: Shopify | None, dry: bool, product_ids: dict[str, str]) -> None:
    manifest = load_image_manifest()
    products = load_products()
    force = os.environ.get("FORCE_IMAGES", "").strip().lower() in ("1", "true", "yes")
    with_images = [p for p in products if p["handle"] in manifest]
    print(f"\n== images ({len(with_images)} products, "
          f"{sum(len(manifest[p['handle']]['images']) for p in with_images)} files"
          f"{', FORCE' if force else ''})")
    if not manifest:
        warn("No images/manifest.json — run scripts/render_product_images.mjs first. Skipping.")
        return
    for p in products:
        if p["handle"] not in manifest:
            warn(f"{p['handle']}: no local images; keeps its placehold.co image")
    plans = {p["handle"]: image_plan(p, manifest[p["handle"]]) for p in with_images}

    if dry:
        for p in with_images:
            print(f"[DRY] {p['handle']}")
            for i, img in enumerate(plans[p["handle"]]):
                size = img["path"].stat().st_size
                role = "featured" if i == 0 else f"#{i + 1}"
                target = (
                    f"variants {img['skus']}" if img["colour"] else f"all {len(img['skus'])} variants (no Colour option)"
                )
                print(f"        {img['path'].relative_to(ROOT)} ({size // 1024} KB, {role}) → {target}")
        return

    ok = skipped = 0
    for product in with_images:
        handle = product["handle"]
        plan = plans[handle]
        product_id = product_ids.get(handle)
        if not product_id or "DRY" in product_id:
            found = api.gql(FIND_PRODUCT, {"q": f'handle:"{handle}"'})["products"]["nodes"]
            if not found:
                warn(f"{handle}: not in the store — run the products stage first. Skipping.")
                continue
            product_id = found[0]["id"]

        old_alts = {img["alt"] for img in product["images"]} | {product["title"]}
        wanted_alts = [img["alt"] for img in plan]
        current = product_media(api, product_id)
        nodes = current["media"]["nodes"]
        present = {m["alt"] for m in nodes if m.get("alt") in wanted_alts}
        to_upload = plan if force else [img for img in plan if img["alt"] not in present]

        # 1–3. upload + attach
        if to_upload:
            targets_input = [
                {
                    "filename": f"hr-{handle}-{img['path'].stem}.png",
                    "mimeType": "image/png",
                    "resource": "IMAGE",
                    "httpMethod": "POST",
                    "fileSize": str(img["path"].stat().st_size),
                }
                for img in to_upload
            ]
            result = api.gql(STAGED_UPLOADS_CREATE, {"input": targets_input})["stagedUploadsCreate"]
            if user_errors(result):
                die(f"stagedUploadsCreate {handle}: {user_errors(result)}")
            targets = result["stagedTargets"]
            media_input = []
            for img, spec, target in zip(to_upload, targets_input, targets):
                upload_to_target(target, spec["filename"], img["path"].read_bytes(), "image/png")
                media_input.append(
                    {"originalSource": target["resourceUrl"], "alt": img["alt"], "mediaContentType": "IMAGE"}
                )
            result = api.gql(PRODUCT_ADD_MEDIA, {"product": {"id": product_id}, "media": media_input})["productUpdate"]
            if user_errors(result):
                die(f"productUpdate(media) {handle}: {user_errors(result)}")
            print(f"UP    {handle}: uploaded {len(to_upload)} image(s)")

        # 4. wait for processing (also catches images left PROCESSING by an earlier run)
        current = wait_ready(api, product_id, set(wanted_alts), handle)
        nodes = current["media"]["nodes"]
        # Newest copy of each of our images wins (media are listed in position
        # order and uploads are appended); older copies and marker images no
        # longer in the manifest are stale.
        by_alt: dict[str, list[dict]] = {}
        for m in nodes:
            if m.get("alt") in wanted_alts:
                by_alt.setdefault(m["alt"], []).append(m)
        new_ids = {alt: ms[-1]["id"] for alt, ms in by_alt.items()}
        stale = [m for ms in by_alt.values() for m in ms[:-1]] + [
            m for m in nodes if (m.get("alt") or "").endswith(IMAGE_MARKER) and m["alt"] not in wanted_alts
        ]

        # 5. detach placeholders and stale copies of our own images
        remove = [m for m in nodes if is_placeholder(m, old_alts)] + stale
        if remove:
            result = api.gql(
                FILE_DETACH,
                {"files": [{"id": m["id"], "referencesToRemove": [product_id]} for m in remove]},
            )["fileUpdate"]
            if user_errors(result):
                die(f"fileUpdate {handle}: {user_errors(result)}")
            print(f"DEL   {handle}: detached {len(remove)} old image(s)")

        # 6. link colour variants
        variant_media = {
            v["sku"]: [n["id"] for n in v["media"]["nodes"]] for v in current["variants"]["nodes"]
        }
        variant_ids = {v["sku"]: v["id"] for v in current["variants"]["nodes"]}
        links = []
        for img in plan:
            if img["colour"] is None:
                continue
            media_id = new_ids[img["alt"]]
            for sku in img["skus"]:
                if sku not in variant_ids:
                    warn(f"{handle}: variant {sku} not in the store")
                    continue
                if variant_media.get(sku, [None])[:1] != [media_id]:
                    links.append({"id": variant_ids[sku], "mediaId": media_id})
        if links:
            result = api.gql(VARIANTS_LINK_MEDIA, {"productId": product_id, "variants": links})[
                "productVariantsBulkUpdate"
            ]
            if user_errors(result):
                die(f"productVariantsBulkUpdate {handle}: {user_errors(result)}")
            print(f"LINK  {handle}: {len(links)} variant(s) → colour image")

        # 7. featured image first, colours in CSV order
        if remove or to_upload:
            current = product_media(api, product_id)
        order = [m["id"] for m in current["media"]["nodes"]]
        wanted_order = [new_ids[alt] for alt in wanted_alts]
        moves = [
            {"id": media_id, "newPosition": str(pos)}
            for pos, media_id in enumerate(wanted_order)
            if pos >= len(order) or order[pos] != media_id
        ]
        if moves:
            result = api.gql(REORDER_MEDIA, {"id": product_id, "moves": moves})["productReorderMedia"]
            if result["mediaUserErrors"]:
                warn(f"productReorderMedia {handle}: {result['mediaUserErrors']}")
            else:
                print(f"ORDER {handle}: featured = {wanted_alts[0].replace(IMAGE_MARKER, '')}")

        if to_upload or remove or links or moves:
            ok += 1
        else:
            skipped += 1
            print(f"SKIP  {handle} (images present)")
    print(f"images: updated={ok} skipped={skipped}")


# --------------------------------------------------------------------------- #
# Customers
# --------------------------------------------------------------------------- #

FIND_CUSTOMER = """
query ($q: String!) {
  customers(first: 1, query: $q) { nodes { id email } }
}
"""

CUSTOMER_CREATE = """
mutation ($input: CustomerInput!) {
  customerCreate(input: $input) {
    customer { id email }
    userErrors { field message }
  }
}
"""


def find_customer(api: Shopify, email: str) -> str | None:
    nodes = api.gql(FIND_CUSTOMER, {"q": f'email:"{email}"'})["customers"]["nodes"]
    return nodes[0]["id"] if nodes else None


def seed_customers(api: Shopify | None, dry: bool) -> dict[str, str]:
    with open(DATA / "customers.csv", encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    print(f"\n== customers ({len(rows)})")
    if dry:
        for r in rows:
            print(f"[DRY] {r['Email']} · {r['Zip']} · {r['Tags']}")
        return {r["Email"]: f"gid://shopify/Customer/DRY-{i}" for i, r in enumerate(rows)}

    ids: dict[str, str] = {}
    for r in rows:
        email = r["Email"].strip()
        existing = find_customer(api, email)
        if existing:
            ids[email] = existing
            print(f"SKIP  {email} (exists)")
            continue
        address = {
            "firstName": r["First Name"],
            "lastName": r["Last Name"],
            "address1": r["Address1"],
            "city": r["City"],
            "zip": r["Zip"],
            "countryCode": r["Country Code"] or "GB",
        }
        if r["Address2"]:
            address["address2"] = r["Address2"]
        data = api.gql(
            CUSTOMER_CREATE,
            {
                "input": {
                    "firstName": r["First Name"],
                    "lastName": r["Last Name"],
                    "email": email,
                    "tags": [t.strip() for t in r["Tags"].split(",") if t.strip()],
                    "note": r["Note"],
                    "taxExempt": r["Tax Exempt"].lower() == "yes",
                    "addresses": [address],
                }
            },
        )
        result = data["customerCreate"]
        if user_errors(result):
            # Search can lag behind a previous run; look once more before failing.
            time.sleep(2)
            existing = find_customer(api, email)
            if not existing:
                die(f"customerCreate {email}: {user_errors(result)}")
            ids[email] = existing
            print(f"SKIP  {email} (exists)")
            continue
        ids[email] = result["customer"]["id"]
        print(f"OK    {email}")
        time.sleep(0.2)
    return ids


# --------------------------------------------------------------------------- #
# Orders
# --------------------------------------------------------------------------- #

SEEDED_ORDERS = """
query ($after: String) {
  orders(first: 250, after: $after, query: "tag:seed") {
    nodes { tags }
    pageInfo { hasNextPage endCursor }
  }
}
"""

VARIANT_BY_SKU = """
query ($q: String!) {
  productVariants(first: 1, query: $q) { nodes { id sku } }
}
"""

ORDER_CREATE = """
mutation ($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    order { id name }
    userErrors { field message }
  }
}
"""


# Development and trial stores accept at most 5 new orders per minute.
ORDER_INTERVAL = float(os.environ.get("ORDER_INTERVAL", "12.5"))


def rate_limited(result: dict) -> bool:
    return any("too many attempts" in (e.get("message") or "").lower() for e in user_errors(result))


ORDER_BY_TAG = """
query ($q: String!) {
  orders(first: 1, query: $q) { nodes { id name } }
}
"""


def order_by_seed_tag(api: Shopify, seed_id: str) -> dict | None:
    nodes = api.gql(ORDER_BY_TAG, {"q": f"tag:{seed_id}"})["orders"]["nodes"]
    return nodes[0] if nodes else None


def seeded_order_tags(api: Shopify) -> set[str]:
    tags: set[str] = set()
    after = None
    while True:
        page = api.gql(SEEDED_ORDERS, {"after": after})["orders"]
        for node in page["nodes"]:
            tags.update(node["tags"])
        if not page["pageInfo"]["hasNextPage"]:
            return tags
        after = page["pageInfo"]["endCursor"]


def seed_orders(api: Shopify | None, dry: bool, customer_ids: dict[str, str]) -> None:
    payload = json.loads((DATA / "orders-seed.json").read_text(encoding="utf-8"))
    orders = payload["orders"]
    limit = os.environ.get("LIMIT", "").strip()
    if limit:
        orders = orders[: int(limit)]
    print(f"\n== orders ({len(orders)})")
    if dry:
        for o in orders:
            print(f"[DRY] {o['id']} {o['created_at']} {o['cohort_hint']} £{o['subtotal']} "
                  f"{o['customer_email']} skus={[li['sku'] for li in o['line_items']]}")
        return

    done = seeded_order_tags(api)
    variant_cache: dict[str, str] = {}
    ok = skipped = failed = 0
    for o in orders:
        if o["id"] in done:
            skipped += 1
            continue
        for li in o["line_items"]:
            sku = li["sku"]
            if sku not in variant_cache:
                nodes = api.gql(VARIANT_BY_SKU, {"q": f'sku:"{sku}"'})["productVariants"]["nodes"]
                if not nodes:
                    die(f"No variant for SKU {sku}. Run the products stage first.")
                variant_cache[sku] = nodes[0]["id"]
        order_input = build_order_input(o, variant_cache)
        order_input["tags"] = [*order_input["tags"], o["id"]]
        customer_id = customer_ids.get(o["customer_email"]) or find_customer(api, o["customer_email"])
        if customer_id:
            order_input["customer"] = {"toAssociate": {"id": customer_id}}
        else:
            warn(f"{o['id']}: no customer for {o['customer_email']}; order will be guest-only")
        result: dict = {"order": None, "userErrors": [{"field": None, "message": "network errors on every attempt"}]}
        for attempt in range(4):
            try:
                data = api.gql(
                    ORDER_CREATE,
                    {"order": order_input, "options": {"sendReceipt": False, "sendFulfillmentReceipt": False}},
                    retry_network=False,
                )
            except NetworkError as e:
                # The create may have landed. Look for its id tag before retrying.
                warn(f"{o['id']}: network error ({e}); checking before retry")
                time.sleep(20)
                existing = order_by_seed_tag(api, o["id"])
                if existing:
                    result = {"order": existing, "userErrors": []}
                    break
                continue
            result = data["orderCreate"]
            if not rate_limited(result) or attempt == 3:
                break
            print(f"WAIT  {o['id']}: order rate limit, retrying in 65s")
            time.sleep(65)
        if user_errors(result):
            print(f"FAIL  {o['id']}: {user_errors(result)}")
            failed += 1
        else:
            print(f"OK    {o['id']} → {result['order']['name']}")
            ok += 1
        time.sleep(ORDER_INTERVAL)
    print(f"orders: ok={ok} skipped={skipped} failed={failed}")
    if failed:
        sys.exit(2)


# --------------------------------------------------------------------------- #
# Menu (best effort)
# --------------------------------------------------------------------------- #

MENUS = """
{
  menus(first: 20) { nodes { id handle title items { title } } }
}
"""

MENU_UPDATE = """
mutation ($id: ID!, $title: String!, $items: [MenuItemUpdateInput!]!) {
  menuUpdate(id: $id, title: $title, items: $items) {
    menu { id handle }
    userErrors { field message }
  }
}
"""


def menu_collections() -> list[dict]:
    by_handle = {c["handle"]: c for c in COLLECTIONS}
    missing = [h for h in MENU_HANDLES if h not in by_handle]
    if missing:
        die(f"MENU_HANDLES not in COLLECTIONS: {missing}")
    return [by_handle[h] for h in MENU_HANDLES]


def seed_menu(api: Shopify | None, dry: bool, collection_ids: dict[str, str]) -> None:
    menu_cols = menu_collections()
    titles = ["Home", *[c["title"] for c in menu_cols]]
    print("\n== menu (main-menu)")
    if dry:
        print(f"[DRY] main-menu → {titles}")
        return

    menu = next((m for m in api.gql(MENUS)["menus"]["nodes"] if m["handle"] == "main-menu"), None)
    if not menu:
        warn("No main-menu found. Set navigation by hand (runbook §11).")
        return
    if [i["title"] for i in menu["items"]] == titles:
        print("SKIP  main-menu (already set)")
        return

    missing = [c["handle"] for c in menu_cols if c["handle"] not in collection_ids]
    for handle in missing:
        found = api.gql(FIND_COLLECTION, {"q": f'handle:"{handle}"'})["collections"]["nodes"]
        if not found:
            warn(f"Collection {handle} not found; skipping menu.")
            return
        collection_ids[handle] = found[0]["id"]

    items = [{"title": "Home", "type": "FRONTPAGE", "url": "/"}]
    for c in menu_cols:
        items.append(
            {
                "title": c["title"],
                "type": "COLLECTION",
                "resourceId": collection_ids[c["handle"]],
                "url": f"/collections/{c['handle']}",
            }
        )
    data = api.gql(MENU_UPDATE, {"id": menu["id"], "title": menu["title"], "items": items})
    if user_errors(data["menuUpdate"]):
        warn(f"menuUpdate: {user_errors(data['menuUpdate'])}. Set navigation by hand (runbook §11).")
        return
    print(f"OK    main-menu → {titles}")


# --------------------------------------------------------------------------- #


def main() -> None:
    domain = os.environ.get("SHOPIFY_STORE_DOMAIN", "").strip()
    token = os.environ.get("SHOPIFY_SEED_ADMIN_TOKEN", "").strip()
    client_id = os.environ.get("SEED_CLIENT_ID", "").strip()
    client_secret = os.environ.get("SEED_CLIENT_SECRET", "").strip()
    dry = os.environ.get("DRY_RUN", "").strip().lower() in ("1", "true", "yes")
    only = [s.strip() for s in os.environ.get("ONLY", "").split(",") if s.strip()]
    stages = only or STAGES
    unknown = [s for s in stages if s not in STAGES]
    if unknown:
        die(f"Unknown stage(s): {unknown}. Choose from {STAGES}")

    if not domain:
        die("Set SHOPIFY_STORE_DOMAIN (e.g. syndicate-4ghkumor.myshopify.com)")

    api = None
    if not dry:
        if not token:
            if not (client_id and client_secret):
                die(
                    "Set SHOPIFY_SEED_ADMIN_TOKEN, or SEED_CLIENT_ID + SEED_CLIENT_SECRET "
                    "(seed app — not Syndicate)"
                )
            token = client_credentials_token(domain, client_id, client_secret)
        api = Shopify(domain, token)
        preflight(api, stages)
    else:
        print(f"Store: {domain} (DRY RUN — no network)\n")

    print("NOTE: seed tool only — Syndicate app stays read-only.\n")

    product_ids: dict[str, str] = {}
    collection_ids: dict[str, str] = {}
    customer_ids: dict[str, str] = {}
    if "products" in stages:
        product_ids = seed_products(api, dry)
    if "collections" in stages:
        collection_ids = seed_collections(api, dry, product_ids)
    if "images" in stages:
        seed_images(api, dry, product_ids)
    if "customers" in stages:
        customer_ids = seed_customers(api, dry)
    if "orders" in stages:
        seed_orders(api, dry, customer_ids)
    if "menu" in stages:
        seed_menu(api, dry, collection_ids)
    print("\nDone.")


if __name__ == "__main__":
    main()
