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

export interface InsightBullet {
  icon: string;
  label: string;
  detail: string;
  color?: string;
}

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
  // Structured insights for seller-focused UI
  performanceSignals: InsightBullet[];
  sellerTakeaway: string;
  competitiveEdge: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysRunning(iso?: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// ─── Hook detection ──────────────────────────────────────────────────────────

const HOOK_RULES: Array<{ pattern: RegExp; type: string; color: string; bg: string }> = [
  { pattern: /\b(you|your|feel|love|hate|fear|want|dream|heart|miss|happy|sad|joy)\b/i,   type: "Emotion-Led",    color: "#F472B6", bg: "rgba(244,114,182,0.12)" },
  { pattern: /\b(how to|step|guide|learn|tips|easy|simple|master|tutorial)\b/i,          type: "How-To",         color: "#60A5FA", bg: "rgba(96,165,250,0.12)"  },
  { pattern: /\b(problem|solution|fix|struggle|tired|finally|stop|pain|issue)\b/i,       type: "Pain Point",     color: "#FB923C", bg: "rgba(251,146,60,0.12)"  },
  { pattern: /\b(limited|last chance|hurry|today only|exclusive|secret|deal|offer)\b/i,  type: "Urgency",        color: "#F87171", bg: "rgba(248,113,113,0.12)" },
  { pattern: /\b(customers|people|reviews|rated|trusted|loved|testimonial|stars)\b/i,    type: "Social Proof",   color: "#34D399", bg: "rgba(52,211,153,0.12)"  },
  { pattern: /\b(story|journey|life|experience|real|authentic|honest|review)\b/i,        type: "UGC",            color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
];

function detectHook(body: string): { hookType: string; hookColor: string; hookBg: string } {
  for (const rule of HOOK_RULES) {
    if (rule.pattern.test(body)) {
      return { hookType: rule.type, hookColor: rule.color, hookBg: rule.bg };
    }
  }
  return { hookType: "Direct", hookColor: "#94A3B8", hookBg: "rgba(148,163,184,0.10)" };
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
  if (!isActive) return { trend: "declining", trendLabel: "Inactive",    trendColor: "#F87171", trendIcon: "⏸" };
  if (days < 7)  return { trend: "rising",    trendLabel: "Just Launched", trendColor: "#34D399", trendIcon: "⚡" };
  if (days < 21) return { trend: "rising",    trendLabel: "Scaling",      trendColor: "#34D399", trendIcon: "↗" };
  if (days > 90) return { trend: "stable",    trendLabel: "Evergreen",    trendColor: "#FCD34D", trendIcon: "♾" };
  return           { trend: "rising",    trendLabel: "Growing",      trendColor: "#34D399", trendIcon: "↗" };
}

// ─── AI text generation ───────────────────────────────────────────────────────

function generatePerformanceSignals(ad: FbAd, score: number, hookType: string, days: number): InsightBullet[] {
  const bullets: InsightBullet[] = [];
  const platCount = ad.publisher_platforms?.length ?? 0;
  const hasVideo = !!ad.video_url;
  const body = ad.ad_creative_bodies?.[0] ?? "";
  const avgSpend = ((Number(ad.spend?.lower_bound ?? 0) + Number(ad.spend?.upper_bound ?? 0)) / 2);

  // Longevity signal — most important for sellers
  if (days > 90) {
    bullets.push({ icon: "🔥", label: "Evergreen winner", detail: `${days} ngày liên tục chạy — ad này profitable, đáng nghiên cứu angle`, color: "#34D399" });
  } else if (days > 30) {
    bullets.push({ icon: "📈", label: "Đã qua giai đoạn test", detail: `${days} ngày active — vượt qua giai đoạn testing, đang scale`, color: "#60A5FA" });
  } else if (days > 7) {
    bullets.push({ icon: "🧪", label: "Đang test", detail: `${days} ngày — còn trong giai đoạn testing, chưa chắc chắn profitable`, color: "#FCD34D" });
  } else {
    bullets.push({ icon: "🆕", label: "Mới launch", detail: `${days} ngày — quá sớm để đánh giá hiệu quả`, color: "#94A3B8" });
  }

  // Platform scaling
  if (platCount >= 3) {
    bullets.push({ icon: "📡", label: "Scale đa nền tảng", detail: `Chạy trên ${platCount} platforms — budget lớn, đang maximize reach`, color: "#A78BFA" });
  }

  // Creative type signal
  if (hasVideo) {
    bullets.push({ icon: "🎬", label: "Video creative", detail: "Video ad thường có CPM thấp hơn 20-40% so với image — lợi thế cạnh tranh", color: "#F472B6" });
  }

  // Hook analysis for sellers
  const hookInsights: Record<string, { detail: string; color: string }> = {
    "Emotion-Led":  { detail: "Hook cảm xúc — CTR cao, phù hợp sản phẩm giải quyết pain point cá nhân", color: "#F472B6" },
    "How-To":       { detail: "Hook giáo dục — xây dựng trust trước khi bán, tốt cho sản phẩm cần giải thích", color: "#60A5FA" },
    "Pain Point":   { detail: "Hook đánh vào nỗi đau — conversion rate cao nhất nhưng dễ bị ad fatigue", color: "#FB923C" },
    "Urgency":      { detail: "Hook urgency — push quyết định nhanh, cẩn thận bị Facebook restrict", color: "#F87171" },
    "Social Proof": { detail: "Hook social proof — giảm lo ngại mua hàng, rất hiệu quả cho sản phẩm mới", color: "#34D399" },
    "UGC":          { detail: "Hook UGC — trust cao nhất, CPM thấp vì Facebook ưu tiên content organic", color: "#A78BFA" },
    "Direct":       { detail: "Hook trực tiếp — đơn giản, hiệu quả cho sản phẩm đã có brand awareness", color: "#94A3B8" },
  };
  const hi = hookInsights[hookType];
  if (hi) {
    bullets.push({ icon: "🎯", label: `Angle: ${hookType}`, detail: hi.detail, color: hi.color });
  }

  // Spend intelligence
  if (avgSpend > 10000) {
    bullets.push({ icon: "💰", label: "Big spender", detail: `Est. spend >$${Math.round(avgSpend / 1000)}k — đối thủ có budget lớn, cần creative khác biệt để cạnh tranh`, color: "#34D399" });
  } else if (avgSpend > 1000) {
    bullets.push({ icon: "💵", label: "Spend tốt", detail: `Est. ~$${Math.round(avgSpend)} — mức chi tiêu cho thấy ad đang profitable`, color: "#60A5FA" });
  }

  // Copy length signal
  if (body.length > 300) {
    bullets.push({ icon: "📝", label: "Long-form copy", detail: "Copy dài — phù hợp sản phẩm giá cao cần thuyết phục nhiều", color: "#FCD34D" });
  } else if (body.length < 50 && body.length > 0) {
    bullets.push({ icon: "⚡", label: "Short copy", detail: "Copy ngắn — impulse buy, sản phẩm visual-driven hoặc giá thấp", color: "#FB923C" });
  }

  return bullets;
}

function generateSellerTakeaway(ad: FbAd, score: number, days: number, hookType: string): string {
  const hasVideo = !!ad.video_url;
  const hasCTA = !!ad.cta_text;

  if (score >= 80) {
    if (hasVideo) return "Ad này đang print money. Nghiên cứu kỹ angle video + hook đầu 3 giây để tạo variation.";
    return "Winner confirmed. Phân tích copy structure + CTA flow để tạo ad tương tự cho sản phẩm của bạn.";
  }
  if (score >= 65) {
    if (days > 60) return "Ad ổn định lâu dài. Có thể test angle tương tự nhưng cải thiện hook để outperform.";
    return "Đang scale tốt. Nếu bán sản phẩm tương tự, test angle này nhưng dùng creative format khác.";
  }
  if (score >= 50) {
    return "Tín hiệu tích cực nhưng chưa chắc chắn. Theo dõi thêm 1-2 tuần trước khi copy angle.";
  }
  return "Quá sớm để đánh giá. Không nên copy — chờ xem ad này có survive qua testing phase không.";
}

function generateCompetitiveEdge(ad: FbAd, hookType: string, days: number): string {
  const platCount = ad.publisher_platforms?.length ?? 0;
  const hasVideo = !!ad.video_url;

  const edges: string[] = [];

  if (days > 60 && hasVideo) edges.push("Video evergreen — tìm góc quay khác để không bị trùng creative");
  else if (days > 60) edges.push("Image ad lâu dài — thử chuyển sang video để có CPM thấp hơn");
  else if (hasVideo) edges.push("Video ad mới — nếu copy angle, dùng UGC style để khác biệt");

  if (platCount >= 3) edges.push("Đối thủ đã scale rộng — tìm niche audience chưa được target");
  if (hookType === "Urgency") edges.push("Hook urgency dễ bị ad fatigue — dùng social proof thay thế");
  if (hookType === "UGC") edges.push("UGC khó copy chính xác — tạo UGC riêng với góc nhìn khác");

  if (edges.length === 0) edges.push("Thử test 2-3 variations với hook khác nhau để tìm angle tốt hơn");

  return edges.join(". ") + ".";
}

function generateWhyWorking(ad: FbAd, score: number, hookType: string, days: number): string {
  // Keep for backward compat (AdDetailModal uses this)
  if (score >= 80) {
    return `Ad chạy ${days} ngày liên tục — profitable đã được chứng minh. Hook ${hookType.toLowerCase()} đang convert tốt. Đáng phân tích kỹ angle và copy structure.`;
  }
  if (score >= 65) {
    return `Hiệu suất ổn định sau ${days} ngày. Hook ${hookType.toLowerCase()} đang hoạt động — ad này đã qua testing phase và đang scale.`;
  }
  return `Ad mới ${days} ngày, còn trong giai đoạn test. Hook ${hookType.toLowerCase()} — chờ thêm data trước khi đánh giá.`;
}

function generateAudience(ad: FbAd): string {
  const platforms = ad.publisher_platforms ?? [];
  const hasIG = platforms.some(p => p.toLowerCase() === "instagram");
  const country = ad.country ?? "US";
  const ageRange = hasIG ? "22–38" : "28–48";
  return `${ageRange} • Mixed (F-leaning) • ${country}\nE-commerce, Online Shopping, Trending Products`;
}

function generateCreativeStrategy(hookType: string, days: number, _score: number): string {
  const strategies: Record<string, string> = {
    "Emotion-Led":  "Mở bằng cảm xúc → bypass lý trí → dẫn đến CTA. Tỷ lệ giữ chân cao.",
    "How-To":       "Dạy trước, bán sau. Tạo trust rồi mới pitch — hiệu quả với cold audience.",
    "Pain Point":   "Khuấy nỗi đau → đặt sản phẩm làm giải pháp duy nhất. CR cao nhưng dễ fatigue.",
    "Urgency":      "Tạo khan hiếm giả → ép quyết định nhanh. Cẩn thận bị Facebook penalize.",
    "Social Proof": "Dùng tâm lý đám đông — review/rating giảm rào cản mua hàng.",
    "UGC":          "Content tự nhiên như user thật → trust cao, CPM thấp vì FB ưu tiên organic.",
    "Direct":       "Copy thẳng vào benefit → CTA. Đơn giản, hiệu quả cho sản phẩm đã quen thuộc.",
  };

  const base = strategies[hookType] ?? "Approach trực tiếp với value proposition rõ ràng.";
  const fatigue = days > 90 ? " Chạy >90 ngày chưa fatigue — creative này có staying power." :
                  days > 60 ? " Sau 60+ ngày vẫn active — chưa có dấu hiệu fatigue." : "";
  return base + fatigue;
}

// ─── Memoization cache ──────────────────────────────────────────────────────

const insightsCache = new Map<string, AIInsights>();

// ─── Main export ─────────────────────────────────────────────────────────────

export function getAIInsights(ad: FbAd): AIInsights {
  const cached = insightsCache.get(ad.id);
  if (cached) return cached;
  const days = daysRunning(ad.ad_delivery_start_time);
  const body = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0] ?? "";
  const isActive = ad.is_active !== false;

  // Winning Score — multi-factor heuristic (15–99)
  // Weighted toward signals available in our data (duration, platforms, creative, CTA).
  // Traction data (impressions/spend/geo) is bonus when available.
  // Max without traction: ~88. Max with traction: ~99.
  // Tiers: 15-34 Weak, 35-50 Testing, 51-70 Promising, 71-84 Winning, 85+ Elite
  let score = 20;

  // Duration (max +25) — strongest signal: advertiser keeps paying = proven ROI
  if      (days > 180) score += 25;
  else if (days > 90)  score += 20;
  else if (days > 60)  score += 15;
  else if (days > 30)  score += 10;
  else if (days > 14)  score += 6;
  else if (days > 7)   score += 3;

  // Still active = advertiser keeps paying (+14)
  if (isActive) score += 14;

  // Platform breadth (max +10) — scaling across platforms = confidence
  const platCount = ad.publisher_platforms?.length ?? 0;
  if      (platCount >= 4) score += 10;
  else if (platCount >= 3) score += 8;
  else if (platCount >= 2) score += 5;
  else if (platCount >= 1) score += 2;

  // Creative quality (max +12) — video + rich copy = high-effort creative
  if (ad.video_url)        score += 7;
  else if (ad.image_url)   score += 4;
  if (body.length > 100)   score += 5;
  else if (body.length > 40) score += 3;

  // CTA + link signals (max +7) — proper funnel setup
  if (ad.cta_text)                      score += 4;
  if (ad.ad_creative_link_titles?.[0])  score += 3;

  // Traction data — bonus when available (max +11)
  const impressLo = Number(ad.impressions?.lower_bound ?? 0);
  const impressHi = Number(ad.impressions?.upper_bound ?? 0);
  const avgImpress = (impressLo + impressHi) / 2;
  if      (avgImpress > 500_000) score += 6;
  else if (avgImpress > 100_000) score += 4;
  else if (avgImpress > 10_000)  score += 3;
  else if (avgImpress > 1_000)   score += 1;

  const spendLo = Number(ad.spend?.lower_bound ?? 0);
  const spendHi = Number(ad.spend?.upper_bound ?? 0);
  const avgSpend = (spendLo + spendHi) / 2;
  if      (avgSpend > 10_000) score += 3;
  else if (avgSpend > 1_000)  score += 2;
  else if (avgSpend > 100)    score += 1;

  // Geographic reach (max +2) — bonus
  const countryCount = ad.countries?.length ?? (ad.country ? 1 : 0);
  if      (countryCount >= 5) score += 2;
  else if (countryCount >= 3) score += 1;

  const winningScore = Math.min(99, Math.max(15, score));

  const { hookType, hookColor, hookBg } = detectHook(body);
  const { trend, trendLabel, trendColor, trendIcon } = computeTrend(isActive, days);

  const result: AIInsights = {
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
    whyWorking:        generateWhyWorking(ad, winningScore, hookType, days),
    targetAudience:    generateAudience(ad),
    creativeStrategy:  generateCreativeStrategy(hookType, days, winningScore),
    performanceSignals: generatePerformanceSignals(ad, winningScore, hookType, days),
    sellerTakeaway:    generateSellerTakeaway(ad, winningScore, days, hookType),
    competitiveEdge:   generateCompetitiveEdge(ad, hookType, days),
  };

  insightsCache.set(ad.id, result);
  return result;
}
