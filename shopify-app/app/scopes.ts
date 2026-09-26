/** Read scopes the demo fixture install uses. */
export const MVP_SCOPES = "read_orders,read_products,read_customers";

export const MVP_SCOPE_LIST = [
  "read_orders",
  "read_products",
  "read_customers",
] as const;

/**
 * Write scopes for storefront Deploy + marketing pack publish.
 * Required on the live Partner app so Publish creates real Shopify pages
 * (not a simulated pack).
 */
export const WRITE_PRODUCTS_SCOPE = "write_products";
export const WRITE_CONTENT_SCOPE = "write_content";
export const WRITE_CUSTOMERS_SCOPE = "write_customers";

/** Back-compat alias used by storefront actions. */
export const WRITE_SCOPE = WRITE_PRODUCTS_SCOPE;

export const WRITE_SCOPE_LIST = [
  WRITE_PRODUCTS_SCOPE,
  WRITE_CONTENT_SCOPE,
  WRITE_CUSTOMERS_SCOPE,
] as const;

/** @deprecated use WRITE_SCOPE_LIST — kept for older imports */
export const OPTIONAL_WRITE_SCOPES = WRITE_SCOPE_LIST;

export const MARKETING_WRITE_SCOPES = WRITE_SCOPE_LIST;

/**
 * Required install scopes for the live app (shopifyApp + Partner toml + Fly SCOPES).
 * Includes content/customer writes so marketing packs publish for real.
 */
export const APP_SCOPES = `${MVP_SCOPES},${WRITE_SCOPE_LIST.join(",")}`;

/** Alias — full granted install. */
export const APP_SCOPES_WITH_WRITE = APP_SCOPES;

const WRITE_SET = new Set<string>(WRITE_SCOPE_LIST);

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
    .filter((part) => part !== "read_content")
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
 * Reads are always required. Writes may be missing until the merchant re-approves
 * after we added them — shell still loads so Publish can trigger consent.
 */
export function assertExactScopes(scopes: string): void {
  if (FORBIDDEN_SCOPE.test(scopes)) {
    throw new Error(`Forbidden scope in "${scopes}".`);
  }
  const parts = splitScopes(scopes);
  const unique = new Set(parts);
  const bad = () =>
    new Error(
      `Scopes must include "${MVP_SCOPES}" and may include ${WRITE_SCOPE_LIST.join(", ")}. Received "${scopes}".`,
    );
  if (unique.size !== parts.length) throw bad();

  const effective = withImpliedReads(parts).filter((part) => part !== "read_content");
  const reads = effective.filter((part) => !WRITE_SET.has(part));
  const readUnique = new Set(reads);
  if (readUnique.size !== MVP_SET.size || reads.length !== MVP_SET.size) throw bad();
  for (const part of readUnique) {
    if (!MVP_SET.has(part)) throw bad();
  }
  for (const part of unique) {
    if (part === "read_content") continue;
    if (!WRITE_SET.has(part) && !MVP_SET.has(part)) throw bad();
  }
}
