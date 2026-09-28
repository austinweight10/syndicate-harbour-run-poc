import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import type { ScoredEvent } from "../graph/build";
import { personaIdFor } from "../personas/ids";

function recId(shopId: string, kind: string, targetRef: string, title: string): string {
  return createHash("sha256").update([shopId, kind, targetRef, title].join("|")).digest("hex").slice(0, 24);
}

export async function buildRecommendations(
  prisma: PrismaClient,
  shopId: string,
  scored: ScoredEvent[],
): Promise<{ recommendations: number; withRun: number }> {
  const race = scored.find((event) => event.name.startsWith("Race weekend — London")) ?? scored[0];
  const wet = scored.find((event) => event.name.startsWith("Wet weekend"));

  // Only clear pipeline merch/collection cards. Agent affordances + insight
  // blockers are written by Playwright with a runId — Refresh must not wipe them.
  await prisma.recommendation.deleteMany({
    where: { shopId, runId: null, kind: { in: ["collection", "merch"] } },
  });

  const cards: {
    kind: string;
    priority: string;
    title: string;
    body: string;
    personaId: string | null;
    eventId: string | null;
    runId: string | null;
    targetType: string | null;
    targetRef: string | null;
    labels: string[];
    confidence: number | null;
    insightKind?: string;
    insightScore?: number;
  }[] = [];

  cards.push({
    kind: "collection",
    priority: "P1",
    title: "Add the waterproof shell to Race Kits",
    body: "Race-weekend baskets look for rain cover beside the tee and shorts. The shell only sits in Wet-weather training, so Race Kits is a dead end on a wet Saturday.",
    personaId: personaIdFor(shopId, "wet_weather_trainer"),
    eventId: race?.id ?? wet?.id ?? null,
    runId: null,
    targetType: "collection",
    targetRef: "race-kits",
    labels: ["OBSERVED orders", "MODEL_HYPOTHESIS"],
    confidence: race?.value ?? null,
  });

  cards.push({
    kind: "merch",
    priority: "P1",
    title: "Pin waterproof shells before the wet weekend",
    body: wet?.lowN
      ? "London’s forecast is wet on 27–28 September, but fewer than five orders fall in that window. Treat this as an early signal and surface the shell anyway."
      : "London’s forecast is wet on 27–28 September and shell orders already show up in training baskets. Pin the shell above the fold before the weekend.",
    personaId: personaIdFor(shopId, "wet_weather_trainer"),
    eventId: wet?.id ?? null,
    runId: null,
    targetType: "product",
    targetRef: "waterproof-shell-jacket",
    labels: [
      "OBSERVED weather forecast",
      "AGGREGATE_PROXY weather driver",
      ...(wet && wet.nOrders > 0 ? ["OBSERVED orders"] : []),
      ...(wet?.lowN ? ["MODEL_HYPOTHESIS (low n)"] : []),
    ],
    confidence: wet?.value ?? null,
  });

  let withRun = 0;
  for (const card of cards.slice(0, 10)) {
    const id = recId(shopId, card.kind, card.targetRef ?? card.title, card.title);
    await prisma.recommendation.create({
      data: {
        id,
        shopId,
        kind: card.kind,
        priority: card.priority,
        title: card.title,
        body: card.body,
        personaId: card.personaId,
        eventId: card.eventId,
        runId: card.runId,
        targetType: card.targetType,
        targetRef: card.targetRef,
        adminDeepLink: null,
        provenanceLabelsJson: JSON.stringify(card.labels),
        confidence: card.confidence,
        status: "open",
      },
    });
    if (card.runId) withRun += 1;
    if (card.insightKind && card.runId) {
      await prisma.insightScore.create({
        data: {
          id: `ins_${id}`,
          shopId,
          personaId: card.personaId ?? personaIdFor(shopId, "race_day_taper"),
          runId: card.runId,
          targetType: card.targetType ?? "product",
          targetRef: card.targetRef ?? id,
          score: card.insightScore ?? 0.5,
          insightKind: card.insightKind,
          evidenceJson: JSON.stringify({ title: card.title, provenanceLabels: card.labels }),
          notes: "Replay fixture hydrate. Show the MOCK badge. Not a live agent finding.",
        },
      });
    }
    if (card.eventId) {
      await prisma.graphEdge.create({
        data: {
          shopId,
          fromType: "Recommendation",
          fromId: id,
          toType: "EventCandidate",
          toId: card.eventId,
          relation: "SUPPORTED_BY",
          weight: card.confidence ?? 0.5,
          provenance: card.labels.includes("MOCK") ? "MOCK" : "MODEL_HYPOTHESIS",
        },
      });
    }
  }

  return { recommendations: Math.min(cards.length, 10), withRun };
}
