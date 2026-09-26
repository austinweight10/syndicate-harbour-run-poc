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
 * Live installs that pre-date write scopes still have a read-only offline token.
 * Query Shopify for granted scopes, sync Shop.scopes, and request writes if missing.
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

/** Request content + customers + products writes for marketing pack deploy. */
export async function ensureMarketingWrites(request: Request, shopId: string): Promise<void> {
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
    if (hasMarketingWriteScopes(normalized)) return;
    const missing = missingMarketingWriteScopes(normalized);
    if (missing.length > 0) await scopes.request(missing);
    return;
  }

  await scopes.request([...MARKETING_WRITE_SCOPES]);
}
