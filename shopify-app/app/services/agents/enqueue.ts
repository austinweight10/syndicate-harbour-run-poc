import { randomBytes } from "node:crypto";
import prisma from "../../db.server";
import { loadDawnPath } from "./path";
import { resolveStorefrontUrl } from "./storefront";
import { kickAgentWorker } from "./worker";

const CAP = 3;

export type EnqueueResult = {
  toast: "t01" | "t02" | "t12";
  block: "url" | "paused" | "no-ready" | "inflight" | null;
  created: { id: string; personaName: string }[];
};

export async function enqueueAgentRuns(input: {
  shopId: string;
  personaIds?: string[];
  forceHeadedDemo?: boolean;
  kick?: boolean;
}): Promise<EnqueueResult> {
  const shop = await prisma.shop.findUnique({ where: { id: input.shopId } });
  const settings = await prisma.shopSettings.findUnique({ where: { shopId: input.shopId } });
  const url = resolveStorefrontUrl(shop?.storefrontUrl);
  if (!url) {
    return { toast: "t12", block: "url", created: [] };
  }
  const paused = settings?.agentsAutoRun === false;
  if (paused && !input.forceHeadedDemo) {
    return { toast: "t02", block: "paused", created: [] };
  }

  const inflight = await prisma.agentRun.count({
    where: { shopId: input.shopId, status: { in: ["queued", "running"] } },
  });
  if (inflight > 0) {
    return { toast: "t02", block: "inflight", created: [] };
  }

  const ready = await prisma.persona.findMany({
    where: {
      shopId: input.shopId,
      status: "ready",
      ...(input.personaIds && input.personaIds.length > 0 ? { id: { in: input.personaIds } } : {}),
    },
    orderBy: { name: "asc" },
  });
  if (ready.length === 0) {
    return { toast: "t12", block: "no-ready", created: [] };
  }

  const path = loadDawnPath();
  const chosen = ready.slice(0, CAP);
  const created: { id: string; personaName: string }[] = [];
  for (const persona of chosen) {
    const id = `run_${Date.now().toString(36)}_${randomBytes(3).toString("hex")}`;
    await prisma.agentRun.create({
      data: {
        id,
        shopId: input.shopId,
        personaId: persona.id,
        eventId: persona.primaryEventId,
        status: "queued",
        progressPct: 0,
        startedAt: new Date(),
        storefrontUrl: url,
        timelineJson: JSON.stringify({ pathId: path.pathId, headed: false, steps: [] }),
      },
    });
    created.push({ id, personaName: persona.name });
  }

  if (input.kick !== false && created.length > 0) kickAgentWorker();
  return { toast: "t01", block: null, created };
}
