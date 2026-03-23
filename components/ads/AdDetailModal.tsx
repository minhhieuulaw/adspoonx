"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Globe, Monitor, Eye, DollarSign, Bookmark, ExternalLink, Play, Copy } from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { useSavedAds } from "@/lib/hooks/useSavedAds";

interface Props {
  ad: FbAd | null;
  onClose: () => void;
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
  return avg >= 1000 ? `$${(avg / 1000).toFixed(1)}k` : `$${avg.toFixed(1)}`;
}

function FlagImg({ code }: { code: string }) {
  if (!code || code.length !== 2) return null;
  const c = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://flagcdn.com/20x15/${c}.png`} srcSet={`https://flagcdn.com/40x30/${c}.png 2x`}
      width={16} height={12} alt={code} style={{ borderRadius: 2, display: "inline-block" }} />
  );
}

function fmtDateRange(start?: string, end?: string): string {
  const s = start ? new Date(start).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null;
  const e = end ? new Date(end).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : null;
  if (s && e) return `${s} → ${e}`;
  if (s) return `${s} → Present`;
  return "—";
}

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#60A5FA", instagram: "#F472B6", messenger: "#38BDF8", audience_network: "#A78BFA", threads: "#E5E7EB",
};
const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network", threads: "Threads",
};

const AVATAR_PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#38BDF8"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ── Video preview ──────────────────────────────────────────────────────────────

function VideoPreview({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (playing) { ref.current?.pause(); setPlaying(false); }
    else ref.current?.play().then(() => setPlaying(true)).catch(() => {});
  }

  return (
    <div
      style={{ position: "relative", overflow: "hidden", borderRadius: 10, cursor: "pointer" }}
      onClick={toggle}
    >
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full object-cover" style={{ display: "block" }} aria-label={alt}
      />
      {/* Overlay */}
      <div style={{
        position: "absolute", inset: 0,
        background: playing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.3)",
        transition: "background 300ms",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(255,255,255,0.45)",
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: playing ? 0 : 1, transition: "opacity 200ms",
        }}>
          <Play size={20} fill="white" color="white" style={{ marginLeft: 3 }} />
        </div>
      </div>
      {/* Playing indicator */}
      {playing && (
        <div style={{
          position: "absolute", bottom: 10, right: 10,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          borderRadius: 5, padding: "2px 7px",
          fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
          ▶ PLAYING
        </div>
      )}
    </div>
  );
}

// ── Metric chip ────────────────────────────────────────────────────────────────

function MetricChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-[10px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1" style={{ color: "var(--text-3)" }}>
        <Icon size={10} strokeWidth={1.5} />
        <span className="text-[9px] uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <span className="font-data text-[13px] font-bold" style={{ color: "var(--text-1)" }}>{value}</span>
    </div>
  );
}

// ── Main modal ─────────────────────────────────────────────────────────────────

export default function AdDetailModal({ ad, onClose }: Props) {
  const { savedIds, toggleSave } = useSavedAds();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!ad) return null;

  const ai          = getAIInsights(ad);
  const isSaved     = savedIds.has(ad.id);
  const storeName   = ad.page_name ?? "Unknown";
  const color       = avatarColor(storeName);
  const isActive    = ad.is_active !== false;
  const days        = daysRunning(ad.ad_delivery_start_time);
  const platforms   = ad.publisher_platforms ?? [];
  const body        = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0];
  const title       = ad.ad_creative_link_titles?.[0];
  const linkDesc    = ad.ad_creative_link_descriptions?.[0];
  const linkCaption = ad.ad_creative_link_captions?.[0];
  const countries   = ad.countries ?? (ad.country ? [ad.country] : []);
  const impressFmt  = fmtNum(ad.impressions?.lower_bound, ad.impressions?.upper_bound);
  const spendFmt    = fmtSpend(ad.spend?.lower_bound, ad.spend?.upper_bound);
  const audienceFmt = fmtNum(
    ad.estimated_audience_size?.lower_bound?.toString(),
    ad.estimated_audience_size?.upper_bound?.toString()
  );

  return (
    <AnimatePresence>
      {ad && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{ opacity: 0, scale: 0.96,    y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="pointer-events-auto w-full flex flex-col md:flex-row"
              style={{
                maxWidth: 980,
                maxHeight: "92vh",
                borderRadius: 16,
                overflow: "hidden",
                background: "var(--bg-surface)",
                border: "1px solid rgba(255,255,255,0.09)",
                boxShadow: "0 32px 80px rgba(0,0,0,0.75), 0 0 0 1px rgba(124,58,237,0.08)",
              }}
            >
              {/* ── Left: Ad Preview ─────────────────────────────────────────── */}
              <div
                className="flex flex-col overflow-y-auto flex-shrink-0"
                style={{ width: "clamp(300px, 40%, 420px)", background: "var(--bg-card)", borderRight: "1px solid var(--border)" }}
              >
                {/* Brand header — Facebook Ads Library style */}
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
                        <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                        {isActive ? "Live" : "Paused"}
                        {days !== null && <span className="font-data font-bold">{days}d</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Ad copy — full text */}
                {body && (
                  <p className="px-4 pb-3 text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
                    {body}
                  </p>
                )}

                {/* Creative */}
                <div className="mx-3 overflow-hidden" style={{ background: "rgba(0,0,0,0.3)", borderTopLeftRadius: 10, borderTopRightRadius: 10, borderBottomLeftRadius: (title || ad.cta_text || linkDesc) ? 0 : 10, borderBottomRightRadius: (title || ad.cta_text || linkDesc) ? 0 : 10 }}>
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

                {/* CTA row — flush with creative, Facebook Ads Library style */}
                {(title || ad.cta_text || linkDesc) && (
                  <div className="mx-3 px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.04)", borderBottom: "1px solid var(--border)", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}>
                    {linkCaption && (
                      <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: "var(--text-3)" }}>
                        {linkCaption}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-display text-[12px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
                          {title ?? storeName}
                        </p>
                        {linkDesc && linkDesc !== body && (
                          <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--text-2)" }}>
                            {linkDesc}
                          </p>
                        )}
                      </div>
                      {ad.cta_text && (
                        ad.ad_snapshot_url ? (
                          <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] font-bold px-2.5 py-1.5 rounded-[6px] flex-shrink-0 hover:opacity-80 transition-opacity"
                            style={{ background: "rgba(255,255,255,0.12)", color: "var(--text-1)", border: "1px solid rgba(255,255,255,0.18)" }}>
                            {ad.cta_text}
                          </a>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1.5 rounded-[6px] flex-shrink-0"
                            style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-2)", border: "1px solid rgba(255,255,255,0.12)" }}>
                            {ad.cta_text}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Platforms */}
                {platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-2">
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

                {/* Run dates */}
                <div className="flex items-center gap-1.5 px-4 pb-1.5">
                  <Calendar size={10} strokeWidth={1.5} style={{ color: "var(--text-3)" }} />
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-2)" }}>
                    {fmtDateRange(ad.ad_delivery_start_time, ad.ad_delivery_stop_time)}
                  </span>
                </div>

                {/* Library ID */}
                <div className="px-4 pb-4">
                  <span className="font-data text-[9px]" style={{ color: "var(--text-3)" }}>
                    Library ID: {ad.id}
                  </span>
                </div>
              </div>

              {/* ── Right: AI Analysis ───────────────────────────────────────── */}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                  style={{ borderBottom: "1px solid var(--border)" }}>
                  <div>
                    <p className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
                      Ad Analysis
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      AI-powered insights
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSave(ad)}
                      className="p-2 rounded-[8px]"
                      style={{
                        color: isSaved ? "var(--ai-light)" : "var(--text-3)",
                        background: isSaved ? "var(--ai-soft)" : "var(--bg-hover)",
                        border: `1px solid ${isSaved ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
                      }}>
                      <Bookmark size={14} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
                    </button>
                    <button onClick={onClose} className="p-2 rounded-[8px]"
                      style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">

                  {/* AI Score */}
                  <div className="rounded-[12px] p-4" style={{ background: getScoreBg(ai.winningScore), border: `1px solid ${getScoreBorder(ai.winningScore)}` }}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: ai.scoreColor, opacity: 0.75 }}>
                          AI Winning Score
                        </p>
                        <span className="font-display text-[36px] font-black leading-none" style={{ color: ai.scoreColor }}>
                          {ai.winningScore}
                        </span>
                        <span className="text-[14px] font-medium ml-1" style={{ color: ai.scoreColor, opacity: 0.5 }}>/100</span>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-[13px] font-semibold" style={{ color: ai.scoreColor }}>
                          {ai.winningScore >= 80 ? "High Performer" : ai.winningScore >= 65 ? "Solid" : "Early Stage"}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                          <span className="text-[9px] font-semibold px-2 py-[3px] rounded-[5px]"
                            style={{ background: ai.hookBg, color: ai.hookColor, border: `1px solid ${ai.hookColor}28` }}>
                            🧠 {ai.hookType}
                          </span>
                          <span className="text-[9px] font-semibold px-2 py-[3px] rounded-[5px]"
                            style={{ background: `${ai.trendColor}15`, color: ai.trendColor, border: `1px solid ${ai.trendColor}28` }}>
                            {ai.trendIcon} {ai.trendLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Score bar */}
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
                      <div className="score-bar h-full rounded-full"
                        style={{ width: `${ai.winningScore}%`, background: `linear-gradient(90deg, ${ai.scoreColor}80, ${ai.scoreColor})` }} />
                    </div>
                  </div>

                  {/* Delivery metrics */}
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>
                      Delivery Metrics
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <MetricChip icon={Calendar} label="Days live" value={days !== null ? `${days}d` : "—"} />
                      {impressFmt && <MetricChip icon={Eye} label="Impressions" value={impressFmt} />}
                      {spendFmt   && <MetricChip icon={DollarSign} label="Est. spend" value={spendFmt} />}
                      {audienceFmt && <MetricChip icon={Globe} label="Audience" value={audienceFmt} />}
                      {countries[0] && (
                        <div className="flex flex-col gap-0.5 px-3 py-2.5 rounded-[10px]"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                          <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-3)" }}>Market</span>
                          <span className="flex items-center gap-1.5 text-[13px] font-bold" style={{ color: "var(--text-1)" }}>
                            <FlagImg code={countries[0]} />
                            {countries[0]}
                            {countries.length > 1 && <span className="text-[10px]" style={{ color: "var(--text-3)" }}>+{countries.length - 1}</span>}
                          </span>
                        </div>
                      )}
                      <MetricChip icon={Monitor} label="Start date" value={fmtDate(ad.ad_delivery_start_time)} />
                    </div>
                  </div>

                  {/* Seller Takeaway */}
                  <div className="rounded-[10px] p-3.5"
                    style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.25)" }}>
                    <div className="flex items-start gap-2">
                      <span className="text-[14px] flex-shrink-0">💡</span>
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

                  {/* Performance Signals */}
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-3)" }}>
                      Performance Signals
                    </p>
                    <div className="flex flex-col gap-2.5">
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
                  <div>
                    <div className="flex items-start gap-2">
                      <span className="text-[12px] flex-shrink-0 mt-0.5">🎨</span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-3)" }}>
                          Creative Strategy
                        </p>
                        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                          {ai.creativeStrategy}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Competitive Edge */}
                  <div className="rounded-[10px] p-3.5"
                    style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                    <div className="flex items-start gap-2">
                      <span className="text-[12px] flex-shrink-0 mt-0.5">⚔️</span>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "#34D399" }}>
                          How to Compete
                        </p>
                        <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                          {ai.competitiveEdge}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 flex items-center gap-2 flex-shrink-0"
                  style={{ borderTop: "1px solid var(--border)" }}>
                  {ad.ad_snapshot_url && (
                    <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-[12px] font-semibold"
                      style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
                      <ExternalLink size={12} />
                      View on Facebook
                    </a>
                  )}
                  {body && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(body); }}
                      className="flex items-center gap-1.5 px-3 py-2.5 rounded-[8px] text-[12px] font-medium"
                      style={{ color: "var(--text-2)", border: "1px solid var(--border)", background: "var(--bg-hover)" }}
                      title="Copy ad text"
                    >
                      <Copy size={12} />
                      Copy Text
                    </button>
                  )}
                  <button onClick={onClose} className="px-4 py-2.5 rounded-[8px] text-[12px] font-medium"
                    style={{ color: "var(--text-2)", border: "1px solid var(--border)", background: "var(--bg-hover)" }}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
