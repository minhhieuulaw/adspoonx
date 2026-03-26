import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const country = req.nextUrl.searchParams.get("country") ?? "";

  try {
    const countryFilter = country ? `AND country = '${country.replace(/'/g, "")}'` : "";

    // Get niche stats: total active, new last 24h, new last 7d
    const niches = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT
        niche,
        COUNT(*) as total_ads,
        COUNT(*) FILTER (WHERE "isActive" = true) as active_ads,
        COUNT(*) FILTER (WHERE "scrapedAt" > now() - interval '24 hours') as new_24h,
        COUNT(*) FILTER (WHERE "scrapedAt" > now() - interval '7 days') as new_7d,
        COUNT(*) FILTER (WHERE "scrapedAt" > now() - interval '14 days'
                         AND "scrapedAt" <= now() - interval '7 days') as prev_7d,
        COUNT(DISTINCT "pageId") as store_count,
        MIN("scrapedAt") as first_seen
      FROM "Ad"
      WHERE niche IS NOT NULL AND niche != 'Other'
      ${countryFilter}
      GROUP BY niche
      HAVING COUNT(*) >= 10
      ORDER BY COUNT(*) FILTER (WHERE "scrapedAt" > now() - interval '24 hours') DESC
    `);

    // Get top 3 store avatars per niche
    const topStoresPerNiche = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT DISTINCT ON (sub.niche, sub.rn) sub.niche, sub."pageName", sub."profilePicture"
      FROM (
        SELECT
          a.niche,
          s."pageName",
          s."profilePicture",
          ROW_NUMBER() OVER (PARTITION BY a.niche ORDER BY s."activeAds" DESC) as rn
        FROM "Ad" a
        JOIN "Shop" s ON a."pageId" = s."pageId"
        WHERE a.niche IS NOT NULL AND a.niche != 'Other'
          AND s."profilePicture" IS NOT NULL
        ${countryFilter.replace('country', 'a.country')}
      ) sub
      WHERE sub.rn <= 3
    `);

    // Group top stores by niche
    const storesByNiche: Record<string, Array<{ name: string; pic: string }>> = {};
    for (const row of topStoresPerNiche) {
      const n = String(row.niche);
      if (!storesByNiche[n]) storesByNiche[n] = [];
      if (storesByNiche[n].length < 3) {
        storesByNiche[n].push({
          name: String(row.pageName ?? ""),
          pic: String(row.profilePicture ?? ""),
        });
      }
    }

    const data = niches.map((n) => {
      const new7d = Number(n.new_7d ?? 0);
      const prev7d = Number(n.prev_7d ?? 0);
      const growth = prev7d > 0 ? Math.round(((new7d - prev7d) / prev7d) * 100) : new7d > 0 ? 100 : 0;
      const niche = String(n.niche);

      return {
        niche,
        totalAds: Number(n.total_ads ?? 0),
        activeAds: Number(n.active_ads ?? 0),
        new24h: Number(n.new_24h ?? 0),
        new7d,
        growth,
        storeCount: Number(n.store_count ?? 0),
        topStores: storesByNiche[niche] ?? [],
      };
    });

    // Sort into categories
    const hotNow = [...data].sort((a, b) => b.new24h - a.new24h).slice(0, 8);
    const rising = [...data].sort((a, b) => b.growth - a.growth).slice(0, 8);
    const evergreen = [...data].sort((a, b) => b.activeAds - a.activeAds).slice(0, 8);

    return NextResponse.json({ hotNow, rising, evergreen, all: data });
  } catch (e) {
    console.error("Trending API error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
