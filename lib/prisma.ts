import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // DIRECT_URL is for migrations only — runtime always uses PgBouncer (DATABASE_URL)
  const connectionString =
    process.env.POOLER_URL ?? process.env.DATABASE_URL!;

  // SSL: required for Supabase connections, not needed for Hetzner localhost
  const needsSsl = connectionString.includes("supabase");

  const adapter = new PrismaPg({
    connectionString,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
