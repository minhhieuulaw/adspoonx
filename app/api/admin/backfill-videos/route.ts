/**
 * POST /api/admin/backfill-videos
 * Downloads videos from Facebook CDN and uploads to Cloudflare R2.
 * Processes in batches to avoid timeouts.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { downloadAndUploadVideo, R2_PUBLIC_PREFIXES } from "@/lib/r2";
import type * as Prisma from "@/lib/generated/prisma/internal/prismaNamespace";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim().toLowerCase());
const CRON_SECRET = process.env.CRON_SECRET ?? "";
const BATCH_SIZE = 10; // Process 10 ads per request to stay within timeout

/**
 * Pending = videoUrl is NULL or not matching ANY accepted R2 prefix. Excludes
 * `""` sentinel used to mark no-video / permanently failed ads.
 *
 * Historical bug: the filter used to be `NOT startsWith "https://pub-"` which
 * re-matched every ad on the custom domain `videos.adspoonx.com` — causing an
 * infinite re-upload loop. This helper uses the canonical prefix list.
 */
function pendingWhere(): Prisma.AdWhereInput {
  return {
    AND: [
      { NOT: { videoUrl: "" } },
      {
        OR: [
          { videoUrl: null },
          {
            AND: R2_PUBLIC_PREFIXES.map(prefix => ({
              NOT: { videoUrl: { startsWith: prefix } },
            })),
          },
        ],
      },
    ],
  };
}

export async function POST(req: NextRequest) {
  // Allow auth via session OR cron secret header
  const cronAuth = req.headers.get("authorization")?.replace("Bearer ", "") === CRON_SECRET && CRON_SECRET;
  if (!cronAuth) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase() ?? "";
    if (!session || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Find ads that still need R2 upload
  const ads = await prisma.ad.findMany({
    where: pendingWhere(),
    select: { adArchiveId: true, rawData: true },
    take: BATCH_SIZE,
    orderBy: { scrapedAt: "desc" }, // Newest first
  });

  if (ads.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, uploaded: 0, message: "No more ads to process" });
  }

  let uploaded = 0;
  let failed = 0;

  for (const ad of ads) {
    const raw = ad.rawData as Record<string, unknown> | null;
    if (!raw) continue;

    // Extract video URL from rawData
    const videoUrl = extractVideoFromRaw(raw);
    if (!videoUrl) {
      // Mark as no-video by setting videoUrl to empty string to skip next time
      await prisma.ad.update({
        where: { adArchiveId: ad.adArchiveId },
        data: { videoUrl: "" },
      }).catch(() => {});
      continue;
    }

    const r2Url = await downloadAndUploadVideo(videoUrl, ad.adArchiveId);
    if (r2Url) {
      await prisma.ad.update({
        where: { adArchiveId: ad.adArchiveId },
        data: { videoUrl: r2Url },
      });
      uploaded++;
    } else {
      // Mark failed so we don't retry endlessly
      await prisma.ad.update({
        where: { adArchiveId: ad.adArchiveId },
        data: { videoUrl: "" },
      }).catch(() => {});
      failed++;
    }
  }

  // Count remaining
  const remaining = await prisma.ad.count({ where: pendingWhere() });

  return NextResponse.json({
    ok: true,
    processed: ads.length,
    uploaded,
    failed,
    remaining,
  });
}

export async function GET(req: NextRequest) {
  const cronAuth = req.headers.get("authorization")?.replace("Bearer ", "") === CRON_SECRET && CRON_SECRET;
  if (!cronAuth) {
    const session = await auth();
    const email = session?.user?.email?.toLowerCase() ?? "";
    if (!session || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // withR2: ads whose videoUrl starts with ANY accepted R2 prefix
  const r2OrClause: Prisma.AdWhereInput = {
    OR: R2_PUBLIC_PREFIXES.map(prefix => ({ videoUrl: { startsWith: prefix } })),
  };

  const [total, withR2, withEmpty, withNull] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: r2OrClause }),
    prisma.ad.count({ where: { videoUrl: "" } }),
    prisma.ad.count({ where: { videoUrl: null } }),
  ]);

  return NextResponse.json({
    total,
    withR2Video: withR2,
    noVideo: withEmpty,
    pending: withNull,
    percentComplete: total > 0 ? Math.round((withR2 / total) * 100) : 0,
  });
}

function extractVideoFromRaw(raw: Record<string, unknown>): string | null {
  // Top-level videoUrl (from enriched crawler data)
  if (typeof raw.videoUrl === "string" && raw.videoUrl.length > 20) return raw.videoUrl;

  const snap = raw.snapshot as Record<string, unknown> | undefined;
  if (!snap) return null;

  // snapshot.videos[0]
  const videos = snap.videos as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(videos) && videos.length > 0) {
    const v = videos[0];
    if (typeof v.video_hd_url === "string" && v.video_hd_url) return v.video_hd_url;
    if (typeof v.video_sd_url === "string" && v.video_sd_url) return v.video_sd_url;
  }

  // snapshot.cards[0]
  const cards = snap.cards as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0) {
    const c = cards[0];
    if (typeof c.video_hd_url === "string" && c.video_hd_url) return c.video_hd_url;
    if (typeof c.video_sd_url === "string" && c.video_sd_url) return c.video_sd_url;
  }

  // snapshot direct
  if (typeof snap.video_hd_url === "string" && snap.video_hd_url) return snap.video_hd_url;
  if (typeof snap.video_sd_url === "string" && snap.video_sd_url) return snap.video_sd_url;

  return null;
}
