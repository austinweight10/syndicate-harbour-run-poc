import type { PrismaClient } from "@prisma/client";
import { linkHarbourCollections } from "../catalogue/collections";
import { seedLondonWeather } from "../catalogue/weather";
import { DEMO_SHOP_DOMAIN, seedFixtures } from "../../fixtures/seed";
import { buildAndScore } from "../graph/build";
import { writeStoreMakeup } from "../makeup/snapshot";
import { derivePersonas } from "../personas/derive";
import { buildRecommendations } from "../recommendations/build";

const STAGES = [
  "store_makeup",
  "graph_seed",
  "catalogue_refresh",
  "score_link",
  "personas",
  "agents_queue",
] as const;

export async function runDemoPipeline(prisma: PrismaClient) {
  const seed = await seedFixtures(prisma);
  const shopId = DEMO_SHOP_DOMAIN;
  const stages = STAGES.map((stage) => ({
    stage,
    status: "success",
    finishedAt: new Date().toISOString(),
  }));

  const pipeline = await prisma.pipelineRun.create({
    data: {
      shopId,
      mode: "demo",
      trigger: "manual_refresh",
      status: "running",
      currentStage: "store_makeup",
      stagesJson: JSON.stringify(stages.map((stage) => ({ ...stage, status: "pending" }))),
      agentsAutoRunSnapshot: false,
      idempotencyKey: `${shopId}:demo:${Date.now()}`,
    },
  });

  try {
    const weather = await seedLondonWeather(prisma);
    const collectionsLinked = await linkHarbourCollections(prisma, shopId);
    const makeup = await writeStoreMakeup(prisma, shopId, pipeline.id);
    const scored = await buildAndScore(prisma, shopId, {
      driverId: weather.wetDriverId,
      wetStart: weather.wetStart,
      wetEnd: weather.wetEnd,
    });
    const personas = await derivePersonas(prisma, shopId, scored);
    const recommendations = await buildRecommendations(prisma, shopId, scored);

    await prisma.pipelineRun.update({
      where: { id: pipeline.id },
      data: {
        status: "success",
        currentStage: "agents_queue",
        lastSuccessfulStage: "agents_queue",
        stagesJson: JSON.stringify(stages),
        finishedAt: new Date(),
      },
    });

    return {
      shopId,
      pipelineRunId: pipeline.id,
      seed,
      forecasts: weather.forecasts,
      collectionsLinked,
      orders: makeup.orders,
      events: scored.map((event) => ({
        name: event.name,
        value: Number(event.value.toFixed(3)),
        nOrders: event.nOrders,
        lowN: event.lowN,
        labels: event.labels,
      })),
      personas: personas.ready,
      recommendations: recommendations.recommendations,
      recommendationsWithRun: recommendations.withRun,
    };
  } catch (error) {
    await prisma.pipelineRun.update({
      where: { id: pipeline.id },
      data: {
        status: "failed",
        failedStage: "score_link",
        errorMessage: error instanceof Error ? error.message : "pipeline failed",
        finishedAt: new Date(),
      },
    });
    throw error;
  }
}
