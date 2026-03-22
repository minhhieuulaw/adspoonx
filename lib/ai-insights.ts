import type { FbAd } from "./facebook-ads";

// ─── Dropshipping detection ───────────────────────────────────────────────────

const DROPSHIPPING_PATTERNS = [
  /\b(dropshipping|drop.?ship(ping)?|aliexpress|dhgate|cj.?dropship(ping)?)\b/i,
  /\b(free.?shipping|ships? from (china|warehouse)|processing.?time)\b/i,
  /\b(limited.?stock|while.?supplies? last|selling.?fast|almost.?sold.?out|low.?stock)\b/i,
  /\b(order.?now|get.?yours|grab.?yours|claim.?yours|shop.?now.{0,5}(today|limited))\b/i,
  /\b([5-9][0-9]%.?off|buy.?[23].?get.?[12].?free)\b/i,
  /\b(trending|viral|tiktok.?(famous|made me buy|viral)|seen.?on.?tv)\b/i,
  /\b(worldwide.?shipping|international.?shipping|ships? (world|globe|everywhere))\b/i,
];

export function getDropshippingScore(ad: FbAd): number {
  const text = [
    ad.ad_creative_bodies?.[0] ?? "",
    ad.ad_creative_link_titles?.[0] ?? "",
    ad.ad_creative_link_descriptions?.[0] ?? "",
    ad.page_name ?? "",
  ].join(" ");

  let score = 0;
  for (const pattern of DROPSHIPPING_PATTERNS) {
    if (pattern.test(text)) score += 18;
  }
  // Audience Network = often dropshipping ad network targeting
  if ((ad.publisher_platforms ?? []).some(p => p === "audience_network")) score += 10;
  // Multi-country signal
  if ((ad.countries?.length ?? 0) > 2) score += 10;

  return Math.min(100, score);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type Trend = "rising" | "stable" | "declining";

export interface AIInsights {
  winningScore: number;
  scoreColor: string;
  scoreGlow: boolean;
  hookType: string;
  hookColor: string;
  hookBg: string;
  trend: Trend;
  trendLabel: string;
  trendColor: string;
  trendIcon: string;
  whyWorking: string;
  targetAudience: string;
  creativeStrategy: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysRunning(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ─── Hook detection ──────────────────────────────────────────────────────────

const HOOK_RULES: Array<{ pattern: RegExp; type: string; color: string; bg: string }> = [
  { pattern: /\b(you|your|feel|love|hate|fear|want|dream|heart|miss|happy|sad|joy)\b/i,   type: "Emotional",        color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  { pattern: /\b(how to|step|guide|learn|tips|easy|simple|master|tutorial)\b/i,          type: "Tutorial",         color: "#60A5FA", bg: "rgba(96,165,250,0.12)"  },
  { pattern: /\b(problem|solution|fix|struggle|tired|finally|stop|pain|issue)\b/i,       type: "Problem-Solution", color: "#FB923C", bg: "rgba(251,146,60,0.12)"  },
  { pattern: /\b(limited|last chance|hurry|today only|exclusive|secret|deal|offer)\b/i,  type: "FOMO",             color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  { pattern: /\b(customers|people|reviews|rated|trusted|loved|testimonial|stars)\b/i,    type: "Social Proof",     color: "#34D399", bg: "rgba(52,211,153,0.12)"  },
  { pattern: /\b(story|journey|life|experience|real|authentic|honest|review)\b/i,        type: "UGC",              color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
];

function detectHook(body: string): { hookType: string; hookColor: string; hookBg: string } {
  for (const rule of HOOK_RULES) {
    if (rule.pattern.test(body)) {
      return { hookType: rule.type, hookColor: rule.color, hookBg: rule.bg };
    }
  }
  return { hookType: "Direct Response", hookColor: "#94A3B8", hookBg: "rgba(148,163,184,0.10)" };
}

// ─── Score color ─────────────────────────────────────────────────────────────

export function getScoreColor(score: number): string {
  if (score >= 80) return "#A78BFA"; // purple
  if (score >= 65) return "#60A5FA"; // blue
  if (score >= 50) return "#FCD34D"; // amber
  return "#94A3B8";                  // muted
}

export function getScoreBg(score: number): string {
  if (score >= 80) return "rgba(124,58,237,0.15)";
  if (score >= 65) return "rgba(59,130,246,0.15)";
  if (score >= 50) return "rgba(245,158,11,0.15)";
  return "rgba(148,163,184,0.10)";
}

export function getScoreBorder(score: number): string {
  if (score >= 80) return "rgba(124,58,237,0.40)";
  if (score >= 65) return "rgba(59,130,246,0.40)";
  if (score >= 50) return "rgba(245,158,11,0.40)";
  return "rgba(148,163,184,0.20)";
}

// ─── Trend ───────────────────────────────────────────────────────────────────

function computeTrend(isActive: boolean, days: number): { trend: Trend; trendLabel: string; trendColor: string; trendIcon: string } {
  if (!isActive) return { trend: "declining", trendLabel: "Paused",    trendColor: "#F87171", trendIcon: "↓" };
  if (days < 7)  return { trend: "rising",    trendLabel: "Launching", trendColor: "#34D399", trendIcon: "↑" };
  if (days < 21) return { trend: "rising",    trendLabel: "Scaling",   trendColor: "#34D399", trendIcon: "↑" };
  if (days > 90) return { trend: "stable",    trendLabel: "Evergreen", trendColor: "#FCD34D", trendIcon: "→" };
  return           { trend: "rising",    trendLabel: "Growing",   trendColor: "#34D399", trendIcon: "↑" };
}

// ─── AI text generation ───────────────────────────────────────────────────────

function generateWhyWorking(ad: FbAd, score: number, hookType: string, days: number): string {
  const brand = ad.page_name ?? "This brand";
  const platforms = (ad.publisher_platforms ?? []).join(" & ") || "Facebook";

  if (score >= 80) {
    return `${brand} has cracked a high-converting formula. Running ${days} days across ${platforms} signals proven ROI — advertisers never sustain spend this long without results. The ${hookType.toLowerCase()} creative angle is deeply resonating with the target market.`;
  }
  if (score >= 65) {
    return `Solid performer with consistent delivery across ${platforms}. The ${hookType.toLowerCase()} framing is connecting with audiences — ${days} days of continuous spend suggests positive signal and steady scaling.`;
  }
  return `Early-stage ad with initial traction. The ${hookType.toLowerCase()} approach shows promise — ${days} days in with continued delivery suggests the algorithm is still finding its audience.`;
}

function generateAudience(ad: FbAd): string {
  const platforms = ad.publisher_platforms ?? [];
  const hasIG = platforms.some(p => p.toLowerCase() === "instagram");
  const country = ad.country ?? "US";
  const ageRange = hasIG ? "22–38" : "28–48";
  return `${ageRange} • Mixed (F-leaning) • ${country}\nE-commerce, Online Shopping, Trending Products`;
}

function generateCreativeStrategy(hookType: string, days: number, score: number): string {
  const strategies: Record<string, string> = {
    "Emotional":         "Leads with emotion to bypass rational resistance. High retention scroll-stopper.",
    "Tutorial":          "Educational hook builds trust before the pitch. Works well for new audiences.",
    "Problem-Solution":  "Agitates a pain point, then positions the product as the only solution.",
    "FOMO":              "Creates artificial urgency to compress the decision-making timeline.",
    "Social Proof":      "Leverages crowd psychology — peer validation reduces purchase anxiety.",
    "UGC":               "Authentic user content dramatically increases trust and click-through rate.",
    "Direct Response":   "Clear, benefit-focused copy optimized for immediate conversion action.",
  };

  const base = strategies[hookType] ?? "Straightforward direct response approach with clear value proposition.";
  const longevity = days > 60 ? " High longevity confirms creative fatigue has not yet set in." : "";
  return base + longevity;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function getAIInsights(ad: FbAd): AIInsights {
  const days = daysRunning(ad.ad_delivery_start_time);
  const body = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0] ?? "";
  const isActive = ad.is_active !== false;

  // Winning Score (heuristic — ranges 15–99)
  let score = 30;
  if (days > 90) score += 28;
  else if (days > 30) score += 20;
  else if (days > 14) score += 12;
  else if (days > 7)  score += 6;
  if (isActive)                                   score += 15;
  if (ad.image_url)                               score += 8;
  if (body.length > 40)                           score += 7;
  if ((ad.publisher_platforms?.length ?? 0) > 1)  score += 9;
  if (ad.ad_creative_link_titles?.[0])            score += 2;
  const winningScore = Math.min(99, Math.max(15, score));

  const { hookType, hookColor, hookBg } = detectHook(body);
  const { trend, trendLabel, trendColor, trendIcon } = computeTrend(isActive, days);

  return {
    winningScore,
    scoreColor:  getScoreColor(winningScore),
    scoreGlow:   winningScore >= 80,
    hookType,
    hookColor,
    hookBg,
    trend,
    trendLabel,
    trendColor,
    trendIcon,
    whyWorking:       generateWhyWorking(ad, winningScore, hookType, days),
    targetAudience:   generateAudience(ad),
    creativeStrategy: generateCreativeStrategy(hookType, days, winningScore),
  };
}
