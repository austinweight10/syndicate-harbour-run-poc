import prisma from "../../db.server";
import {
  TRENDING_CONFIDENCE,
  slugify,
  type ContentPackAssets,
  type ContentPackDraft,
  type PackGenerateInput,
  type SegmentAsset,
} from "./types";

/**
 * Drafts a marketing pack for an occasion from templates (demo-safe offline).
 * British English, Harbour Run voice. Persona goals drive segment + email targeting.
 */

export async function loadPackInput(shopId: string, eventId: string): Promise<PackGenerateInput | null> {
  const event = await prisma.eventCandidate.findFirst({ where: { id: eventId, shopId } });
  if (!event) return null;
  const [score, personas, collections, edges] = await Promise.all([
    prisma.confidenceScore.findUnique({ where: { eventCandidateId: event.id } }),
    prisma.persona.findMany({ where: { shopId, primaryEventId: event.id } }),
    prisma.collectionRow.findMany({ where: { shopId }, orderBy: { title: "asc" } }),
    prisma.graphEdge.findMany({
      where: { shopId, fromId: event.id, relation: "AFFINITY", toType: "SKU" },
      take: 6,
    }),
  ]);
  const products = await prisma.productRow.findMany({
    where: { id: { in: edges.map((edge) => edge.toId) } },
  });
  return {
    eventId: event.id,
    eventName: event.name,
    archetype: event.archetype,
    confidence: score?.value ?? 0,
    city: event.venueCity,
    windowLabel: event.windowLabel,
    topSkus: products.map((product) => ({ title: product.title, handle: product.handle })),
    personas: personas.map((persona) => ({
      id: persona.id,
      name: persona.name,
      status: persona.status,
      goals: parseJsonArray(persona.goalsJson),
      budgetMin: Number(persona.budgetMin),
      budgetMax: Number(persona.budgetMax),
      locationProxy: persona.locationProxy,
    })),
    collections: collections
      .filter((row) => row.handle)
      .map((row) => ({ handle: row.handle as string, title: row.title })),
  };
}

export async function generatePack(shopId: string, eventId: string): Promise<ContentPackDraft | null> {
  const input = await loadPackInput(shopId, eventId);
  if (!input) return null;
  const draft = templatePack(input);
  await prisma.contentPack.upsert({
    where: { shopId_eventId: { shopId, eventId } },
    create: {
      shopId,
      eventId,
      headline: draft.headline,
      rationale: draft.rationale,
      source: "template",
      model: null,
      status: "proposed",
      assetsJson: JSON.stringify(draft.assets),
      personaIdsJson: JSON.stringify(draft.personaIds),
      undoJson: null,
      resultJson: null,
      errorMessage: null,
      appliedAt: null,
      revertedAt: null,
    },
    update: {
      headline: draft.headline,
      rationale: draft.rationale,
      source: "template",
      model: null,
      status: "proposed",
      assetsJson: JSON.stringify(draft.assets),
      personaIdsJson: JSON.stringify(draft.personaIds),
      undoJson: null,
      resultJson: null,
      errorMessage: null,
      appliedAt: null,
      revertedAt: null,
    },
  });
  return draft;
}

/** Background draft when the occasion is trending and no pack exists yet. */
export async function kickPackDraft(shopId: string, eventId: string, confidence: number): Promise<boolean> {
  if (confidence < TRENDING_CONFIDENCE) return false;
  const existing = await prisma.contentPack.findUnique({
    where: { shopId_eventId: { shopId, eventId } },
  });
  if (existing && existing.status !== "reverted" && existing.status !== "failed") return false;
  void generatePack(shopId, eventId).catch((error) =>
    console.error("content_pack.draft_failed", error instanceof Error ? error.message : error),
  );
  return true;
}

export async function redraftPack(shopId: string, eventId: string): Promise<void> {
  await prisma.contentPack.deleteMany({
    where: { shopId, eventId, status: { in: ["proposed", "failed", "reverted"] } },
  });
  await generatePack(shopId, eventId);
}

export function templatePack(input: PackGenerateInput): ContentPackDraft {
  const slug = slugify(input.eventName);
  const city = input.city ?? "London";
  const window = input.windowLabel ?? "this weekend";
  const skus = input.topSkus.map((sku) => sku.title).filter(Boolean);
  const leadSku = skus[0] ?? "race kit";
  const secondSku = skus[1] ?? "waterproof shell";
  const raceKits = input.collections.find((row) => /race/.test(row.handle))?.handle ?? "race-kits";
  const wetKits =
    input.collections.find((row) => /wet|weather|rain/.test(row.handle))?.handle ?? "wet-weather-training";
  const collectionHandle = /weather|wet|rain/.test(input.archetype) ? wetKits : raceKits;
  const readyPersonas = input.personas.filter((persona) => persona.status === "ready");
  const targets = readyPersonas.length > 0 ? readyPersonas : input.personas;
  const personaNames = targets.map((persona) => persona.name);
  const isWeather = /weather|wet|rain/.test(input.archetype) || /wet|rain|shell/.test(input.eventName.toLowerCase());

  const segments: SegmentAsset[] = targets.map((persona) => segmentForPersona(persona, city, isWeather));

  const assets: ContentPackAssets = {
    blog: {
      title: isWeather
        ? `Wet-weekend kit guide · ${city}`
        : `Race-weekend readiness · ${input.eventName.replace(/\s*—\s*.*$/, "").trim()}`,
      handle: `blog-${slug}`,
      summary: isWeather
        ? `How Harbour Run shoppers gear up when the forecast turns — ${window}.`
        : `What to buy before ${input.eventName} — kit picks for ${personaNames.join(" and ") || "race-day shoppers"}.`,
      bodyHtml: blogHtml({
        eventName: input.eventName,
        city,
        window,
        leadSku,
        secondSku,
        collectionHandle,
        personas: personaNames,
        isWeather,
      }),
    },
    page: {
      title: isWeather ? `Wet weekend layers · ${city}` : `Shop ${input.eventName.replace(/\s*—\s*.*$/, "").trim()}`,
      handle: `occasion-${slug}`,
      bodyHtml: pageHtml({
        eventName: input.eventName,
        city,
        window,
        leadSku,
        secondSku,
        collectionHandle,
        personas: personaNames,
        isWeather,
      }),
    },
    banner: {
      headline: isWeather ? "Rain on the forecast?" : `${shortEvent(input.eventName)} is on`,
      body: isWeather
        ? `Waterproof shells and layers for ${window} — built for ${city} miles.`
        : `Race kits ready for ${window}. Shop before the taper runs out.`,
      ctaLabel: isWeather ? "Shop wet-weather kit" : "Shop race kits",
      ctaPath: `/collections/${collectionHandle}`,
    },
    email: {
      subject: isWeather
        ? `Wet weekend coming — pack the shell`
        : `${shortEvent(input.eventName)} kit, sorted`,
      previewText: isWeather
        ? `Shells and layers for ${city} training this weekend.`
        : `Race tee + essentials before ${window}.`,
      bodyHtml: emailHtml({
        eventName: input.eventName,
        city,
        window,
        leadSku,
        secondSku,
        collectionHandle,
        personas: personaNames,
        isWeather,
      }),
      personaTargets: personaNames,
    },
    segments,
  };

  const pct = Math.round(input.confidence * 100);
  return {
    eventId: input.eventId,
    headline: `Launch marketing for ${shortEvent(input.eventName)}`,
    rationale: `Confidence ${pct}% · targets ${personaNames.join(", ") || "linked shoppers"} with a blog, storefront page, banner, email draft and matching customer segments.`,
    assets,
    personaIds: targets.map((persona) => persona.id),
  };
}

function shortEvent(name: string): string {
  return name.replace(/\s*[—–].*$/, "").trim() || name;
}

function segmentForPersona(
  persona: PackGenerateInput["personas"][number],
  city: string,
  isWeather: boolean,
): SegmentAsset {
  const tagHint = isWeather || /wet|weather|shell/i.test(persona.name) ? "waterproof" : "race";
  const cityToken = (persona.locationProxy ?? city).split(/[—,]/)[0]?.trim() || city;
  return {
    personaId: persona.id,
    personaName: persona.name,
    name: `Syndicate · ${persona.name}`,
    query: `customer_cities CONTAINS '${escapeSeg(cityToken)}' AND customer_order_count >= 1`,
    description: `Shoppers near ${cityToken} who buy ${tagHint} kit — aligned to ${persona.name} (£${persona.budgetMin}–£${persona.budgetMax}). Goals: ${persona.goals.slice(0, 2).join("; ") || "race essentials"}.`,
  };
}

function escapeSeg(value: string): string {
  return value.replace(/'/g, "");
}

function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function productList(lead: string, second: string): string {
  return `<ul><li><strong>${escapeHtml(lead)}</strong></li><li><strong>${escapeHtml(second)}</strong></li></ul>`;
}

function blogHtml(args: {
  eventName: string;
  city: string;
  window: string;
  leadSku: string;
  secondSku: string;
  collectionHandle: string;
  personas: string[];
  isWeather: boolean;
}): string {
  const who = args.personas.length ? args.personas.join(" and ") : "committed runners";
  if (args.isWeather) {
    return `<p>When ${escapeHtml(args.city)} turns wet, ${escapeHtml(who)} still head out — they just want the right shell first.</p>
<p>For <strong>${escapeHtml(args.window)}</strong>, lead with layers that earn their keep on damp miles:</p>
${productList(args.leadSku, args.secondSku)}
<p><a href="/collections/${escapeHtml(args.collectionHandle)}">Browse wet-weather training</a> before the next front moves in.</p>`;
  }
  return `<p><strong>${escapeHtml(args.eventName)}</strong> is the kind of weekend that empties the wardrobe drawer. ${escapeHtml(who)} shop on mobile, often the morning of the race.</p>
<p>Stock the taper list for <strong>${escapeHtml(args.window)}</strong>:</p>
${productList(args.leadSku, args.secondSku)}
<p><a href="/collections/${escapeHtml(args.collectionHandle)}">Shop race kits</a> — adult sizes first, youth sizing clear if family is tagging along.</p>`;
}

function pageHtml(args: {
  eventName: string;
  city: string;
  window: string;
  leadSku: string;
  secondSku: string;
  collectionHandle: string;
  personas: string[];
  isWeather: boolean;
}): string {
  const who = args.personas.length ? `Built for ${args.personas.join(" + ")}.` : "Built for race-week demand.";
  return `<h1>${escapeHtml(args.isWeather ? "Wet weekend layers" : shortEvent(args.eventName))}</h1>
<p class="lede">${escapeHtml(who)} ${escapeHtml(args.city)} · ${escapeHtml(args.window)}.</p>
${productList(args.leadSku, args.secondSku)}
<p><a class="button" href="/collections/${escapeHtml(args.collectionHandle)}">${args.isWeather ? "Shop wet-weather kit" : "Shop race kits"}</a></p>`;
}

function emailHtml(args: {
  eventName: string;
  city: string;
  window: string;
  leadSku: string;
  secondSku: string;
  collectionHandle: string;
  personas: string[];
  isWeather: boolean;
}): string {
  const greeting = args.personas[0] ? `Hi — this one's for ${args.personas.join(" / ")} shoppers.` : "Hi runner,";
  return `<p>${escapeHtml(greeting)}</p>
<p>${args.isWeather ? `The forecast for ${escapeHtml(args.city)} looks wet through ${escapeHtml(args.window)}.` : `${escapeHtml(args.eventName)} is nearly here.`}</p>
<p>We've lined up:</p>
${productList(args.leadSku, args.secondSku)}
<p><a href="/collections/${escapeHtml(args.collectionHandle)}">${args.isWeather ? "Get the shell" : "Get race-ready"}</a></p>
<p>— Harbour Run</p>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
