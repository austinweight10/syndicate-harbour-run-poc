import prisma from "../../db.server";
import { resolveHeaded, resolveStorefrontUrl } from "./storefront";

export async function loadAgentGate(shopId: string) {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } });
  const settings = await prisma.shopSettings.findUnique({ where: { shopId } });
  const ready = await prisma.persona.findMany({
    where: { shopId, status: "ready" },
    orderBy: { name: "asc" },
    select: { id: true, name: true, primaryEventId: true },
  });
  const inflight = await prisma.agentRun.count({
    where: { shopId, status: { in: ["queued", "running"] } },
  });
  return {
    storefrontUrl: resolveStorefrontUrl(shop?.storefrontUrl),
    paused: settings?.agentsAutoRun === false,
    headed: resolveHeaded(),
    ready,
    inflight,
  };
}

export type AgentGate = Awaited<ReturnType<typeof loadAgentGate>>;
