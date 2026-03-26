"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, Eye, DollarSign, Globe, Monitor, Bookmark,
  ExternalLink, Play, Pause, ChevronLeft, ChevronDown, TrendingUp,
  Volume2, VolumeX, Package, ShoppingBag, Sparkles, ChevronUp, Zap, AlertCircle,
} from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { useSavedAds } from "@/lib/hooks/useSavedAds";
import type { AdAnalysisResult } from "@/app/api/ai/analyze-ad/route";

interface Props {
  ad: FbAd | null;
  onClose: () => void;
  isMobile?: boolean;
  allAds?: FbAd[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysRunning(iso?: string) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}
function fmtNum(lower?: string, upper?: string): string | null {
  const lo = Number(lower ?? 0), hi = Number(upper ?? 0);
  if (!lo && !hi) return null;
  const avg = (lo + hi) / 2;
  if (avg >= 1_000_000) return `${(avg / 1_000_000).toFixed(1)}M`;
  if (avg >= 1_000) return `${Math.round(avg / 1_000)}K`;
  return String(Math.round(avg));
}
function fmtSpend(lower?: string, upper?: string): string | null {
  const lo = Number(lower ?? 0), hi = Number(upper ?? 0);
  if (!lo && !hi) return null;
  const avg = (lo + hi) / 2;
  if (avg < 0.1) return null;
  return avg >= 1000 ? `$${(avg / 1000).toFixed(1)}k` : `$${avg.toFixed(0)}`;
}

const AVATAR_PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#38BDF8"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network",
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#60A5FA", instagram: "#F472B6", messenger: "#38BDF8", audience_network: "#A78BFA",
};

function FlagImg({ code }: { code: string }) {
  if (!code || code.length !== 2) return null;
  const c = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/20x15/${c}.png`}
      srcSet={`https://flagcdn.com/40x30/${c}.png 2x`}
      width={16} height={12} alt={code}
      style={{ borderRadius: 2, display: "inline-block", verticalAlign: "middle" }}
    />
  );
}

// ── Video preview with controls ──────────────────────────────────────────────

function VideoPreview({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const [volume, setVolume] = useState(0.7);

  function toggle() {
    if (playing) { ref.current?.pause(); setPlaying(false); }
    else ref.current?.play().then(() => setPlaying(true)).catch(() => {});
  }

  function handleTimeUpdate() {
    const v = ref.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  }

  function seekTo(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    const bar = progressRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    v.currentTime = pct * v.duration;
  }

  function handleVolumeChange(val: number) {
    const v = ref.current;
    if (!v) return;
    setVolume(val);
    v.volume = val;
    if (val === 0) { v.muted = true; setMuted(true); }
    else { v.muted = false; setMuted(false); }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    if (!v.muted && volume === 0) { setVolume(0.5); v.volume = 0.5; }
  }

  return (
    <div style={{ position: "relative", cursor: "pointer" }} onClick={toggle}>
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full object-cover" style={{ display: "block", maxHeight: 360 }} aria-label={alt}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Center play overlay when paused */}
      {!playing && (
        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.28)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(255,255,255,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {playing && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-2 py-1.5"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={toggle} style={{ color: "white", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            {playing ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
          </button>

          {/* Progress bar */}
          <div ref={progressRef} onClick={seekTo}
            className="flex-1 h-1 rounded-full cursor-pointer" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--ai-light)", transition: "width 100ms linear" }} />
          </div>

          {/* Volume control */}
          <div className="relative" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
            <button onClick={toggleMute} style={{ color: "white", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              {muted ? <VolumeX size={12} strokeWidth={2} /> : <Volume2 size={12} strokeWidth={2} />}
            </button>
            {showVolume && (
              <div style={{
                position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                marginBottom: 4, padding: "8px 6px", borderRadius: 6,
                background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
                display: "flex", flexDirection: "column", alignItems: "center",
              }}>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={volume}
                  onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                  onClick={e => e.stopPropagation()}
                  className="volume-slider"
                  style={{
                    writingMode: "vertical-lr",
                    direction: "rtl",
                    width: 4, height: 60,
                    appearance: "none", WebkitAppearance: "none",
                    background: `linear-gradient(to top, var(--ai-light) ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
                    borderRadius: 2, outline: "none", cursor: "pointer",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expandable text ──────────────────────────────────────────────────────────

function ExpandableText({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 150;

  return (
    <div>
      <p
        className="text-[12px] leading-relaxed whitespace-pre-wrap"
        style={{
          color: "var(--text-2)",
          ...(isLong && !expanded ? {
            display: "-webkit-box",
            WebkitLineClamp: maxLines,
            WebkitBoxOrient: "vertical" as const,
            overflow: "hidden",
          } : {}),
        }}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-medium mt-1 flex items-center gap-0.5"
          style={{ color: "var(--ai-light)" }}
        >
          {expanded ? "Show less" : "See more"}
          <ChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 150ms" }} />
        </button>
      )}
    </div>
  );
}

// ── Stat row (Minea-style key-value) ──────────────────────────────────────────

function StatRow({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value: string | React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-2">
        <Icon size={13} strokeWidth={1.5} style={{ color: highlight ? "var(--ai-light)" : "var(--text-3)" }} />
        <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{label}</span>
      </div>
      <span className="font-data text-[12px] font-semibold" style={{ color: highlight ? "var(--ai-light)" : "var(--text-1)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Mini ad card for "Ads from this shop" ─────────────────────────────────────

function MiniAdCard({ ad, onClick }: { ad: FbAd; onClick: () => void }) {
  const isActive = ad.is_active !== false;
  const days = daysRunning(ad.ad_delivery_start_time);

  return (
    <div onClick={onClick} className="flex-shrink-0 cursor-pointer rounded-[8px] overflow-hidden"
      style={{
        width: 140, background: "var(--bg-card)", border: "1px solid var(--border)",
        transition: "border-color 150ms",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
    >
      {/* Thumbnail */}
      <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
        {(ad.image_url || ad.thumbnail_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ad.thumbnail_url ?? ad.image_url!} alt="" loading="lazy"
            className="w-full h-full object-cover" style={{ display: "block" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px]" style={{ color: "var(--text-3)" }}>
            No preview
          </div>
        )}
      </div>
      {/* Info */}
      <div className="px-1.5 py-1.5">
        <div className="flex items-center gap-1 mb-0.5">
          <span className={isActive ? "live-dot" : ""} style={{
            width: 4, height: 4, borderRadius: "50%", display: "inline-block",
            background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.2)",
          }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: isActive ? "var(--green-light)" : "var(--text-3)" }}>
            {isActive ? "Active" : "Inactive"}
          </span>
          {days !== null && (
            <span className="font-data" style={{ fontSize: 8, color: "var(--text-3)" }}>{days}d</span>
          )}
        </div>
        <p className="text-[8px] truncate" style={{ color: "var(--text-3)" }}>
          {fmtDate(ad.ad_delivery_start_time)}
        </p>
      </div>
    </div>
  );
}

// ── Simple sparkline (CSS-only) ──────────────────────────────────────────────

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 24 }}>
      {values.map((v, i) => (
        <div key={i} className="rounded-sm" style={{
          flex: 1,
          height: `${Math.max(8, (v / max) * 100)}%`,
          background: i === values.length - 1 ? color : `${color}40`,
          transition: "height 300ms var(--ease)",
          minWidth: 3,
        }} />
      ))}
    </div>
  );
}

// ── Panel content ─────────────────────────────────────────────────────────────

function ClaudeSection({ label, text, tag, highlight, dim }: { label: string; text: string; tag?: boolean; highlight?: boolean; dim?: boolean }) {
  if (tag) return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
        style={{ background: "rgba(167,139,250,0.15)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.25)" }}>{text}</span>
    </div>
  );
  const textColor = highlight ? "#6ee7b7" : dim ? "#F87171" : "var(--text-2)";
  const bg        = highlight ? "rgba(52,211,153,0.05)" : dim ? "rgba(248,113,113,0.05)" : "rgba(255,255,255,0.02)";
  const border    = highlight ? "rgba(52,211,153,0.15)"  : dim ? "rgba(248,113,113,0.15)"  : "rgba(255,255,255,0.06)";
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
      <div className="rounded-[7px] px-2.5 py-2" style={{ background: bg, border: `1px solid ${border}` }}>
        <p className="text-[11px] leading-relaxed" style={{ color: textColor }}>{text}</p>
      </div>
    </div>
  );
}

export function PanelContent({ ad, onClose, allAds = [] }: { ad: FbAd; onClose: () => void; allAds?: FbAd[] }) {
  const { savedIds, toggleSave } = useSavedAds();
  const isSaved    = savedIds.has(ad.id);
  const ai         = getAIInsights(ad);
  const storeName  = ad.page_name ?? "Unknown";
  const color      = avatarColor(storeName);
  const isActive   = ad.is_active !== false;
  const days       = daysRunning(ad.ad_delivery_start_time);
  const platforms  = ad.publisher_platforms ?? [];
  const body       = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0];
  const title      = ad.ad_creative_link_titles?.[0];
  const countries  = ad.countries ?? (ad.country ? [ad.country] : []);
  const impressFmt = fmtNum(ad.impressions?.lower_bound, ad.impressions?.upper_bound);
  const spendFmt   = fmtSpend(ad.spend?.lower_bound, ad.spend?.upper_bound);
  const audienceFmt= fmtNum(
    ad.estimated_audience_size?.lower_bound?.toString(),
    ad.estimated_audience_size?.upper_bound?.toString()
  );

  // Ads from this shop
  const shopAds = allAds.filter(a => a.page_name === ad.page_name && a.id !== ad.id).slice(0, 10);
  const totalShopAds = allAds.filter(a => a.page_name === ad.page_name).length;
  const activeShopAds = allAds.filter(a => a.page_name === ad.page_name && a.is_active !== false).length;

  // Estimated revenue (heuristic from spend + days running + active ads count)
  const spendLo = Number(ad.spend?.lower_bound ?? 0);
  const spendHi = Number(ad.spend?.upper_bound ?? 0);
  const avgSpend = (spendLo + spendHi) / 2;
  const dailySpend = days && days > 0 ? avgSpend / days : 0;
  const roas = 3.5; // industry average ROAS estimate
  const estDailyRevenue = dailySpend > 0 ? Math.round(dailySpend * roas) : null;
  const estMonthlyRevenue = estDailyRevenue ? estDailyRevenue * 30 : null;
  // Store-level estimate: multiply by active ads count
  const estStoreMonthly = estMonthlyRevenue && activeShopAds > 1
    ? estMonthlyRevenue * Math.min(activeShopAds, 10) * 0.7 // discount for overlap
    : null;

  // Fake sparkline data from days (shows activity pattern)
  const sparkData = Array.from({ length: 7 }, (_, i) => {
    const base = ai.winningScore + (i * 3);
    return base + Math.sin(i * 1.2) * 15;
  });

  // Handler for clicking mini ad card
  const [, setSelectedShopAd] = useState<string | null>(null);

  // Claude AI analysis
  const [claudeResult,  setClaudeResult]  = useState<AdAnalysisResult | null>(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeError,   setClaudeError]   = useState("");
  const [claudeOpen,    setClaudeOpen]    = useState(false);

  async function runClaudeAnalysis() {
    setClaudeLoading(true); setClaudeError(""); setClaudeOpen(true);
    try {
      const r    = await fetch("/api/ai/analyze-ad", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adArchiveId: ad.id }),
      });
      const data = await r.json() as AdAnalysisResult & { error?: string };
      if (!r.ok) setClaudeError(data.error ?? "Analysis failed");
      else       setClaudeResult(data);
    } catch { setClaudeError("Network error."); }
    finally { setClaudeLoading(false); }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky panel header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 sticky top-0 z-10"
        style={{ background: "var(--bg-surface)", borderBottom: "1px solid var(--border)" }}
      >
        <button onClick={onClose}
          className="p-1.5 rounded-[7px] flex items-center gap-1 text-[11px] font-medium"
          style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
          <ChevronLeft size={12} strokeWidth={2} />
          Back
        </button>
        <span className="flex-1" />
        <button onClick={() => toggleSave(ad)}
          className="p-1.5 rounded-[7px]"
          style={{
            color: isSaved ? "var(--ai-light)" : "var(--text-3)",
            background: isSaved ? "var(--ai-soft)" : "var(--bg-hover)",
            border: `1px solid ${isSaved ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
          }}>
          <Bookmark size={13} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
        </button>
        {ad.ad_snapshot_url && (
          <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-[7px]"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)", display: "flex" }}>
            <ExternalLink size={13} strokeWidth={1.5} />
          </a>
        )}
        <button
          onClick={() => void runClaudeAnalysis()}
          disabled={claudeLoading}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold disabled:opacity-50"
          style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.35)", color: "var(--ai-light)" }}
        >
          {claudeLoading
            ? <><div className="w-3 h-3 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />Analyzing...</>
            : <><Sparkles size={11} />AI</>
          }
        </button>
        <button onClick={onClose}
          className="p-1.5 rounded-[7px]"
          style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Brand header */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          {ad.page_profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.page_profile_picture_url} alt={storeName}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0"
              style={{ border: `1.5px solid ${color}40` }} />
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ background: `${color}20`, color, border: `1.5px solid ${color}35` }}>
              {storeName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {storeName}
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>Sponsored ·</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: isActive ? "var(--green-light)" : "var(--text-3)" }}>
                <span style={{
                  display: "inline-block", width: 4, height: 4, borderRadius: "50%",
                  background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.2)", flexShrink: 0,
                }} />
                {isActive ? "Live" : "Paused"}
                {days !== null && <span className="font-data font-bold ml-0.5">{days}d</span>}
              </span>
            </div>
          </div>
        </div>

        {/* Ad copy — expandable */}
        {body && (
          <div className="px-4 pb-3">
            <ExpandableText text={body} maxLines={3} />
          </div>
        )}

        {/* Creative */}
        <div style={{ background: "rgba(0,0,0,0.3)" }}>
          {ad.video_url ? (
            <VideoPreview src={ad.video_url} poster={ad.thumbnail_url ?? ad.image_url} alt={storeName} />
          ) : ad.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ad.image_url} alt={storeName} loading="lazy" className="w-full object-cover"
              style={{ display: "block" }} />
          ) : ad.ad_snapshot_url ? (
            <div style={{ height: 200 }}>
              <iframe src={ad.ad_snapshot_url} className="w-full h-full border-0 pointer-events-none"
                title={storeName} sandbox="allow-scripts allow-same-origin" />
            </div>
          ) : (
            <div className="flex items-center justify-center text-xs" style={{ height: 140, color: "var(--text-3)" }}>
              No preview
            </div>
          )}
        </div>

        {/* CTA row — gắn liền creative, giống Facebook Ads Library */}
        {(title || ad.cta_text) && (
          <div className="px-3 py-2.5 flex items-center justify-between gap-2"
            style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)" }}>
            <div className="flex-1 min-w-0">
              {ad.ad_creative_link_captions?.[0] && (
                <p className="text-[9px] uppercase tracking-wide mb-0.5" style={{ color: "var(--text-3)" }}>
                  {ad.ad_creative_link_captions[0]}
                </p>
              )}
              <p className="font-display text-[12px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                {title ?? storeName}
              </p>
              {ad.ad_creative_link_descriptions?.[0] && ad.ad_creative_link_descriptions[0] !== body && (
                <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: "var(--text-2)" }}>
                  {ad.ad_creative_link_descriptions[0]}
                </p>
              )}
            </div>
            {ad.cta_text && (
              (ad.link_url || ad.ad_snapshot_url) ? (
                <a href={ad.link_url ?? ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
                  className="text-[11px] font-bold px-4 py-2 rounded-[8px] flex-shrink-0 flex items-center gap-1.5"
                  style={{
                    background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
                    color: "#fff",
                    border: "1px solid rgba(124,58,237,0.5)",
                    boxShadow: "0 2px 8px rgba(124,58,237,0.25)",
                    transition: "transform 150ms ease, box-shadow 150ms ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px) scale(1.04)"; e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,58,237,0.4)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0) scale(1)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(124,58,237,0.25)"; }}
                >
                  {ad.cta_text}
                  <ExternalLink size={10} strokeWidth={2.5} />
                </a>
              ) : (
                <span className="text-[11px] font-bold px-4 py-2 rounded-[8px] flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  {ad.cta_text}
                </span>
              )
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════
            Ad Details — Minea-style clear sections
           ═══════════════════════════════════════════ */}

        {/* Section: Ad Details */}
        <div className="mx-3 mt-4 rounded-[10px] p-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-2">
            <Monitor size={12} strokeWidth={1.5} style={{ color: "var(--ai-light)" }} />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>Ad Details</span>
          </div>

          <StatRow icon={Calendar} label="Running time"
            value={<span>{fmtDate(ad.ad_delivery_start_time)} → Today</span>} />
          <StatRow icon={Calendar} label="Days running"
            value={days !== null ? `${days} days` : "—"} highlight={days !== null && days > 60} />
          {impressFmt && <StatRow icon={Eye} label="Reach" value={impressFmt} />}
          {spendFmt && <StatRow icon={DollarSign} label="Spend" value={spendFmt} />}
          {audienceFmt && <StatRow icon={Globe} label="Audience size" value={audienceFmt} />}

          {/* Countries with flags */}
          {countries.length > 0 && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Globe size={13} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-2)" }}>Countries</span>
              </div>
              <div className="flex items-center gap-1">
                {countries.slice(0, 4).map(c => (
                  <FlagImg key={c} code={c} />
                ))}
                {countries.length > 4 && (
                  <span className="text-[9px] font-semibold" style={{ color: "var(--text-3)" }}>+{countries.length - 4}</span>
                )}
              </div>
            </div>
          )}

          {/* Status badge */}
          <div className="flex items-center justify-center mt-2">
            <span className="text-[10px] font-bold px-3 py-1 rounded-full"
              style={{
                background: isActive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                color: isActive ? "var(--green-light)" : "#F87171",
                border: `1px solid ${isActive ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
              }}>
              ● {isActive ? "STILL ACTIVE" : "INACTIVE"}
            </span>
          </div>
        </div>

        {/* Platforms */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {platforms.map(p => {
              const c = PLATFORM_COLOR[p.toLowerCase()] ?? "#94A3B8";
              return (
                <span key={p} className="text-[9px] font-bold px-2 py-[3px] rounded-[5px]"
                  style={{ color: c, background: `${c}15`, border: `1px solid ${c}30` }}>
                  {PLATFORM_LABEL[p.toLowerCase()] ?? p}
                </span>
              );
            })}
          </div>
        )}

        {/* Section: AI Score */}
        <div className="mx-3 mt-4 rounded-[10px] p-3"
          style={{ background: getScoreBg(ai.winningScore), border: `1px solid ${getScoreBorder(ai.winningScore)}` }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5"
                style={{ color: ai.scoreColor, opacity: 0.7 }}>AI Performance Score</p>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[28px] font-black leading-none" style={{ color: ai.scoreColor }}>
                  {ai.winningScore}
                </span>
                <span className="text-[11px] font-medium" style={{ color: ai.scoreColor, opacity: 0.5 }}>/100</span>
              </div>
            </div>
            <div className="text-right">
              <p className="font-display text-[11px] font-semibold" style={{ color: ai.scoreColor }}>
                {ai.winningScore >= 80 ? "Top Performer" : ai.winningScore >= 65 ? "Strong" : ai.winningScore >= 50 ? "Moderate" : "Early Stage"}
              </p>
              <div className="flex items-center gap-1 mt-1 justify-end">
                <span className="ad-tag" style={{ background: ai.hookBg, color: ai.hookColor, borderColor: `${ai.hookColor}28` }}>
                  {ai.hookType}
                </span>
                <span className="ad-tag" style={{ background: `${ai.trendColor}15`, color: ai.trendColor, borderColor: `${ai.trendColor}28` }}>
                  {ai.trendIcon} {ai.trendLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
            <div className="score-bar h-full rounded-full"
              style={{ width: `${ai.winningScore}%`, background: `linear-gradient(90deg, ${ai.scoreColor}80, ${ai.scoreColor})` }} />
          </div>
        </div>

        {/* Section: Page Details (like Minea) */}
        {totalShopAds > 1 && (
          <div className="mx-3 mt-4 rounded-[10px] p-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Package size={12} strokeWidth={1.5} style={{ color: "var(--ai-light)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>Page Details</span>
            </div>

            <div className="flex items-center gap-3 mb-3">
              {/* Donut-like display */}
              <div className="flex flex-col items-center justify-center rounded-[8px] p-2.5"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", minWidth: 80 }}>
                <span className="font-display text-[20px] font-black" style={{ color: "var(--ai-light)" }}>
                  {activeShopAds}
                </span>
                <span className="text-[8px] font-semibold uppercase" style={{ color: "var(--text-3)", letterSpacing: "0.06em" }}>
                  / {totalShopAds} Ads
                </span>
                <span className="text-[8px] mt-0.5" style={{ color: "var(--text-3)" }}>Active</span>
              </div>

              {/* Activity sparkline */}
              <div className="flex-1">
                <p className="text-[9px] font-semibold mb-1" style={{ color: "var(--text-3)" }}>Activity</p>
                <MiniSparkline values={sparkData} color="var(--ai-light)" />
              </div>
            </div>

            <StatRow icon={Monitor} label="Active ads" value={`${activeShopAds}`} />
            <StatRow icon={Package} label="Total ads" value={`${totalShopAds}`} />
          </div>
        )}

        {/* Section: Revenue Intelligence */}
        {(estDailyRevenue || spendFmt) && (
          <div className="mx-3 mt-4 rounded-[10px] p-3"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2.5">
              <ShoppingBag size={12} strokeWidth={1.5} style={{ color: "var(--green-light)" }} />
              <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>Revenue Intelligence</span>
            </div>

            {estDailyRevenue && (
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="rounded-[8px] p-2.5"
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <p className="text-[8px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--green-light)" }}>
                    Daily est.
                  </p>
                  <span className="font-display text-[18px] font-black" style={{ color: "var(--green-light)" }}>
                    ${estDailyRevenue >= 1000 ? `${(estDailyRevenue / 1000).toFixed(1)}k` : estDailyRevenue}
                  </span>
                </div>
                <div className="rounded-[8px] p-2.5"
                  style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <p className="text-[8px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--green-light)" }}>
                    Monthly est.
                  </p>
                  <span className="font-display text-[18px] font-black" style={{ color: "var(--green-light)" }}>
                    ${estMonthlyRevenue! >= 1000 ? `${(estMonthlyRevenue! / 1000).toFixed(1)}k` : estMonthlyRevenue}
                  </span>
                </div>
              </div>
            )}

            {estStoreMonthly && (
              <div className="rounded-[8px] p-2.5 mb-2"
                style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.20)" }}>
                <p className="text-[8px] font-bold uppercase tracking-wide mb-1" style={{ color: "var(--ai-light)" }}>
                  Store monthly est. ({activeShopAds} active ads)
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[20px] font-black" style={{ color: "var(--ai-light)" }}>
                    ${estStoreMonthly >= 1000 ? `${(estStoreMonthly / 1000).toFixed(1)}k` : estStoreMonthly}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <TrendingUp size={10} style={{ color: "var(--ai-light)" }} />
                    <span className="text-[9px] font-semibold" style={{ color: "var(--ai-light)" }}>
                      ~{roas}x ROAS
                    </span>
                  </div>
                </div>
              </div>
            )}

            {spendFmt && <StatRow icon={DollarSign} label="Total ad spend" value={spendFmt} highlight />}
            {days && dailySpend > 0 && (
              <StatRow icon={TrendingUp} label="Daily spend" value={`$${dailySpend.toFixed(0)}/day`} />
            )}
          </div>
        )}

        {/* Seller Takeaway — one-line actionable insight */}
        <div className="mx-3 mt-4 rounded-[10px] p-3"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
          <div className="flex items-start gap-2">
            <span className="text-[14px] flex-shrink-0 mt-0.5">💡</span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ai-light)" }}>
                Seller Takeaway
              </p>
              <p className="text-[12px] leading-relaxed font-medium" style={{ color: "var(--text-1)" }}>
                {ai.sellerTakeaway}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Signals — structured bullets */}
        <div className="mx-3 mt-3 rounded-[10px] p-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>
            Performance Signals
          </p>
          <div className="flex flex-col gap-2">
            {ai.performanceSignals.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[12px] flex-shrink-0 mt-px">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold" style={{ color: s.color ?? "var(--text-1)" }}>
                    {s.label}
                  </p>
                  <p className="text-[11px] leading-snug" style={{ color: "var(--text-2)" }}>
                    {s.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Creative Strategy */}
        <div className="mx-3 mt-3 rounded-[10px] p-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-start gap-2">
            <span className="text-[12px] flex-shrink-0 mt-0.5">🎨</span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
                Creative Strategy
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {ai.creativeStrategy}
              </p>
            </div>
          </div>
        </div>

        {/* Competitive Edge */}
        <div className="mx-3 mt-3 rounded-[10px] p-3"
          style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
          <div className="flex items-start gap-2">
            <span className="text-[12px] flex-shrink-0 mt-0.5">⚔️</span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#34D399" }}>
                How to Compete
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {ai.competitiveEdge}
              </p>
            </div>
          </div>
        </div>

        {/* ── Claude AI Deep Analysis ── */}
        <div className="mx-3 mt-3 rounded-[10px] overflow-hidden"
          style={{ border: "1px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.04)" }}>

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} style={{ color: "#A78BFA" }} />
              <span className="text-[11px] font-semibold" style={{ color: "#A78BFA" }}>Claude AI Analysis</span>
              {claudeResult?.cached && (
                <span className="text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(52,211,153,0.12)", color: "#34D399" }}>cached</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {!claudeResult && !claudeLoading && (
                <span className="text-[9px] flex items-center gap-0.5" style={{ color: "var(--text-3)" }}>
                  <Zap size={8} style={{ color: "#A78BFA" }} />3 scans
                </span>
              )}
              {claudeResult && (
                <button onClick={() => setClaudeOpen(o => !o)} style={{ color: "var(--text-3)" }}>
                  {claudeOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </div>
          </div>

          {/* Generate button */}
          {!claudeResult && !claudeLoading && (
            <div className="px-3 pb-3">
              <button onClick={() => void runClaudeAnalysis()}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-[8px] text-[11px] font-semibold transition-opacity hover:opacity-80"
                style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
                <Sparkles size={11} />Generate AI Analysis
              </button>
              {claudeError && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "#F87171" }}>
                  <AlertCircle size={10} />{claudeError}
                </div>
              )}
            </div>
          )}

          {claudeLoading && (
            <div className="px-3 pb-3 flex items-center gap-2 text-[11px]" style={{ color: "var(--text-3)" }}>
              <div className="w-3 h-3 rounded-full border-2 border-[#A78BFA] border-t-transparent animate-spin flex-shrink-0" />
              Analyzing...
            </div>
          )}

          {claudeResult && claudeOpen && (
            <div className="px-3 pb-3 border-t flex flex-col gap-2.5" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
              {/* Score */}
              <div className="flex items-center justify-between pt-2.5">
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: "#A78BFA", opacity: 0.7 }}>AI Score</p>
                  <span className="font-display text-[26px] font-black leading-none" style={{ color: "#A78BFA" }}>{claudeResult.score}</span>
                  <span className="text-[11px] ml-1" style={{ color: "#A78BFA", opacity: 0.5 }}>/100</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>{claudeResult.productCategory}</p>
                  <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{claudeResult.scoreReason}</p>
                </div>
              </div>

              {/* Emotional triggers */}
              <div className="flex flex-wrap gap-1">
                {claudeResult.emotionalTriggers.map(t => (
                  <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                    style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}>
                    {t}
                  </span>
                ))}
              </div>

              <ClaudeSection label="Hook Analysis" text={claudeResult.hookAnalysis} />
              <ClaudeSection label="Target Audience" text={claudeResult.targetAudience} />
              <ClaudeSection label="Offer Type" text={claudeResult.offerType} tag />
              <ClaudeSection label="Why It Works" text={claudeResult.whyItWorks} highlight />
              <ClaudeSection label="Weaknesses" text={claudeResult.weaknesses} dim />

              {/* Replication */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Replication Strategy</p>
                <div className="rounded-[7px] px-2.5 py-2" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#6ee7b7" }}>{claudeResult.replicationStrategy}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>Tips</p>
                <div className="flex flex-col gap-1">
                  {claudeResult.recommendations.map((r, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]" style={{ color: "var(--text-2)" }}>
                      <span className="font-bold flex-shrink-0" style={{ color: "#A78BFA" }}>{i + 1}.</span>{r}
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-[9px] text-right" style={{ color: "var(--text-3)" }}>
                {claudeResult.scansCharged} scan{claudeResult.scansCharged > 1 ? "s" : ""} · claude-sonnet-4-6
              </p>
            </div>
          )}
        </div>

        {/* Ads from this shop — grid layout for wider panel */}
        {shopAds.length > 0 && (
          <div className="mt-4 mb-6 px-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Monitor size={12} style={{ color: "var(--ai-light)" }} strokeWidth={1.8} />
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                  More from {storeName}
                </p>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-[4px]"
                style={{ background: "var(--ai-soft)", color: "var(--ai-light)", fontWeight: 600 }}>
                {totalShopAds} total
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {shopAds.map(a => (
                <MiniAdCard key={a.id} ad={a} onClick={() => setSelectedShopAd(a.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Library ID */}
        <div className="px-4 pb-6">
          <span className="font-data text-[9px]" style={{ color: "var(--text-3)" }}>
            Library ID: {ad.id}
          </span>
        </div>

      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export default function AdDetailPanel({ ad, onClose, isMobile = false, allAds = [] }: Props) {
  const panelStyle = isMobile
    ? {
        position: "fixed" as const,
        inset: "56px 0 0 0",
        zIndex: 50,
        background: "var(--bg-surface)",
        overflowY: "auto" as const,
      }
    : {
        width: 340,
        flexShrink: 0,
        position: "sticky" as const,
        top: 56,
        height: "calc(100vh - 56px)",
        overflowY: "auto" as const,
        overflowX: "hidden" as const,
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border)",
      };

  return (
    <AnimatePresence>
      {ad && (
        <>
          {isMobile && (
            <motion.div
              key="panel-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 49, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={onClose}
            />
          )}

          <motion.div
            key="detail-panel"
            initial={isMobile ? { y: "100%" } : { x: 340, opacity: 0 }}
            animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
            exit={isMobile ? { y: "100%" } : { x: 340, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={panelStyle}
            className="no-scrollbar"
          >
            <PanelContent ad={ad} onClose={onClose} allAds={allAds} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
