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
    const whereClause = q
      ? `WHERE "pageName" ILIKE '%' || $3 || '%'`
      : "";

    const params: unknown[] = [limit, offset];
    if (q) params.push(q);

    const shops = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "pageId", "pageName", "profilePicture", "activeAds", "pausedAds", "totalAds",
              platforms, countries, "firstSeenAt", "lastAdSeenAt"
       FROM "Shop"
       ${whereClause}
       ORDER BY ${orderCol} DESC NULLS LAST
       LIMIT $1 OFFSET $2`,
      ...params,
    );

    const countResult = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Shop" ${whereClause}`,
      ...(q ? [q] : []),
    );
    const total = Number(countResult[0]?.count ?? 0);

    // Convert BigInt and Date for JSON serialization
    const data = shops.map((s) => ({
      pageId: s.pageId,
      pageName: s.pageName,
      profilePicture: s.profilePicture ?? null,
      activeAds: Number(s.activeAds ?? 0),
      pausedAds: Number(s.pausedAds ?? 0),
      totalAds: Number(s.totalAds ?? 0),
      platforms: s.platforms ?? [],
      countries: s.countries ?? [],
      firstSeenAt: s.firstSeenAt ? new Date(s.firstSeenAt as string).toISOString() : null,
      lastAdSeenAt: s.lastAdSeenAt ? new Date(s.lastAdSeenAt as string).toISOString() : null,
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
