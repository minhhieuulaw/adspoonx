import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Group ads by pageName, count ads per store, sort by most ads
  const grouped = await prisma.ad.groupBy({
    by: ["pageName", "pageId"],
    _count: { adArchiveId: true },
    where: { isActive: true, pageName: { not: null } },
    orderBy: { _count: { adArchiveId: "desc" } },
    take: 30,
  });

  // Get a sample image + adLibraryUrl + platforms for each store
  const storeDetails = await Promise.all(
    grouped.map(async (g) => {
      const sample = await prisma.ad.findFirst({
        where: { pageName: g.pageName, isActive: true },
        select: { imageUrl: true, adLibraryUrl: true, platforms: true },
        orderBy: { scrapedAt: "desc" },
      });
      return {
        pageName:     g.pageName ?? "Unknown",
        pageId:       g.pageId,
        adCount:      g._count.adArchiveId,
        imageUrl:     sample?.imageUrl ?? null,
        adLibraryUrl: sample?.adLibraryUrl ?? null,
        platforms:    sample?.platforms ?? [],
      };
    })
  );

  return NextResponse.json({ data: storeDetails });
}
