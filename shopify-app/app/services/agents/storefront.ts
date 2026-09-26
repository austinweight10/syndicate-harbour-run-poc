/**
 * A browse URL counts only when the operator set SHOP_STOREFRONT_URL
 * or saved one in Settings. The fixture hint harbour-run-demo.myshopify.com
 * is not a live storefront.
 */
const PLACEHOLDER = "https://harbour-run-demo.myshopify.com";

/** "shop.myshopify.com" → "https://shop.myshopify.com"; trailing slash dropped. */
function normalise(url: string): string {
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withScheme.replace(/\/$/, "");
}

export function resolveStorefrontUrl(saved: string | null | undefined): string | null {
  const fromEnv = process.env.SHOP_STOREFRONT_URL?.trim();
  if (fromEnv) return normalise(fromEnv);
  const fromShop = saved?.trim();
  if (!fromShop || normalise(fromShop) === PLACEHOLDER) return null;
  return normalise(fromShop);
}

/** Headed Chromium when a display exists, unless AGENTS_HEADED forces it. */
export function resolveHeaded(): boolean {
  if (process.env.AGENTS_HEADED === "0") return false;
  if (process.env.AGENTS_HEADED === "1") return true;
  return Boolean(process.env.DISPLAY);
}
