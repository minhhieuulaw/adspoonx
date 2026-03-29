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
 * ─── Market Allocation (70 jobs total) ─────────────────────────────────────
 * US 18 (14 T1 + 2 T2 + 2 T3)  — largest e-commerce market
 * UK 12 ( 9 T1 + 2 T2 + 1 T3)  — strong dropshipping market
 * CA  8 ( 6 T1 + 1 T2 + 1 T3)  — high purchasing power
 * AU  7 ( 5 T1 + 1 T2 + 1 T3)  — outdoor/fitness/pet niches
 * DE  6 ( 5 T1 + 0 T2 + 1 T3)  — EU largest economy
 * FR  5 ( 4 T1 + 1 T2 + 0 T3)  — beauty/skincare strong
 * BR  5 ( 3 T1 + 1 T2 + 1 T3)  — growing e-commerce
 * MX  5 ( 3 T1 + 1 T2 + 1 T3)  — growing e-commerce
 * NL  2 ( 1 T1 + 1 T2 + 0 T3)  — high-tech consumers
 * IT  2 ( 0 T1 + 0 T2 + 2 T3)  — beauty/fashion market (broad discovery)
 *
 * 70% video / 30% all mediaType split for video-first strategy.
 */

import { prisma } from "./prisma";
import { detectNiche, type NicheInput } from "./niche-detect";
import { downloadAndUploadVideo } from "./r2";
import { isProductAd } from "./product-filter";

const APIFY_BASE = "https://api.apify.com/v2";
const ACTOR_ID   = "3853UUZQG6pjjdw11";
const MAX_ITEMS  = 150;
const MAX_RESULTS_PER_JOB = 150;
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
  // US — 18 jobs (14 Tier 1 + 2 Tier 2 + 2 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "posture corrector",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "massage gun",            country: "US", mediaType: "video", tier: 1 },
  { keyword: "neck massager",          country: "US", mediaType: "video", tier: 1 },
  { keyword: "led facial device",      country: "US", mediaType: "video", tier: 1 },
  { keyword: "hair removal device",    country: "US", mediaType: "all",   tier: 1 },
  { keyword: "portable blender",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "electric spin scrubber", country: "US", mediaType: "video", tier: 1 },
  { keyword: "wireless charger",       country: "US", mediaType: "all",   tier: 1 },
  { keyword: "portable projector",     country: "US", mediaType: "video", tier: 1 },
  { keyword: "dash cam",              country: "US", mediaType: "video", tier: 1 },
  { keyword: "pet camera",            country: "US", mediaType: "video", tier: 1 },
  { keyword: "baby monitor",          country: "US", mediaType: "all",   tier: 1 },
  { keyword: "security camera",       country: "US", mediaType: "video", tier: 1 },
  { keyword: "smart home gadget",     country: "US", mediaType: "all",   tier: 1 },
  { keyword: "hair thinning solution", country: "US", mediaType: "video", tier: 2 },
  { keyword: "back pain relief",       country: "US", mediaType: "video", tier: 2 },
  { keyword: "fitness recovery",       country: "US", mediaType: "video", tier: 3 },
  { keyword: "kitchen gadget",         country: "US", mediaType: "all",   tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // UK (GB) — 12 jobs (9 Tier 1 + 2 Tier 2 + 1 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "knee massager",          country: "GB", mediaType: "video", tier: 1 },
  { keyword: "back stretcher",         country: "GB", mediaType: "video", tier: 1 },
  { keyword: "teeth whitening kit",    country: "GB", mediaType: "video", tier: 1 },
  { keyword: "garment steamer",        country: "GB", mediaType: "video", tier: 1 },
  { keyword: "pet grooming brush",     country: "GB", mediaType: "all",   tier: 1 },
  { keyword: "pet hair remover",       country: "GB", mediaType: "video", tier: 1 },
  { keyword: "mini printer",          country: "GB", mediaType: "video", tier: 1 },
  { keyword: "power bank",            country: "GB", mediaType: "all",   tier: 1 },
  { keyword: "bottle warmer",         country: "GB", mediaType: "video", tier: 1 },
  { keyword: "posture support",        country: "GB", mediaType: "video", tier: 2 },
  { keyword: "neck pain relief",       country: "GB", mediaType: "video", tier: 2 },
  { keyword: "beauty tool",            country: "GB", mediaType: "all",   tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // CA — 8 jobs (6 Tier 1 + 1 Tier 2 + 1 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "foot massager",          country: "CA", mediaType: "video", tier: 1 },
  { keyword: "heating pad",            country: "CA", mediaType: "video", tier: 1 },
  { keyword: "mini vacuum",           country: "CA", mediaType: "video", tier: 1 },
  { keyword: "storage organizer",      country: "CA", mediaType: "all",   tier: 1 },
  { keyword: "phone mount",           country: "CA", mediaType: "video", tier: 1 },
  { keyword: "car vacuum",            country: "CA", mediaType: "video", tier: 1 },
  { keyword: "better sleep device",    country: "CA", mediaType: "video", tier: 2 },
  { keyword: "skincare device",        country: "CA", mediaType: "all",   tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // AU — 7 jobs (5 Tier 1 + 1 Tier 2 + 1 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "pain relief patch",      country: "AU", mediaType: "video", tier: 1 },
  { keyword: "scalp massager",         country: "AU", mediaType: "video", tier: 1 },
  { keyword: "pet water fountain",     country: "AU", mediaType: "all",   tier: 1 },
  { keyword: "pet toy",               country: "AU", mediaType: "video", tier: 1 },
  { keyword: "nasal aspirator",        country: "AU", mediaType: "video", tier: 1 },
  { keyword: "pet anxiety relief",     country: "AU", mediaType: "video", tier: 2 },
  { keyword: "pet wellness",           country: "AU", mediaType: "all",   tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // DE — 6 jobs (5 Tier 1 + 0 Tier 2 + 1 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "blackhead remover",      country: "DE", mediaType: "video", tier: 1 },
  { keyword: "facial cleansing brush", country: "DE", mediaType: "video", tier: 1 },
  { keyword: "ice face roller",        country: "DE", mediaType: "video", tier: 1 },
  { keyword: "window cleaner tool",    country: "DE", mediaType: "all",   tier: 1 },
  { keyword: "cordless cleaning brush",country: "DE", mediaType: "video", tier: 1 },
  { keyword: "fitness tracker",        country: "DE", mediaType: "video", tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // FR — 5 jobs (4 Tier 1 + 1 Tier 2 + 0 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "microcurrent facial device", country: "FR", mediaType: "video", tier: 1 },
  { keyword: "kitchen organizer",      country: "FR", mediaType: "all",   tier: 1 },
  { keyword: "baby carrier",           country: "FR", mediaType: "video", tier: 1 },
  { keyword: "diaper bag",             country: "FR", mediaType: "video", tier: 1 },
  { keyword: "under eye treatment",    country: "FR", mediaType: "video", tier: 2 },

  // ═══════════════════════════════════════════════════════════════════════════
  // BR — 5 jobs (3 Tier 1 + 1 Tier 2 + 1 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "pet feeder",            country: "BR", mediaType: "video", tier: 1 },
  { keyword: "dog seat cover",         country: "BR", mediaType: "video", tier: 1 },
  { keyword: "bottle sterilizer",      country: "BR", mediaType: "all",   tier: 1 },
  { keyword: "skin tightening device", country: "BR", mediaType: "video", tier: 2 },
  { keyword: "home workout equipment", country: "BR", mediaType: "video", tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // MX — 5 jobs (3 Tier 1 + 1 Tier 2 + 1 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "kids drawing tablet",    country: "MX", mediaType: "video", tier: 1 },
  { keyword: "shoe cleaning brush",    country: "MX", mediaType: "video", tier: 1 },
  { keyword: "waterproof mattress cover", country: "MX", mediaType: "all", tier: 1 },
  { keyword: "cellulite massager",     country: "MX", mediaType: "video", tier: 2 },
  { keyword: "cleaning tool",          country: "MX", mediaType: "video", tier: 3 },

  // ═══════════════════════════════════════════════════════════════════════════
  // NL — 2 jobs (1 Tier 1 + 1 Tier 2 + 0 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "car scratch remover",    country: "NL", mediaType: "video", tier: 1 },
  { keyword: "car scratch remover",    country: "NL", mediaType: "all",   tier: 2 },

  // ═══════════════════════════════════════════════════════════════════════════
  // IT — 2 jobs (0 Tier 1 + 0 Tier 2 + 2 Tier 3)
  // ═══════════════════════════════════════════════════════════════════════════
  { keyword: "car accessory",          country: "IT", mediaType: "video", tier: 3 },
  { keyword: "travel accessory",       country: "IT", mediaType: "all",   tier: 3 },
];

// ─── URL builder for memo23 actor ───────────────────────────────────────────

function buildUrl(job: CrawlJob): string {
  return (
    `https://www.facebook.com/ads/library/` +
    `?active_status=active&ad_type=all&country=${job.country}` +
    `&q=${encodeURIComponent(job.keyword)}&search_type=keyword_unordered`
  );
}

// ─── Apify helpers ──────────────────────────────────────────────────────────

async function startRun(job: CrawlJob, token: string, webhookUrl?: string): Promise<string> {
  const body: Record<string, unknown> = {
    startUrls: [{ url: buildUrl(job) }],
    maxResults: MAX_RESULTS_PER_JOB,
  };
  if (webhookUrl) {
    body.webhooks = [{ eventTypes: ["ACTOR.RUN.SUCCEEDED"], requestUrl: webhookUrl }];
  }
  const res = await fetch(
    `${APIFY_BASE}/acts/${ACTOR_ID}/runs?token=${token}&memory=1024`,
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
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${token}&limit=${MAX_ITEMS}&format=json`
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
    const ALLOWED_CTA = [
      "shop now", "buy now", "order now", "get offer", "learn more",
      "see more", "get quote", "subscribe", "watch more", "view more",
      "order today", "buy today", "shop today",
    ];
    const hasCta = ctaRaw ? ALLOWED_CTA.includes(ctaRaw.trim().toLowerCase()) : false;

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
    }>;
  };
}
