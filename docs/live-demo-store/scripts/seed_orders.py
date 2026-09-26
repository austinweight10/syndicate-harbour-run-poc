#!/usr/bin/env python3
"""
Harbour Run — order seed tool (SEED APP ONLY).

Creates paid/fulfilled-style orders from data/orders-seed.json via Shopify Admin
GraphQL `orderCreate` (API 2024-10+). Falls back notes if mutation unavailable.

IMPORTANT
---------
- This script is for SEEDING a development store only.
- Syndicate (the hackathon product) stays read-only:
  read_orders, read_products, read_customers.
- Create a SEPARATE custom app on the Partner store with write scopes for this
  script. Do NOT add write_* to the Syndicate app.

Required env:
  SHOPIFY_STORE_DOMAIN   e.g. syndicate-4ghkumor.myshopify.com
  Either:
    SEED_CLIENT_ID + SEED_CLIENT_SECRET  (client_credentials → access token)
    or SHOPIFY_SEED_ADMIN_TOKEN          (static Admin token from seed custom app)

Optional:
  ORDERS_SEED_PATH       default: ../data/orders-seed.json relative to this file
  DRY_RUN=1              print payloads, do not POST
  LIMIT=N                seed only first N orders

Loads docs/live-demo-store/.env automatically if present.

Seed-app scopes (document for Austin):
  write_orders, write_customers, read_products
  (read_products so we can resolve variant IDs by SKU)

Usage:
  export SHOPIFY_STORE_DOMAIN=harbour-run-demo.myshopify.com
  export SHOPIFY_SEED_ADMIN_TOKEN=shpat_...
  python3 scripts/seed_orders.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

API_VERSION = "2025-01"
ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SEED = ROOT / "data" / "orders-seed.json"


def die(msg: str, code: int = 1) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def gql(domain: str, token: str, query: str, variables: dict | None = None) -> dict:
    url = f"https://{domain}/admin/api/{API_VERSION}/graphql.json"
    body = json.dumps({"query": query, "variables": variables or {}}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": token,
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        die(f"HTTP {e.code}: {detail}")
    if payload.get("errors"):
        die(f"GraphQL errors: {json.dumps(payload['errors'], indent=2)}")
    return payload["data"]


PRODUCTS_BY_SKU = """
query ($q: String!) {
  productVariants(first: 5, query: $q) {
    edges {
      node {
        id
        sku
        product { id title }
      }
    }
  }
}
"""

ORDER_CREATE = """
mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    order { id name createdAt }
    userErrors { field message }
  }
}
"""


def resolve_variant_id(domain: str, token: str, sku: str, cache: dict) -> str:
    if sku in cache:
        return cache[sku]
    data = gql(domain, token, PRODUCTS_BY_SKU, {"q": f"sku:{sku}"})
    edges = data["productVariants"]["edges"]
    if not edges:
        die(f"No variant found for SKU {sku}. Import products.csv first.")
    vid = edges[0]["node"]["id"]
    cache[sku] = vid
    return vid


def build_order_input(order: dict, variant_ids: dict) -> dict:
    line_items = []
    for li in order["line_items"]:
        line_items.append(
            {
                "variantId": variant_ids[li["sku"]],
                "quantity": int(li["quantity"]),
                "requiresShipping": True,
            }
        )
    ship = order["shipping"]
    # orderCreate accepts processedAt for historical-ish created time on some API versions
    return {
        "email": order["customer_email"],
        "financialStatus": "PAID",
        "fulfillmentStatus": "FULFILLED",
        "currency": order.get("currency", "GBP"),
        "processedAt": order["created_at"],
        "tags": order.get("tags", ["seed"]),
        "note": f"Harbour Run demo seed · cohort={order.get('cohort_hint','')}",
        "lineItems": line_items,
        "shippingAddress": {
            "address1": ship.get("address1", "10 Demo Street"),
            "city": ship["city"],
            "zip": ship["zip"],
            "province": ship.get("province", "England"),
            "countryCode": ship.get("country_code", "GB"),
            "firstName": "Demo",
            "lastName": "Customer",
        },
        "billingAddress": {
            "address1": ship.get("address1", "10 Demo Street"),
            "city": ship["city"],
            "zip": ship["zip"],
            "province": ship.get("province", "England"),
            "countryCode": ship.get("country_code", "GB"),
            "firstName": "Demo",
            "lastName": "Customer",
        },
        "transactions": [
            {
                "kind": "SALE",
                "status": "SUCCESS",
                "amountSet": {
                    "shopMoney": {
                        "amount": order["subtotal"],
                        "currencyCode": order.get("currency", "GBP"),
                    }
                },
            }
        ],
    }


def load_dotenv() -> None:
    """Load docs/live-demo-store/.env into os.environ if present (no overwrite)."""
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


def client_credentials_token(domain: str, client_id: str, client_secret: str) -> str:
    """Exchange SEED_CLIENT_ID/SECRET for a short-lived Admin access token."""
    url = f"https://{domain}/admin/oauth/access_token"
    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        die(f"client_credentials HTTP {e.code}: {detail}")
    token = payload.get("access_token")
    if not token:
        die(f"client_credentials response missing access_token: {payload}")
    scopes = payload.get("scope", "")
    expires = payload.get("expires_in")
    print(f"Got access token via client_credentials (scopes={scopes or '?'} expires_in={expires})")
    return token


def resolve_seed_token(domain: str) -> str:
    token = os.environ.get("SHOPIFY_SEED_ADMIN_TOKEN", "").strip()
    if token:
        return token
    client_id = (
        os.environ.get("SEED_CLIENT_ID", "").strip()
        or os.environ.get("SHOPIFY_SEED_CLIENT_ID", "").strip()
    )
    client_secret = (
        os.environ.get("SEED_CLIENT_SECRET", "").strip()
        or os.environ.get("SHOPIFY_SEED_CLIENT_SECRET", "").strip()
    )
    if client_id and client_secret:
        return client_credentials_token(domain, client_id, client_secret)
    die(
        "Set SEED_CLIENT_ID + SEED_CLIENT_SECRET (client_credentials), "
        "or SHOPIFY_SEED_ADMIN_TOKEN (seed custom app — not Syndicate)"
    )


def main() -> None:
    load_dotenv()
    domain = os.environ.get("SHOPIFY_STORE_DOMAIN", "").strip()
    dry = os.environ.get("DRY_RUN", "").strip() in ("1", "true", "TRUE", "yes")
    limit = os.environ.get("LIMIT", "").strip()
    seed_path = Path(os.environ.get("ORDERS_SEED_PATH", str(DEFAULT_SEED)))
    if not seed_path.is_absolute():
        seed_path = (ROOT / seed_path).resolve()

    if not domain:
        die("Set SHOPIFY_STORE_DOMAIN (e.g. syndicate-4ghkumor.myshopify.com)")
    token = "" if dry else resolve_seed_token(domain)

    if not seed_path.exists():
        die(f"Seed file not found: {seed_path}")

    payload = json.loads(seed_path.read_text(encoding="utf-8"))
    orders = payload["orders"]
    if limit:
        orders = orders[: int(limit)]

    print(f"Store: {domain}")
    print(f"Orders to seed: {len(orders)} (from {seed_path})")
    print("NOTE: seed tool only — Syndicate app stays read-only.\n")

    cache: dict[str, str] = {}
    ok = 0
    fail = 0

    for i, order in enumerate(orders, 1):
        # Resolve variants
        vids = {}
        for li in order["line_items"]:
            sku = li["sku"]
            if dry:
                vids[sku] = f"gid://shopify/ProductVariant/DRY-{sku}"
            else:
                vids[sku] = resolve_variant_id(domain, token, sku, cache)

        order_input = build_order_input(order, vids)
        options = {"sendReceipt": False, "sendFulfillmentReceipt": False}

        if dry:
            print(f"[DRY] {i}/{len(orders)} {order['id']} {order['created_at']} "
                  f"{order['cohort_hint']} £{order['subtotal']} "
                  f"skus={[li['sku'] for li in order['line_items']]}")
            ok += 1
            continue

        data = gql(
            domain,
            token,
            ORDER_CREATE,
            {"order": order_input, "options": options},
        )
        result = data["orderCreate"]
        errors = result.get("userErrors") or []
        if errors:
            print(f"FAIL {order['id']}: {errors}")
            fail += 1
        else:
            created = result["order"]
            print(f"OK   {order['id']} → {created['name']} ({created['id']})")
            ok += 1
        time.sleep(0.35)  # gentle rate limit

    print(f"\nDone. ok={ok} fail={fail}")
    if fail:
        sys.exit(2)


if __name__ == "__main__":
    main()
