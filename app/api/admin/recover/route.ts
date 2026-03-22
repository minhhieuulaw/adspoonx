// One-time recovery endpoint: fetch data from all recent Apify runs into DB
import { NextRequest, NextResponse } from "next/server";
import { upsertAds } from "@/lib/crawler";

export const maxDuration = 300;

interface ApifyRun {
  id: string;
  status: string;
  stats?: { itemCount?: number };
  defaultDatasetId?: string;
}

function extractJobFromInput(input: Record<string, unknown>): { keyword: string; country: string } {
  try {
    const urls = input?.urls as Array<{ url: string }>;
    const url = new URL(urls?.[0]?.url ?? "");
    const country = url.searchParams.get("country") ?? "US";
    const keyword = url.searchParams.get("q") ?? "";
    return { keyword, country };
  } catch {
    return { keyword: "", country: "US" };
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.APIFY_API_TOKEN;
  if (!token) return NextResponse.json({ error: "No Apify token" }, { status: 500 });

  const ACTOR_ID = "curious_coder~facebook-ads-library-scraper";

  // 1. List recent runs (last 200)
  const runsRes = await fetch(
    `https://api.apify.com/v2/acts/${ACTOR_ID}/runs?token=${token}&limit=200&desc=true&status=SUCCEEDED,RUNNING,ABORTED`
  );
  if (!runsRes.ok) return NextResponse.json({ error: "Failed to list runs" }, { status: 500 });

  const { data: { items: runs } } = await runsRes.json() as { data: { items: ApifyRun[] } };

  console.log(`[recover] Found ${runs.length} runs to process`);

  let totalSaved = 0;
  let processed = 0;
  const errors: string[] = [];

  // 2. Process each run sequentially (avoid overwhelming DB)
  for (const run of runs) {
    if (!run.defaultDatasetId) continue;

    try {
      // Fetch run input to get keyword/country
      const inputRes = await fetch(
        `https://api.apify.com/v2/actor-runs/${run.id}?token=${token}`
      );
      const runDetail = await inputRes.json() as { data: { input?: Record<string, unknown> } };
      const job = extractJobFromInput(runDetail.data?.input ?? {});

      // Fetch dataset
      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${run.defaultDatasetId}/items?token=${token}&limit=500&format=json`
      );
      if (!dataRes.ok) continue;

      const items = await dataRes.json();
      if (!Array.isArray(items) || items.length === 0) continue;

      const saved = await upsertAds(items, job);
      totalSaved += saved;
      processed++;
      console.log(`[recover] run ${run.id} (${job.keyword}/${job.country}): ${saved} saved`);
    } catch (e) {
      errors.push(`${run.id}: ${e}`);
    }
  }

  return NextResponse.json({ ok: true, runs: runs.length, processed, totalSaved, errors: errors.length });
}
