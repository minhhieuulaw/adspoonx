/**
 * Crawler service — Apify → PostgreSQL (production DB on 5.78.207.17)
 *
 * Strategy: start all runs IN PARALLEL → single wait → fetch all datasets at once
 * Faster than sequential: 70 jobs × 45s wait → ~60s total (not 70×30s)
 *
 * ─── Keyword Tier System ───────────────────────────────────────────────────
 * Tier 1 (50 keywords) — Product-specific: exact product names that buyers search
 *   e.g. "posture corrector", "massage gun", "portable blender"
 *   Highest conversion intent, best for finding winning ads.
 *
 * Tier 2 (10 keywords) — Problem-solution: pain points that lead to product discovery
 *   e.g. "hair thinning solution", "back pain relief", "better sleep device"
 *   Catches ads using problem-aware copy.
 *
 * Tier 3 (10 keywords) — Category: broad product categories
 *   e.g. "fitness recovery", "beauty tool", "kitchen gadget"
 *   Casts a wider net, discovers trending products.
 *
 * ─── Market Allocation (US 45 + CA 25 = 70 jobs (US+CA focus)) ─────────────
 * US 45 (40 T1 + 3 T2 + 2 T3)  — largest e-commerce market, full keyword coverage
 * CA 25 (22 T1 + 2 T2 + 1 T3)  — high purchasing power, top keywords mirrored
 *
 * 70% video / 30% all mediaType split for video-first strategy.
 */

import { prisma } from "./prisma";
import { detectNiche, type NicheInput } from "./niche-detect";
import { downloadAndUploadVideo } from "./r2";
import { isProductAd } from "./product-filter";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID   = "3853UUZQG6pjjdw11";
const MAX_ITEMS  = 20_000;
const MAX_RESULTS_PER_JOB = 20_000;
const WAIT_MS    = 55_000; // 55s for actor to accumulate data

// ─── Job definitions ────────────────────────────────────────────────────────

export interface CrawlJob {
  keyword: string;
  country: string;
  mediaType?: "video" | "image_and_meme" | "all";
  tier?: 1 | 2 | 3;
}

export const DEFAULT_CRAWL_JOBS: CrawlJob[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // US — 45 jobs: ALL Tier 1 product keywords + Tier 2 + Tier 3
  // ═══════════════════════════════════════════════════════════════════════════
  // Health & Pain Relief (8)
  { keyword: "posture corrector",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "massage gun",             country: "US", mediaType: "video", tier: 1 },
  { keyword: "neck massager",           country: "US", mediaType: "video", tier: 1 },
  { keyword: "knee massager",           country: "US", mediaType: "video", tier: 1 },
  { keyword: "back stretcher",          country: "US", mediaType: "video", tier: 1 },
  { keyword: "foot massager",           country: "US", mediaType: "video", tier: 1 },
  { keyword: "heating pad",             country: "US", mediaType: "all",   tier: 1 },
  { keyword: "pain relief patch",       country: "US", mediaType: "video", tier: 1 },
  // Beauty & Skincare (8)
  { keyword: "led facial device",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "hair removal device",     country: "US", mediaType: "video", tier: 1 },
  { keyword: "facial cleansing brush",  country: "US", mediaType: "video", tier: 1 },
  { keyword: "blackhead remover",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "teeth whitening kit",     country: "US", mediaType: "all",   tier: 1 },
  { keyword: "scalp massager",          country: "US", mediaType: "video", tier: 1 },
  { keyword: "ice face roller",         country: "US", mediaType: "video", tier: 1 },
  { keyword: "microcurrent facial device", country: "US", mediaType: "video", tier: 1 },
  // Home & Cleaning (6)
  { keyword: "portable blender",        country: "US", mediaType: "video", tier: 1 },
  { keyword: "mini vacuum",             country: "US", mediaType: "video", tier: 1 },
  { keyword: "electric spin scrubber",  country: "US", mediaType: "video", tier: 1 },
  { keyword: "garment steamer",         country: "US", mediaType: "all",   tier: 1 },
  { keyword: "storage organizer",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "cordless cleaning brush", country: "US", mediaType: "video", tier: 1 },
  // Pet (5)
  { keyword: "pet camera",              country: "US", mediaType: "video", tier: 1 },
  { keyword: "pet grooming brush",      country: "US", mediaType: "video", tier: 1 },
  { keyword: "pet hair remover",        country: "US", mediaType: "all",   tier: 1 },
  { keyword: "pet water fountain",      country: "US", mediaType: "video", tier: 1 },
  { keyword: "pet feeder",              country: "US", mediaType: "video", tier: 1 },
  // Tech & Gadgets (7)
  { keyword: "wireless charger",        country: "US", mediaType: "video", tier: 1 },
  { keyword: "portable projector",      country: "US", mediaType: "video", tier: 1 },
  { keyword: "dash cam",                country: "US", mediaType: "video", tier: 1 },
  { keyword: "mini printer",            country: "US", mediaType: "all",   tier: 1 },
  { keyword: "phone mount",             country: "US", mediaType: "video", tier: 1 },
  { keyword: "power bank",              country: "US", mediaType: "video", tier: 1 },
  { keyword: "security camera",         country: "US", mediaType: "video", tier: 1 },
  // Baby (4)
  { keyword: "baby monitor",            country: "US", mediaType: "video", tier: 1 },
  { keyword: "bottle warmer",           country: "US", mediaType: "all",   tier: 1 },
  { keyword: "baby carrier",            country: "US", mediaType: "video", tier: 1 },
  { keyword: "diaper bag",              country: "US", mediaType: "video", tier: 1 },
  // Auto (2)
  { keyword: "car vacuum",              country: "US", mediaType: "video", tier: 1 },
  { keyword: "car scratch remover",     country: "US", mediaType: "video", tier: 1 },
  // Tier 2 — Problem-solution (3)
  { keyword: "hair thinning solution",  country: "US", mediaType: "video", tier: 2 },
  { keyword: "back pain relief",        country: "US", mediaType: "video", tier: 2 },
  { keyword: "better sleep device",     country: "US", mediaType: "video", tier: 2 },
  // Tier 3 — Broader (2)
  { keyword: "fitness recovery",        country: "US", mediaType: "all",   tier: 3 },
  { keyword: "kitchen gadget",          country: "US", mediaType: "all",   tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CA — 25 jobs: Top Tier 1 keywords for Canadian market
  // ═══════════════════════════════════════════════════════════════════════════
  // Health & Pain Relief (5)
  { keyword: "massage gun",             country: "CA", mediaType: "video", tier: 1 },
  { keyword: "neck massager",           country: "CA", mediaType: "video", tier: 1 },
  { keyword: "foot massager",           country: "CA", mediaType: "video", tier: 1 },
  { keyword: "heating pad",             country: "CA", mediaType: "video", tier: 1 },
  { keyword: "posture corrector",       country: "CA", mediaType: "all",   tier: 1 },
  // Beauty (4)
  { keyword: "led facial device",       country: "CA", mediaType: "video", tier: 1 },
  { keyword: "hair removal device",     country: "CA", mediaType: "video", tier: 1 },
  { keyword: "teeth whitening kit",     country: "CA", mediaType: "video", tier: 1 },
  { keyword: "blackhead remover",       country: "CA", mediaType: "all",   tier: 1 },
  // Home (4)
  { keyword: "portable blender",        country: "CA", mediaType: "video", tier: 1 },
  { keyword: "mini vacuum",             country: "CA", mediaType: "video", tier: 1 },
  { keyword: "electric spin scrubber",  country: "CA", mediaType: "video", tier: 1 },
  { keyword: "storage organizer",       country: "CA", mediaType: "all",   tier: 1 },
  // Pet (3)
  { keyword: "pet camera",              country: "CA", mediaType: "video", tier: 1 },
  { keyword: "pet grooming brush",      country: "CA", mediaType: "video", tier: 1 },
  { keyword: "pet water fountain",      country: "CA", mediaType: "video", tier: 1 },
  // Tech (3)
  { keyword: "wireless charger",        country: "CA", mediaType: "video", tier: 1 },
  { keyword: "dash cam",                country: "CA", mediaType: "video", tier: 1 },
  { keyword: "portable projector",      country: "CA", mediaType: "all",   tier: 1 },
  // Baby (2)
  { keyword: "baby monitor",            country: "CA", mediaType: "video", tier: 1 },
  { keyword: "bottle warmer",           country: "CA", mediaType: "video", tier: 1 },
  // Auto (1)
  { keyword: "car vacuum",              country: "CA", mediaType: "video", tier: 1 },
  // Tier 2 (2)
  { keyword: "back pain relief",        country: "CA", mediaType: "video", tier: 2 },
  { keyword: "better sleep device",     country: "CA", mediaType: "video", tier: 2 },
  // Tier 3 (1)
  { keyword: "kitchen gadget",          country: "CA", mediaType: "all",   tier: 3 },
];

// ─── URL builder for memo23 actor ───────────────────────────────────────────

function buildUrl(job: CrawlJob): string {
  const mediaType = job.mediaType === "all" ? "" : `&media_type=${job.mediaType ?? "video"}`;
  return (
    `https://www.facebook.com/ads/library/` +
    `?active_status=active&ad_type=all&country=${job.country}` +
    `&is_targeted_country=false` +
    mediaType +
    `&q=${encodeURIComponent(job.keyword)}` +
    `&search_type=keyword_exact_phrase`
  );
}

// ─── Apify helpers ──────────────────────────────────────────────────────────

async function startRun(job: CrawlJob, token: string, webhookUrl?: string): Promise<string> {
  const body: Record<string, unknown> = {
    startUrls: [{ url: buildUrl(job) }],
    maxItems: MAX_RESULTS_PER_JOB,
    includeAdReach: true,
    includeTotalActiveAdsCount: true,
    filterDuplicatePageIds: true,
    enableDebugLogging: true,
    minDelay: 5,
    maxDelay: 10,
    maxConcurrency: 10,
    maxRequestRetries: 100,
    proxy: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
  };
  // Webhooks via query param must be Base64-encoded JSON
  const webhooksParam = webhookUrl
    ? `&webhooks=${Buffer.from(JSON.stringify([{ eventTypes: ["ACTOR.RUN.SUCCEEDED"], requestUrl: webhookUrl }])).toString("base64url")}`
    : "";
  const res = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}&memory=4096${webhooksParam}`,
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
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${token}&limit=${MAX_ITEMS}&format=json&clean=true`
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

  // Split into batches of 25 to avoid Apify concurrent limit
  const BATCH_SIZE = 25;
  let started = 0;
  let errors = 0;

  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(job => {
        const webhookUrl =
          `${appUrl}/api/webhook/apify` +
          `?secret=${encodeURIComponent(secret)}` +
          `&keyword=${encodeURIComponent(job.keyword)}` +
          `&country=${job.country}`;
        return startRun(job, token, webhookUrl);
      })
    );
    started += results.filter(r => r.status === "fulfilled").length;
    errors += results.filter(r => r.status === "rejected").length;

    // Wait 2s between batches to avoid rate limit
    if (i + BATCH_SIZE < jobs.length) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  return { started, errors };
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

    // Use cta_type (always English: SHOP_NOW, LEARN_MORE) instead of cta_text (localized)
    const ctaType = (
      (snap as Record<string, unknown> | undefined)?.cta_type ??
      (firstCard as Record<string, unknown> | undefined)?.cta_type ??
      null
    ) as string | null;
    const ctaText = firstCard?.cta_text ?? null;
    const ALLOWED_CTA_TYPES = [
      "SHOP_NOW", "BUY_NOW", "ORDER_NOW", "GET_OFFER", "LEARN_MORE",
      "SEE_MORE", "GET_QUOTE", "SUBSCRIBE", "WATCH_MORE", "VIEW_MORE",
      "SIGN_UP", "SEND_MESSAGE", "BOOK_NOW", "CONTACT_US",
    ];
    const ALLOWED_CTA_TEXT = [
      "shop now", "buy now", "order now", "get offer", "learn more",
      "see more", "get quote", "subscribe", "watch more", "view more",
      "order today", "buy today", "shop today",
    ];
    const hasCta = !!(
      (ctaType && ALLOWED_CTA_TYPES.includes(ctaType.toUpperCase())) ||
      (ctaText && ALLOWED_CTA_TEXT.includes(ctaText.trim().toLowerCase()))
    );

    if (!pageName || !hasMedia || !hasBody || !hasCta) continue;

    // Product ad filter — reject service/political/charity/app ads
    if (!isProductAd(raw as unknown as Record<string, unknown>)) continue;

    // ── Extract new performance fields from memo23 actor ────────────────────
    const reach = typeof raw.reach_estimate === 'number' ? raw.reach_estimate : null;
    const spend = raw.spend ? JSON.stringify(raw.spend) : null;
    const impressions = raw.impressions_with_index ? JSON.stringify(raw.impressions_with_index) : null;
    const website = (raw as Record<string, unknown>).Website ?? (raw as Record<string, unknown>).website ?? null;
    const totalActiveTime = typeof raw.total_active_time === 'number' ? raw.total_active_time : null;

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
          reach,
          spend,
          impressions,
          website: typeof website === 'string' ? website : null,
          totalActiveTime,
          rawData:      enrichedRaw as object,
        },
        update: {
          isActive:  raw.is_active ?? true,
          endDate:   raw.end_date ? new Date(raw.end_date * 1000) : null,
          imageUrl:  imageUrl ?? undefined,
          videoUrl:  videoUrl ?? undefined,
          niche:     detectedNiche,
          reach: reach ?? undefined,
          spend: spend ?? undefined,
          impressions: impressions ?? undefined,
          website: typeof website === 'string' ? website : undefined,
          totalActiveTime: totalActiveTime ?? undefined,
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
  reach_estimate?: number;
  spend?: unknown;
  impressions_with_index?: unknown;
  Website?: string;
  website?: string;
  total_active_time?: number;
  targeted_or_reached_countries?: string[];
  categories?: string[];
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
      cta_type?: string;
    }>;
    cta_text?: string;
    cta_type?: string;
    link_url?: string;
    page_categories?: string[];
    page_like_count?: number;
  };
}
