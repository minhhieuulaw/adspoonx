import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ── In-memory cache (10 minutes TTL) ─────────────────────────────────────────

let cached: { data: Record<string, unknown>; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Return cached if fresh
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" },
    });
  }

  try {
    // Use estimated count (instant) instead of COUNT(*) full scan
    const estResult = await prisma.$queryRawUnsafe<[{ estimate: bigint }]>(
      `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = 'Ad'`
    );
    const totalAds = Number(estResult[0]?.estimate ?? 0);

    // Lightweight queries only — avoid full table scans
    const [nicheGroups, topStores] = await Promise.all([
      // Niche distribution (uses index on niche)
      prisma.ad.groupBy({
        by: ["niche"],
        _count: { adArchiveId: true },
        where: { niche: { not: null } },
        orderBy: { _count: { adArchiveId: "desc" } },
        take: 10,
      }).catch(() => []),

      // Top stores (uses index on pageName)
      prisma.ad.groupBy({
        by: ["pageName", "pageId"],
        _count: { adArchiveId: true },
        where: { isActive: true, pageName: { not: null } },
        orderBy: { _count: { adArchiveId: "desc" } },
        take: 5,
      }).catch(() => []),
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

    const data = {
      totalAds,
      activeAds: Math.round(totalAds * 0.85), // estimate
      countries: 10,
      videoCount: 0,
      niches,
      stores,
      recentCount: 0,
      platformDist: [],
      weeklyGrowth: [],
    };

    cached = { data, ts: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" },
    });
  } catch (e) {
    // Return minimal data on error
    console.error("[api/stats] error:", e);
    return NextResponse.json({
      totalAds: 0, activeAds: 0, countries: 0, videoCount: 0,
      niches: [], stores: [], recentCount: 0, platformDist: [], weeklyGrowth: [],
    });
  }
}
