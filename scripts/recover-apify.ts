/**
 * Recovery script — chạy local để lấy data từ tất cả Apify runs về Supabase
 * Usage: npx tsx scripts/recover-apify.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!;
const ACTOR_ID    = "curious_coder~facebook-ads-library-scraper";
const BASE        = "https://api.apify.com/v2";
const CONCURRENCY = 10; // process 10 runs at a time

function makeClient() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
  const adapter = new PrismaPg({ connectionString, ssl: { rejectUnauthorized: false } });
  return new PrismaClient({ adapter, log: ["error"] });
}

interface ApifyRun {
  id: string;
  defaultDatasetId?: string;
}

function extractJob(input: Record<string, unknown>) {
  try {
    const url = new URL((input?.urls as Array<{url:string}>)?.[0]?.url ?? "");
    return { keyword: url.searchParams.get("q") ?? "", country: url.searchParams.get("country") ?? "US" };
  } catch { return { keyword: "", country: "US" }; }
}

async function upsertAds(prisma: PrismaClient, items: Record<string, unknown>[], job: {keyword:string; country:string}) {
  let saved = 0;
  for (const raw of items) {
    const adArchiveId = raw.ad_archive_id as string | undefined;
    if (!adArchiveId) continue;
    const snap      = raw.snapshot as Record<string,unknown> | undefined;
    const cards     = snap?.cards as Array<Record<string,unknown>> | undefined;
    const firstCard = cards?.[0];
    const bodyText  = (cards?.map((c:Record<string,unknown>) => c.body).filter(Boolean) as string[]).join(" | ")
                   || (snap?.body as Record<string,unknown>)?.text as string | null || null;
    const imageUrl  = (firstCard?.resized_image_url ?? firstCard?.original_image_url ?? null) as string | null;
    const videoUrl  = (firstCard?.video_hd_url ?? firstCard?.video_sd_url ?? snap?.video_hd_url ?? null) as string | null;
    const platforms = Array.isArray(raw.publisher_platform) ? raw.publisher_platform as string[] : [];
    try {
      await prisma.ad.upsert({
        where:  { adArchiveId },
        create: {
          adArchiveId,
          pageId:       (raw.page_id as string) ?? null,
          pageName:     (raw.page_name as string) ?? (snap?.page_name as string) ?? null,
          bodyText, imageUrl,
          title:        ((firstCard?.title ?? snap?.title) as string) ?? null,
          description:  (firstCard?.link_description as string) ?? null,
          adLibraryUrl: (raw.ad_library_url as string) ?? null,
          platforms,
          country:      job.country,
          isActive:     (raw.is_active as boolean) ?? true,
          startDate:    raw.start_date ? new Date((raw.start_date as number) * 1000) : null,
          endDate:      raw.end_date   ? new Date((raw.end_date   as number) * 1000) : null,
          rawData:      { ...raw, videoUrl, thumbnailUrl: imageUrl } as object,
        },
        update: {
          isActive:  (raw.is_active as boolean) ?? true,
          imageUrl:  imageUrl ?? undefined,
          scrapedAt: new Date(),
          rawData:   { ...raw, videoUrl, thumbnailUrl: imageUrl } as object,
        },
      });
      saved++;
    } catch { /* skip duplicate/bad data */ }
  }
  return saved;
}

async function processRun(prisma: PrismaClient, run: ApifyRun): Promise<{ saved: number; keyword: string; country: string; items: number }> {
  const runRes  = await fetch(`${BASE}/actor-runs/${run.id}?token=${APIFY_TOKEN}`);
  const runData = await runRes.json() as { data: { input?: Record<string,unknown> } };
  const job     = extractJob(runData.data?.input ?? {});

  const dsRes = await fetch(`${BASE}/datasets/${run.defaultDatasetId}/items?token=${APIFY_TOKEN}&limit=500&format=json`);
  const items = await dsRes.json() as Record<string,unknown>[];
  if (!Array.isArray(items) || items.length === 0) return { saved: 0, ...job, items: 0 };

  const saved = await upsertAds(prisma, items, job);
  return { saved, ...job, items: items.length };
}

async function main() {
  if (!APIFY_TOKEN) { console.error("APIFY_API_TOKEN not set"); process.exit(1); }

  const prisma = makeClient();
  const before = await prisma.ad.count();
  console.log(`DB connected. Ads before: ${before}`);

  console.log("Fetching Apify runs...");
  const res  = await fetch(`${BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=200&desc=true`);
  const data = await res.json() as { data?: { items: ApifyRun[] }; error?: unknown };
  if (data.error) { console.error("Apify API error:", data.error); process.exit(1); }

  const runs = data.data!.items.filter(r => r.defaultDatasetId);
  console.log(`Found ${runs.length} runs with data. Processing ${CONCURRENCY} at a time...\n`);

  let totalSaved = 0, processed = 0;

  // Process in chunks of CONCURRENCY
  for (let i = 0; i < runs.length; i += CONCURRENCY) {
    const chunk = runs.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(chunk.map(run => processRun(prisma, run)));

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      processed++;
      if (r.status === "fulfilled") {
        totalSaved += r.value.saved;
        console.log(`  [${processed}/${runs.length}] ${chunk[j].id} (${r.value.keyword}/${r.value.country}): ${r.value.saved}/${r.value.items} saved`);
      } else {
        console.log(`  [${processed}/${runs.length}] ${chunk[j].id}: ERROR - ${String(r.reason).split("\n")[0]}`);
      }
    }
    console.log(`  --- Chunk done. Total saved so far: ${totalSaved} ---\n`);
  }

  const after = await prisma.ad.count();
  console.log(`\nDone! ${processed} runs processed.`);
  console.log(`Ads: ${before} → ${after} (+${after - before} new)`);
  console.log(`Total upserted (new+updated): ${totalSaved}`);
  await prisma.$disconnect();
}

main().catch(console.error);
