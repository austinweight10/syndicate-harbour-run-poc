import prisma from "../../db.server";
import { WRITE_SCOPE, assertExactScopes, hasWriteScope, normalizeScopes } from "../../scopes";

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
