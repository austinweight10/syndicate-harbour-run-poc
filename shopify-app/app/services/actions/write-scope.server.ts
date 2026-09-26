import prisma from "../../db.server";
import {
  WRITE_SCOPE,
  assertExactScopes,
  hasMarketingWriteScopes,
  hasWriteScope,
  normalizeScopes,
} from "../../scopes";

/**
 * Live installs that pre-date write_products still have a read-only offline token.
 * Query Shopify for granted scopes, sync Shop.scopes, and request write if missing.
 * `scopes.request` throws a full-page redirect Response when consent is needed.
 */
export async function ensureWriteProducts(request: Request, shopId: string): Promise<void> {
  if (process.env.DEMO_FIXTURE_SHOP === "1") return;

  const { authenticate } = await import("../../shopify.live.server");
  const { session, scopes } = await authenticate.admin(request);
  const detail = await scopes.query();
  const granted = detail.granted.length
    ? detail.granted.join(",")
    : session.scope && session.scope.length > 0
      ? session.scope
      : "";

  if (granted) {
    assertExactScopes(granted);
    const normalized = normalizeScopes(granted);
    await prisma.shop.update({
      where: { id: shopId },
      data: { scopes: normalized },
    });
    if (hasWriteScope(normalized)) return;
  }

  await scopes.request([WRITE_SCOPE]);
}

/**
 * Sync granted scopes before a marketing pack publish.
 *
 * Only escalate `write_products` via scopes.request — that optional scope is
 * already registered on the Partner app. Requesting `write_content` /
 * `write_customers` before they are registered returns a blank 401 page.
 * applyPack simulates when those scopes are still missing.
 */
export async function ensureMarketingWrites(request: Request, shopId: string): Promise<void> {
  if (process.env.DEMO_FIXTURE_SHOP === "1") return;

  try {
    const { authenticate } = await import("../../shopify.live.server");
    const { session, scopes } = await authenticate.admin(request);
    const detail = await scopes.query();
    const granted = detail.granted.length
      ? detail.granted.join(",")
      : session.scope && session.scope.length > 0
        ? session.scope
        : "";

    if (!granted) {
      await scopes.request([WRITE_SCOPE]);
      return;
    }

    try {
      assertExactScopes(granted);
    } catch {
      console.warn("content_pack.scopes_unexpected", granted);
      return;
    }

    const normalized = normalizeScopes(granted);
    await prisma.shop.update({
      where: { id: shopId },
      data: { scopes: normalized },
    });

    if (hasMarketingWriteScopes(normalized)) return;
    if (!hasWriteScope(normalized)) await scopes.request([WRITE_SCOPE]);
  } catch (error) {
    // Consent redirects must bubble. Auth / scope HTTP errors must not wipe the UI.
    if (error instanceof Response && error.status >= 300 && error.status < 400) throw error;
    console.warn(
      "content_pack.ensure_scopes_failed",
      error instanceof Response ? `http_${error.status}` : error instanceof Error ? error.message : error,
    );
  }
}
