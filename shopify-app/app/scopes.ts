/** Read scopes every install needs. Same three; order from Shopify may vary. */
export const MVP_SCOPES = "read_orders,read_products,read_customers";

export const MVP_SCOPE_LIST = [
  "read_orders",
  "read_products",
  "read_customers",
] as const;

/**
 * The one write scope. One-click storefront actions add products to collections,
 * reorder collections, tag products and append size guides — all write_products.
 * No themes, no orders, no customers.
 *
 * Declared as optional_scopes in shopify.app.toml so Deploy can call
 * scopes.request(["write_products"]) when the merchant ships a change.
 */
export const WRITE_SCOPE = "write_products";

/** Required install scopes (shopifyApp() + SCOPES env). */
export const APP_SCOPES = MVP_SCOPES;

/** Required + optional — what a fully granted install looks like. */
export const APP_SCOPES_WITH_WRITE = `${MVP_SCOPES},${WRITE_SCOPE}`;

const FORBIDDEN_SCOPE = /write_(?!products\b)|read_all_orders|read_reports/;

const MVP_SET = new Set<string>(MVP_SCOPE_LIST);

/** Canonical comma string (stable order for DB / UI). */
export function normalizeScopes(scopes: string): string {
  return scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function hasWriteScope(scopes: string | null | undefined): boolean {
  return (scopes ?? "").split(",").some((s) => s.trim() === WRITE_SCOPE);
}

/**
 * The three read scopes, optionally plus write_products. Installs granted before
 * one-click actions shipped carry only the read set and still load.
 */
export function assertExactScopes(scopes: string): void {
  if (FORBIDDEN_SCOPE.test(scopes)) {
    throw new Error(`Forbidden scope in "${scopes}".`);
  }
  const parts = scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const unique = new Set(parts);
  const reads = parts.filter((part) => part !== WRITE_SCOPE);
  const readUnique = new Set(reads);
  const bad = () =>
    new Error(`Scopes must be "${MVP_SCOPES}" with optional ${WRITE_SCOPE}. Received "${scopes}".`);
  if (unique.size !== parts.length) throw bad();
  if (readUnique.size !== MVP_SET.size || reads.length !== MVP_SET.size) throw bad();
  for (const part of readUnique) {
    if (!MVP_SET.has(part)) throw bad();
  }
}
