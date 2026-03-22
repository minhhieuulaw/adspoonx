import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Read at call time (not module load time) so dotenv has a chance to inject vars
  // DIRECT_URL = port 5432 direct (local dev only)
  // DATABASE_URL = pooler port 6543 (Vercel production)
  const useDirect = !!process.env.DIRECT_URL;
  const connectionString = useDirect ? process.env.DIRECT_URL! : process.env.DATABASE_URL!;
  const adapter = new PrismaPg({
    connectionString,
    // SSL only needed for direct connection (local dev); pooler handles SSL itself
    ssl: useDirect ? { rejectUnauthorized: false } : undefined,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
