/**
 * Niche detection — maps Facebook page_categories + keyword fallback to ~15 niches.
 *
 * Priority:
 *   1. page_categories from Apify rawData (95%+ coverage)
 *   2. Keyword scan in bodyText / title / link_url
 *   3. Fallback: "Other"
 */

export const NICHES = [
  "Fashion & Apparel",
  "Health & Beauty",
  "Fitness & Wellness",
  "Supplements & Nutrition",
  "Food & Beverage",
  "Electronics & Tech",
  "Home & Living",
  "Baby & Kids",
  "Jewelry & Accessories",
  "Pet Supplies",
  "Sports & Outdoors",
  "Education & Courses",
  "Entertainment & Media",
  "Finance & Insurance",
  "E-commerce",
  "Other",
] as const;

export type Niche = (typeof NICHES)[number];

// ── Category → Niche mapping ─────────────────────────────────────────────────

const CATEGORY_MAP: Record<string, Niche> = {
  // Fashion
  "clothing (brand)":     "Fashion & Apparel",
  "clothing":             "Fashion & Apparel",
  "women's clothing":     "Fashion & Apparel",
  "men's clothing":       "Fashion & Apparel",
  "children's clothing":  "Fashion & Apparel",
  "apparel":              "Fashion & Apparel",
  "design & fashion":     "Fashion & Apparel",
  "fashion":              "Fashion & Apparel",
  "shoes":                "Fashion & Apparel",
  "lingerie":             "Fashion & Apparel",
  "eyewear":              "Fashion & Apparel",
  "sunglasses":           "Fashion & Apparel",
  "bags/luggage":         "Fashion & Apparel",
  "handbags":             "Fashion & Apparel",
  "boutique":             "Fashion & Apparel",
  "fashion designer":     "Fashion & Apparel",

  // Health & Beauty
  "health/beauty":        "Health & Beauty",
  "health & beauty":      "Health & Beauty",
  "beauty supplies":      "Health & Beauty",
  "beauty salon":         "Health & Beauty",
  "skin care":            "Health & Beauty",
  "skincare":             "Health & Beauty",
  "cosmetics":            "Health & Beauty",
  "makeup":               "Health & Beauty",
  "hair care":            "Health & Beauty",
  "beauty":               "Health & Beauty",
  "spa":                  "Health & Beauty",
  "nail salon":           "Health & Beauty",
  "personal care":        "Health & Beauty",

  // Fitness & Wellness
  "gym":                  "Fitness & Wellness",
  "fitness":              "Fitness & Wellness",
  "health & wellness website": "Fitness & Wellness",
  "health service":       "Fitness & Wellness",
  "medical service":      "Fitness & Wellness",
  "hospital":             "Fitness & Wellness",
  "doctor":               "Fitness & Wellness",
  "dentist":              "Fitness & Wellness",
  "orthodontist":         "Fitness & Wellness",
  "yoga studio":          "Fitness & Wellness",
  "sports instruction":   "Fitness & Wellness",
  "physical therapist":   "Fitness & Wellness",
  "mental health":        "Fitness & Wellness",
  "chiropractor":         "Fitness & Wellness",
  "wellness":             "Fitness & Wellness",

  // Supplements
  "vitamins/supplements": "Supplements & Nutrition",
  "vitamin supplement shop": "Supplements & Nutrition",
  "health food store":    "Supplements & Nutrition",
  "herbalist":            "Supplements & Nutrition",
  "nutrition":            "Supplements & Nutrition",
  "dietitian":            "Supplements & Nutrition",

  // Food & Beverage
  "grocery store":        "Food & Beverage",
  "restaurant":           "Food & Beverage",
  "food & beverage":      "Food & Beverage",
  "food":                 "Food & Beverage",
  "bakery":               "Food & Beverage",
  "café":                 "Food & Beverage",
  "coffee shop":          "Food & Beverage",
  "bar":                  "Food & Beverage",
  "food delivery":        "Food & Beverage",
  "catering":             "Food & Beverage",

  // Electronics & Tech
  "electronics":          "Electronics & Tech",
  "software":             "Electronics & Tech",
  "app page":             "Electronics & Tech",
  "telecommunication company": "Electronics & Tech",
  "computer":             "Electronics & Tech",
  "information technology company": "Electronics & Tech",
  "internet company":     "Electronics & Tech",
  "mobile phone shop":    "Electronics & Tech",
  "science, technology & engineering": "Electronics & Tech",

  // Home & Living
  "home decor":           "Home & Living",
  "furniture":            "Home & Living",
  "home improvement":     "Home & Living",
  "home & garden":        "Home & Living",
  "kitchen/cooking":      "Home & Living",
  "interior design":      "Home & Living",
  "household supplies":   "Home & Living",
  "mattress":             "Home & Living",

  // Baby & Kids
  "baby goods/kids goods": "Baby & Kids",
  "baby & children's clothing store": "Baby & Kids",
  "toy store":            "Baby & Kids",
  "children's toys":      "Baby & Kids",

  // Jewelry
  "jewelry/watches":      "Jewelry & Accessories",
  "jewelry":              "Jewelry & Accessories",
  "watches":              "Jewelry & Accessories",
  "accessories":          "Jewelry & Accessories",

  // Pet
  "pet supplies":         "Pet Supplies",
  "pet service":          "Pet Supplies",
  "pet store":            "Pet Supplies",
  "veterinarian":         "Pet Supplies",
  "animal":               "Pet Supplies",

  // Sports
  "sports":               "Sports & Outdoors",
  "outdoor recreation":   "Sports & Outdoors",
  "sports team":          "Sports & Outdoors",
  "sporting goods":       "Sports & Outdoors",
  "outdoor equipment":    "Sports & Outdoors",
  "camping":              "Sports & Outdoors",

  // Education
  "education website":    "Education & Courses",
  "education":            "Education & Courses",
  "school":               "Education & Courses",
  "tutor/teacher":        "Education & Courses",
  "college & university": "Education & Courses",
  "coach":                "Education & Courses",
  "training":             "Education & Courses",
  "e-learning":           "Education & Courses",

  // Entertainment
  "media/news company":   "Entertainment & Media",
  "entertainment website": "Entertainment & Media",
  "magazine":             "Entertainment & Media",
  "tv show":              "Entertainment & Media",
  "movie":                "Entertainment & Media",
  "music":                "Entertainment & Media",
  "gaming":               "Entertainment & Media",
  "video game":           "Entertainment & Media",
  "comedian":             "Entertainment & Media",
  "artist":               "Entertainment & Media",
  "musician":             "Entertainment & Media",

  // Finance
  "financial service":    "Finance & Insurance",
  "insurance company":    "Finance & Insurance",
  "bank":                 "Finance & Insurance",
  "investing":            "Finance & Insurance",
  "loan service":         "Finance & Insurance",
  "real estate":          "Finance & Insurance",

  // E-commerce
  "shopping":             "E-commerce",
  "retail company":       "E-commerce",
  "shopping & retail":    "E-commerce",
  "e-commerce website":   "E-commerce",
  "marketplace":          "E-commerce",
};

// ── Keyword patterns for fallback ─────────────────────────────────────────────

const KEYWORD_RULES: Array<{ pattern: RegExp; niche: Niche }> = [
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

// ── Domain hints ──────────────────────────────────────────────────────────────

const DOMAIN_HINTS: Record<string, Niche> = {
  "temu.com":           "E-commerce",
  "amazon.com":         "E-commerce",
  "amazon.de":          "E-commerce",
  "shopee.ph":          "E-commerce",
  "shopee.co.th":       "E-commerce",
  "aliexpress.com":     "E-commerce",
  "etsy.com":           "E-commerce",
  "ebay.com":           "E-commerce",
  "lightinthebox.com":  "E-commerce",
  "iherb.com":          "Supplements & Nutrition",
  "sephora.sg":         "Health & Beauty",
  "sephora.com":        "Health & Beauty",
  "farfetch.com":       "Fashion & Apparel",
  "skool.com":          "Education & Courses",
};

// ── Main detection function ───────────────────────────────────────────────────

export interface NicheInput {
  pageCategories?: string[];
  bodyText?: string;
  title?: string;
  linkUrl?: string;
}

export function detectNiche(input: NicheInput): Niche {
  const { pageCategories, bodyText, title, linkUrl } = input;

  // 1. Try page_categories first (most reliable)
  if (pageCategories && pageCategories.length > 0) {
    for (const cat of pageCategories) {
      const key = cat.toLowerCase().trim();
      if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
    }
    // Partial match: check if any category CONTAINS a known key
    for (const cat of pageCategories) {
      const lower = cat.toLowerCase().trim();
      for (const [mapKey, niche] of Object.entries(CATEGORY_MAP)) {
        if (lower.includes(mapKey) || mapKey.includes(lower)) return niche;
      }
    }
  }

  // 2. Try domain hints from link_url
  if (linkUrl) {
    try {
      const domain = new URL(linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`).hostname.replace("www.", "");
      if (DOMAIN_HINTS[domain]) return DOMAIN_HINTS[domain];
    } catch { /* ignore invalid URLs */ }
  }

  // 3. Keyword fallback from body + title
  const text = [bodyText ?? "", title ?? ""].join(" ");
  if (text.length > 10) {
    for (const rule of KEYWORD_RULES) {
      if (rule.pattern.test(text)) return rule.niche;
    }
  }

  return "Other";
}

/**
 * Extract niche input from raw Apify ad data (as stored in DB).
 */
export function nicheInputFromRaw(raw: Record<string, unknown>, ad: { bodyText?: string | null; title?: string | null }): NicheInput {
  const snap = (raw.snapshot ?? {}) as Record<string, unknown>;
  const cats = (snap.page_categories ?? raw.page_categories ?? raw.categories ?? []) as string[];
  const linkUrl = (snap.link_url ?? raw.link_url ?? snap.caption ?? "") as string;

  return {
    pageCategories: Array.isArray(cats) ? cats.filter(Boolean) : [],
    bodyText: ad.bodyText ?? undefined,
    title: ad.title ?? undefined,
    linkUrl,
  };
}
