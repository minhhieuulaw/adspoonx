/**
 * Apify integration for Facebook Ads Library scraping
 * - Basic actor (curious_coder): $0.75/1000 ads — Free/Starter
 * - Premium actor (memo23/cheerio): $15-31/month flat — Premium/Business
 *
 * Pattern: async run → wait for data accumulation → fetch dataset → abort run
 */

import type { FbAd, FbAdsResponse } from "./facebook-ads";

const APIFY_BASE    = "https://api.apify.com/v2";
const ACTOR_BASIC   = "curious_coder~facebook-ads-library-scraper";
const ACTOR_PREMIUM = "memo23~facebook-ads-library-scraper-cheerio";

export interface ApifySearchParams {
  searchTerms: string;
  country: string;
  activeStatus?: "active" | "inactive" | "all";
  limit?: number;
}

// Build Facebook Ads Library search URL
function buildFbAdsUrl(p: ApifySearchParams): string {
  const q = encodeURIComponent(p.searchTerms);
  const status = p.activeStatus ?? "active";
  return (
    `https://www.facebook.com/ads/library/` +
    `?active_status=${status}&ad_type=all&country=${p.country}` +
    `&q=${q}&search_type=keyword_unordered`
  );
}

// Start run, wait for data, fetch dataset, abort run
async function runAndCollect(
  actorId: string,
  input: Record<string, unknown>,
  limit: number,
  waitMs = 20000
): Promise<ApifyRawAd[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  // 1. Start async run
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${actorId}/runs?token=${token}&memory=512`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );
  if (!startRes.ok) throw new Error(`Failed to start Apify run: ${startRes.status}`);
  const startData = await startRes.json() as { data?: { id: string } };
  const runId = startData.data?.id;
  if (!runId) throw new Error("No runId returned from Apify");

  // 2. Wait for actor to collect data
  await new Promise<void>((r) => setTimeout(r, waitMs));

  // 3. Fetch dataset items collected so far
  const itemsRes = await fetch(
    `${APIFY_BASE}/actor-runs/${runId}/dataset/items?token=${token}&limit=${limit}&format=json`
  );
  const items = itemsRes.ok
    ? (await itemsRes.json() as ApifyRawAd[])
    : [];

  // 4. Abort the run (fire-and-forget)
  fetch(`${APIFY_BASE}/actor-runs/${runId}/abort?token=${token}`, {
    method: "POST",
  }).catch(() => null);

  return items;
}

// ─── Public API ─────────────────────────────────────────────────

export async function searchAdsBasic(
  params: ApifySearchParams
): Promise<FbAdsResponse> {
  const limit = Math.min(params.limit ?? 20, 50);
  const input = {
    urls: [{ url: buildFbAdsUrl(params) }],
    maxResults: limit,
  };
  const items = await runAndCollect(ACTOR_BASIC, input, limit, 20000);
  return { data: items.map(mapRawAd) };
}

export async function searchAdsPremium(
  params: ApifySearchParams
): Promise<FbAdsResponse> {
  const limit = params.limit ?? 40;
  const input = {
    urls: [{ url: buildFbAdsUrl(params) }],
    maxResults: limit,
  };
  // Premium actor may need more time
  const items = await runAndCollect(ACTOR_PREMIUM, input, limit, 30000);
  return { data: items.map(mapRawAd) };
}

// ─── Mapper: Apify raw output → FbAd ───────────────────────────

function mapRawAd(raw: ApifyRawAd): FbAd {
  const snap = raw.snapshot;
  const firstCard = snap?.cards?.[0];

  const bodies = snap?.cards?.length
    ? [...new Set(snap.cards.map((c) => c.body).filter(Boolean) as string[])]
    : snap?.body?.text ? [snap.body.text] : undefined;

  // Thumbnail — always extract, used as poster for video and as image for image ads
  const thumbnailUrl =
    firstCard?.resized_image_url ||
    firstCard?.original_image_url ||
    undefined;

  const imageUrl = thumbnailUrl || snap?.page_profile_picture_url || undefined;

  // Video URL — try multiple field locations Apify actors may use
  const videoUrl =
    firstCard?.video_hd_url ||
    firstCard?.video_sd_url ||
    snap?.video_hd_url ||
    snap?.video_sd_url ||
    undefined;

  const startTime = raw.start_date
    ? new Date(raw.start_date * 1000).toISOString()
    : undefined;
  const endTime = raw.end_date
    ? new Date(raw.end_date * 1000).toISOString()
    : undefined;

  return {
    id: raw.ad_archive_id ?? String(raw.position ?? Math.random()),
    page_id:   raw.page_id,
    page_name: raw.page_name ?? snap?.page_name,
    ad_creative_bodies:           bodies,
    ad_creative_link_titles:      firstCard?.title ? [firstCard.title] : snap?.title ? [snap.title] : undefined,
    ad_creative_link_descriptions: firstCard?.link_description ? [firstCard.link_description] : undefined,
    ad_creative_link_captions:    firstCard?.caption ? [firstCard.caption] : undefined,
    ad_snapshot_url:              raw.ad_library_url,
    image_url:                    imageUrl,
    video_url:                    videoUrl,
    thumbnail_url:                videoUrl ? thumbnailUrl : undefined,
    ad_delivery_start_time:       startTime,
    ad_delivery_stop_time:        endTime,
    publisher_platforms:          raw.publisher_platform,
    is_active:                    raw.is_active,
    cta_text:                     snap?.cta_text ?? firstCard?.cta_text,
    page_profile_picture_url:     snap?.page_profile_picture_url,
    page_profile_uri:             snap?.page_profile_uri,
  };
}

// ─── Raw Apify output types ─────────────────────────────────────

interface ApifyRawAd {
  ad_archive_id?: string;
  page_id?: string;
  page_name?: string;
  is_active?: boolean;
  publisher_platform?: string[];
  start_date?: number;
  end_date?: number;
  ad_library_url?: string;
  spend?: null | { lower_bound?: string; upper_bound?: string };
  currency?: string;
  reach_estimate?: null | number;
  total?: number;
  position?: number;
  impressions_with_index?: { impressions_text?: string | null };
  snapshot?: {
    page_name?: string;
    page_profile_picture_url?: string;
    page_profile_uri?: string;
    body?: { text?: string };
    title?: string;
    caption?: string;
    cta_text?: string;
    video_hd_url?: string;
    video_sd_url?: string;
    cards?: Array<{
      body?: string;
      title?: string;
      caption?: string;
      link_description?: string;
      link_url?: string;
      cta_text?: string;
      original_image_url?: string;
      resized_image_url?: string;
      video_hd_url?: string;
      video_sd_url?: string;
    }>;
  };
}
