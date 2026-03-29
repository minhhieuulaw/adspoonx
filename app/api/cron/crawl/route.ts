// Vercel Cron endpoint — Hobby plan compatible (< 10s)
// Strategy: start all Apify runs with webhook callbacks, return immediately.
// Apify calls back /api/webhook/apify when each run completes.
import { NextRequest, NextResponse } from "next/server";
import { startAllRunsWithWebhooks, cleanOldAds, DEFAULT_CRAWL_JOBS } from "@/lib/crawler";

export const maxDuration = 60; // 7 batches × 10 jobs + 2s delays

export async function GET(req: NextRequest) {
  // DISABLED: tạm tắt auto-crawl để kiểm soát chi phí Apify
  if (process.env.CRON_DISABLED === "true") {
    return NextResponse.json({ ok: false, message: "Cron disabled" }, { status: 503 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = (process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const secret = process.env.CRON_SECRET ?? "";

  const [{ started, errors }, deleted] = await Promise.all([
    startAllRunsWithWebhooks(DEFAULT_CRAWL_JOBS, appUrl, secret),
    cleanOldAds(),
  ]);

  console.log(`[cron/crawl] Started ${started} Apify runs, ${errors} errors, ${deleted} old ads deleted`);

  return NextResponse.json({ ok: true, started, errors, deleted });
}
