import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache 5 phút — public endpoint, no auth required
let cached: { data: Record<string, unknown>; ts: number } | null = null;
const TTL = 5 * 60 * 1000;

export async function GET() {
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  try {
    const [totalEst, activeCount, countryGroups, todayCount] = await Promise.all([
      // Ước tính tổng ads (instant, không scan full table)
      prisma.$queryRawUnsafe<[{ estimate: bigint }]>(
        `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'Ad'`
      ),
      // Active ads
      prisma.ad.count({ where: { isActive: true } }),
      // Số quốc gia
      prisma.ad.groupBy({ by: ["country"], _count: { adArchiveId: true }, orderBy: { _count: { adArchiveId: "desc" } }, take: 100 }),
      // Ads mới hôm nay
      prisma.ad.count({
        where: {
          scrapedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const data = {
      totalAds:    Number(totalEst[0]?.estimate ?? 0),
      activeAds:   activeCount,
      countries:   countryGroups.length,
      todayNewAds: todayCount,
    };

    cached = { data, ts: Date.now() };
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch {
    return NextResponse.json({ totalAds: 0, activeAds: 0, countries: 0, todayNewAds: 0 });
  }
}
