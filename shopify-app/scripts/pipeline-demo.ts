import prisma from "../app/db.server";
import { runDemoPipeline } from "../app/services/pipeline/run-demo";

const result = await runDemoPipeline(prisma);
console.log(JSON.stringify(result, null, 2));
await prisma.$disconnect();
