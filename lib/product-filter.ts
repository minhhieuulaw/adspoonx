/**
 * Product ad detection filter.
 *
 * Filters out service ads, political ads, charity, apps, etc.
 * Only keeps product/e-commerce/dropshipping ads.
 */

// ── CTA whitelist (product-related CTAs) ────────────────────────────────────

const PRODUCT_CTAS = new Set([
  "shop_now", "shop now",
  "buy_now", "buy now",
  "order_now", "order now",
  "get_offer", "get offer",
  "learn_more", "learn more",
  "see_more", "see more",
  "get_quote", "get quote",
  "sign_up", "sign up",
  "subscribe", "subscribe now",
  "get_started", "get started",
  "request_time", "request time",
  "send_message", "send message",
  "watch_more", "watch more",
  "view_more", "view more",
]);

// ── CTA blacklist (non-product CTAs) ────────────────────────────────────────

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

// ── Domain blacklist — marketplaces & brands that are NOT dropshipping ───────
// Ads linking to these domains are rejected outright; they represent established
// brands / marketplace listings, not independent dropshipping stores.

const DOMAIN_BLACKLIST = [
  "amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.ca",
  "walmart.com", "target.com", "bestbuy.com",
  "temu.com", "shein.com", "aliexpress.com", "wish.com",
  "ebay.com", "ebay.co.uk",
  "apple.com", "samsung.com", "nike.com", "adidas.com",
  "play.google.com", "apps.apple.com",  // app installs
  "facebook.com/marketplace",
];

// ── Service-related text patterns — strong signal to reject ─────────────────

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
  // App install patterns — ads pushing users to install an app are not product ads
  /\b(download\s+(the\s+)?app|install\s+now|get\s+the\s+app|available\s+on\s+(app\s+store|google\s+play))\b/i,
  /\b(play\s+store|app\s+store|google\s+play)\b/i,
];

// ── Marketplace-specific text patterns — strong rejection signal ─────────────
// Mentioning these marketplaces / fulfilment phrases signals the ad is NOT
// an independent dropshipping store.

const MARKETPLACE_PATTERNS = [
  /\b(amazon\s+prime|prime\s+delivery|sold\s+by|fulfilled\s+by)\b/i,
  /\b(walmart\s+pickup|target\s+drive|best\s+buy)\b/i,
  /\b(temu|shein|aliexpress|wish\.com)\b/i,
];

// ── Blog / content patterns — reject if no product signal ───────────────────
// These indicate editorial / brand-awareness content, not a product offer.

const CONTENT_PATTERNS = [
  /\b(read\s+more|blog\s+post|article|news|press\s+release)\b/i,
  /\b(podcast|episode\s+\d|listen\s+now|watch\s+our\s+video)\b/i,
];

// ── Product-signal text patterns — boost confidence ─────────────────────────

const PRODUCT_PATTERNS = [
  /\b(shop\s+now|buy\s+now|order\s+(now|today|yours)|add\s+to\s+cart)\b/i,
  /\b(free\s+shipping|fast\s+shipping|ships?\s+free|worldwide\s+shipping)\b/i,
  /\b(\d+%\s*off|save\s+\$?\d|discount|sale\s+ends|limited\s+(time\s+)?offer)\b/i,
  /\b(best\s*seller|new\s+arrival|just\s+dropped|trending\s+now)\b/i,
  /\b(in\s+stock|back\s+in\s+stock|selling\s+fast|almost\s+sold\s+out)\b/i,
  /\b(dropship|aliexpress|free\s+returns|money.?back\s+guarantee)\b/i,
  /\$([\d,]+\.?\d{0,2})\b/,
];

/**
 * Returns true only if the ad looks like a product/dropshipping ad.
 * Accepts raw ad data from any crawl source (Record<string, unknown>).
 */
export function isProductAd(raw: Record<string, unknown>): boolean {
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

  // 4a) Marketplace text patterns → instant reject (any match)
  for (const p of MARKETPLACE_PATTERNS) {
    if (p.test(text)) return false;
  }

  // 5) CTA whitelist → accept (most reliable signal)
  if (ctaRaw && PRODUCT_CTAS.has(ctaRaw)) return true;

  // 5a) Content/blog patterns → reject if matched AND no product signal present
  let hasProductSignal = false;
  for (const p of PRODUCT_PATTERNS) { if (p.test(text)) { hasProductSignal = true; break; } }
  if (!hasProductSignal) {
    for (const p of CONTENT_PATTERNS) {
      if (p.test(text)) return false;
    }
  }

  // 6) Product text patterns → accept if any hit
  if (hasProductSignal) return true;

  // 7) Has link_url pointing to a shop → domain checks first, then whitelist
  const linkUrl = (cards?.[0]?.link_url ?? snap?.link_url ?? "") as string;

  // 7a) Domain blacklist → reject (marketplaces / big brands are not dropshipping stores)
  if (linkUrl) {
    for (const domain of DOMAIN_BLACKLIST) {
      if (linkUrl.toLowerCase().includes(domain)) return false;
    }
  }

  // 7b) Known dropshipping / indie shop platforms → accept
  if (/shopify|myshopify|etsy|tiktok.*shop/i.test(linkUrl)) return true;

  // 8) No signals at all and 1 service hit → reject
  if (serviceHits >= 1) return false;

  // 9) No CTA at all → reject (most legit product ads have a CTA)
  if (!ctaRaw) return false;

  // 10) Unknown CTA, no text signals → cautiously accept
  return true;
}
