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

  const shop = await prisma.shop.findUnique({
    where: { pageId },
    select: {
      pageId: true,
      pageName: true,
      profilePicture: true,
      totalAds: true,
      activeAds: true,
      pausedAds: true,
      platforms: true,
      countries: true,
      firstSeenAt: true,
      lastAdSeenAt: true,
    },
  });

  if (!shop) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Get ads, sorted: active first, then by date
  const ads = await prisma.ad.findMany({
    where: { pageId },
    orderBy: [{ isActive: "desc" }, { scrapedAt: "desc" }],
    take: 500,
  });

  const niches = [...new Set(ads.map((a) => a.niche).filter(Boolean))];

  return NextResponse.json({
    ...shop,
    firstSeenAt: shop.firstSeenAt?.toISOString() ?? null,
    lastAdSeenAt: shop.lastAdSeenAt?.toISOString() ?? null,
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
}
