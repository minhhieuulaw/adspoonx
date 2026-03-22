import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // DIRECT_URL = port 5432 direct (local dev only, via .env.local)
  // POOLER_URL  = port 6543 pooler (Vercel production — custom var, avoids Supabase integration override)
  // DATABASE_URL is intentionally NOT used here because Vercel's Supabase integration
  //   injects DATABASE_URL = direct connection (port 5432), which is unreachable from Vercel serverless.
  const useDirect = !!process.env.DIRECT_URL;
  const connectionString = useDirect
    ? process.env.DIRECT_URL!
    : (process.env.POOLER_URL ?? process.env.DATABASE_URL)!;
  const adapter = new PrismaPg({
    connectionString,
    // SSL only for direct (local dev); pooler handles SSL on its own
    ssl: useDirect ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
