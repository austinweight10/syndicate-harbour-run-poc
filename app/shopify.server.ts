export type OfflineSession = {
  shop: string;
  accessToken: string;
};

/**
 * OAuth plug-in for a later dev-store install.
 *
 * Expected flow once the Shopify React Router app package is added:
 * 1. App Bridge sends a short-lived ID token from the embedded admin.
 * 2. authenticate.admin(request) validates it and exchanges an offline access token.
 * 3. Background ingest uses that token. The token never goes to the browser.
 *
 * Scopes live in shopify.app.toml: read_products, read_orders, read_customers.
 */
export async function authenticateAdmin(request: Request): Promise<OfflineSession> {
  const url = new URL(request.url);
  throw new Error(
    `Shopify OAuth is not connected (${url.pathname}). Implement token exchange in authenticateAdmin() before calling the Admin API.`,
  );
}
