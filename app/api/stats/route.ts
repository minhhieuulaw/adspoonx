import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── In-memory cache (5 minutes TTL) ─────────────────────────────────────────

let cached: { data: Record<string, unknown>; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return cached if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  }

  const [totalAds, activeAds, countries, nicheGroups, topStores, recentCount] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { isActive: true } }),
    prisma.ad.groupBy({ by: ["country"] }).then((r) => r.length),

    // Niche distribution (top 10)
    prisma.ad.groupBy({
      by: ["niche"],
      _count: { adArchiveId: true },
      where: { niche: { not: null } },
      orderBy: { _count: { adArchiveId: "desc" } },
      take: 10,
    }),

    // Top stores by ad count
    prisma.ad.groupBy({
      by: ["pageName", "pageId"],
      _count: { adArchiveId: true },
      where: { isActive: true, pageName: { not: null } },
      orderBy: { _count: { adArchiveId: "desc" } },
      take: 5,
    }),

    // Just count recent ads (no rawData needed)
    prisma.ad.count({
      where: {
        isActive: true,
        scrapedAt: { gte: new Date(Date.now() - 7 * 86_400_000) },
      },
    }),
  ]);

  const niches = nicheGroups.map((g) => ({
    niche: g.niche ?? "Other",
    count: g._count.adArchiveId,
  }));

  const stores = topStores.map((g) => ({
    pageName: g.pageName ?? "Unknown",
    pageId: g.pageId,
    adCount: g._count.adArchiveId,
  }));

  // Video count
  const videoCount = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) FROM "Ad"
    WHERE "isActive" = true
      AND COALESCE(
        "rawData"->>'videoUrl',
        "rawData"->'snapshot'->>'video_hd_url',
        "rawData"->'snapshot'->>'video_sd_url'
      ) IS NOT NULL
  `.then((r) => Number(r[0]?.count ?? 0));

  // Platform distribution (unnest platforms array)
  const platformDist = await prisma.$queryRaw<Array<{ platform: string; count: bigint }>>`
    SELECT unnest(platforms) as platform, COUNT(*) as count
    FROM "Ad" WHERE "isActive" = true
    GROUP BY platform ORDER BY count DESC
  `.then(rows => rows.map(r => ({ platform: r.platform, count: Number(r.count) })));

  // Ads added per week (last 8 weeks)
  const weeklyGrowth = await prisma.$queryRaw<Array<{ week: Date; count: bigint }>>`
    SELECT date_trunc('week', "scrapedAt") as week, COUNT(*) as count
    FROM "Ad"
    WHERE "scrapedAt" > NOW() - INTERVAL '8 weeks'
    GROUP BY week ORDER BY week ASC
  `.then(rows => rows.map(r => ({ week: r.week.toISOString().slice(0, 10), count: Number(r.count) })));

  const data = {
    totalAds,
    activeAds,
    countries,
    videoCount,
    niches,
    stores,
    recentCount,
    platformDist,
    weeklyGrowth,
  };

  // Update cache
  cached = { data, ts: Date.now() };

  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
  });
}
