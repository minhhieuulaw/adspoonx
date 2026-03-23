/**
 * Backfill niche column for all ads in the database.
 * Replicates logic from lib/niche-detect.ts (can't import TS directly).
 */
import 'dotenv/config';
import pg from 'pg';

const CATEGORY_MAP = {
  "clothing (brand)": "Fashion & Apparel", "clothing": "Fashion & Apparel", "women's clothing": "Fashion & Apparel",
  "men's clothing": "Fashion & Apparel", "children's clothing": "Fashion & Apparel", "apparel": "Fashion & Apparel",
  "design & fashion": "Fashion & Apparel", "fashion": "Fashion & Apparel", "shoes": "Fashion & Apparel",
  "lingerie": "Fashion & Apparel", "eyewear": "Fashion & Apparel", "sunglasses": "Fashion & Apparel",
  "bags/luggage": "Fashion & Apparel", "handbags": "Fashion & Apparel", "boutique": "Fashion & Apparel",
  "fashion designer": "Fashion & Apparel",
  "health/beauty": "Health & Beauty", "health & beauty": "Health & Beauty", "beauty supplies": "Health & Beauty",
  "beauty salon": "Health & Beauty", "skin care": "Health & Beauty", "skincare": "Health & Beauty",
  "cosmetics": "Health & Beauty", "makeup": "Health & Beauty", "hair care": "Health & Beauty",
  "beauty": "Health & Beauty", "spa": "Health & Beauty", "nail salon": "Health & Beauty", "personal care": "Health & Beauty",
  "gym": "Fitness & Wellness", "fitness": "Fitness & Wellness", "health & wellness website": "Fitness & Wellness",
  "health service": "Fitness & Wellness", "medical service": "Fitness & Wellness", "hospital": "Fitness & Wellness",
  "doctor": "Fitness & Wellness", "dentist": "Fitness & Wellness", "orthodontist": "Fitness & Wellness",
  "yoga studio": "Fitness & Wellness", "sports instruction": "Fitness & Wellness", "physical therapist": "Fitness & Wellness",
  "mental health": "Fitness & Wellness", "chiropractor": "Fitness & Wellness", "wellness": "Fitness & Wellness",
  "vitamins/supplements": "Supplements & Nutrition", "vitamin supplement shop": "Supplements & Nutrition",
  "health food store": "Supplements & Nutrition", "herbalist": "Supplements & Nutrition",
  "nutrition": "Supplements & Nutrition", "dietitian": "Supplements & Nutrition",
  "grocery store": "Food & Beverage", "restaurant": "Food & Beverage", "food & beverage": "Food & Beverage",
  "food": "Food & Beverage", "bakery": "Food & Beverage", "café": "Food & Beverage",
  "coffee shop": "Food & Beverage", "bar": "Food & Beverage", "food delivery": "Food & Beverage", "catering": "Food & Beverage",
  "electronics": "Electronics & Tech", "software": "Electronics & Tech", "app page": "Electronics & Tech",
  "telecommunication company": "Electronics & Tech", "computer": "Electronics & Tech",
  "information technology company": "Electronics & Tech", "internet company": "Electronics & Tech",
  "mobile phone shop": "Electronics & Tech", "science, technology & engineering": "Electronics & Tech",
  "home decor": "Home & Living", "furniture": "Home & Living", "home improvement": "Home & Living",
  "home & garden": "Home & Living", "kitchen/cooking": "Home & Living", "interior design": "Home & Living",
  "household supplies": "Home & Living", "mattress": "Home & Living",
  "baby goods/kids goods": "Baby & Kids", "baby & children's clothing store": "Baby & Kids",
  "toy store": "Baby & Kids", "children's toys": "Baby & Kids",
  "jewelry/watches": "Jewelry & Accessories", "jewelry": "Jewelry & Accessories", "watches": "Jewelry & Accessories",
  "accessories": "Jewelry & Accessories",
  "pet supplies": "Pet Supplies", "pet service": "Pet Supplies", "pet store": "Pet Supplies",
  "veterinarian": "Pet Supplies", "animal": "Pet Supplies",
  "sports": "Sports & Outdoors", "outdoor recreation": "Sports & Outdoors", "sports team": "Sports & Outdoors",
  "sporting goods": "Sports & Outdoors", "outdoor equipment": "Sports & Outdoors", "camping": "Sports & Outdoors",
  "education website": "Education & Courses", "education": "Education & Courses", "school": "Education & Courses",
  "tutor/teacher": "Education & Courses", "college & university": "Education & Courses",
  "coach": "Education & Courses", "training": "Education & Courses", "e-learning": "Education & Courses",
  "media/news company": "Entertainment & Media", "entertainment website": "Entertainment & Media",
  "magazine": "Entertainment & Media", "tv show": "Entertainment & Media", "movie": "Entertainment & Media",
  "music": "Entertainment & Media", "gaming": "Entertainment & Media", "video game": "Entertainment & Media",
  "comedian": "Entertainment & Media", "artist": "Entertainment & Media", "musician": "Entertainment & Media",
  "financial service": "Finance & Insurance", "insurance company": "Finance & Insurance",
  "bank": "Finance & Insurance", "investing": "Finance & Insurance", "loan service": "Finance & Insurance",
  "real estate": "Finance & Insurance",
  "shopping": "E-commerce", "retail company": "E-commerce", "shopping & retail": "E-commerce",
  "e-commerce website": "E-commerce", "marketplace": "E-commerce",
};

const KEYWORD_RULES = [
  { pattern: /\b(dress|shirt|hoodie|jeans|sneaker|clothing|fashion|outfit|wear|apparel|tee|jacket|pant|legging|skirt)\b/i, niche: "Fashion & Apparel" },
  { pattern: /\b(serum|moisturiz|skincare|skin care|makeup|concealer|foundation|lipstick|mascara|beauty|cosmetic|cream|glow|wrinkle|acne)\b/i, niche: "Health & Beauty" },
  { pattern: /\b(workout|gym|fitness|exercise|weight loss|muscle|training|yoga|pilates|cardio|diet plan)\b/i, niche: "Fitness & Wellness" },
  { pattern: /\b(supplement|vitamin|protein|collagen|probiotic|omega|herbal|extract|capsule|tablet)\b/i, niche: "Supplements & Nutrition" },
  { pattern: /\b(recipe|food|cook|meal|snack|coffee|tea|chocolate|organic food|restaurant|delivery|grocery)\b/i, niche: "Food & Beverage" },
  { pattern: /\b(phone|laptop|tablet|gadget|tech|software|app|wireless|bluetooth|smart home|charger|headphone|earbuds)\b/i, niche: "Electronics & Tech" },
  { pattern: /\b(furniture|mattress|pillow|blanket|home decor|kitchen|cleaning|candle|lamp|rug|curtain|sofa)\b/i, niche: "Home & Living" },
  { pattern: /\b(baby|toddler|newborn|kids|children|diaper|stroller|nursery|infant)\b/i, niche: "Baby & Kids" },
  { pattern: /\b(necklace|bracelet|earring|ring|watch|pendant|gold|silver|diamond|jewelry|jewellery)\b/i, niche: "Jewelry & Accessories" },
  { pattern: /\b(pet|dog|cat|puppy|kitten|vet|animal|paw|treat|kibble)\b/i, niche: "Pet Supplies" },
  { pattern: /\b(hiking|camping|fishing|golf|tennis|basketball|football|soccer|cycling|running shoes|outdoor)\b/i, niche: "Sports & Outdoors" },
  { pattern: /\b(course|class|learn|study|tutorial|certificate|online training|masterclass|bootcamp|coaching|webinar)\b/i, niche: "Education & Courses" },
  { pattern: /\b(movie|music|game|streaming|podcast|entertainment|show|concert|ticket|event)\b/i, niche: "Entertainment & Media" },
  { pattern: /\b(insurance|loan|credit|invest|mortgage|bank|financial|trading|crypto|forex|saving)\b/i, niche: "Finance & Insurance" },
  { pattern: /\b(shop now|buy now|free shipping|order now|limited stock|add to cart|discount|sale|deal)\b/i, niche: "E-commerce" },
];

const DOMAIN_HINTS = {
  "temu.com": "E-commerce", "amazon.com": "E-commerce", "amazon.de": "E-commerce",
  "shopee.ph": "E-commerce", "shopee.co.th": "E-commerce", "aliexpress.com": "E-commerce",
  "etsy.com": "E-commerce", "ebay.com": "E-commerce", "lightinthebox.com": "E-commerce",
  "iherb.com": "Supplements & Nutrition", "sephora.sg": "Health & Beauty",
  "sephora.com": "Health & Beauty", "farfetch.com": "Fashion & Apparel", "skool.com": "Education & Courses",
};

function detectNiche(raw, bodyText, title) {
  const snap = raw?.snapshot || {};
  const cats = snap.page_categories || raw?.page_categories || raw?.categories || [];

  // 1. Category match
  if (Array.isArray(cats)) {
    for (const cat of cats) {
      const key = (cat || '').toLowerCase().trim();
      if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
    }
    for (const cat of cats) {
      const lower = (cat || '').toLowerCase().trim();
      for (const [mapKey, niche] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(mapKey) || mapKey.includes(lower)) return niche;
      }
    }
  }

  // 2. Domain hints
  const linkUrl = snap.link_url || raw?.link_url || snap.caption || '';
  if (linkUrl) {
    try {
      const domain = new URL(linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`).hostname.replace('www.', '');
      if (DOMAIN_HINTS[domain]) return DOMAIN_HINTS[domain];
    } catch {}
  }

  // 3. Keyword fallback
  const text = [bodyText || '', title || ''].join(' ');
  if (text.length > 10) {
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(text)) return rule.niche;
    }
  }

  return 'Other';
}

// ── Main ──────────────────────────────────────────────────────────────────────

const client = new pg.Client(process.env.DATABASE_URL);
await client.connect();

const BATCH = 1000;
let offset = 0;
let total = 0;
const nicheCounts = {};

console.log('Backfilling niche for ads with NULL niche...\n');

while (true) {
  const { rows } = await client.query(
    `SELECT id, "rawData", "bodyText", title FROM "Ad" WHERE niche IS NULL ORDER BY id LIMIT $1`,
    [BATCH]
  );
  if (rows.length === 0) break;

  for (const row of rows) {
    const niche = detectNiche(row.rawData, row.bodyText, row.title);
    await client.query(`UPDATE "Ad" SET niche = $1 WHERE id = $2`, [niche, row.id]);
    nicheCounts[niche] = (nicheCounts[niche] || 0) + 1;
    total++;
  }

  // no offset needed — WHERE niche IS NULL shrinks each iteration
  process.stdout.write(`  ${total} ads processed...\r`);
}

console.log(`\n\n✅ Done! ${total} ads backfilled.\n`);
console.log('=== NICHE DISTRIBUTION ===');
Object.entries(nicheCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([niche, count]) => {
    const pct = ((count / total) * 100).toFixed(1);
    console.log(`  ${String(count).padStart(5)} (${pct.padStart(5)}%) | ${niche}`);
  });

await client.end();
