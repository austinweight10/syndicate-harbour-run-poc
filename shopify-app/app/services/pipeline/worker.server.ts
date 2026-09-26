import prisma from "../../db.server";
import { liveAdminClient, type AdminGraphql } from "../ingest/admin-client";
import { runLivePipeline } from "./run-live";

/** A run still "running" after this long lost its process (restart, crash). */
const STALE_MS = 15 * 60 * 1000;

type ClientFactory = (shopId: string) => Promise<AdminGraphql>;

let pumping = false;

/**
 * In-process queue for live PipelineRuns, one at a time. Demo mode never
 * creates live runs (pipelineEnqueue refuses), so this is a no-op there.
 */
export function kickPipelineWorker(makeClient: ClientFactory = liveAdminClient): void {
  if (pumping) return;
  pumping = true;
  void drainPipelineRuns(makeClient)
    .catch((error) => console.error("[pipeline] worker stopped:", error))
    .finally(() => {
      pumping = false;
    });
}

/**
 * Runs pending live PipelineRuns (all shops, or one with `shopId`). Returns
 * the ids it processed.
 */
export async function drainPipelineRuns(
  makeClient: ClientFactory = liveAdminClient,
  options: { shopId?: string } = {},
): Promise<string[]> {
  const scope = { mode: "live", ...(options.shopId ? { shopId: options.shopId } : {}) };
  await prisma.pipelineRun.updateMany({
    where: { ...scope, status: "running", startedAt: { lt: new Date(Date.now() - STALE_MS) } },
    data: { status: "pending" },
  });

  const processed: string[] = [];
  for (;;) {
    const next = await prisma.pipelineRun.findFirst({
      where: { ...scope, status: "pending" },
      orderBy: { startedAt: "asc" },
    });
    if (!next) return processed;

    // Claim atomically so two pumps never run the same row.
    const claimed = await prisma.pipelineRun.updateMany({
      where: { id: next.id, status: "pending" },
      data: { status: "running", startedAt: new Date() },
    });
    if (claimed.count === 0) continue;
    processed.push(next.id);

    try {
      const shop = await prisma.shop.findUnique({ where: { id: next.shopId } });
      if (!shop || shop.uninstalledAt) {
        await prisma.pipelineRun.update({
          where: { id: next.id },
          data: { status: "cancelled", errorCode: "shop_uninstalled", finishedAt: new Date() },
        });
        continue;
      }
      const admin = await makeClient(next.shopId);
      await runLivePipeline(prisma, next.id, admin);
    } catch (error) {
      // runLivePipeline records stage failures itself; this catches client setup.
      const current = await prisma.pipelineRun.findUnique({ where: { id: next.id } });
      if (current?.status === "running") {
        await prisma.pipelineRun.update({
          where: { id: next.id },
          data: {
            status: "failed",
            failedStage: current.currentStage,
            errorCode: "worker_failed",
            errorMessage: (error instanceof Error ? error.message : String(error)).slice(0, 500),
            finishedAt: new Date(),
          },
        });
      }
    }
  }
}
