import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const results: Record<string, unknown> = {};

  // Test 1: Check if Shop table exists
  try {
    const count = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Shop"`
    );
    results.shopCount = Number(count[0]?.count ?? 0);
  } catch (e) {
    results.shopError = String(e);
  }

  // Test 2: Get 3 sample shops
  try {
    const shops = await prisma.$queryRawUnsafe(
      `SELECT "pageId", "pageName", "activeAds" FROM "Shop" ORDER BY "activeAds" DESC LIMIT 3`
    );
    results.sampleShops = shops;
  } catch (e) {
    results.sampleError = String(e);
  }

  // Test 3: Check Ad table
  try {
    const adCount = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Ad"`
    );
    results.adCount = Number(adCount[0]?.count ?? 0);
  } catch (e) {
    results.adError = String(e);
  }

  // Test 4: Check DATABASE_URL (masked)
  const dbUrl = process.env.DATABASE_URL ?? "NOT SET";
  results.dbHost = dbUrl.includes("@") ? dbUrl.split("@")[1]?.split("/")[0] : "unknown";

  // Test 5: List all tables
  try {
    const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
    );
    results.tables = tables.map((t) => t.tablename);
  } catch (e) {
    results.tablesError = String(e);
  }

  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
