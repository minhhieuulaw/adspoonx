import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, getLimits } from "@/lib/subscription";
import type { FbAd } from "@/lib/facebook-ads";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Enforce plan limits
  const plan   = await getUserPlan(session.user.id);
  const limits = getLimits(plan);

  const { searchParams } = new URL(req.url);
  const q         = (searchParams.get("q") ?? "").trim();
  const country   = searchParams.get("country") ?? "US";
  const status    = searchParams.get("status") ?? "ACTIVE";
  const mediaType = searchParams.get("mediaType"); // "video" | null

  // Block video filter for free users
  if (mediaType === "video" && !limits.canFilterVideo) {
    return NextResponse.json(
      { error: "upgrade_required", plan, feature: "video_filter" },
      { status: 403 }
    );
  }

  const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = Math.min(limits.maxResults, Math.max(1, Number(searchParams.get("limit") ?? "20")));
  const skip  = (page - 1) * limit;
  const isActive = status !== "INACTIVE";

  // ── Video filter via raw SQL (JSON field query) ─────────────────────────────
  if (mediaType === "video") {
    type RawAd = {
      id: string; adArchiveId: string; pageId: string | null; pageName: string | null;
      bodyText: string | null; title: string | null; description: string | null;
      imageUrl: string | null; adLibraryUrl: string | null; platforms: string[];
      country: string; isActive: boolean; startDate: Date | null; endDate: Date | null;
      rawData: Record<string, unknown>; scrapedAt: Date;
    };

    try {
      // $queryRaw tagged template — parameterised, safe from injection
      const [videoAds, countResult] = await Promise.all([
        q
          ? prisma.$queryRaw<RawAd[]>`
              SELECT * FROM "Ad"
              WHERE country = ${country}
                AND "isActive" = ${isActive}
                AND COALESCE(
                  "rawData"->>'videoUrl',
                  "rawData"->>'video_hd_url',
                  "rawData"->>'video_sd_url',
                  "rawData"->'snapshot'->>'video_hd_url',
                  "rawData"->'snapshot'->>'video_sd_url'
                ) IS NOT NULL
                AND ("pageName" ILIKE ${`%${q}%`} OR "bodyText" ILIKE ${`%${q}%`})
              ORDER BY "scrapedAt" DESC
              LIMIT ${limit} OFFSET ${skip}
            `
          : prisma.$queryRaw<RawAd[]>`
              SELECT * FROM "Ad"
              WHERE country = ${country}
                AND "isActive" = ${isActive}
                AND COALESCE(
                  "rawData"->>'videoUrl',
                  "rawData"->>'video_hd_url',
                  "rawData"->>'video_sd_url',
                  "rawData"->'snapshot'->>'video_hd_url',
                  "rawData"->'snapshot'->>'video_sd_url'
                ) IS NOT NULL
              ORDER BY "scrapedAt" DESC
              LIMIT ${limit} OFFSET ${skip}
            `,
        q
          ? prisma.$queryRaw<[{ count: bigint }]>`
              SELECT COUNT(*) FROM "Ad"
              WHERE country = ${country}
                AND "isActive" = ${isActive}
                AND COALESCE(
                  "rawData"->>'videoUrl',
                  "rawData"->>'video_hd_url',
                  "rawData"->>'video_sd_url',
                  "rawData"->'snapshot'->>'video_hd_url',
                  "rawData"->'snapshot'->>'video_sd_url'
                ) IS NOT NULL
                AND ("pageName" ILIKE ${`%${q}%`} OR "bodyText" ILIKE ${`%${q}%`})
            `
          : prisma.$queryRaw<[{ count: bigint }]>`
              SELECT COUNT(*) FROM "Ad"
              WHERE country = ${country}
                AND "isActive" = ${isActive}
                AND COALESCE(
                  "rawData"->>'videoUrl',
                  "rawData"->>'video_hd_url',
                  "rawData"->>'video_sd_url',
                  "rawData"->'snapshot'->>'video_hd_url',
                  "rawData"->'snapshot'->>'video_sd_url'
                ) IS NOT NULL
            `,
      ]);

      const total      = Number(countResult[0]?.count ?? 0);
      const totalPages = Math.ceil(total / limit);
      const data: FbAd[] = videoAds.map(ad => mapAdToFbAd(ad));
      return NextResponse.json({ data, total, page, totalPages, hasMore: page < totalPages, plan, maxResults: limits.maxResults });
    } catch (err) {
      console.error("[api/ads] video query error:", err);
      return NextResponse.json({ error: "DB error", detail: String(err) }, { status: 500 });
    }
  }

  // ── Standard query ──────────────────────────────────────────────────────────
  const where = {
    country,
    isActive,
    ...(q
      ? {
          OR: [
            { pageName:    { contains: q, mode: "insensitive" as const } },
            { bodyText:    { contains: q, mode: "insensitive" as const } },
            { title:       { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  let ads, total;
  try {
    [ads, total] = await Promise.all([
      prisma.ad.findMany({ where, orderBy: { scrapedAt: "desc" }, take: limit, skip }),
      prisma.ad.count({ where }),
    ]);
  } catch (err) {
    console.error("[api/ads] DB query error:", err);
    return NextResponse.json({ error: "DB error", detail: String(err) }, { status: 500 });
  }

  const totalPages = Math.ceil(total / limit);
  const data: FbAd[] = ads.map(ad => mapAdToFbAd(ad));
  return NextResponse.json({ data, total, page, totalPages, hasMore: page < totalPages, plan, maxResults: limits.maxResults });
}

// ── Helpers ─────────────────────────────────────────────────────────────────────

function extractPageProfilePicture(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (typeof snap?.["page_profile_picture_url"] === "string" && snap["page_profile_picture_url"]) {
    return snap["page_profile_picture_url"] as string;
  }
  return undefined;
}

function extractCtaText(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0) {
    const cta = cards[0]["cta_text"];
    if (typeof cta === "string" && cta) return cta;
  }
  if (typeof snap["cta_text"] === "string" && snap["cta_text"]) return snap["cta_text"] as string;
  return undefined;
}

function extractVideoUrl(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const r = rawData as Record<string, unknown>;
  // Top-level enriched field (stored by crawler)
  if (typeof r["videoUrl"] === "string" && r["videoUrl"]) return r["videoUrl"] as string;
  const snap = r["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  // snapshot.videos[] array (main location)
  const videos = snap["videos"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(videos) && videos.length > 0) {
    const v = videos[0];
    if (typeof v["video_hd_url"] === "string" && v["video_hd_url"]) return v["video_hd_url"] as string;
    if (typeof v["video_sd_url"] === "string" && v["video_sd_url"]) return v["video_sd_url"] as string;
  }
  // snapshot.cards[0] video (carousel ads)
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0) {
    const c = cards[0];
    if (typeof c["video_hd_url"] === "string" && c["video_hd_url"]) return c["video_hd_url"] as string;
    if (typeof c["video_sd_url"] === "string" && c["video_sd_url"]) return c["video_sd_url"] as string;
  }
  // snapshot direct fields
  if (typeof snap["video_hd_url"] === "string" && snap["video_hd_url"]) return snap["video_hd_url"] as string;
  if (typeof snap["video_sd_url"] === "string" && snap["video_sd_url"]) return snap["video_sd_url"] as string;
  return undefined;
}

function extractThumbnailUrl(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const r = rawData as Record<string, unknown>;
  // Top-level enriched field
  if (typeof r["thumbnailUrl"] === "string" && r["thumbnailUrl"]) return r["thumbnailUrl"] as string;
  const snap = r["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  // snapshot.images[] array (main location)
  const images = snap["images"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const img = images[0];
    if (typeof img["resized_image_url"] === "string" && img["resized_image_url"]) return img["resized_image_url"] as string;
    if (typeof img["original_image_url"] === "string" && img["original_image_url"]) return img["original_image_url"] as string;
  }
  // snapshot.cards[0] image (carousel)
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0) {
    const c = cards[0];
    if (typeof c["resized_image_url"] === "string" && c["resized_image_url"]) return c["resized_image_url"] as string;
    if (typeof c["original_image_url"] === "string" && c["original_image_url"]) return c["original_image_url"] as string;
  }
  return undefined;
}

type PrismaAd = {
  adArchiveId: string; pageId: string | null; pageName: string | null;
  bodyText: string | null; title: string | null; description: string | null;
  imageUrl: string | null; adLibraryUrl: string | null; platforms: string[];
  country: string; isActive: boolean; startDate: Date | null; endDate: Date | null;
  rawData: unknown;
};

function mapAdToFbAd(ad: PrismaAd): FbAd {
  return {
    id:                            ad.adArchiveId,
    page_id:                       ad.pageId ?? undefined,
    page_name:                     ad.pageName ?? undefined,
    ad_creative_bodies:            ad.bodyText ? [ad.bodyText] : undefined,
    ad_creative_link_titles:       ad.title ? [ad.title] : undefined,
    ad_creative_link_descriptions: ad.description ? [ad.description] : undefined,
    ad_snapshot_url:               ad.adLibraryUrl ?? undefined,
    image_url:                     ad.imageUrl ?? extractThumbnailUrl(ad.rawData) ?? undefined,
    video_url:                     extractVideoUrl(ad.rawData),
    thumbnail_url:                 extractThumbnailUrl(ad.rawData) ?? ad.imageUrl ?? undefined,
    publisher_platforms:           ad.platforms.length ? ad.platforms : undefined,
    ad_delivery_start_time:        ad.startDate?.toISOString(),
    ad_delivery_stop_time:         ad.endDate?.toISOString(),
    is_active:                     ad.isActive,
    country:                       ad.country,
    countries:                     [ad.country],
    page_profile_picture_url:      extractPageProfilePicture(ad.rawData),
    cta_text:                      extractCtaText(ad.rawData),
  };
}
