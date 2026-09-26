/**
 * Plug-in for Admin GraphQL backfill.
 * Keep the scope list in step with shopify.app.toml.
 * v0 does not call Shopify. The dashboard reads app/data/fixture.ts.
 */

export const declaredScopes = [
  {
    scope: 'read_products',
    reason: 'Products, variants, type, vendor, tags, and collections.',
  },
  {
    scope: 'read_orders',
    reason: 'Orders and line items for the last 60 days. Older history needs read_all_orders.',
  },
  {
    scope: 'read_customers',
    reason: 'Customer records only where protected customer data allows. Not used to score wealth.',
  },
] as const;

export function ingestStatus() {
  return {
    mode: 'fixture' as const,
    message:
      'Admin GraphQL ingest is not connected. The dashboard is reading the Harbour Athletic fixture, not a live shop.',
  };
}
