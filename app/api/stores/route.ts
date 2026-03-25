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
  const limit = Math.min(60, parseInt(url.searchParams.get("limit") ?? "30"));
  const sort = url.searchParams.get("sort") ?? "activeAds";
  const q = url.searchParams.get("q")?.trim();
  const offset = (page - 1) * limit;

  const orderCol =
    sort === "totalAds" ? '"totalAds"' :
    sort === "lastAdSeenAt" ? '"lastAdSeenAt"' :
    '"activeAds"';

  try {
    let shops: Array<Record<string, unknown>>;
    let total: number;

    if (q) {
      shops = await prisma.$queryRawUnsafe(
        `SELECT "pageId", "pageName", "profilePicture", "activeAds", "pausedAds", "totalAds",
                platforms, countries, "firstSeenAt", "lastAdSeenAt"
         FROM "Shop"
         WHERE "pageName" ILIKE '%' || $1 || '%'
         ORDER BY ${orderCol} DESC NULLS LAST
         LIMIT $2 OFFSET $3`,
        q, limit, offset,
      );
      const cnt = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "Shop" WHERE "pageName" ILIKE '%' || $1 || '%'`,
        q,
      );
      total = Number(cnt[0]?.count ?? 0);
    } else {
      shops = await prisma.$queryRawUnsafe(
        `SELECT "pageId", "pageName", "profilePicture", "activeAds", "pausedAds", "totalAds",
                platforms, countries, "firstSeenAt", "lastAdSeenAt"
         FROM "Shop"
         ORDER BY ${orderCol} DESC NULLS LAST
         LIMIT $1 OFFSET $2`,
        limit, offset,
      );
      const cnt = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) as count FROM "Shop"`,
      );
      total = Number(cnt[0]?.count ?? 0);
    }

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
    return NextResponse.json(
      { error: "Failed to fetch stores", detail: String(e) },
      { status: 500 },
    );
  }
}
