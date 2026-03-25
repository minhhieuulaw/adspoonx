import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId } = await params;

  try {
    // Get shop info via raw SQL
    const shops = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "pageId", "pageName", "profilePicture", "totalAds", "activeAds", "pausedAds",
              platforms, countries, "firstSeenAt", "lastAdSeenAt"
       FROM "Shop" WHERE "pageId" = $1 LIMIT 1`,
      pageId,
    );

    if (!shops.length) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const shop = shops[0];

    // Get ads via Prisma (Ad model works fine)
    const ads = await prisma.ad.findMany({
      where: { pageId },
      orderBy: [{ isActive: "desc" }, { scrapedAt: "desc" }],
      take: 500,
    });

    const niches = [...new Set(ads.map((a) => a.niche).filter(Boolean))];

    return NextResponse.json({
      pageId: shop.pageId,
      pageName: shop.pageName,
      profilePicture: shop.profilePicture ?? null,
      totalAds: Number(shop.totalAds ?? 0),
      activeAds: Number(shop.activeAds ?? 0),
      pausedAds: Number(shop.pausedAds ?? 0),
      platforms: shop.platforms ?? [],
      countries: shop.countries ?? [],
      firstSeenAt: shop.firstSeenAt ? new Date(shop.firstSeenAt as string).toISOString() : null,
      lastAdSeenAt: shop.lastAdSeenAt ? new Date(shop.lastAdSeenAt as string).toISOString() : null,
      niches,
      ads: ads.map((ad) => ({
        adArchiveId: ad.adArchiveId,
        pageName: ad.pageName,
        pageId: ad.pageId,
        bodyText: ad.bodyText,
        title: ad.title,
        description: ad.description,
        imageUrl: ad.imageUrl,
        videoUrl: ad.videoUrl,
        adLibraryUrl: ad.adLibraryUrl,
        ctaType: ad.ctaType,
        platforms: ad.platforms,
        country: ad.country,
        isActive: ad.isActive,
        startDate: ad.startDate?.toISOString() ?? null,
        endDate: ad.endDate?.toISOString() ?? null,
        pausedAt: ad.pausedAt?.toISOString() ?? null,
        niche: ad.niche,
        rawData: ad.rawData,
      })),
    });
  } catch (e) {
    console.error("Store detail API error:", e);
    return NextResponse.json(
      { error: "Failed to fetch store", detail: String(e) },
      { status: 500 },
    );
  }
}
