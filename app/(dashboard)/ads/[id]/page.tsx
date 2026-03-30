"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Eye, DollarSign, Globe, Monitor,
  ExternalLink, Bookmark, Play, ShoppingBag, TrendingUp, Sparkles,
} from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { useSavedAds } from "@/lib/hooks/useSavedAds";

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysRunning(iso?: string) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
function fmtNum(lo?: string, hi?: string) {
  const a = (Number(lo ?? 0) + Number(hi ?? 0)) / 2;
  if (!a) return null;
  if (a >= 1e6) return `${(a / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${Math.round(a / 1e3)}K`;
  return String(Math.round(a));
}
function fmtSpend(lo?: string, hi?: string) {
  const a = (Number(lo ?? 0) + Number(hi ?? 0)) / 2;
  if (a < 0.1) return null;
  return a >= 1000 ? `$${(a / 1000).toFixed(1)}k` : `$${a.toFixed(0)}`;
}

const PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#38BDF8"];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

const PLAT_COLOR: Record<string, string> = {
  facebook: "#60A5FA", instagram: "#F472B6", messenger: "#38BDF8",
  audience_network: "#A78BFA", threads: "#E2E8F0",
};
const PLAT_LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger",
  audience_network: "Audience Network", threads: "Threads",
};

function FlagImg({ code }: { code: string }) {
  if (!code || code.length !== 2) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`}
      width={16} height={16} alt={code} className="rounded-full flex-shrink-0"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
  );
}

function StatItem({ icon: Icon, label, value, highlight }: { icon: React.ElementType; label: string; value: string | React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-1.5">
        <Icon size={12} strokeWidth={1.5} style={{ color: highlight ? "var(--ai-light)" : "var(--text-3)" }} />
        <span className="text-[12px]" style={{ color: "var(--text-2)" }}>{label}</span>
      </div>
      <span className="font-data text-[12px] font-semibold" style={{ color: highlight ? "var(--ai-light)" : "var(--text-1)" }}>{value}</span>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { savedIds, toggleSave } = useSavedAds();
  const [ad, setAd] = useState<FbAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/ads/${id}`).then(r => {
      if (!r.ok) throw new Error();
      return r.json();
    }).then(setAd).catch(() => setError("Failed to load ad")).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-[var(--ai-light)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-[#F87171] font-medium">{error ?? "Ad not found"}</p>
        <button onClick={() => router.back()} className="mt-4 text-sm hover:underline" style={{ color: "var(--ai-light)" }}>Go back</button>
      </div>
    );
  }

  const ai = getAIInsights(ad);
  const storeName = ad.page_name ?? "Unknown";
  const color = avatarColor(storeName);
  const isActive = ad.is_active !== false;
  const days = daysRunning(ad.ad_delivery_start_time);
  const platforms = ad.publisher_platforms ?? [];
  const body = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0];
  const title = ad.ad_creative_link_titles?.[0];
  const countries = ad.countries ?? (ad.country ? [ad.country] : []);
  const impressFmt = fmtNum(ad.impressions?.lower_bound, ad.impressions?.upper_bound);
  const spendFmt = fmtSpend(ad.spend?.lower_bound, ad.spend?.upper_bound);
  const isSaved = savedIds.has(ad.id);

  const spendAvg = (Number(ad.spend?.lower_bound ?? 0) + Number(ad.spend?.upper_bound ?? 0)) / 2;
  const dailySpend = days && days > 0 ? spendAvg / days : 0;
  const estDailyRev = dailySpend > 0 ? Math.round(dailySpend * 3.5) : null;
  const estMonthlyRev = estDailyRev ? estDailyRev * 30 : null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
      className="max-w-6xl mx-auto">

      {/* Back + Actions */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm transition-colors hover:text-white"
          style={{ color: "var(--text-3)" }}>
          <ArrowLeft size={16} /> Back to Ads
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => toggleSave(ad)} className={`save-btn ${isSaved ? "save-btn--active" : ""}`}
            title={isSaved ? "Saved" : "Save"}>
            <Bookmark size={16} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
          </button>
          {ad.ad_snapshot_url && (
            <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
              className="panel-btn p-2 rounded-lg flex items-center gap-1.5 text-[12px]"
              style={{ color: "var(--text-2)" }}>
              <ExternalLink size={14} /> Ad Library
            </a>
          )}
        </div>
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* LEFT — Creative + Copy (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-4">

          {/* Creative */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {ad.page_profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.page_profile_picture_url} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  style={{ border: `1.5px solid ${color}50` }} />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                  style={{ background: `${color}20`, color, border: `1.5px solid ${color}35` }}>
                  {storeName.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{storeName}</p>
                <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--text-3)" }}>
                  <span>Sponsored</span>
                  <span style={{ color: isActive ? "var(--green-light)" : "var(--text-3)" }}>
                    ● {isActive ? "Live" : "Paused"} {days !== null && `${days}d`}
                  </span>
                </div>
              </div>
            </div>

            {/* Media */}
            <div style={{ background: "rgba(0,0,0,0.3)" }}>
              {ad.video_url ? (
                <video src={ad.video_url} poster={ad.thumbnail_url ?? ad.image_url} controls playsInline
                  className="w-full" style={{ maxHeight: 500, display: "block" }} />
              ) : ad.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.image_url} alt={storeName} className="w-full object-cover" style={{ maxHeight: 500, display: "block" }} />
              ) : (
                <div className="flex items-center justify-center" style={{ height: 200, color: "var(--text-3)" }}>No preview</div>
              )}
            </div>

            {/* CTA */}
            {(title || ad.cta_text) && (
              <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{title ?? storeName}</p>
                {ad.cta_text && (ad.link_url || ad.ad_snapshot_url) && (
                  <a href={ad.link_url ?? ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0 flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "1px solid rgba(124,58,237,0.5)" }}>
                    {ad.cta_text} <ExternalLink size={9} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Ad Copy */}
          {body && (
            <div className="rounded-xl p-5" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Ad Copy</p>
              <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>{body}</p>
            </div>
          )}

          {/* Platforms + Countries */}
          <div className="rounded-xl p-5 flex flex-wrap gap-4" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {platforms.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {platforms.map(p => {
                  const c = PLAT_COLOR[p.toLowerCase()] ?? "#94A3B8";
                  return (
                    <span key={p} className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                      style={{ color: c, background: `${c}15`, border: `1px solid ${c}30` }}>
                      {PLAT_LABEL[p.toLowerCase()] ?? p}
                    </span>
                  );
                })}
              </div>
            )}
            {countries.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Globe size={12} style={{ color: "var(--text-3)" }} />
                {countries.slice(0, 10).map(c => <FlagImg key={c} code={c} />)}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Analytics (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">

          {/* Ad Details */}
          <div className="rounded-xl p-4" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2 mb-3">
              <Monitor size={13} style={{ color: "var(--ai-light)" }} />
              <span className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>Ad Details</span>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: isActive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: isActive ? "var(--green-light)" : "#F87171" }}>
                ● {isActive ? "LIVE" : "PAUSED"}
              </span>
            </div>
            <StatItem icon={Calendar} label="Started" value={fmtDate(ad.ad_delivery_start_time)} />
            <StatItem icon={Calendar} label="Days running" value={days !== null ? `${days}d` : "—"} highlight={(days ?? 0) > 60} />
            {impressFmt && <StatItem icon={Eye} label="Reach" value={impressFmt} />}
            {spendFmt && <StatItem icon={DollarSign} label="Spend" value={spendFmt} />}
            {dailySpend > 0 && <StatItem icon={TrendingUp} label="Daily spend" value={`$${dailySpend.toFixed(0)}/d`} />}
          </div>

          {/* AI Score */}
          <div className="rounded-xl p-4" style={{ background: getScoreBg(ai.winningScore), border: `1px solid ${getScoreBorder(ai.winningScore)}` }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: ai.scoreColor, opacity: 0.7 }}>AI Performance Score</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-[38px] font-black leading-none" style={{ color: ai.scoreColor }}>{ai.winningScore}</span>
              <span className="text-[13px]" style={{ color: ai.scoreColor, opacity: 0.5 }}>/100</span>
              <span className="ml-auto text-[12px] font-semibold" style={{ color: ai.scoreColor }}>
                {ai.winningScore >= 80 ? "Top Performer" : ai.winningScore >= 65 ? "Strong" : ai.winningScore >= 50 ? "Moderate" : "Early Stage"}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(0,0,0,0.2)" }}>
              <div className="h-full rounded-full" style={{ width: `${ai.winningScore}%`, background: `linear-gradient(90deg, ${ai.scoreColor}80, ${ai.scoreColor})` }} />
            </div>
            <div className="flex gap-1">
              <span className="ad-tag" style={{ background: ai.hookBg, color: ai.hookColor, borderColor: `${ai.hookColor}28` }}>{ai.hookType}</span>
              <span className="ad-tag" style={{ background: `${ai.trendColor}15`, color: ai.trendColor, borderColor: `${ai.trendColor}28` }}>{ai.trendIcon} {ai.trendLabel}</span>
            </div>
          </div>

          {/* Revenue */}
          {estDailyRev && (
            <div className="rounded-xl p-4" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-3">
                <ShoppingBag size={13} style={{ color: "var(--green-light)" }} />
                <span className="text-[12px] font-semibold" style={{ color: "var(--text-1)" }}>Revenue Estimate</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg p-3" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "var(--green-light)" }}>Daily</p>
                  <span className="text-[18px] font-black" style={{ color: "var(--green-light)" }}>
                    ${estDailyRev >= 1000 ? `${(estDailyRev / 1000).toFixed(1)}k` : estDailyRev}
                  </span>
                </div>
                <div className="rounded-lg p-3" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <p className="text-[9px] font-bold uppercase mb-1" style={{ color: "var(--green-light)" }}>Monthly</p>
                  <span className="text-[18px] font-black" style={{ color: "var(--green-light)" }}>
                    ${estMonthlyRev! >= 1000 ? `${(estMonthlyRev! / 1000).toFixed(1)}k` : estMonthlyRev}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Seller Takeaway */}
          <div className="rounded-xl p-4" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.22)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--ai-light)" }}>Seller Takeaway</p>
            <p className="text-[13px] leading-relaxed font-medium" style={{ color: "var(--text-1)" }}>{ai.sellerTakeaway}</p>
          </div>

          {/* Signals */}
          <div className="rounded-xl p-4" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-[9px] font-bold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>Performance Signals</p>
            <div className="flex flex-col gap-2.5">
              {ai.performanceSignals.slice(0, 5).map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[12px] flex-shrink-0 mt-px">{s.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold leading-tight" style={{ color: s.color ?? "var(--text-1)" }}>{s.label}</p>
                    <p className="text-[10px] leading-snug" style={{ color: "var(--text-3)" }}>{s.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strategy */}
          <div className="grid grid-cols-1 gap-3">
            <div className="rounded-xl p-4" style={{ background: "var(--card-deep)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Creative Strategy</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>{ai.creativeStrategy}</p>
            </div>
            <div className="rounded-xl p-4" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "#34D399" }}>How to Compete</p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>{ai.competitiveEdge}</p>
            </div>
          </div>

          {/* ID */}
          <p className="text-[10px] font-mono" style={{ color: "var(--text-3)" }}>ID: {ad.id}</p>
        </div>
      </div>
    </motion.div>
  );
}
