import type { PrismaClient } from "@prisma/client";
import { linkHarbourCollections } from "../catalogue/collections";
import { seedLondonWeather } from "../catalogue/weather";
import { buildAndScore } from "../graph/build";
import { ingestShopifyFull } from "../ingest/shopify-full";
import { writeStoreMakeup } from "../makeup/snapshot";
import { derivePersonas } from "../personas/derive";
import { buildRecommendations } from "../recommendations/build";
import { enqueueAgentRuns } from "../agents/enqueue";
import { resolveStorefrontUrl } from "../agents/storefront";
import { seedFixtures } from "../../fixtures/seed";

const STAGE_ORDER = [
  "store_makeup",
  "graph_seed",
  "catalogue_refresh",
  "score_link",
  "personas",
  "agents_queue",
] as const;

type PipelineStage = (typeof STAGE_ORDER)[number];

type StageRow = { stage: string; status: string; finishedAt?: string; error?: string };

function mark(
  stages: StageRow[],
  stage: PipelineStage,
  status: "running" | "success" | "failed" | "skipped",
  error?: string,
): StageRow[] {
  return stages.map((row) =>
    row.stage === stage
      ? {
          ...row,
          status,
          finishedAt: status === "running" ? undefined : new Date().toISOString(),
          ...(error ? { error } : {}),
        }
      : row,
  );
}

/**
 * Advance a live PipelineRun: Admin GraphQL ingest → makeup → score → personas.
 * Hybrid fallback: if live ingest returns 0 orders, seed Harbour Run fixtures
 * into this shop (preserving the OAuth token) so boards are not empty.
 */
export async function drainLivePipeline(prisma: PrismaClient, pipelineRunId: string): Promise<void> {
  const run = await prisma.pipelineRun.findUnique({ where: { id: pipelineRunId } });
  if (!run || run.status === "success" || run.status === "failed") return;

  let stages: StageRow[] = (() => {
    try {
      return JSON.parse(run.stagesJson) as StageRow[];
    } catch {
      return STAGE_ORDER.map((stage) => ({ stage, status: "pending" }));
    }
  })();

  await prisma.pipelineRun.update({
    where: { id: pipelineRunId },
    data: { status: "running", currentStage: "store_makeup" },
  });

  try {
    stages = mark(stages, "store_makeup", "running");
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { currentStage: "store_makeup", stagesJson: JSON.stringify(stages) },
    });

    let liveOrders = 0;
    let ingestError: string | null = null;
    try {
      const ingest = await ingestShopifyFull(prisma, run.shopId, {
        pipelineRunId,
        maxOrders: 2500,
      });
      liveOrders = ingest.ordersUpserted;
    } catch (error) {
      ingestError = error instanceof Error ? error.message : "ingest failed";
    }

    // Hybrid A5: empty live shop → fixture seed so boards are speakable.
    if (liveOrders < 1) {
      await seedFixtures(prisma, { shopId: run.shopId, preserveCredentials: true });
    }

    const orderCount = await prisma.orderRow.count({ where: { shopId: run.shopId } });
    if (orderCount < 1) {
      const msg =
        ingestError ??
        "No orders in the last 60 days and fixture seed produced none. Add orders in Shopify Admin, then Refresh.";
      stages = mark(stages, "store_makeup", "failed", msg);
      await prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: {
          status: "failed",
          failedStage: "store_makeup",
          currentStage: "store_makeup",
          errorMessage: msg,
          stagesJson: JSON.stringify(stages),
          finishedAt: new Date(),
        },
      });
      return;
    }

    await writeStoreMakeup(prisma, run.shopId, pipelineRunId, {
      provenance: liveOrders > 0 ? "OBSERVED" : "MOCK",
    });
    stages = mark(stages, "store_makeup", "success");

    stages = mark(stages, "graph_seed", "running");
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { currentStage: "graph_seed", stagesJson: JSON.stringify(stages) },
    });
    stages = mark(stages, "graph_seed", "success");

    stages = mark(stages, "catalogue_refresh", "running");
    const weather = await seedLondonWeather(prisma);
    await linkHarbourCollections(prisma, run.shopId);
    stages = mark(stages, "catalogue_refresh", "success");

    stages = mark(stages, "score_link", "running");
    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: { currentStage: "score_link", stagesJson: JSON.stringify(stages) },
    });
    const scored = await buildAndScore(prisma, run.shopId, {
      driverId: weather.wetDriverId,
      wetStart: weather.wetStart,
      wetEnd: weather.wetEnd,
    });
    stages = mark(stages, "score_link", "success");

    stages = mark(stages, "personas", "running");
    await derivePersonas(prisma, run.shopId, scored);
    stages = mark(stages, "personas", "success");

    await buildRecommendations(prisma, run.shopId, scored);

    const shop = await prisma.shop.findUnique({ where: { id: run.shopId } });
    const storefront = resolveStorefrontUrl(shop?.storefrontUrl);
    const autoAgents = run.agentsAutoRunSnapshot === true && Boolean(storefront);

    if (autoAgents) {
      stages = mark(stages, "agents_queue", "running");
      await prisma.pipelineRun.update({
        where: { id: pipelineRunId },
        data: { currentStage: "agents_queue", stagesJson: JSON.stringify(stages) },
      });
      await enqueueAgentRuns({ shopId: run.shopId, kick: true });
      stages = mark(stages, "agents_queue", "success");
    } else {
      stages = mark(stages, "agents_queue", "skipped");
    }

    await prisma.pipelineRun.update({
      where: { id: pipelineRunId },
      data: {
        status: "success",
        currentStage: "agents_queue",
        lastSuccessfulStage: autoAgents ? "agents_queue" : "personas",
        stagesJson: JSON.stringify(stages),
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "pipeline failed";
    const failed = (run.currentStage as PipelineStage) || "store_makeup";
    stages = mark(stages, failed, "failed", msg);
    // updateMany: the run may be gone (uninstall wipe) or cancelled mid-drain — don't resurrect or throw.
    await prisma.pipelineRun.updateMany({
      where: { id: pipelineRunId, status: { notIn: ["cancelled"] } },
      data: {
        status: "failed",
        failedStage: failed,
        errorMessage: msg,
        stagesJson: JSON.stringify(stages),
        finishedAt: new Date(),
      },
    });
  }
}

let pumping = false;

/** Fire-and-forget after live enqueue so the strip cannot stick on pending. */
export function kickLivePipelineDrain(prisma: PrismaClient, pipelineRunId: string): void {
  if (pumping) return;
  pumping = true;
  setTimeout(() => {
    void drainLivePipeline(prisma, pipelineRunId)
      .catch((error) => {
        // Fire-and-forget: an unhandled rejection here would kill the server process.
        console.error("pipeline.drain_failed", pipelineRunId, error instanceof Error ? error.message : error);
      })
      .finally(() => {
        pumping = false;
      });
  }, 200);
}
