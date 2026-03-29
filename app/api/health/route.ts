import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Use estimated count (instant) instead of COUNT(*) which can timeout on large tables
    const result = await prisma.$queryRawUnsafe<[{ estimate: bigint }]>(
      `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'Ad'`
    );
    const totalAds = Number(result[0]?.estimate ?? 0);
    return NextResponse.json({ ok: true, totalAds });
  } catch (e) {
    console.error("Health check error:", e);
    return NextResponse.json({ ok: false, error: "Health check failed" }, { status: 500 });
  }
}
