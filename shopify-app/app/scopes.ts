/** Read scopes every install needs. Same three; order from Shopify may vary. */
export const MVP_SCOPES = "read_orders,read_products,read_customers";

export const MVP_SCOPE_LIST = [
  "read_orders",
  "read_products",
  "read_customers",
] as const;

/**
 * Optional write scopes. Storefront Deploy uses write_products.
 * Marketing packs also need write_content (blog/pages) and write_customers (segments).
 *
 * Declared as optional_scopes in shopify.app.toml so Deploy can call
 * scopes.request([...]) when the merchant ships a change.
 */
export const WRITE_PRODUCTS_SCOPE = "write_products";
export const WRITE_CONTENT_SCOPE = "write_content";
export const WRITE_CUSTOMERS_SCOPE = "write_customers";

/** Back-compat alias used by storefront actions. */
export const WRITE_SCOPE = WRITE_PRODUCTS_SCOPE;

export const OPTIONAL_WRITE_SCOPES = [
  WRITE_PRODUCTS_SCOPE,
  WRITE_CONTENT_SCOPE,
  WRITE_CUSTOMERS_SCOPE,
] as const;

export const MARKETING_WRITE_SCOPES = [
  WRITE_PRODUCTS_SCOPE,
  WRITE_CONTENT_SCOPE,
  WRITE_CUSTOMERS_SCOPE,
] as const;

/** Required install scopes (shopifyApp() + SCOPES env). */
export const APP_SCOPES = MVP_SCOPES;

/** Required + all optional writes — what a fully granted install looks like. */
export const APP_SCOPES_WITH_WRITE = `${MVP_SCOPES},${OPTIONAL_WRITE_SCOPES.join(",")}`;

const OPTIONAL_WRITE_SET = new Set<string>(OPTIONAL_WRITE_SCOPES);

const FORBIDDEN_SCOPE = /write_(?!products\b|content\b|customers\b)|read_all_orders|read_reports/;

const MVP_SET = new Set<string>(MVP_SCOPE_LIST);

function splitScopes(scopes: string): string[] {
  return scopes
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Shopify omits read_X when write_X is granted for the same resource.
 * Expand so our checks and DB rows always see the effective read set.
 */
function withImpliedReads(parts: string[]): string[] {
  const set = new Set(parts);
  if (set.has(WRITE_PRODUCTS_SCOPE)) set.add("read_products");
  if (set.has(WRITE_CUSTOMERS_SCOPE)) set.add("read_customers");
  if (set.has(WRITE_CONTENT_SCOPE)) set.add("read_content");
  return [...set];
}

/** Canonical comma string (stable order for DB / UI). */
export function normalizeScopes(scopes: string): string {
  return withImpliedReads(splitScopes(scopes))
    .filter((part) => part !== "read_content") // read_content is implied; not in MVP install set
    .sort()
    .join(",");
}

export function hasWriteScope(scopes: string | null | undefined): boolean {
  return (scopes ?? "").split(",").some((s) => s.trim() === WRITE_PRODUCTS_SCOPE);
}

export function hasMarketingWriteScopes(scopes: string | null | undefined): boolean {
  const set = new Set(
    (scopes ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return MARKETING_WRITE_SCOPES.every((scope) => set.has(scope));
}

export function missingMarketingWriteScopes(scopes: string | null | undefined): string[] {
  const set = new Set(
    (scopes ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
  return MARKETING_WRITE_SCOPES.filter((scope) => !set.has(scope));
}

/**
 * The three read scopes, optionally plus allowed write scopes. Installs granted
 * before one-click actions shipped carry only the read set and still load.
 *
 * Session tokens often list `write_products` without `read_products` — that is
 * valid on Shopify and must not fail the Admin shell.
 */
export function assertExactScopes(scopes: string): void {
  if (FORBIDDEN_SCOPE.test(scopes)) {
    throw new Error(`Forbidden scope in "${scopes}".`);
  }
  const parts = splitScopes(scopes);
  const unique = new Set(parts);
  const bad = () =>
    new Error(
      `Scopes must be "${MVP_SCOPES}" with optional ${OPTIONAL_WRITE_SCOPES.join(", ")}. Received "${scopes}".`,
    );
  if (unique.size !== parts.length) throw bad();

  const effective = withImpliedReads(parts).filter((part) => part !== "read_content");
  const reads = effective.filter((part) => !OPTIONAL_WRITE_SET.has(part));
  const readUnique = new Set(reads);
  if (readUnique.size !== MVP_SET.size || reads.length !== MVP_SET.size) throw bad();
  for (const part of readUnique) {
    if (!MVP_SET.has(part)) throw bad();
  }
  for (const part of unique) {
    if (part === "read_content") continue; // implied by write_content
    if (!OPTIONAL_WRITE_SET.has(part) && !MVP_SET.has(part)) throw bad();
  }
}
