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

  // Get all ads for this store
  const ads = await prisma.ad.findMany({
    where: { pageId },
    orderBy: { scrapedAt: "desc" },
    take: 200,
  });

  if (ads.length === 0) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Store-level analytics
  const pageName = ads[0].pageName ?? "Unknown";
  const activeCount = ads.filter((a) => a.isActive).length;
  const niches = [...new Set(ads.map((a) => a.niche).filter(Boolean))];
  const platforms = [...new Set(ads.flatMap((a) => a.platforms))];

  // Extract first available profile picture
  let profilePicture: string | undefined;
  for (const ad of ads) {
    const raw = ad.rawData as Record<string, unknown> | null;
    if (!raw) continue;
    const snap = raw["snapshot"] as Record<string, unknown> | undefined;
    if (typeof snap?.["page_profile_picture_url"] === "string" && snap["page_profile_picture_url"]) {
      profilePicture = snap["page_profile_picture_url"] as string;
      break;
    }
  }

  // Earliest start date
  const startDates = ads.map((a) => a.startDate).filter(Boolean) as Date[];
  const earliestStart = startDates.length > 0 ? new Date(Math.min(...startDates.map((d) => d.getTime()))) : null;

  return NextResponse.json({
    pageId,
    pageName,
    profilePicture,
    totalAds: ads.length,
    activeAds: activeCount,
    niches,
    platforms,
    earliestStart: earliestStart?.toISOString() ?? null,
    ads: ads.map((ad) => ({
      adArchiveId: ad.adArchiveId,
      pageName: ad.pageName,
      pageId: ad.pageId,
      bodyText: ad.bodyText,
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      adLibraryUrl: ad.adLibraryUrl,
      platforms: ad.platforms,
      country: ad.country,
      isActive: ad.isActive,
      startDate: ad.startDate?.toISOString() ?? null,
      endDate: ad.endDate?.toISOString() ?? null,
      niche: ad.niche,
      rawData: ad.rawData,
    })),
  });
}
