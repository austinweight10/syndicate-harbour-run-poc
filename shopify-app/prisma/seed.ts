import prisma from "../app/db.server";
import { seedFixtures } from "../app/fixtures/seed";

const counts = await seedFixtures(prisma);
console.log("Harbour Run fixture seed", counts);
await prisma.$disconnect();
