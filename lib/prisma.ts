import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Production DB: PostgreSQL on Coolify VPS (5.78.207.17:5432)
  // POOLER_URL takes priority if set (legacy Supabase pooler), otherwise DATABASE_URL
  const connectionString =
    process.env.POOLER_URL ?? process.env.DATABASE_URL!;

  // SSL: enable if connecting via Supabase pooler (legacy), disable for local PostgreSQL
  const needsSsl = connectionString.includes("supabase") || connectionString.includes("pooler");

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
