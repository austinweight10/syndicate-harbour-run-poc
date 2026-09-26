/** Locked MVP scopes. Exact string — no write_*, no read_all_orders. */
export const MVP_SCOPES = "read_orders,read_products,read_customers";

export const MVP_SCOPE_LIST = [
  "read_orders",
  "read_products",
  "read_customers",
] as const;

const FORBIDDEN_SCOPE = /write_|read_all_orders|read_reports/;

export function assertExactScopes(scopes: string): void {
  if (scopes !== MVP_SCOPES) {
    throw new Error(
      `Scopes must be exactly "${MVP_SCOPES}". Received "${scopes}".`,
    );
  }
  if (FORBIDDEN_SCOPE.test(scopes)) {
    throw new Error(`Forbidden scope in "${scopes}".`);
  }
}
