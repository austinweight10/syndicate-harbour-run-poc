import prisma from "../../db.server";
import {
  MARKETING_WRITE_SCOPES,
  WRITE_SCOPE,
  assertExactScopes,
  hasMarketingWriteScopes,
  hasWriteScope,
  missingMarketingWriteScopes,
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
 * Sync / escalate scopes before a marketing pack publish.
 * Requests write_products, write_content, and write_customers when missing
 * (registered as optional_scopes on the Partner app).
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
      await scopes.request([...MARKETING_WRITE_SCOPES]);
      return;
    }

    try {
      assertExactScopes(granted);
    } catch {
      console.warn("content_pack.scopes_unexpected", granted);
      // Still try to request marketing writes — Partner may have updated.
      await scopes.request([...MARKETING_WRITE_SCOPES]);
      return;
    }

    const normalized = normalizeScopes(granted);
    await prisma.shop.update({
      where: { id: shopId },
      data: { scopes: normalized },
    });

    if (hasMarketingWriteScopes(normalized)) return;
    const missing = missingMarketingWriteScopes(normalized);
    await scopes.request(missing.length ? missing : [...MARKETING_WRITE_SCOPES]);
  } catch (error) {
    if (error instanceof Response && error.status >= 300 && error.status < 400) throw error;
    console.warn(
      "content_pack.ensure_scopes_failed",
      error instanceof Response ? `http_${error.status}` : error instanceof Error ? error.message : error,
    );
  }
}
