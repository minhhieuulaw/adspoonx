/**
 * GET /api/admin/vps-status
 * Trả về tình trạng VPS jobs + crawl stats hôm nay.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

const CRON_SECRET = process.env.CRON_SECRET ?? "";

async function assertAdmin(req: NextRequest): Promise<boolean> {
  // Allow CRON_SECRET as fallback (same pattern as backfill-videos)
  const authHeader = req.headers.get("authorization") ?? "";
  if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;

  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  return !!(session && ADMIN_EMAILS.includes(email));
}

function getNextRunUtc(): string {
  // Continuous runner V4: 6 cycles per day, ~4h each
  // Cycles start roughly at: 00, 04, 08, 12, 16, 20 UTC
  const now = new Date();
  const currentH = now.getUTCHours() + now.getUTCMinutes() / 60;
  for (const h of [0, 4, 8, 12, 16, 20]) {
    if (currentH < h) {
      return new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0, 0
      )).toISOString();
    }
  }
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return new Date(Date.UTC(
    tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 0, 0, 0
  )).toISOString();
}

export async function GET(req: NextRequest) {
  if (!await assertAdmin(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const todayStart = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  ));

  const [todayRuns, todayNewAds, todayClassified, totalUnclassified, totalAdsRaw, totalClassified, totalOnProduction] = await Promise.all([
    prisma.workflowRun.findMany({
      where: { runAt: { gte: todayStart } },
      orderBy: { runAt: "desc" },
    }),
    prisma.ad.count({ where: { scrapedAt: { gte: todayStart } } }),
    prisma.ad.count({
      where: { scrapedAt: { gte: todayStart }, niche: { not: null, notIn: ["Other"] } },
    }),
    prisma.ad.count({
      where: { OR: [{ niche: null }, { niche: "Other" }] },
    }),
    // Pipeline totals
    prisma.ad.count(),  // total raw ads crawled
    prisma.ad.count({ where: { niche: { not: null, notIn: ["Other"] } } }),  // total classified
    prisma.ad.count({ where: { niche: { not: null, notIn: ["Other"] }, isActive: true } }),  // total on production (active + classified)
  ]);

  return NextResponse.json({
    todayRuns,
    todayNewAds,
    todayClassified,
    totalUnclassified,
    totalNewToday:     todayRuns.reduce((s, r) => s + (r.newAds     ?? 0), 0),
    totalUpdatedToday: todayRuns.reduce((s, r) => s + (r.updatedAds ?? 0), 0),
    totalErrorsToday:  todayRuns.reduce((s, r) => s + (r.errors     ?? 0), 0),
    nextRun: getNextRunUtc(),
    lastRun: todayRuns[0] ?? null,
    // Pipeline totals (all-time)
    totalAdsRaw,
    totalClassified,
    totalOnProduction,
  });
}
