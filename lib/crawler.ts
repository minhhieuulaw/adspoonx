/**
 * Crawler service — Apify → PostgreSQL (Supabase)
 *
 * Strategy: start all runs IN PARALLEL → single wait → fetch all datasets at once
 * Faster than sequential: 20 jobs × 45s wait → ~60s total (not 20×30s = 600s)
 */

import { prisma } from "./prisma";
import { detectNiche, type NicheInput } from "./niche-detect";
import { downloadAndUploadVideo } from "./r2";
import { isProductAd } from "./product-filter";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID   = "curious_coder~facebook-ads-library-scraper";
const MAX_RESULTS_PER_JOB = 300;
const WAIT_MS    = 55_000; // 55s for actor to accumulate data

// ─── Job definitions ────────────────────────────────────────────────────────

export interface CrawlJob {
  keyword: string;
  country: string;
}

export const DEFAULT_CRAWL_JOBS: CrawlJob[] = [
  // ── US (10 jobs) — Problem-solving + High-margin products ─────
  { keyword: "posture corrector",   country: "US" },
  { keyword: "massage gun",         country: "US" },
  { keyword: "LED facial device",   country: "US" },
  { keyword: "pet camera",          country: "US" },
  { keyword: "wireless charger",    country: "US" },
  { keyword: "smart home gadget",   country: "US" },
  { keyword: "hair removal device", country: "US" },
  { keyword: "portable projector",  country: "US" },
  { keyword: "jewelry handmade",    country: "US" },
  { keyword: "supplement protein",  country: "US" },

  // ── AU (7 jobs) — Outdoor + Fitness + Pet ─────────────────────
  { keyword: "camping gear",        country: "AU" },
  { keyword: "fitness recovery",    country: "AU" },
  { keyword: "pet wellness",        country: "AU" },
  { keyword: "skincare serum",      country: "AU" },
  { keyword: "home organizer",      country: "AU" },
  { keyword: "wireless earbuds",    country: "AU" },
  { keyword: "yoga mat",            country: "AU" },

  // ── EU — GB (5 jobs) ──────────────────────────────────────────
  { keyword: "LED strip lights",    country: "GB" },
  { keyword: "beauty device",       country: "GB" },
  { keyword: "kitchen gadget",      country: "GB" },
  { keyword: "pet toy",             country: "GB" },
  { keyword: "phone accessory",     country: "GB" },

  // ── EU — DE (4 jobs) ──────────────────────────────────────────
  { keyword: "smart home",          country: "DE" },
  { keyword: "fitness tracker",     country: "DE" },
  { keyword: "eco friendly product", country: "DE" },
  { keyword: "hair care device",    country: "DE" },

  // ── EU — FR (3 jobs) ──────────────────────────────────────────
  { keyword: "skincare routine",    country: "FR" },
  { keyword: "home decor LED",      country: "FR" },
  { keyword: "bijoux artisanal",    country: "FR" },

  // ── CA (5 jobs) ───────────────────────────────────────────────
  { keyword: "home office gadget",  country: "CA" },
  { keyword: "outdoor gear",        country: "CA" },
  { keyword: "pet supplies",        country: "CA" },
  { keyword: "massage roller",      country: "CA" },
  { keyword: "supplement vitamin",  country: "CA" },

  // ── BR (5 jobs) — Beauty Tech + Gaming HOT market ─────────────
  { keyword: "LED facial",          country: "BR" },
  { keyword: "gaming RGB",          country: "BR" },
  { keyword: "hair removal",        country: "BR" },
  { keyword: "fitness banda",       country: "BR" },
  { keyword: "pet acessorio",       country: "BR" },

  // ── MX (5 jobs) — Growing e-commerce market ───────────────────
  { keyword: "gadget cocina",       country: "MX" },
  { keyword: "belleza LED",         country: "MX" },
  { keyword: "fitness accesorio",   country: "MX" },
  { keyword: "mascota juguete",     country: "MX" },
  { keyword: "organizador hogar",   country: "MX" },
];

// ─── Apify helpers ──────────────────────────────────────────────────────────

function buildUrl(job: CrawlJob): string {
  return (
    `https://www.facebook.com/ads/library/` +
    `?active_status=active&ad_type=all&country=${job.country}` +
    `&q=${encodeURIComponent(job.keyword)}&search_type=keyword_unordered`
  );
}

async function startRun(job: CrawlJob, token: string, webhookUrl?: string): Promise<string> {
  const body: Record<string, unknown> = {
    urls: [{ url: buildUrl(job) }],
    maxResults: MAX_RESULTS_PER_JOB,
  };
  if (webhookUrl) {
    body.webhooks = [{ eventTypes: ["ACTOR.RUN.SUCCEEDED"], requestUrl: webhookUrl }];
  }
  const res = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}&memory=512`,
    {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Start run failed: ${res.status}`);
  const { data } = await res.json() as { data: { id: string } };
  return data.id;
}

async function fetchDataset(runId: string, token: string): Promise<ApifyRawAd[]> {
  const res = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${token}&limit=${MAX_RESULTS_PER_JOB}&format=json`
  );
  if (!res.ok) return [];
  return (await res.json()) as ApifyRawAd[];
}

function abortRun(runId: string, token: string) {
  fetch(`${APIFY_BASE}/actor-runs/${runId}/abort?token=${token}`, { method: "POST" })
    .catch(() => null);
}

// ─── Single job crawl ────────────────────────────────────────────────────────

export async function crawlAndStore(job: CrawlJob): Promise<number> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not configured");

  const runId = await startRun(job, token);
  await new Promise<void>(r => setTimeout(r, WAIT_MS));
  const items = await fetchDataset(runId, token);
  abortRun(runId, token);
  return upsertAds(items, job);
}

// ─── Parallel batch crawl (used by cron) ────────────────────────────────────

export interface BatchResult {
  job: string;
  saved: number;
  error?: string;
}

export async function crawlBatch(jobs: CrawlJob[]): Promise<BatchResult[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not configured");

  // 1. Start all runs in parallel
  const runResults = await Promise.allSettled(jobs.map(j => startRun(j, token)));

  // 2. Single wait for all actors to accumulate data
  await new Promise<void>(r => setTimeout(r, WAIT_MS));

  // 3. Fetch all datasets + abort all runs in parallel
  const outcomes = await Promise.allSettled(
    runResults.map(async (r, i) => {
      if (r.status === "rejected") throw new Error(r.reason as string);
      const runId = r.value;
      const [items] = await Promise.all([
        fetchDataset(runId, token),
        Promise.resolve(abortRun(runId, token)),
      ]);
      return upsertAds(items, jobs[i]);
    })
  );

  return outcomes.map((o, i) => ({
    job:   `${jobs[i].keyword}/${jobs[i].country}`,
    saved: o.status === "fulfilled" ? o.value : 0,
    error: o.status === "rejected"  ? String(o.reason) : undefined,
  }));
}

// ─── Upsert ads into DB ──────────────────────────────────────────────────────

// ─── Webhook-based approach: start all runs, return quickly ─────────────────

export async function startAllRunsWithWebhooks(
  jobs: CrawlJob[],
  appUrl: string,
  secret: string
): Promise<{ started: number; errors: number }> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN not configured");

  const results = await Promise.allSettled(
    jobs.map(job => {
      const webhookUrl =
        `${appUrl}/api/webhook/apify` +
        `?secret=${encodeURIComponent(secret)}` +
        `&keyword=${encodeURIComponent(job.keyword)}` +
        `&country=${job.country}`;
      return startRun(job, token, webhookUrl);
    })
  );

  return {
    started: results.filter(r => r.status === "fulfilled").length,
    errors:  results.filter(r => r.status === "rejected").length,
  };
}

export async function upsertAds(items: ApifyRawAd[], job: CrawlJob): Promise<number> {
  let saved = 0;

  for (const raw of items) {
    const adArchiveId = raw.ad_archive_id;
    if (!adArchiveId) continue;

    const snap      = raw.snapshot;
    const firstCard = snap?.cards?.[0];

    const bodyText =
      (snap?.cards?.map(c => c.body).filter(Boolean) as string[]).join(" | ") ||
      snap?.body?.text || null;

    // Thumbnail: cards → snapshot.images[] → snapshot direct
    const imageUrl =
      firstCard?.resized_image_url ||
      firstCard?.original_image_url ||
      snap?.images?.[0]?.resized_image_url ||
      snap?.images?.[0]?.original_image_url ||
      null;

    // Video URL: cards → snapshot.videos[] → snapshot direct
    const videoUrl =
      firstCard?.video_hd_url ||
      firstCard?.video_sd_url ||
      snap?.videos?.[0]?.video_hd_url ||
      snap?.videos?.[0]?.video_sd_url ||
      snap?.video_hd_url ||
      snap?.video_sd_url ||
      null;

    // ── Quality filter (thống nhất 2026-03-25) ──────────────────────────────
    // Phải có: (1) pageName, (2) bodyText >= 10 ký tự, (3) media, (4) CTA hợp lệ
    const pageName = raw.page_name ?? snap?.page_name ?? null;
    const hasMedia = !!(imageUrl || videoUrl);
    const hasBody  = !!(bodyText && bodyText.trim().length >= 10);

    const ctaRaw =
      firstCard?.cta_text ??
      (snap?.cards?.[0] as { cta_text?: string } | undefined)?.cta_text ??
      null;
    const ALLOWED_CTA = ["shop now", "learn more", "order now"];
    const hasCta = ctaRaw ? ALLOWED_CTA.includes(ctaRaw.trim().toLowerCase()) : false;

    if (!pageName || !hasMedia || !hasBody || !hasCta) continue;

    // Product ad filter — reject service/political/charity/app ads
    if (!isProductAd(raw as unknown as Record<string, unknown>)) continue;

    // Store enriched rawData so extractors in api/ads/route.ts can pull video+thumbnail
    const enrichedRaw = {
      ...raw,
      videoUrl,
      thumbnailUrl: imageUrl,
    };

    // Detect niche from page categories, body text, link URL
    const rawSnap = raw.snapshot as Record<string, unknown> | undefined;
    const pageCategories = (rawSnap?.page_categories as string[] | undefined) ?? [];
    const firstCardRaw = firstCard as Record<string, unknown> | undefined;
    const linkUrl = (firstCardRaw?.link_url as string | undefined) ?? (rawSnap?.link_url as string | undefined) ?? null;
    const nicheInput: NicheInput = {
      pageCategories,
      bodyText: bodyText ?? undefined,
      title: firstCard?.title ?? snap?.title ?? undefined,
      linkUrl: linkUrl ?? undefined,
    };
    const detectedNiche = detectNiche(nicheInput);

    try {
      await prisma.ad.upsert({
        where:  { adArchiveId },
        create: {
          adArchiveId,
          pageId:       raw.page_id ?? null,
          pageName:     raw.page_name ?? snap?.page_name ?? null,
          bodyText,
          title:        firstCard?.title ?? snap?.title ?? null,
          description:  firstCard?.link_description ?? null,
          imageUrl,
          videoUrl:     videoUrl ?? null,
          adLibraryUrl: raw.ad_library_url ?? null,
          platforms:    raw.publisher_platform ?? [],
          country:      job.country,
          isActive:     raw.is_active ?? true,
          startDate:    raw.start_date ? new Date(raw.start_date * 1000) : null,
          endDate:      raw.end_date   ? new Date(raw.end_date   * 1000) : null,
          niche:        detectedNiche,
          rawData:      enrichedRaw as object,
        },
        update: {
          isActive:  raw.is_active ?? true,
          endDate:   raw.end_date ? new Date(raw.end_date * 1000) : null,
          imageUrl:  imageUrl ?? undefined,
          videoUrl:  videoUrl ?? undefined,
          niche:     detectedNiche,
          scrapedAt: new Date(),
          rawData:   enrichedRaw as object,
        },
      });
      saved++;

      // Upload video to R2 if available (non-blocking, best-effort)
      if (videoUrl) {
        downloadAndUploadVideo(videoUrl, adArchiveId).then(r2Url => {
          if (r2Url) {
            prisma.ad.update({
              where: { adArchiveId },
              data: { videoUrl: r2Url },
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch {
      // Skip on conflict or bad data
    }
  }

  return saved;
}

// ─── Data retention — called by cron ────────────────────────────────────────

export async function cleanOldAds(): Promise<number> {
  const cutoff90 = new Date(Date.now() - 90 * 86_400_000);  // inactive > 90d
  const cutoff30 = new Date(Date.now() - 30 * 86_400_000);  // paused   > 30d

  const { count } = await prisma.ad.deleteMany({
    where: {
      OR: [
        { scrapedAt: { lt: cutoff90 } },
        { isActive: false, scrapedAt: { lt: cutoff30 } },
      ],
    },
  });

  return count;
}

// ─── DB stats helper ─────────────────────────────────────────────────────────

export async function getDbStats() {
  const [total, active, last24h, byCountry] = await Promise.all([
    prisma.ad.count(),
    prisma.ad.count({ where: { isActive: true } }),
    prisma.ad.count({ where: { scrapedAt: { gte: new Date(Date.now() - 86_400_000) } } }),
    prisma.ad.groupBy({ by: ["country"], _count: { _all: true }, orderBy: { _count: { country: "desc" } }, take: 10 }),
  ]);

  return { total, active, last24h, byCountry };
}

// ─── Raw Apify types ─────────────────────────────────────────────────────────

interface ApifyRawAd {
  ad_archive_id?: string;
  page_id?: string;
  page_name?: string;
  is_active?: boolean;
  publisher_platform?: string[];
  start_date?: number;
  end_date?: number;
  ad_library_url?: string;
  snapshot?: {
    page_name?: string;
    page_profile_picture_url?: string;
    body?: { text?: string };
    title?: string;
    video_hd_url?: string;
    video_sd_url?: string;
    images?: Array<{ resized_image_url?: string; original_image_url?: string }>;
    videos?: Array<{ video_hd_url?: string; video_sd_url?: string }>;
    cards?: Array<{
      body?: string;
      title?: string;
      link_description?: string;
      original_image_url?: string;
      resized_image_url?: string;
      video_hd_url?: string;
      video_sd_url?: string;
      cta_text?: string;
    }>;
  };
}
