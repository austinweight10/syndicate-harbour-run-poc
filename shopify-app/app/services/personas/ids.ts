import { createHash } from "node:crypto";
import { DEMO_SHOP_DOMAIN } from "../../fixtures/seed";

export type PersonaSlug = "race_day_taper" | "wet_weather_trainer";

/**
 * Persona.id is a global primary key. The fixture shop keeps its historic ids
 * (`pers_race_day_taper`), which scripts and tests reference. Every other shop
 * gets a shop-scoped id so two shops never collide.
 */
export function personaIdFor(shopId: string, slug: PersonaSlug): string {
  if (shopId === DEMO_SHOP_DOMAIN) return `pers_${slug}`;
  const hash = createHash("sha1").update(shopId).digest("hex").slice(0, 10);
  return `pers_${slug}_${hash}`;
}
