import prisma from "../app/db.server";
import { kickAgentWorker } from "../app/services/agents/worker";

kickAgentWorker();

for (let i = 0; i < 90; i += 1) {
  const inflight = await prisma.agentRun.count({ where: { status: { in: ["queued", "running"] } } });
  if (inflight === 0) break;
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

const latest = await prisma.agentRun.findFirst({ orderBy: { startedAt: "desc" } });
console.log(latest ? `${latest.id} ${latest.status} ${latest.outcome ?? ""}` : "no runs");
await prisma.$disconnect();
