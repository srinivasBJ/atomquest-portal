import { PrismaClient } from "@prisma/client";
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function prepareRuntimeDatabase() {
  if (!process.env.VERCEL) {
    return;
  }

  const runtimeDatabase = "/tmp/atomquest-dev.db";
  const bundledDatabase = join(process.cwd(), "prisma", "dev.db");

  if (!existsSync(runtimeDatabase) && existsSync(bundledDatabase)) {
    copyFileSync(bundledDatabase, runtimeDatabase);
  }

  process.env.DATABASE_URL = `file:${runtimeDatabase}`;
}

prepareRuntimeDatabase();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
