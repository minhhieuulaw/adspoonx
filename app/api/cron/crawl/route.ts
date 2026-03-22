// Vercel Cron endpoint — chạy tự động mỗi 4 tiếng
// vercel.json schedule: "0 */4 * * *"
// Chạy toàn bộ 40 jobs song song, tận dụng 128 concurrent runs của Scale plan.
// Parallel start → single 55s wait → fetch all → upsert.
// Total time: ~75s + upsert time, well within maxDuration 300s.
import { NextRequest, NextResponse } from "next/server";
import { crawlBatch, cleanOldAds, DEFAULT_CRAWL_JOBS } from "@/lib/crawler";

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Chạy toàn bộ jobs — Scale plan hỗ trợ 128 concurrent runs
  const jobs = DEFAULT_CRAWL_JOBS;

  console.log(`[cron/crawl] Starting all ${jobs.length} jobs in parallel`);

  const [results, deleted] = await Promise.all([
    crawlBatch(jobs),
    cleanOldAds(),
  ]);

  const totalSaved = results.reduce((s, r) => s + r.saved, 0);
  const errors     = results.filter(r => r.error);

  console.log(`[cron/crawl] Done: ${totalSaved} ads saved, ${deleted} old ads deleted`);

  return NextResponse.json({
    ok: true,
    totalSaved,
    deleted,
    results,
    errors: errors.length,
  });
}
