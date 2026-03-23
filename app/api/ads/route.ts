import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserPlan, getLimits } from "@/lib/subscription";
import type { FbAd } from "@/lib/facebook-ads";

// ── Simple hash for deterministic shuffle ────────────────────────────────────

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return h;
}

// ── Search clause builder (parameterized, safe from injection) ───────────────

interface SearchParams {
  q: string;
  searchPage: string;
  searchBody: string;
  searchNiche: string;
  useRegex: boolean;
}

function buildSearchClauses(sp: SearchParams): { clauses: string[]; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  let idx = 3; // $1=country, $2=isActive already used

  const op = sp.useRegex ? "~*" : "ILIKE";
  const wrap = (v: string) => sp.useRegex ? v : `%${v}%`;

  // General search (q) — searches across all text fields
  if (sp.q) {
    idx++;
    const pQ = idx;
    clauses.push(`("pageName" ${op} $${pQ} OR "bodyText" ${op} $${pQ} OR "title" ${op} $${pQ} OR "description" ${op} $${pQ})`);
    values.push(wrap(sp.q));
  }

  // Field-specific search
  if (sp.searchPage) {
    idx++;
    clauses.push(`"pageName" ${op} $${idx}`);
    values.push(wrap(sp.searchPage));
  }
  if (sp.searchBody) {
    idx++;
    clauses.push(`("bodyText" ${op} $${idx} OR "title" ${op} $${idx} OR "description" ${op} $${idx})`);
    values.push(wrap(sp.searchBody));
  }
  if (sp.searchNiche) {
    idx++;
    clauses.push(`"niche" ${op} $${idx}`);
    values.push(wrap(sp.searchNiche));
  }

  return { clauses, values };
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan   = await getUserPlan(session.user.id);
  const limits = getLimits(plan);

  const { searchParams } = new URL(req.url);
  const q           = (searchParams.get("q") ?? "").trim();
  const searchPage  = (searchParams.get("searchPage") ?? "").trim();
  const searchBody  = (searchParams.get("searchBody") ?? "").trim();
  const searchNiche = (searchParams.get("searchNiche") ?? "").trim();
  const useRegex    = searchParams.get("useRegex") === "1";
  const country     = searchParams.get("country") ?? "US";
  const status      = searchParams.get("status") ?? "ACTIVE";
  const mediaType   = searchParams.get("mediaType");

  if (mediaType === "video" && !limits.canFilterVideo) {
    return NextResponse.json(
      { error: "upgrade_required", plan, feature: "video_filter" },
      { status: 403 }
    );
  }

  // Validate regex patterns early to avoid DB errors
  if (useRegex) {
    for (const pattern of [q, searchPage, searchBody, searchNiche]) {
      if (pattern) {
        try { new RegExp(pattern); } catch {
          return NextResponse.json({ error: "Invalid regex pattern", pattern }, { status: 400 });
        }
      }
    }
  }

  const page  = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const requestedLimit = Math.max(1, Number(searchParams.get("limit") ?? "40"));
  const limit = Math.min(500, requestedLimit);
  const isActive = status !== "INACTIVE";
  const seed = Number(searchParams.get("seed")) || Math.floor(Math.random() * 1_000_000);
  const seedStr = String(seed);

  const sp: SearchParams = { q, searchPage, searchBody, searchNiche, useRegex };
  const { clauses: searchClauses, values: searchValues } = buildSearchClauses(sp);

  // Build WHERE
  const whereParts = [`country = $1`, `"isActive" = $2`];

  // Media type filter
  const videoExpr = `COALESCE("rawData"->>'videoUrl', "rawData"->'snapshot'->>'video_hd_url', "rawData"->'snapshot'->>'video_sd_url')`;
  if (mediaType === "video") {
    whereParts.push(`${videoExpr} IS NOT NULL`);
  } else if (mediaType === "image") {
    whereParts.push(`${videoExpr} IS NULL AND "imageUrl" IS NOT NULL`);
  }

  // Search clauses
  whereParts.push(...searchClauses);

  const whereSQL = whereParts.join(" AND ");

  const queryParams = [country, isActive, ...searchValues];

  type RawAd = {
    id: string; adArchiveId: string; pageId: string | null; pageName: string | null;
    bodyText: string | null; title: string | null; description: string | null;
    imageUrl: string | null; adLibraryUrl: string | null; platforms: string[];
    country: string; isActive: boolean; startDate: Date | null; endDate: Date | null;
    niche: string | null; rawData: Record<string, unknown>; scrapedAt: Date;
  };

  try {
    const [rows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<RawAd[]>(
        `SELECT DISTINCT ON (COALESCE("pageId",''), COALESCE("bodyText",''), COALESCE("imageUrl",'')) *
         FROM "Ad" WHERE ${whereSQL}
         ORDER BY COALESCE("pageId",''), COALESCE("bodyText",''), COALESCE("imageUrl",''), "scrapedAt" DESC`,
        country, isActive, ...searchValues,
      ).then(rows => {
        // Video-first: sort videos before images, then shuffle within each group
        const hasVideo = (r: RawAd) => {
          const rd = r.rawData as Record<string, unknown> | null;
          if (!rd) return false;
          if (rd["videoUrl"]) return true;
          const snap = rd["snapshot"] as Record<string, unknown> | undefined;
          if (!snap) return false;
          return !!(snap["video_hd_url"] || snap["video_sd_url"]);
        };
        rows.sort((a, b) => {
          const va = hasVideo(a) ? 0 : 1;
          const vb = hasVideo(b) ? 0 : 1;
          if (va !== vb) return va - vb; // videos first
          const ha = simpleHash(a.adArchiveId + seedStr);
          const hb = simpleHash(b.adArchiveId + seedStr);
          return ha - hb;
        });
        return rows.slice(0, limit);
      }),
      prisma.$queryRawUnsafe<[{ count: bigint }]>(
        `SELECT COUNT(*) FROM (
          SELECT DISTINCT ON (COALESCE("pageId",''), COALESCE("bodyText",''), COALESCE("imageUrl",'')) 1
          FROM "Ad" WHERE ${whereSQL}
          ORDER BY COALESCE("pageId",''), COALESCE("bodyText",''), COALESCE("imageUrl",''), "scrapedAt" DESC
        ) t`,
        country, isActive, ...searchValues,
      ),
    ]);

    const total      = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / limit);
    const data: FbAd[] = rows.map(ad => mapAdToFbAd(ad));

    return NextResponse.json({
      data, total, page, totalPages,
      hasMore: page < totalPages,
      plan, maxResults: limits.maxResults, seed,
    });
  } catch (err) {
    console.error("[api/ads] query error:", err);
    // If regex error, return friendly message
    const msg = String(err);
    if (msg.includes("invalid regular expression")) {
      return NextResponse.json({ error: "Invalid regex pattern" }, { status: 400 });
    }
    return NextResponse.json({ error: "DB error", detail: msg }, { status: 500 });
  }
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

function extractLinkUrl(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  if (typeof snap["link_url"] === "string" && snap["link_url"]) return snap["link_url"] as string;
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0) {
    const link = cards[0]["link_url"];
    if (typeof link === "string" && link) return link as string;
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
  if (typeof r["videoUrl"] === "string" && r["videoUrl"]) return r["videoUrl"] as string;
  const snap = r["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const videos = snap["videos"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(videos) && videos.length > 0) {
    const v = videos[0];
    if (typeof v["video_hd_url"] === "string" && v["video_hd_url"]) return v["video_hd_url"] as string;
    if (typeof v["video_sd_url"] === "string" && v["video_sd_url"]) return v["video_sd_url"] as string;
  }
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0) {
    const c = cards[0];
    if (typeof c["video_hd_url"] === "string" && c["video_hd_url"]) return c["video_hd_url"] as string;
    if (typeof c["video_sd_url"] === "string" && c["video_sd_url"]) return c["video_sd_url"] as string;
  }
  if (typeof snap["video_hd_url"] === "string" && snap["video_hd_url"]) return snap["video_hd_url"] as string;
  if (typeof snap["video_sd_url"] === "string" && snap["video_sd_url"]) return snap["video_sd_url"] as string;
  return undefined;
}

function extractThumbnailUrl(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const r = rawData as Record<string, unknown>;
  if (typeof r["thumbnailUrl"] === "string" && r["thumbnailUrl"]) return r["thumbnailUrl"] as string;
  const snap = r["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const images = snap["images"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    const img = images[0];
    if (typeof img["resized_image_url"] === "string" && img["resized_image_url"]) return img["resized_image_url"] as string;
    if (typeof img["original_image_url"] === "string" && img["original_image_url"]) return img["original_image_url"] as string;
  }
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
  niche: string | null; rawData: unknown;
};

const DS_PATTERNS = [
  /\b(dropshipping|drop.?ship|aliexpress|dhgate|cj.?dropship)\b/i,
  /\b(free.?shipping|ships? from (china|warehouse))\b/i,
  /\b(limited.?stock|selling.?fast|almost.?sold.?out)\b/i,
  /\b(order.?now.{0,5}(today|limited)|get.?yours.?now)\b/i,
  /\b([5-9][0-9]%.?off|buy.?[23].?get)\b/i,
  /\b(trending|viral|tiktok.?(famous|made me buy))\b/i,
];

function computeDsTag(ad: PrismaAd): "dropshipping" | "brand" | undefined {
  const text = [ad.bodyText ?? "", ad.title ?? "", ad.description ?? "", ad.pageName ?? ""].join(" ");
  let score = 0;
  for (const p of DS_PATTERNS) { if (p.test(text)) score += 18; }
  if (ad.platforms.some(p => p === "audience_network")) score += 10;
  if (score >= 40) return "dropshipping";
  if (score < 20) return "brand";
  return undefined;
}

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
    link_url:                      extractLinkUrl(ad.rawData),
    niche:                         ad.niche ?? undefined,
    ds_tag:                        computeDsTag(ad),
  };
}
