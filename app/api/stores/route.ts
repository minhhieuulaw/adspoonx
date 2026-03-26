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
    // Build WHERE clauses
    const conditions: string[] = ['"activeAds" >= $1', '"activeAds" <= $2'];
    const params: unknown[] = [minAds, maxAds];
    let paramIdx = 3;

    if (q) {
      conditions.push(`"pageName" ILIKE '%' || $${paramIdx} || '%'`);
      params.push(q);
      paramIdx++;
    }
    if (countries?.length) {
      conditions.push(`countries && $${paramIdx}::text[]`);
      params.push(countries);
      paramIdx++;
    }
    if (platforms?.length) {
      conditions.push(`platforms && $${paramIdx}::text[]`);
      params.push(platforms);
      paramIdx++;
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const shops = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "pageId", "pageName", "profilePicture", "activeAds", "pausedAds", "totalAds",
              platforms, countries, "firstSeenAt", "lastAdSeenAt"
       FROM "Shop"
       ${whereSQL}
       ORDER BY ${orderCol} DESC NULLS LAST
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      ...params, limit, offset,
    );

    const cnt = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Shop" ${whereSQL}`,
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
    }));

    return NextResponse.json({
      data,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("Stores API error:", e);
    return NextResponse.json({ error: "Failed to fetch stores", detail: String(e) }, { status: 500 });
  }
}
