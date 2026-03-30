import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(60, parseInt(url.searchParams.get("limit") ?? "20"));
  const sort = url.searchParams.get("sort") ?? "activeAds";
  const q = url.searchParams.get("q")?.trim();
  const countries = url.searchParams.get("countries")?.split(",").filter(Boolean);
  const platforms = url.searchParams.get("platforms")?.split(",").filter(Boolean);
  const minAds = parseInt(url.searchParams.get("minAds") ?? "0");
  const maxAds = parseInt(url.searchParams.get("maxAds") ?? "999999");
  const offset = (page - 1) * limit;

  const orderCol =
    sort === "totalAds" ? '"totalAds"' :
    sort === "lastAdSeenAt" ? '"lastAdSeenAt"' :
    '"activeAds"';

  try {
    // Build WHERE clauses (s. prefix for Shop alias)
    const conditions: string[] = ['s."activeAds" >= $1', 's."activeAds" <= $2'];
    const params: unknown[] = [minAds, maxAds];
    let paramIdx = 3;

    if (q) {
      conditions.push(`s."pageName" ILIKE '%' || $${paramIdx} || '%'`);
      params.push(q);
      paramIdx++;
    }
    if (countries?.length) {
      conditions.push(`s.countries && $${paramIdx}::text[]`);
      params.push(countries);
      paramIdx++;
    }
    if (platforms?.length) {
      conditions.push(`s.platforms && $${paramIdx}::text[]`);
      params.push(platforms);
      paramIdx++;
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const shops = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT s."pageId", s."pageName", s."profilePicture", s."activeAds", s."pausedAds", s."totalAds",
              s.platforms, s.countries, s."firstSeenAt", s."lastAdSeenAt",
              -- Website domain (most common from ads)
              (SELECT a.website FROM "Ad" a WHERE a."pageId" = s."pageId" AND a.website IS NOT NULL AND a.website != '' LIMIT 1) as website,
              -- Top 4 ad thumbnails
              (SELECT COALESCE(json_agg(t.img), '[]'::json) FROM (
                SELECT COALESCE(a."imageUrl", a."videoUrl") as img
                FROM "Ad" a WHERE a."pageId" = s."pageId" AND (a."imageUrl" IS NOT NULL OR a."videoUrl" IS NOT NULL)
                ORDER BY a."scrapedAt" DESC LIMIT 4
              ) t) as "adThumbnails",
              -- Country distribution (top 3)
              (SELECT COALESCE(json_agg(json_build_object('country', cd.country, 'pct', cd.pct)), '[]'::json) FROM (
                SELECT a.country, ROUND(COUNT(*)::numeric * 100 / NULLIF(SUM(COUNT(*)) OVER(), 0), 0) as pct
                FROM "Ad" a WHERE a."pageId" = s."pageId" AND a.country IS NOT NULL
                GROUP BY a.country ORDER BY COUNT(*) DESC LIMIT 3
              ) cd) as "countryDistribution"
       FROM "Shop" s
       ${whereSQL}
       ORDER BY s.${orderCol} DESC NULLS LAST
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params, limit, offset,
    );

    const cnt = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Shop" s ${whereSQL}`,
      ...params,
    );
    const total = Number(cnt[0]?.count ?? 0);

    const data = shops.map((s) => ({
      pageId: String(s.pageId ?? ""),
      pageName: String(s.pageName ?? ""),
      profilePicture: s.profilePicture ? String(s.profilePicture) : null,
      activeAds: Number(s.activeAds ?? 0),
      pausedAds: Number(s.pausedAds ?? 0),
      totalAds: Number(s.totalAds ?? 0),
      platforms: Array.isArray(s.platforms) ? s.platforms : [],
      countries: Array.isArray(s.countries) ? s.countries : [],
      firstSeenAt: s.firstSeenAt instanceof Date ? s.firstSeenAt.toISOString() : null,
      lastAdSeenAt: s.lastAdSeenAt instanceof Date ? s.lastAdSeenAt.toISOString() : null,
      website: s.website ? String(s.website) : null,
      adThumbnails: Array.isArray(s.adThumbnails) ? (s.adThumbnails as string[]).filter(Boolean).slice(0, 4) : [],
      countryDistribution: Array.isArray(s.countryDistribution) ? s.countryDistribution : [],
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("Stores API error:", e);
    return NextResponse.json({ error: "Failed to fetch stores" }, { status: 500 });
  }
}
