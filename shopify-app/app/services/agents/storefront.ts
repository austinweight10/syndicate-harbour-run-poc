/**
 * A browse URL counts only when the operator set SHOP_STOREFRONT_URL
 * or saved one in Settings. The fixture hint harbour-run-demo.myshopify.com
 * is not a live storefront.
 */
const PLACEHOLDER = "https://harbour-run-demo.myshopify.com";
const BAD_PLACEHOLDERS = new Set([
  PLACEHOLDER,
  "https://YOUR-STORE.myshopify.com",
  "http://YOUR-STORE.myshopify.com",
]);

export function resolveStorefrontUrl(saved: string | null | undefined): string | null {
  const fromEnv = process.env.SHOP_STOREFRONT_URL?.trim();
  if (fromEnv) {
    const cleaned = fromEnv.replace(/\/$/, "");
    if (BAD_PLACEHOLDERS.has(cleaned) || cleaned.includes("YOUR-STORE")) return null;
    return cleaned;
  }
  const fromShop = saved?.trim();
  if (!fromShop) return null;
  const cleaned = fromShop.replace(/\/$/, "");
  if (BAD_PLACEHOLDERS.has(cleaned) || cleaned.includes("YOUR-STORE")) return null;
  return cleaned;
}

/**
 * Headed Chromium when a display exists, unless AGENTS_HEADED forces it.
 * `preferHeaded` (Force headed demo) asks for a visible window when the env
 * does not force headless — AGENTS_HEADED=0 still wins for CI / agents:prove.
 */
export function resolveHeaded(preferHeaded = false): boolean {
  if (process.env.AGENTS_HEADED === "0") return false;
  if (process.env.AGENTS_HEADED === "1") return true;
  if (preferHeaded) return true;
  return Boolean(process.env.DISPLAY);
}
