import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const base = process.env.DATABASE_URL ?? "";
  // In dev, Turbopack hot-reload can create multiple client instances that each
  // claim connections from Neon's pgbouncer pool (hard cap: ~13). Capping each
  // instance to 1 connection prevents pool exhaustion and P2024 timeouts.
  const datasourceUrl =
    process.env.NODE_ENV !== "production" && base
      ? `${base}${base.includes("?") ? "&" : "?"}connection_limit=1&pool_timeout=30`
      : base;

  return new PrismaClient({
    log: ["error"],
    datasourceUrl,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
