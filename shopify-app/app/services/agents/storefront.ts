/**
 * A browse URL counts only when the operator set SHOP_STOREFRONT_URL
 * or saved one in Settings. The fixture hint harbour-run-demo.myshopify.com
 * is not a live storefront.
 */
const PLACEHOLDER = "https://harbour-run-demo.myshopify.com";

export function resolveStorefrontUrl(saved: string | null | undefined): string | null {
  const fromEnv = process.env.SHOP_STOREFRONT_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const fromShop = saved?.trim();
  if (!fromShop || fromShop.replace(/\/$/, "") === PLACEHOLDER) return null;
  return fromShop.replace(/\/$/, "");
}

/** Headed Chromium when a display exists, unless AGENTS_HEADED forces it. */
export function resolveHeaded(): boolean {
  if (process.env.AGENTS_HEADED === "0") return false;
  if (process.env.AGENTS_HEADED === "1") return true;
  return Boolean(process.env.DISPLAY);
}
