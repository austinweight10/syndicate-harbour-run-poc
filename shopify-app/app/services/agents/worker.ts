import prisma from "../../db.server";
import { executeAgentRun } from "./playwright-run";

let pumping = false;

/** In-process queue. Concurrency is also enforced in the SQLite claim. */
export function kickAgentWorker(): void {
  if (pumping) return;
  pumping = true;
  // Leave the row queued long enough for the runs page to paint it.
  setTimeout(() => {
    void pump().finally(() => {
      pumping = false;
    });
  }, 400);
}

async function pump() {
  for (;;) {
    const next = await prisma.agentRun.findFirst({
      where: { status: "queued" },
      orderBy: { startedAt: "asc" },
    });
    if (!next) {
      const still = await prisma.agentRun.findFirst({ where: { status: "queued" } });
      if (!still) return;
    }
    const queued = next ?? (await prisma.agentRun.findFirst({ where: { status: "queued" } }));
    if (!queued) return;
    await executeAgentRun(queued.id);
    const current = await prisma.agentRun.findUnique({ where: { id: queued.id } });
    if (current?.status === "queued") {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
}
