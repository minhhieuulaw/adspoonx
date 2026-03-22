/** Public-safe niche config — no server imports */

export interface Niche {
  slug:        string;
  label:       string;
  keyword:     string;
  emoji:       string;
  description: string;
}

export const NICHES: Niche[] = [
  { slug: "fashion",     label: "Fashion & Apparel",  keyword: "fashion",      emoji: "👗", description: "Top-performing fashion ads analyzed by AI" },
  { slug: "skincare",    label: "Skincare & Beauty",  keyword: "skincare",     emoji: "✨", description: "Winning skincare & beauty ads with proven ROI" },
  { slug: "fitness",     label: "Fitness & Health",   keyword: "fitness",      emoji: "💪", description: "High-converting fitness ads running right now" },
  { slug: "home-decor",  label: "Home & Decor",       keyword: "home decor",   emoji: "🏠", description: "Best home decor ads driving real results" },
  { slug: "jewelry",     label: "Jewelry",             keyword: "jewelry",      emoji: "💎", description: "Best-performing jewelry ads with highest AI scores" },
  { slug: "supplement",  label: "Supplements",         keyword: "supplement",   emoji: "💊", description: "Winning supplement & wellness ads" },
  { slug: "tech",        label: "Tech & Gadgets",      keyword: "tech gadget",  emoji: "⚡", description: "Top tech & gadget ads analyzed by AI" },
  { slug: "pet",         label: "Pet Products",        keyword: "pet",          emoji: "🐾", description: "Top pet product ads with proven ROI" },
  { slug: "clothing",    label: "Clothing",             keyword: "clothing",     emoji: "👕", description: "Top clothing brand ads running now" },
  { slug: "beauty",      label: "Beauty",               keyword: "beauty",       emoji: "💄", description: "Viral beauty ads with high engagement" },
];

export function getNicheBySlug(slug: string): Niche | undefined {
  return NICHES.find(n => n.slug === slug);
}
