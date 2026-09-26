import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const prismaDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../prisma");

function sqliteUrl(): string {
  const configured = process.env.DATABASE_URL;
  if (configured && !configured.startsWith("file:./") && !configured.startsWith("file:dev")) {
    return configured;
  }
  return `file:${path.join(prismaDir, "dev.db")}`;
}

process.env.DATABASE_URL = sqliteUrl();

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

function createPrisma(): PrismaClient {
  return new PrismaClient();
}

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = createPrisma();
  }
}

const prisma = global.prismaGlobal ?? createPrisma();

export default prisma;
