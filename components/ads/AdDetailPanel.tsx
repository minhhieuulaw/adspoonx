"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Eye, DollarSign, Globe, Monitor, Bookmark, ExternalLink, Play, ChevronLeft } from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { useSavedAds } from "@/lib/hooks/useSavedAds";

interface Props {
  ad: FbAd | null;
  onClose: () => void;
  isMobile?: boolean;
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

const AVATAR_PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#38BDF8"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#60A5FA", instagram: "#F472B6", messenger: "#38BDF8", audience_network: "#A78BFA",
};
const PLATFORM_LABEL: Record<string, string> = {
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger", audience_network: "Audience Network",
};

// ── Video preview ──────────────────────────────────────────────────────────────

function VideoPreview({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function toggle() {
    if (playing) { ref.current?.pause(); setPlaying(false); }
    else ref.current?.play().then(() => setPlaying(true)).catch(() => {});
  }

  return (
    <div style={{ position: "relative", cursor: "pointer" }} onClick={toggle}>
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full object-cover" style={{ display: "block", maxHeight: 300 }} aria-label={alt}
      />
      <div style={{
        position: "absolute", inset: 0,
        background: playing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.28)",
        transition: "background 300ms",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {!playing && (
          <div style={{
            width: 48, height: 48, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(255,255,255,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play size={18} fill="white" color="white" style={{ marginLeft: 2 }} />
          </div>
        )}
      </div>
      {playing && (
        <div style={{
          position: "absolute", bottom: 8, right: 8,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
          borderRadius: 5, padding: "2px 7px",
          fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em",
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
    <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-[8px]"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1" style={{ color: "var(--text-3)" }}>
        <Icon size={9} strokeWidth={1.5} />
        <span className="text-[9px] uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <span className="font-data text-[12px] font-bold" style={{ color: "var(--text-1)" }}>{value}</span>
    </div>
  );
}

// ── Panel content (exported for use in always-visible sidebar) ─────────────────

export function PanelContent({ ad, onClose }: { ad: FbAd; onClose: () => void }) {
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

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky panel header ── */}
      <div
        className="flex items-center gap-2 px-3 py-2 flex-shrink-0 sticky top-0 z-10"
        style={{
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
        }}
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
        <button onClick={onClose}
          className="p-1.5 rounded-[7px]"
          style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
          <X size={13} strokeWidth={2} />
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar">

        {/* Brand header — FB Ads Library style */}
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

        {/* Ad copy */}
        {body && (
          <p className="px-4 pb-3 text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "var(--text-2)" }}>
            {body}
          </p>
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

        {/* CTA row */}
        {(title || ad.cta_text) && (
          <div className="mx-3 mt-2.5 px-3 py-2 rounded-[8px] flex items-center justify-between gap-2"
            style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
            <p className="font-display text-[11px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
              {title ?? storeName}
            </p>
            {ad.cta_text && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-[5px] flex-shrink-0"
                style={{ background: "var(--ai-soft)", color: "var(--ai-light)", border: "1px solid rgba(124,58,237,0.25)" }}>
                {ad.cta_text}
              </span>
            )}
          </div>
        )}

        {/* Platforms */}
        {platforms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2.5 pb-1">
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

        {/* Library ID */}
        <div className="px-4 pb-3">
          <span className="font-data text-[9px]" style={{ color: "var(--text-3)" }}>
            Library ID: {ad.id}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "var(--border)", margin: "0 0 16px" }} />

        {/* AI Score */}
        <div className="mx-3 mb-4 rounded-[12px] p-4"
          style={{ background: getScoreBg(ai.winningScore), border: `1px solid ${getScoreBorder(ai.winningScore)}` }}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5"
                style={{ color: ai.scoreColor, opacity: 0.75 }}>AI Winning Score</p>
              <span className="font-display text-[32px] font-black leading-none" style={{ color: ai.scoreColor }}>
                {ai.winningScore}
              </span>
              <span className="text-[12px] font-medium ml-1" style={{ color: ai.scoreColor, opacity: 0.5 }}>/100</span>
            </div>
            <div className="text-right">
              <p className="font-display text-[12px] font-semibold" style={{ color: ai.scoreColor }}>
                {ai.winningScore >= 80 ? "High Performer" : ai.winningScore >= 65 ? "Solid" : "Early Stage"}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 justify-end flex-wrap">
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
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
            <div className="score-bar h-full rounded-full"
              style={{ width: `${ai.winningScore}%`, background: `linear-gradient(90deg, ${ai.scoreColor}80, ${ai.scoreColor})` }} />
          </div>
        </div>

        {/* Delivery metrics */}
        <div className="px-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
            Delivery Metrics
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <MetricChip icon={Calendar} label="Days live" value={days !== null ? `${days}d` : "—"} />
            {impressFmt && <MetricChip icon={Eye} label="Impressions" value={impressFmt} />}
            {spendFmt   && <MetricChip icon={DollarSign} label="Est. spend" value={spendFmt} />}
            {audienceFmt && <MetricChip icon={Globe} label="Audience" value={audienceFmt} />}
            {countries[0] && (
              <div className="flex flex-col gap-0.5 px-2.5 py-2 rounded-[8px]"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                <span className="text-[9px] uppercase tracking-wide font-semibold" style={{ color: "var(--text-3)" }}>Market</span>
                <span className="text-[12px] font-bold" style={{ color: "var(--text-1)" }}>
                  {countries[0]}{countries.length > 1 ? ` +${countries.length - 1}` : ""}
                </span>
              </div>
            )}
            <MetricChip icon={Monitor} label="Start date" value={fmtDate(ad.ad_delivery_start_time)} />
          </div>
        </div>

        {/* Why this works */}
        <div className="px-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
            Why This Ad Works
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{ai.whyWorking}</p>
        </div>

        {/* Target audience */}
        <div className="px-3 mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
            Target Audience
          </p>
          {ai.targetAudience.split("\n").map((line, i) => (
            <p key={i} className="text-[12px]" style={{ color: i === 0 ? "var(--text-1)" : "var(--text-2)", marginBottom: i === 0 ? 2 : 0 }}>
              {line}
            </p>
          ))}
        </div>

        {/* Creative strategy */}
        <div className="px-3 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>
            Creative Strategy
          </p>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{ai.creativeStrategy}</p>
        </div>

      </div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────────

export default function AdDetailPanel({ ad, onClose, isMobile = false }: Props) {
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
          {/* Mobile backdrop */}
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
            <PanelContent ad={ad} onClose={onClose} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
