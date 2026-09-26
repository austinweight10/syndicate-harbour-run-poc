import prisma from "../db.server";
import { kickLivePipelineDrain } from "./pipeline/drain-live";

export const PIPELINE_STAGE_ORDER = [
  "store_makeup",
  "graph_seed",
  "catalogue_refresh",
  "score_link",
  "personas",
  "agents_queue",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGE_ORDER)[number];

export type PipelineTrigger = "install" | "reconnect" | "manual_refresh" | "scheduled";

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  store_makeup: "Ingesting store makeup…",
  graph_seed: "Seeding graph…",
  catalogue_refresh: "Refreshing events…",
  score_link: "Scoring occasions…",
  personas: "Materialising personas…",
  agents_queue: "Agents running…",
};

export class DemoPipelineRefusedError extends Error {
  constructor() {
    super("Demo fixture mode does not create a live PipelineRun.");
    this.name = "DemoPipelineRefusedError";
  }
}

function pendingStages() {
  return PIPELINE_STAGE_ORDER.map((stage) => ({ stage, status: "pending" }));
}

/**
 * Live OAuth success calls this. Stages drain in-process via kickLivePipelineDrain
 * (score existing orders, or fail store_makeup honestly if ingest is empty).
 * Idempotent on shop + trigger + install timestamp.
 */
export async function enqueueLivePipeline(
  shopId: string,
  trigger: PipelineTrigger,
): Promise<{ pipelineRunId: string }> {
  const active = await prisma.pipelineRun.findFirst({
    where: { shopId, status: { in: ["pending", "running"] } },
    orderBy: { startedAt: "desc" },
  });
  if (active) {
    if (active.status === "pending") kickLivePipelineDrain(prisma, active.id);
    return { pipelineRunId: active.id };
  }

  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const settings = await prisma.shopSettings.findUnique({ where: { shopId } });
  const installEpoch = (shop?.installedAt ?? new Date()).toISOString();
  const idempotencyKey =
    trigger === "install" ? `${shopId}:install:${installEpoch}` : `${shopId}:${trigger}:${Date.now()}`;

  const existing = await prisma.pipelineRun.findUnique({ where: { idempotencyKey } });
  if (existing) {
    if (existing.status === "pending" || existing.status === "running") {
      kickLivePipelineDrain(prisma, existing.id);
    }
    return { pipelineRunId: existing.id };
  }

  let created;
  try {
    created = await prisma.pipelineRun.create({
      data: {
        shopId,
        mode: "live",
        trigger,
        status: "pending",
        currentStage: "store_makeup",
        stagesJson: JSON.stringify(pendingStages()),
        agentsAutoRunSnapshot: settings?.agentsAutoRun ?? true,
        idempotencyKey,
      },
    });
  } catch (err) {
    // Parallel loaders (layout + index) race here on first embedded load; the loser reuses the winner's run.
    if ((err as { code?: string })?.code !== "P2002") throw err;
    const winner = await prisma.pipelineRun.findUnique({ where: { idempotencyKey } });
    if (!winner) throw err;
    return { pipelineRunId: winner.id };
  }
  kickLivePipelineDrain(prisma, created.id);
  return { pipelineRunId: created.id };
}

/** CONTRACTS pipelineEnqueue. Refuses the fixture shop path. */
export async function pipelineEnqueue(
  shopId: string,
  trigger: PipelineTrigger,
): Promise<{ pipelineRunId: string }> {
  if (process.env.DEMO_FIXTURE_SHOP === "1") {
    throw new DemoPipelineRefusedError();
  }
  return enqueueLivePipeline(shopId, trigger);
}
