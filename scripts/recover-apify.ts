/**
 * Recovery script — pull ALL data from Apify runs into Supabase
 * Uses pg Pool + sequential batch upsert for reliability
 * Usage: npx tsx scripts/recover-apify.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import pg from "pg";
const { Pool } = pg;

const APIFY_TOKEN = process.env.APIFY_API_TOKEN!;
const ACTOR_ID    = "curious_coder~facebook-ads-library-scraper";
const BASE        = "https://api.apify.com/v2";
const ITEMS_PER_PAGE = 1000;

// ── Filters ─────────────────────────────────────────────────────────────────

const ALLOWED_COUNTRIES = new Set(["US", "GB", "DE", "FR", "NL", "AU", "CA"]);

// ── CTA whitelist/blacklist (primary filter) ────────────────────────────────

/** CTAs used by product/e-commerce/dropshipping ads — KEEP these */
const PRODUCT_CTAS = new Set([
  "shop_now", "shop now",
  "buy_now", "buy now",
  "order_now", "order now",
  "get_offer", "get offer",
  "learn_more", "learn more",       // very common in product ads
  "see_more", "see more",
  "get_quote", "get quote",         // custom products
  "sign_up", "sign up",             // e-com sign up for deals
  "subscribe", "subscribe now",     // subscription boxes
  "get_started", "get started",     // subscription products
  "request_time", "request time",
  "send_message", "send message",   // DM to buy (common in DS)
  "watch_more", "watch more",       // video product demos
  "view_more", "view more",
]);

/** CTAs that almost NEVER appear on product ads — REJECT these */
const REJECT_CTAS = new Set([
  "donate_now", "donate now", "donate",
  "book_now", "book now",
  "apply_now", "apply now",
  "call_now", "call now",
  "contact_us", "contact us",
  "get_directions", "get directions",
  "vote_now", "vote now",
  "play_game", "play game",
  "use_app", "use app",
  "install_app", "install app",
  "open_link", "open link",
  "download", "install_now", "install now",
  "listen_now", "listen now",
  "event_rsvp", "event rsvp",
  "interested",
]);

/** Service-related text patterns — strong signal to reject */
const SERVICE_PATTERNS = [
  /\b(book\s+(a|your|free)\s+(call|session|demo|consultation|appointment))\b/i,
  /\b(schedule\s+(a|your)\s+(call|demo|consultation|meeting))\b/i,
  /\b(free\s+(consultation|trial|demo|webinar|masterclass|workshop))\b/i,
  /\b(coaching|mentoring|life\s*coach|business\s*coach)\b/i,
  /\b(agency|consulting|law\s*firm|attorney|lawyer|accountant|realtor)\b/i,
  /\b(insurance|mortgage|loan|investment\s+(fund|opportunity)|financial\s+advis)/i,
  /\b(hire\s+(us|me)|we\s+(help|build|create|design)\s+(your|custom))\b/i,
  /\b(real\s*estate|property\s+(listing|management))\b/i,
  /\b(dental|clinic|hospital|medical\s+center|therapist)\b/i,
  /\b(political|vote\s+for|campaign|donate\s+to|petition)\b/i,
  /\b(church|ministry|sermon|worship|prayer)\b/i,
  /\b(nonprofit|non-profit|charity|fundrais)/i,
  /\b(podcast|episode\s+\d|tune\s+in)\b/i,
];

/** Product-signal text patterns — boost confidence */
const PRODUCT_PATTERNS = [
  /\b(shop\s+now|buy\s+now|order\s+(now|today|yours)|add\s+to\s+cart)\b/i,
  /\b(free\s+shipping|fast\s+shipping|ships?\s+free|worldwide\s+shipping)\b/i,
  /\b(\d+%\s*off|save\s+\$?\d|discount|sale\s+ends|limited\s+(time\s+)?offer)\b/i,
  /\b(best\s*seller|new\s+arrival|just\s+dropped|trending\s+now)\b/i,
  /\b(in\s+stock|back\s+in\s+stock|selling\s+fast|almost\s+sold\s+out)\b/i,
  /\b(dropship|aliexpress|free\s+returns|money.?back\s+guarantee)\b/i,
  /\$([\d,]+\.?\d{0,2})\b/,
];

/** Returns true only if ad looks like a product/dropshipping ad */
function isProductAd(raw: Record<string, unknown>): boolean {
  const snap = raw.snapshot as Record<string, unknown> | undefined;
  const cards = snap?.cards as Array<Record<string, unknown>> | undefined;

  // 1) Extract CTA text from all possible locations
  const ctaRaw = (
    (cards?.[0]?.cta_text as string) ??
    (snap?.cta_text as string) ??
    (raw.cta_text as string) ??
    ""
  ).toLowerCase().trim();

  // 2) CTA blacklist → instant reject
  if (ctaRaw && REJECT_CTAS.has(ctaRaw)) return false;

  // 3) Build full text for pattern matching
  const bodyParts = cards?.map((c: Record<string, unknown>) => c.body).filter(Boolean) ?? [];
  const text = [
    ...bodyParts,
    (snap?.body as Record<string, unknown>)?.text ?? "",
    cards?.[0]?.title ?? snap?.title ?? "",
    cards?.[0]?.link_description ?? "",
    raw.page_name ?? "",
  ].join(" ").toString();

  // 4) Service text patterns → reject if 2+ hits
  let serviceHits = 0;
  for (const p of SERVICE_PATTERNS) { if (p.test(text)) serviceHits++; }
  if (serviceHits >= 2) return false;

  // 5) CTA whitelist → accept (most reliable signal)
  if (ctaRaw && PRODUCT_CTAS.has(ctaRaw)) return true;

  // 6) Product text patterns → accept if any hit
  for (const p of PRODUCT_PATTERNS) { if (p.test(text)) return true; }

  // 7) Has link_url pointing to a shop → accept
  const linkUrl = (cards?.[0]?.link_url ?? snap?.link_url ?? "") as string;
  if (/shopify|myshopify|etsy|amazon|ebay|aliexpress|tiktok.*shop/i.test(linkUrl)) return true;

  // 8) No signals at all and 1 service hit → reject
  if (serviceHits >= 1) return false;

  // 9) No CTA at all → reject (most legit product ads have a CTA)
  if (!ctaRaw) return false;

  // 10) Unknown CTA, no text signals → cautiously accept
  return true;
}

// ── Niche detection ──────────────────────────────────────────────────────────

const KEYWORD_TO_NICHE: Record<string, string> = {
  "fashion": "Fashion & Apparel", "clothing": "Fashion & Apparel",
  "dress": "Fashion & Apparel", "sneakers": "Fashion & Apparel",
  "jewelry": "Jewelry & Accessories",
  "skincare": "Beauty & Skincare", "beauty": "Beauty & Skincare",
  "supplement": "Health & Supplements", "weight loss": "Health & Supplements",
  "organic": "Health & Supplements",
  "fitness": "Fitness & Sports", "yoga": "Fitness & Sports", "outdoor": "Fitness & Sports",
  "home decor": "Home & Living", "kitchen": "Home & Living",
  "pet": "Pets & Animals",
  "tech gadget": "Tech & Electronics", "wireless": "Tech & Electronics",
  "dropshipping": "Dropshipping",
  "baby": "Baby & Kids",
};

function detectNiche(keyword: string): string | null {
  return KEYWORD_TO_NICHE[keyword.toLowerCase().trim()] ?? null;
}

// ── Types ────────────────────────────────────────────────────────────────────

interface ApifyRun { id: string; defaultDatasetId?: string; }

function extractJob(input: Record<string, unknown>) {
  try {
    const url = new URL((input?.urls as Array<{url: string}>)?.[0]?.url ?? "");
    return { keyword: url.searchParams.get("q") ?? "", country: url.searchParams.get("country") ?? "US" };
  } catch { return { keyword: "", country: "US" }; }
}

// ── Fetch all items from dataset ─────────────────────────────────────────────

async function fetchAllDatasetItems(datasetId: string): Promise<Record<string, unknown>[]> {
  const allItems: Record<string, unknown>[] = [];
  let offset = 0;
  while (true) {
    const res = await fetch(
      `${BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${ITEMS_PER_PAGE}&offset=${offset}&format=json`
    );
    if (!res.ok) { console.log(`    fetch fail: ${res.status}`); break; }
    const items = await res.json() as Record<string, unknown>[];
    if (!Array.isArray(items) || items.length === 0) break;
    allItems.push(...items);
    if (items.length < ITEMS_PER_PAGE) break;
    offset += ITEMS_PER_PAGE;
  }
  return allItems;
}

// ── cuid generator ───────────────────────────────────────────────────────────

let counter = 0;
function cuid(): string {
  counter++;
  return `c${Date.now().toString(36)}${counter.toString(36).padStart(4, "0")}${Math.random().toString(36).slice(2, 8)}`;
}

// ── Parse single ad ──────────────────────────────────────────────────────────

function parseAd(raw: Record<string, unknown>, job: { keyword: string; country: string }) {
  const adArchiveId = raw.ad_archive_id as string | undefined;
  if (!adArchiveId) return null;

  const snap      = raw.snapshot as Record<string, unknown> | undefined;
  const cards     = snap?.cards as Array<Record<string, unknown>> | undefined;
  const firstCard = cards?.[0];
  const images    = snap?.images as Array<Record<string, unknown>> | undefined;
  const videos    = snap?.videos as Array<Record<string, unknown>> | undefined;

  const bodyText =
    (cards?.map((c: Record<string, unknown>) => c.body).filter(Boolean) as string[]).join(" | ") ||
    (snap?.body as Record<string, unknown>)?.text as string | null || null;

  const imageUrl =
    (firstCard?.resized_image_url ?? firstCard?.original_image_url ??
     images?.[0]?.resized_image_url ?? images?.[0]?.original_image_url ?? null) as string | null;

  const videoUrl =
    (firstCard?.video_hd_url ?? firstCard?.video_sd_url ??
     videos?.[0]?.video_hd_url ?? videos?.[0]?.video_sd_url ??
     snap?.video_hd_url ?? snap?.video_sd_url ?? null) as string | null;

  const title = ((firstCard?.title ?? snap?.title) as string) ?? null;
  const description = (firstCard?.link_description as string) ?? null;

  if (!bodyText && !title && !imageUrl && !videoUrl) return null;

  return {
    adArchiveId,
    pageId:       (raw.page_id as string) ?? null,
    pageName:     (raw.page_name as string) ?? (snap?.page_name as string) ?? null,
    bodyText, title, description, imageUrl,
    adLibraryUrl: (raw.ad_library_url as string) ?? null,
    platforms:    Array.isArray(raw.publisher_platform) ? raw.publisher_platform as string[] : [],
    country:      job.country,
    isActive:     (raw.is_active as boolean) ?? true,
    startDate:    raw.start_date ? new Date((raw.start_date as number) * 1000) : null,
    endDate:      raw.end_date   ? new Date((raw.end_date   as number) * 1000) : null,
    niche:        detectNiche(job.keyword),
    rawData:      { ...raw, videoUrl, thumbnailUrl: imageUrl },
  };
}

// ── Single-row upsert (reliable, fast enough with pg Pool) ───────────────────

async function upsertOne(pool: pg.Pool, ad: ReturnType<typeof parseAd>): Promise<boolean> {
  if (!ad) return false;
  try {
    await pool.query(
      `INSERT INTO "Ad" ("id","adArchiveId","pageId","pageName","bodyText","title","description",
        "imageUrl","adLibraryUrl","platforms","country","isActive","startDate","endDate","niche","rawData","updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,NOW())
       ON CONFLICT ("adArchiveId") DO UPDATE SET
         "isActive"=EXCLUDED."isActive", "endDate"=EXCLUDED."endDate",
         "imageUrl"=COALESCE(EXCLUDED."imageUrl","Ad"."imageUrl"),
         "niche"=COALESCE(EXCLUDED."niche","Ad"."niche"),
         "scrapedAt"=NOW(), "updatedAt"=NOW(), "rawData"=EXCLUDED."rawData"`,
      [
        cuid(), ad.adArchiveId, ad.pageId, ad.pageName, ad.bodyText, ad.title,
        ad.description, ad.imageUrl, ad.adLibraryUrl, ad.platforms, ad.country,
        ad.isActive, ad.startDate, ad.endDate, ad.niche, JSON.stringify(ad.rawData),
      ]
    );
    return true;
  } catch { return false; }
}

// ── Process single run ──────────────────────────────────────────────────────

async function processRun(pool: pg.Pool, run: ApifyRun, idx: number, total: number) {
  // Get run info for keyword/country
  const runRes = await fetch(`${BASE}/actor-runs/${run.id}?token=${APIFY_TOKEN}`);
  const runData = await runRes.json() as { data: { input?: Record<string, unknown> } };
  const job = extractJob(runData.data?.input ?? {});

  // ── Filter 1: Country whitelist ──
  if (!ALLOWED_COUNTRIES.has(job.country.toUpperCase())) {
    console.log(`  [${idx}/${total}] SKIP country ${job.country} (${job.keyword})`);
    return { saved: 0, skipped: 0, filtered: 0, keyword: job.keyword, country: job.country, items: 0 };
  }

  console.log(`  [${idx}/${total}] Fetching ${job.keyword}/${job.country}...`);

  const items = await fetchAllDatasetItems(run.defaultDatasetId!);
  if (items.length === 0) {
    console.log(`  [${idx}/${total}] ${job.keyword}/${job.country}: 0 items`);
    return { saved: 0, skipped: 0, filtered: 0, keyword: job.keyword, country: job.country, items: 0 };
  }

  let saved = 0, skipped = 0, filtered = 0;

  // Parse + filter + upsert
  const UPSERT_CONCURRENCY = 10;
  const batch: ReturnType<typeof parseAd>[] = [];

  for (const raw of items) {
    // ── Filter 2: Product/dropshipping CTA + text filter ──
    if (!isProductAd(raw)) { filtered++; continue; }

    const ad = parseAd(raw, job);
    if (!ad) { skipped++; continue; }
    batch.push(ad);

    // Flush batch
    if (batch.length >= UPSERT_CONCURRENCY) {
      const chunk = batch.splice(0, UPSERT_CONCURRENCY);
      const results = await Promise.all(chunk.map(a => upsertOne(pool, a)));
      for (const ok of results) { if (ok) saved++; else skipped++; }
    }
  }

  // Flush remaining
  if (batch.length > 0) {
    const results = await Promise.all(batch.map(a => upsertOne(pool, a)));
    for (const ok of results) { if (ok) saved++; else skipped++; }
  }

  console.log(`  [${idx}/${total}] ${job.keyword}/${job.country}: ${saved} saved, ${filtered} filtered, ${skipped} skip (${items.length} raw)`);
  return { saved, skipped, filtered, keyword: job.keyword, country: job.country, items: items.length };
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!APIFY_TOKEN) { console.error("APIFY_API_TOKEN not set"); process.exit(1); }

  const connStr = process.env.DIRECT_URL ?? process.env.DATABASE_URL!;
  const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false }, max: 12 });

  const beforeRes = await pool.query('SELECT COUNT(*) FROM "Ad"');
  const before = Number(beforeRes.rows[0].count);
  console.log(`DB connected. Ads before: ${before.toLocaleString()}`);

  // Fetch all runs
  console.log("Fetching Apify runs...");
  const res = await fetch(`${BASE}/acts/${ACTOR_ID}/runs?token=${APIFY_TOKEN}&limit=1000&desc=true`);
  const data = await res.json() as { data?: { items: ApifyRun[] } };
  const runs = (data.data?.items ?? []).filter(r => r.defaultDatasetId);
  console.log(`Found ${runs.length} runs with datasets.\n`);

  let totalSaved = 0, totalSkipped = 0, totalFiltered = 0, totalItems = 0;
  const byCountry: Record<string, number> = {};
  const byNiche: Record<string, number> = {};
  const skippedCountries: Record<string, number> = {};
  const startTime = Date.now();

  // Process runs SEQUENTIALLY (1 at a time to avoid overloading Apify + DB)
  for (let i = 0; i < runs.length; i++) {
    try {
      const v = await processRun(pool, runs[i], i + 1, runs.length);
      totalSaved += v.saved;
      totalSkipped += v.skipped;
      totalFiltered += v.filtered;
      totalItems += v.items;
      if (v.saved > 0) {
        byCountry[v.country] = (byCountry[v.country] ?? 0) + v.saved;
        const niche = detectNiche(v.keyword) ?? "Other";
        byNiche[niche] = (byNiche[niche] ?? 0) + v.saved;
      }
      if (!ALLOWED_COUNTRIES.has(v.country.toUpperCase()) && v.items === 0) {
        skippedCountries[v.country] = (skippedCountries[v.country] ?? 0) + 1;
      }
    } catch (e) {
      console.log(`  [${i + 1}/${runs.length}] ERROR: ${String(e).split("\n")[0]}`);
    }

    // Progress every 10 runs
    if ((i + 1) % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      const eta = Math.round(((Date.now() - startTime) / (i + 1)) * (runs.length - i - 1) / 1000);
      console.log(`\n  === ${i + 1}/${runs.length} (${elapsed}s elapsed, ~${eta}s remaining) | Saved: ${totalSaved.toLocaleString()} | Filtered: ${totalFiltered.toLocaleString()} ===\n`);
    }
  }

  const afterRes = await pool.query('SELECT COUNT(*) FROM "Ad"');
  const after = Number(afterRes.rows[0].count);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RECOVERY COMPLETE (${((Date.now() - startTime) / 1000).toFixed(0)}s)`);
  console.log(`${"=".repeat(60)}`);
  console.log(`Runs processed: ${runs.length}`);
  console.log(`Items fetched:  ${totalItems.toLocaleString()}`);
  console.log(`Filtered out:   ${totalFiltered.toLocaleString()} (non-product/service/spam)`);
  console.log(`Saved to DB:    ${totalSaved.toLocaleString()}`);
  console.log(`Parse errors:   ${totalSkipped.toLocaleString()}`);
  console.log(`DB: ${before.toLocaleString()} → ${after.toLocaleString()} (+${(after - before).toLocaleString()} new)`);
  console.log(`\nAllowed countries: ${[...ALLOWED_COUNTRIES].join(", ")}`);
  if (Object.keys(skippedCountries).length) {
    console.log(`Skipped countries: ${Object.entries(skippedCountries).map(([c, n]) => `${c}(${n})`).join(", ")}`);
  }
  console.log(`\nBy country:`);
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n.toLocaleString()}`));
  console.log(`\nBy niche:`);
  Object.entries(byNiche).sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(`  ${n}: ${c.toLocaleString()}`));

  await pool.end();
}

main().catch(console.error);
