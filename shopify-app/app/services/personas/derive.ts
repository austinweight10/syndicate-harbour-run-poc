import type { PrismaClient } from "@prisma/client";
import type { ScoredEvent } from "../graph/build";

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (sorted.length - 1) * p;
  const low = Math.floor(index);
  const high = Math.ceil(index);
  return sorted[low] + (sorted[high] - sorted[low]) * (index - low);
}

function round10(value: number): number {
  return Math.max(10, Math.round(value / 10) * 10);
}

async function cohortStats(prisma: PrismaClient, shopId: string, eventId: string | undefined) {
  if (!eventId) return null;
  const event = await prisma.eventCandidate.findUnique({ where: { id: eventId } });
  if (!event) return null;
  const orders = await prisma.orderRow.findMany({
    where: {
      shopId,
      test: false,
      processedAt: { gte: event.timeStart, lte: event.timeEnd },
    },
  });
  const totals = orders.map((order) => Number(order.subtotalAmount)).sort((a, b) => a - b);
  const lines = await prisma.lineItemRow.findMany({
    where: { shopId, orderId: { in: orders.map((order) => order.id) } },
  });
  const titles = new Map<string, number>();
  for (const line of lines) titles.set(line.title, (titles.get(line.title) ?? 0) + line.quantity);
  const goals = [...titles.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title]) => title);
  return {
    orders: orders.length,
    budgetMin: totals.length ? round10(percentile(totals, 0.25)) : 40,
    budgetMax: totals.length ? round10(percentile(totals, 0.75)) : 90,
    goals,
    city: event.venueCity,
  };
}

export async function derivePersonas(
  prisma: PrismaClient,
  shopId: string,
  scored: ScoredEvent[],
): Promise<{ ready: string[] }> {
  const race = scored.find((event) => event.name === "Race weekend — London 10K") ?? scored[0];
  const wet = scored.find((event) => event.name === "Wet weekend layers");
  const raceStats = await cohortStats(prisma, shopId, race?.id);
  const wetStats = await cohortStats(prisma, shopId, wet?.id);

  const raceGoals = raceStats?.goals.length
    ? raceStats.goals
    : ["Race Tee — Unisex", "Running Shorts"];
  const wetGoals = wetStats?.goals.length
    ? wetStats.goals
    : ["Waterproof Shell Jacket", "Half-Zip Midlayer"];

  await prisma.persona.upsert({
    where: { shopId_name: { shopId, name: "Race-day taper" } },
    create: {
      id: "pers_race_day_taper",
      shopId,
      name: "Race-day taper",
      status: "ready",
      vertical: "running",
      primaryEventId: race?.id ?? null,
      goalsJson: JSON.stringify(raceGoals),
      budgetMin: String(raceStats?.budgetMin ?? 50),
      budgetMax: String(raceStats?.budgetMax ?? 100),
      currencyCode: "GBP",
      constraintsJson: JSON.stringify({
        sizes: ["L"],
        colours: ["navy", "race"],
        mobileFirst: true,
        timePressure: true,
        deliveryBy: "race-morning",
      }),
      behaviouralJson: JSON.stringify({
        impulseVsDeliberate: "impulse",
        collectionFirstVsSearch: "collection",
        brief:
          "Shops on mobile the morning of a London 5K/10K. Wants adult L race tee plus shorts or socks. Time-pressured — will abandon if size guide is buried.",
      }),
      locationProxy: "London — Hyde Park / Battersea",
      mockFlagsJson: JSON.stringify(["time_pressure_hypothesis"]),
      successCriteriaJson: JSON.stringify({ minGoalsInCart: 2, reachCheckout: true }),
      avatarInitials: "RT",
    },
    update: {
      primaryEventId: race?.id ?? null,
      status: "ready",
      goalsJson: JSON.stringify(raceGoals),
      budgetMin: String(raceStats?.budgetMin ?? 50),
      budgetMax: String(raceStats?.budgetMax ?? 100),
      locationProxy: raceStats?.city ? `${raceStats.city} race cohort` : "London — Hyde Park / Battersea",
      constraintsJson: JSON.stringify({
        sizes: ["L"],
        colours: ["navy", "race"],
        mobileFirst: true,
        timePressure: true,
        deliveryBy: "race-morning",
      }),
      behaviouralJson: JSON.stringify({
        impulseVsDeliberate: "impulse",
        collectionFirstVsSearch: "collection",
        brief:
          "Shops on mobile the morning of a London 5K/10K. Wants adult L race tee plus shorts or socks. Time-pressured — will abandon if size guide is buried.",
      }),
      mockFlagsJson: JSON.stringify(["time_pressure_hypothesis"]),
    },
  });

  await prisma.persona.upsert({
    where: { shopId_name: { shopId, name: "Wet-weather trainer" } },
    create: {
      id: "pers_wet_weather_trainer",
      shopId,
      name: "Wet-weather trainer",
      status: wet && !wet.lowN ? "ready" : "draft",
      vertical: "running",
      primaryEventId: wet?.id ?? null,
      goalsJson: JSON.stringify(wetGoals),
      budgetMin: String(wetStats?.budgetMin ?? 60),
      budgetMax: String(wetStats?.budgetMax ?? 130),
      currencyCode: "GBP",
      constraintsJson: JSON.stringify({
        sizes: ["M", "L"],
        colours: ["black", "olive"],
        mobileFirst: true,
        timePressure: false,
        weatherAware: true,
      }),
      behaviouralJson: JSON.stringify({
        impulseVsDeliberate: "deliberate",
        collectionFirstVsSearch: "search",
        brief:
          "Midweek London rain. Buys a packable shell (± tee or midlayer). Search-first, compares waterproof claims and delivery before carting.",
      }),
      locationProxy: "London — wet training",
      mockFlagsJson: JSON.stringify(["weather_window_may_be_thin", "weather_proxy_narrative"]),
      successCriteriaJson: JSON.stringify({ minGoalsInCart: 1, reachCheckout: true }),
      avatarInitials: "WW",
    },
    update: {
      primaryEventId: wet?.id ?? null,
      status: wet && !wet.lowN ? "ready" : "draft",
      goalsJson: JSON.stringify(wetGoals),
      budgetMin: String(wetStats?.budgetMin ?? 60),
      budgetMax: String(wetStats?.budgetMax ?? 130),
      constraintsJson: JSON.stringify({
        sizes: ["M", "L"],
        colours: ["black", "olive"],
        mobileFirst: true,
        timePressure: false,
        weatherAware: true,
      }),
      behaviouralJson: JSON.stringify({
        impulseVsDeliberate: "deliberate",
        collectionFirstVsSearch: "search",
        brief:
          "Midweek London rain. Buys a packable shell (± tee or midlayer). Search-first, compares waterproof claims and delivery before carting.",
      }),
      mockFlagsJson: JSON.stringify(["weather_window_may_be_thin", "weather_proxy_narrative"]),
    },
  });

  const ready = ["Race-day taper"];
  if (wet && !wet.lowN) ready.push("Wet-weather trainer");
  return { ready };
}
