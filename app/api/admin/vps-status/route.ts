/**
 * GET /api/admin/vps-status
 * Trả về tình trạng VPS jobs + crawl stats hôm nay.
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map(e => e.trim().toLowerCase());

async function assertAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  return !!(session && ADMIN_EMAILS.includes(email));
}

function getNextRunUtc(): string {
  const now = new Date();
  const currentH = now.getUTCHours() + now.getUTCMinutes() / 60;
  for (const h of [2, 10, 18]) {
    if (currentH < h) {
      return new Date(Date.UTC(
        now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), h, 0, 0
      )).toISOString();
    }
  }
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  return new Date(Date.UTC(
    tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 2, 0, 0
  )).toISOString();
}

export async function GET() {
  if (!await assertAdmin()) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = new Date();
  const todayStart = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  ));

  const [todayRuns, todayNewAds, todayClassified, totalUnclassified] = await Promise.all([
    prisma.workflowRun.findMany({
      where: { runAt: { gte: todayStart } },
      orderBy: { runAt: "desc" },
    }),
    prisma.ad.count({ where: { scrapedAt: { gte: todayStart } } }),
    // Ads scraped today that already have a real niche (not null, not "Other")
    prisma.ad.count({
      where: { scrapedAt: { gte: todayStart }, niche: { not: null, notIn: ["Other"] } },
    }),
    // Total ads that still need classification (null OR "Other")
    prisma.ad.count({
      where: { OR: [{ niche: null }, { niche: "Other" }] },
    }),
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
  });
}
