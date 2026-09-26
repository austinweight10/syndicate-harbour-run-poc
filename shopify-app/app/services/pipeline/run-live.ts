import type { PrismaClient } from "@prisma/client";
import { seedCatalogue } from "../../fixtures/seed";
import { enqueueAgentRuns } from "../agents/enqueue";
import { seedLondonWeather } from "../catalogue/weather";
import { buildAndScore } from "../graph/build";
import type { AdminGraphql } from "../ingest/admin-client";
import { ingestLiveShop } from "../ingest/shopify";
import { writeStoreMakeup } from "../makeup/snapshot";
import { derivePersonas } from "../personas/derive";
import { buildRecommendations } from "../recommendations/build";
import { PIPELINE_STAGE_ORDER, type PipelineStage } from "../pipeline.server";

type StageState = {
  stage: PipelineStage;
  status: "pending" | "running" | "success" | "failed" | "skipped";
  finishedAt?: string;
  detail?: Record<string, unknown>;
};

export type LivePipelineResult = {
  pipelineRunId: string;
  shopId: string;
  stages: StageState[];
};

/**
 * Stages a→f for a live shop (docs/scope/AUTO_PIPELINE_ON_INSTALL.md).
 * The caller must already have claimed the run (status "running").
 */
export async function runLivePipeline(
  prisma: PrismaClient,
  pipelineRunId: string,
  admin: AdminGraphql,
): Promise<LivePipelineResult> {
  const run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: pipelineRunId } });
  const shopId = run.shopId;
  const stages: StageState[] = PIPELINE_STAGE_ORDER.map((stage) => ({ stage, status: "pending" }));

  const save = (data: Record<string, unknown> = {}) =>
    prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { stagesJson: JSON.stringify(stages), ...data },
    });

  async function stage<T>(name: PipelineStage, work: () => Promise<T>, detail: (result: T) => Record<string, unknown>) {
    const entry = stages.find((row) => row.stage === name)!;
    entry.status = "running";
    await save({ currentStage: name });
    console.log(`[pipeline] ${pipelineRunId} ${run.trigger} ${shopId} stage=${name} start`);
    const result = await work();
    entry.status = "success";
    entry.finishedAt = new Date().toISOString();
    entry.detail = detail(result);
    await save({ lastSuccessfulStage: name });
    console.log(`[pipeline] ${pipelineRunId} stage=${name} ok ${JSON.stringify(entry.detail)}`);
    return result;
  }

  try {
    // a — ingest + StoreMakeupSnapshot
    const ingest = await stage(
      "store_makeup",
      async () => {
        const counts = await ingestLiveShop(prisma, shopId, admin, pipelineRunId);
        const makeup = await writeStoreMakeup(prisma, shopId, pipelineRunId);
        return { ...counts, emptyOrders: makeup.emptyOrders };
      },
      (result) => ({
        orders: result.orders,
        products: result.products,
        collections: result.collections,
        pcdRedacted: result.pcdRedacted,
        emptyOrders: result.emptyOrders,
      }),
    );

    // b — OBSERVED rows are persisted by ingest; confirm the graph has inputs.
    await stage(
      "graph_seed",
      async () => ({
        orders: await prisma.orderRow.count({ where: { shopId } }),
        lineItems: await prisma.lineItemRow.count({ where: { shopId } }),
        geos: await prisma.geo.count({ where: { shopId } }),
        collectionLinks: await prisma.productCollection.count({
          where: { collectionId: { in: (await prisma.collectionRow.findMany({ where: { shopId }, select: { id: true } })).map((row) => row.id) } },
        }),
      }),
      (result) => result,
    );

    // c — curated/MOCK catalogue + saved Open-Meteo London forecast
    const weather = await stage(
      "catalogue_refresh",
      async () => {
        const catalogue = await seedCatalogue(prisma);
        const forecast = await seedLondonWeather(prisma);
        return { catalogue, forecast };
      },
      (result) => ({ ...result.catalogue, forecasts: result.forecast.forecasts, wetDriver: Boolean(result.forecast.wetDriverId) }),
    );

    // d — confidence + linking
    const scored = await stage(
      "score_link",
      () =>
        buildAndScore(prisma, shopId, {
          driverId: weather.forecast.wetDriverId,
          wetStart: weather.forecast.wetStart,
          wetEnd: weather.forecast.wetEnd,
        }),
      (result) => ({ events: result.length, lowN: result.filter((event) => event.lowN).length }),
    );

    // e — personas from the store-backed cohorts
    const personas = await stage(
      "personas",
      () => derivePersonas(prisma, shopId, scored),
      (result) => ({ ready: result.ready }),
    );

    // f — recommendations, then capped agent queue (respects Pause + storefront URL)
    await stage(
      "agents_queue",
      async () => {
        const recommendations = await buildRecommendations(prisma, shopId, scored);
        if (!run.agentsAutoRunSnapshot || personas.ready.length === 0) {
          return { recommendations: recommendations.recommendations, agents: "not_requested" };
        }
        const queued = await enqueueAgentRuns({ shopId });
        return {
          recommendations: recommendations.recommendations,
          agents: queued.block ?? `queued ${queued.created.length}`,
        };
      },
      (result) => result,
    );

    await save({ status: "success", finishedAt: new Date() });
    console.log(`[pipeline] ${pipelineRunId} success (${ingest.orders} orders)`);
    return { pipelineRunId, shopId, stages };
  } catch (error) {
    const failed = stages.find((row) => row.status === "running");
    if (failed) failed.status = "failed";
    const message = error instanceof Error ? error.message : "pipeline failed";
    await save({
      status: "failed",
      failedStage: failed?.stage ?? null,
      errorCode: "stage_failed",
      errorMessage: message.slice(0, 500),
      finishedAt: new Date(),
    });
    console.error(`[pipeline] ${pipelineRunId} failed at ${failed?.stage}: ${message}`);
    throw error;
  }
}
