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

  const where: Record<string, unknown> = {};
  if (q) {
    where.pageName = { contains: q, mode: "insensitive" };
  }

  const orderBy =
    sort === "totalAds"
      ? { totalAds: "desc" as const }
      : sort === "lastAdSeenAt"
        ? { lastAdSeenAt: "desc" as const }
        : { activeAds: "desc" as const };

  try {
    const [shops, total] = await Promise.all([
      prisma.shop.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          pageId: true,
          pageName: true,
          profilePicture: true,
          activeAds: true,
          pausedAds: true,
          totalAds: true,
          platforms: true,
          countries: true,
          firstSeenAt: true,
          lastAdSeenAt: true,
        },
      }),
      prisma.shop.count({ where }),
    ]);

    return NextResponse.json({
      data: shops,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (e) {
    console.error("Stores API error:", e);
    return NextResponse.json({ error: "Internal server error", detail: String(e) }, { status: 500 });
  }
}
