/** Locked MVP scopes. Exact string — no write_*, no read_all_orders. */
export const MVP_SCOPES = "read_orders,read_products,read_customers";

export const MVP_SCOPE_LIST = [
  "read_orders",
  "read_products",
  "read_customers",
] as const;

const FORBIDDEN_SCOPE = /write_|read_all_orders|read_reports/;

/**
 * Exactly the MVP scope set, in any order. Shopify returns granted scopes
 * sorted alphabetically ("read_customers,read_orders,read_products").
 */
export function assertExactScopes(scopes: string): void {
  if (FORBIDDEN_SCOPE.test(scopes)) {
    throw new Error(`Forbidden scope in "${scopes}".`);
  }
  const granted = scopes.split(",").map((scope) => scope.trim()).filter(Boolean).sort();
  const expected = [...MVP_SCOPE_LIST].sort();
  if (granted.length !== expected.length || granted.some((scope, index) => scope !== expected[index])) {
    throw new Error(
      `Scopes must be exactly "${MVP_SCOPES}". Received "${scopes}".`,
    );
  }
}
