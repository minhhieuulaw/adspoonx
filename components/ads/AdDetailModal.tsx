"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Calendar, Eye, DollarSign, Globe, Monitor, Bookmark,
  ExternalLink, Play, Pause, ChevronDown, TrendingUp, Download, Copy, Check,
  Volume2, VolumeX, Package, ShoppingBag, Sparkles, Zap, AlertCircle, ChevronUp,
} from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { useSavedAds } from "@/lib/hooks/useSavedAds";
import type { AdAnalysisResult } from "@/app/api/ai/analyze-ad/route";

// ── Helpers ──────────────────────────────────────────────────────────────────

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
  facebook: "Facebook", instagram: "Instagram", messenger: "Messenger",
  audience_network: "Audience Network", threads: "Threads",
};
const PLATFORM_COLOR: Record<string, string> = {
  facebook: "#60A5FA", instagram: "#F472B6", messenger: "#38BDF8",
  audience_network: "#A78BFA", threads: "#E2E8F0",
};

function FlagImg({ code }: { code: string }) {
  if (!code || code.length !== 2) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`}
      width={16} height={16} alt={code}
      className="rounded-full flex-shrink-0"
      style={{ border: "1px solid rgba(255,255,255,0.08)", display: "inline-block", verticalAlign: "middle" }} />
  );
}

// ── Stat row ──────────────────────────────────────────────────────────────────

function StatRow({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value: string | React.ReactNode; highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1.5"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center gap-1.5">
        <Icon size={11} strokeWidth={1.5} style={{ color: highlight ? "var(--ai-light)" : "var(--text-3)" }} />
        <span className="text-[11px]" style={{ color: "var(--text-2)" }}>{label}</span>
      </div>
      <span className="font-data text-[11px] font-semibold" style={{ color: highlight ? "var(--ai-light)" : "var(--text-1)" }}>
        {value}
      </span>
    </div>
  );
}

// ── Expandable text ──────────────────────────────────────────────────────────

function ExpandableText({ text, maxLines = 5 }: { text: string; maxLines?: number }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 220;
  return (
    <div>
      <p className="text-[12px] leading-relaxed whitespace-pre-wrap"
        style={{
          color: "var(--text-2)",
          ...(isLong && !expanded ? {
            display: "-webkit-box", WebkitLineClamp: maxLines,
            WebkitBoxOrient: "vertical" as const, overflow: "hidden",
          } : {}),
        }}>
        {text}
      </p>
      {isLong && (
        <button onClick={() => setExpanded(!expanded)}
          className="text-[11px] font-medium mt-1 flex items-center gap-0.5"
          style={{ color: "var(--ai-light)" }}>
          {expanded ? "Show less" : "See more"}
          <ChevronDown size={10} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
        </button>
      )}
    </div>
  );
}

// ── Copyable Ad Copy ─────────────────────────────────────────────────────────

function CopyableAdCopy({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }
  return (
    <div className="px-4 py-3 flex-shrink-0 relative" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Ad Copy</p>
        <button onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-semibold transition-all"
          style={{ background: copied ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.04)", color: copied ? "#34D399" : "var(--text-3)", border: `1px solid ${copied ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.08)"}` }}>
          {copied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
        </button>
      </div>
      <ExpandableText text={body} maxLines={7} />
    </div>
  );
}

// ── Video player ──────────────────────────────────────────────────────────────

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
    const v = ref.current; const bar = progressRef.current;
    if (!v || !bar || !v.duration) return;
    const rect = bar.getBoundingClientRect();
    v.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * v.duration;
  }
  function handleVol(val: number) {
    const v = ref.current; if (!v) return;
    setVolume(val); v.volume = val;
    if (val === 0) { v.muted = true; setMuted(true); }
    else { v.muted = false; setMuted(false); }
  }
  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current; if (!v) return;
    v.muted = !v.muted; setMuted(v.muted);
    if (!v.muted && volume === 0) { setVolume(0.5); v.volume = 0.5; }
  }

  return (
    <div style={{ position: "relative", cursor: "pointer" }} onClick={toggle}>
      <video ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full object-cover" style={{ display: "block", maxHeight: 420 }} aria-label={alt}
        onTimeUpdate={handleTimeUpdate} />
      {/* Download button — top right corner */}
      <a href={src} download target="_blank" rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:scale-105"
        style={{ background: "rgba(124,58,237,0.85)", backdropFilter: "blur(8px)", color: "#fff", border: "1px solid rgba(167,139,250,0.4)", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
        <Download size={12} /> Download
      </a>
      {!playing && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)", border: "1.5px solid rgba(255,255,255,0.45)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Play size={20} fill="white" color="white" style={{ marginLeft: 2 }} />
          </div>
        </div>
      )}
      {playing && (
        <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-2 py-1.5"
          style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))" }}
          onClick={e => e.stopPropagation()}>
          <button onClick={toggle} style={{ color: "white", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
            <Pause size={12} fill="white" />
          </button>
          <div ref={progressRef} onClick={seekTo} className="flex-1 h-1 rounded-full cursor-pointer" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: "var(--ai-light)", transition: "width 100ms linear" }} />
          </div>
          <div className="relative" onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
            <button onClick={toggleMute} style={{ color: "white", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
            </button>
            {showVolume && (
              <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 4, padding: "8px 6px", borderRadius: 6, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <input type="range" min="0" max="1" step="0.05" value={volume}
                  onChange={e => handleVol(parseFloat(e.target.value))} onClick={e => e.stopPropagation()}
                  className="volume-slider"
                  style={{ writingMode: "vertical-lr", direction: "rtl", width: 4, height: 60, appearance: "none", WebkitAppearance: "none", background: `linear-gradient(to top, var(--ai-light) ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`, borderRadius: 2, outline: "none", cursor: "pointer" }} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mini ad card ──────────────────────────────────────────────────────────────

function MiniAdCard({ ad, onClickStore }: { ad: FbAd; onClickStore?: () => void }) {
  const isActive = ad.is_active !== false;
  const days = daysRunning(ad.ad_delivery_start_time);
  const thumb = ad.thumbnail_url ?? ad.image_url ?? (ad.video_url ? ad.video_url : null);
  return (
    <div className="cursor-pointer rounded-[8px] overflow-hidden mini-ad-card"
      onClick={onClickStore}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div style={{ aspectRatio: "1/1", overflow: "hidden", background: "rgba(0,0,0,0.2)" }}>
        {thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumb} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[9px]" style={{ color: "var(--text-3)" }}>No preview</div>
        )}
      </div>
      <div className="px-1.5 py-1.5">
        <div className="flex items-center gap-1">
          <span className={isActive ? "live-dot" : ""} style={{ width: 4, height: 4, borderRadius: "50%", display: "inline-block", flexShrink: 0, background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.2)" }} />
          <span style={{ fontSize: 8, fontWeight: 700, color: isActive ? "var(--green-light)" : "var(--text-3)" }}>
            {isActive ? "Active" : "Paused"}
          </span>
          {days !== null && <span className="font-data ml-auto" style={{ fontSize: 8, color: "var(--text-3)" }}>{days}d</span>}
        </div>
        {ad.ad_creative_bodies?.[0] && (
          <p className="text-[8px] line-clamp-2 leading-tight mt-0.5" style={{ color: "var(--text-3)" }}>
            {ad.ad_creative_bodies[0]}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Sparkline ─────────────────────────────────────────────────────────────────

function MiniSparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 20 }}>
      {values.map((v, i) => (
        <div key={i} className="rounded-sm" style={{ flex: 1, height: `${Math.max(8, (v / max) * 100)}%`, background: i === values.length - 1 ? color : `${color}40`, minWidth: 3 }} />
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface Props { ad: FbAd | null; onClose: () => void; allAds?: FbAd[]; }

export default function AdDetailModal({ ad, onClose, allAds = [] }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (ad) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [ad]);

  if (!mounted) return null;

  // Portal to document.body — escapes any transformed/stacking-context parent
  return createPortal(
    <AnimatePresence>
      {ad && <ModalInner ad={ad} onClose={onClose} allAds={allAds} />}
    </AnimatePresence>,
    document.body
  );
}

// ── Modal content ─────────────────────────────────────────────────────────────

function ModalInner({ ad, onClose, allAds }: { ad: FbAd; onClose: () => void; allAds: FbAd[] }) {
  const { savedIds, toggleSave } = useSavedAds();
  const isSaved     = savedIds.has(ad.id);
  const ai          = getAIInsights(ad);
  const storeName   = ad.page_name ?? "Unknown";
  const color       = avatarColor(storeName);
  const isActive    = ad.is_active !== false;
  const days        = daysRunning(ad.ad_delivery_start_time);
  const platforms   = ad.publisher_platforms ?? [];
  const body        = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0];
  const title       = ad.ad_creative_link_titles?.[0];
  const countries   = ad.countries ?? (ad.country ? [ad.country] : []);
  const impressFmt  = fmtNum(ad.impressions?.lower_bound, ad.impressions?.upper_bound);
  const spendFmt    = fmtSpend(ad.spend?.lower_bound, ad.spend?.upper_bound);
  const audienceFmt = fmtNum(
    ad.estimated_audience_size?.lower_bound?.toString(),
    ad.estimated_audience_size?.upper_bound?.toString()
  );

  // Shop data
  const shopAds       = allAds.filter(a => a.page_name === ad.page_name && a.id !== ad.id).slice(0, 12);
  const totalShopAds  = allAds.filter(a => a.page_name === ad.page_name).length;
  const activeShopAds = allAds.filter(a => a.page_name === ad.page_name && a.is_active !== false).length;

  // Revenue estimate
  const spendLo    = Number(ad.spend?.lower_bound ?? 0);
  const spendHi    = Number(ad.spend?.upper_bound ?? 0);
  const avgSpend   = (spendLo + spendHi) / 2;
  const dailySpend = days && days > 0 ? avgSpend / days : 0;
  const roas       = 3.5;
  const estDailyRev   = dailySpend > 0 ? Math.round(dailySpend * roas) : null;
  const estMonthlyRev = estDailyRev ? estDailyRev * 30 : null;
  const estStoreRev   = estMonthlyRev && activeShopAds > 1
    ? estMonthlyRev * Math.min(activeShopAds, 10) * 0.7 : null;

  const sparkData = Array.from({ length: 7 }, (_, i) =>
    Math.max(10, ai.winningScore + Math.sin(i * 1.2) * 15 + i * 2)
  );

  // Claude AI
  const [claudeResult,  setClaudeResult]  = useState<AdAnalysisResult | null>(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [claudeError,   setClaudeError]   = useState("");
  const [claudeOpen,    setClaudeOpen]    = useState(true);

  async function runClaudeAnalysis() {
    setClaudeLoading(true); setClaudeError(""); setClaudeOpen(true);
    try {
      const r = await fetch("/api/ai/analyze-ad", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adArchiveId: ad.id }),
      });
      const data = await r.json() as AdAnalysisResult & { error?: string };
      if (!r.ok) setClaudeError(data.error ?? "Analysis failed");
      else setClaudeResult(data);
    } catch { setClaudeError("Network error."); }
    finally { setClaudeLoading(false); }
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key="modal-bg"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(3px)" }}
        onClick={onClose}
      >
        {/* Modal — inside backdrop so flex-centering works, stopPropagation prevents close */}
        <motion.div
          key="modal-body"
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          style={{
            width: "min(1120px, calc(100vw - 24px))",
            height: "min(900px, calc(100vh - 32px))",
            borderRadius: 16,
            background: "var(--bg-surface)",
            border: "1px solid var(--border-strong)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.72), 0 0 0 1px rgba(255,255,255,0.04)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
          }}
          onClick={e => e.stopPropagation()}
        >

        {/* ── Header ── */}
        <div className="flex items-center gap-3 px-4 py-2.5 flex-shrink-0"
          style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>

          {/* Brand info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {ad.page_profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.page_profile_picture_url} alt={storeName}
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                style={{ border: `1.5px solid ${color}50` }} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ background: `${color}20`, color, border: `1.5px solid ${color}35` }}>
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-display text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{storeName}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px]" style={{ color: "var(--text-3)" }}>Sponsored ·</span>
                <span className="flex items-center gap-1 text-[9px]" style={{ color: isActive ? "var(--green-light)" : "var(--text-3)" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.2)", display: "inline-block" }} />
                  {isActive ? "Live" : "Paused"}
                  {days !== null && <span className="font-data font-bold ml-0.5">{days}d</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => toggleSave(ad)} data-tip={isSaved ? "Unsave" : "Save ad"}
              className="panel-btn p-1.5 rounded-[7px]"
              style={{ color: isSaved ? "var(--ai-light)" : "var(--text-3)", background: isSaved ? "var(--ai-soft)" : "var(--bg-hover)", border: `1px solid ${isSaved ? "rgba(124,58,237,0.3)" : "var(--border)"}` }}>
              <Bookmark size={13} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
            </button>
            {ad.ad_snapshot_url && (
              <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
                data-tip="Open in library" className="panel-btn p-1.5 rounded-[7px]"
                style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)", display: "flex" }}>
                <ExternalLink size={13} strokeWidth={1.5} />
              </a>
            )}
            <a href={`/ads/${ad.id}`} target="_blank" rel="noopener noreferrer"
              data-tip="Open in new tab" className="panel-btn p-1.5 rounded-[7px]"
              style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)", display: "flex" }}
              onClick={e => e.stopPropagation()}>
              <Monitor size={13} strokeWidth={1.5} />
            </a>
            <button onClick={() => void runClaudeAnalysis()} disabled={claudeLoading}
              data-tip="AI deep analysis"
              className="panel-btn flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold disabled:opacity-50"
              style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.35)", color: "var(--ai-light)" }}>
              {claudeLoading
                ? <><div className="w-3 h-3 rounded-full border-2 border-[var(--ai-light)] border-t-transparent animate-spin" />Analyzing...</>
                : <><Sparkles size={11} />AI</>}
            </button>
            <button onClick={onClose} data-tip="Close" className="panel-btn p-1.5 rounded-[7px]"
              style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
              <X size={13} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* ── Body: 2-column ── */}
        <div className="flex flex-1 min-h-0">

          {/* LEFT: Creative + copy (fixed width, scrollable) */}
          <div className="flex flex-col flex-shrink-0 overflow-y-auto no-scrollbar"
            style={{ width: 420, borderRight: "1px solid var(--border)", background: "var(--bg-base)" }}>

            {/* Creative */}
            <div style={{ background: "rgba(0,0,0,0.35)", flexShrink: 0 }}>
              {ad.video_url ? (
                <VideoPreview src={ad.video_url} poster={ad.thumbnail_url ?? ad.image_url} alt={storeName} />
              ) : ad.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ad.image_url} alt={storeName} loading="lazy"
                  className="w-full object-cover" style={{ display: "block", maxHeight: 400 }} />
              ) : ad.ad_snapshot_url ? (
                <div style={{ height: 260 }}>
                  <iframe src={ad.ad_snapshot_url} className="w-full h-full border-0 pointer-events-none"
                    title={storeName} sandbox="allow-scripts allow-same-origin" />
                </div>
              ) : (
                <div className="flex items-center justify-center text-xs" style={{ height: 160, color: "var(--text-3)" }}>
                  No preview
                </div>
              )}
            </div>

            {/* CTA row */}
            {(title || ad.cta_text) && (
              <div className="px-3 py-2.5 flex items-center justify-between gap-2 flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid var(--border)" }}>
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
                      className="text-[11px] font-bold px-3 py-1.5 rounded-[7px] flex-shrink-0 flex items-center gap-1"
                      style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)", color: "#fff", border: "1px solid rgba(124,58,237,0.5)", boxShadow: "0 2px 8px rgba(124,58,237,0.25)", transition: "transform 150ms, box-shadow 150ms" }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px) scale(1.04)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}>
                      {ad.cta_text}<ExternalLink size={9} strokeWidth={2.5} />
                    </a>
                  ) : (
                    <span className="text-[11px] font-bold px-3 py-1.5 rounded-[7px] flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.08)", color: "var(--text-3)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      {ad.cta_text}
                    </span>
                  )
                )}
              </div>
            )}

            {/* Ad copy */}
            {body && (
              <CopyableAdCopy body={body} />

            )}

            {/* Platforms */}
            {platforms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
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

            {/* Countries */}
            {countries.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2.5 flex-shrink-0">
                <Globe size={11} strokeWidth={1.5} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                <div className="flex items-center gap-1 flex-wrap">
                  {countries.slice(0, 10).map(c => <FlagImg key={c} code={c} />)}
                  {countries.length > 10 && <span className="text-[9px] font-semibold" style={{ color: "var(--text-3)" }}>+{countries.length - 10}</span>}
                </div>
              </div>
            )}

            {/* Library ID */}
            <div className="px-4 py-3 mt-auto flex-shrink-0">
              <span className="font-data text-[9px]" style={{ color: "var(--text-3)" }}>ID: {ad.id}</span>
            </div>
          </div>

          {/* RIGHT: Analytics (scrollable) */}
          <div className="flex-1 overflow-y-auto no-scrollbar" style={{ background: "var(--bg-surface)" }}>
            <div className="p-4 flex flex-col gap-3">

              {/* Ad Details stats */}
              <div className="rounded-[10px] p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-2.5">
                  <Monitor size={12} strokeWidth={1.5} style={{ color: "var(--ai-light)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>Ad Details</span>
                  <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: isActive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)", color: isActive ? "var(--green-light)" : "#F87171", border: `1px solid ${isActive ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}` }}>
                    ● {isActive ? "LIVE" : "PAUSED"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-6">
                  <div>
                    <StatRow icon={Calendar} label="Started" value={fmtDate(ad.ad_delivery_start_time)} />
                    <StatRow icon={Calendar} label="Days running" value={days !== null ? `${days}d` : "—"} highlight={(days ?? 0) > 60} />
                    {impressFmt && <StatRow icon={Eye} label="Reach" value={impressFmt} />}
                  </div>
                  <div>
                    {spendFmt && <StatRow icon={DollarSign} label="Spend" value={spendFmt} />}
                    {audienceFmt && <StatRow icon={Globe} label="Audience" value={audienceFmt} />}
                    {days !== null && dailySpend > 0 && <StatRow icon={TrendingUp} label="Daily spend" value={`$${dailySpend.toFixed(0)}/d`} />}
                  </div>
                </div>
              </div>

              {/* AI Score */}
              <div className="rounded-[10px] p-3"
                style={{ background: getScoreBg(ai.winningScore), border: `1px solid ${getScoreBorder(ai.winningScore)}` }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: ai.scoreColor, opacity: 0.7 }}>AI Performance Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-[34px] font-black leading-none" style={{ color: ai.scoreColor }}>{ai.winningScore}</span>
                      <span className="text-[12px]" style={{ color: ai.scoreColor, opacity: 0.5 }}>/100</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-[12px] font-semibold mb-1.5" style={{ color: ai.scoreColor }}>
                      {ai.winningScore >= 80 ? "Top Performer" : ai.winningScore >= 65 ? "Strong" : ai.winningScore >= 50 ? "Moderate" : "Early Stage"}
                    </p>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="ad-tag" style={{ background: ai.hookBg, color: ai.hookColor, borderColor: `${ai.hookColor}28` }}>{ai.hookType}</span>
                      <span className="ad-tag" style={{ background: `${ai.trendColor}15`, color: ai.trendColor, borderColor: `${ai.trendColor}28` }}>{ai.trendIcon} {ai.trendLabel}</span>
                    </div>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <div className="score-bar h-full rounded-full"
                    style={{ width: `${ai.winningScore}%`, background: `linear-gradient(90deg, ${ai.scoreColor}80, ${ai.scoreColor})` }} />
                </div>
              </div>

              {/* Shop Overview — unified card */}
              <div className="rounded-[10px] p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <ShoppingBag size={12} strokeWidth={1.5} style={{ color: "var(--ai-light)" }} />
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-1)" }}>Shop Overview</span>
                  {ad.page_id && (
                    <a href={`/stores/${ad.page_id}`} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="ml-auto text-[9px] font-semibold flex items-center gap-0.5 hover:underline"
                      style={{ color: "var(--ai-light)" }}>
                      View Shop <ExternalLink size={8} />
                    </a>
                  )}
                </div>

                {/* Store header row */}
                <div className="flex items-center gap-2.5 mb-3 pb-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {ad.page_profile_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={ad.page_profile_picture_url} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      style={{ border: `1.5px solid ${color}25` }} />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ background: `${color}15`, color, border: `1.5px solid ${color}25` }}>
                      {storeName.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{storeName}</p>
                    {(ad as any).website && (
                      <a href={(ad as any).website} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] flex items-center gap-0.5 hover:underline" style={{ color: "#60A5FA" }}>
                        {(() => { try { return new URL((ad as any).website).hostname.replace("www.",""); } catch { return ""; } })()}
                        <ExternalLink size={7} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-[7px] p-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <span className="font-display text-[18px] font-black block" style={{ color: "var(--green-light)" }}>{activeShopAds}</span>
                    <span className="text-[8px]" style={{ color: "var(--text-3)" }}>Active Ads</span>
                  </div>
                  <div className="rounded-[7px] p-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <span className="font-display text-[18px] font-black block" style={{ color: "var(--text-1)" }}>{totalShopAds}</span>
                    <span className="text-[8px]" style={{ color: "var(--text-3)" }}>Total Ads</span>
                  </div>
                  <div className="rounded-[7px] p-2 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
                    <span className="font-display text-[18px] font-black block" style={{ color: "var(--ai-light)" }}>
                      {totalShopAds > 0 ? `${Math.round(activeShopAds / totalShopAds * 100)}%` : "—"}
                    </span>
                    <span className="text-[8px]" style={{ color: "var(--text-3)" }}>Active Rate</span>
                  </div>
                </div>

                {/* Revenue row */}
                {estDailyRev && (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-[7px] p-2" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                      <p className="text-[8px] font-bold uppercase mb-0.5" style={{ color: "var(--green-light)" }}>Daily</p>
                      <span className="font-display text-[14px] font-black" style={{ color: "var(--green-light)" }}>
                        ${estDailyRev >= 1000 ? `${(estDailyRev / 1000).toFixed(1)}k` : estDailyRev}
                      </span>
                    </div>
                    <div className="rounded-[7px] p-2" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
                      <p className="text-[8px] font-bold uppercase mb-0.5" style={{ color: "var(--green-light)" }}>Monthly</p>
                      <span className="font-display text-[14px] font-black" style={{ color: "var(--green-light)" }}>
                        ${estMonthlyRev! >= 1000 ? `${(estMonthlyRev! / 1000).toFixed(1)}k` : estMonthlyRev}
                      </span>
                    </div>
                    {estStoreRev && (
                      <div className="rounded-[7px] p-2" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                        <p className="text-[8px] font-bold uppercase mb-0.5" style={{ color: "var(--ai-light)" }}>Store</p>
                        <span className="font-display text-[14px] font-black" style={{ color: "var(--ai-light)" }}>
                          ${estStoreRev >= 1000 ? `${(estStoreRev / 1000).toFixed(1)}k` : estStoreRev}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* More from this shop — moved up, right after Shop Overview */}
              {shopAds.length > 0 && (
                <div className="rounded-[10px] p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <Monitor size={12} strokeWidth={1.8} style={{ color: "var(--ai-light)" }} />
                      <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>
                        More from {storeName}
                      </p>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-[4px]"
                      style={{ background: "var(--ai-soft)", color: "var(--ai-light)", fontWeight: 600 }}>
                      {totalShopAds} total
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {shopAds.map(a => <MiniAdCard key={a.id} ad={a} onClickStore={() => {
                      if (ad.page_id) window.location.href = `/stores/${ad.page_id}`;
                    }} />)}
                  </div>
                </div>
              )}

              {/* Seller Takeaway */}
              <div className="rounded-[10px] p-3" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.22)" }}>
                <div className="flex items-start gap-2">
                  <span className="text-[14px] flex-shrink-0">💡</span>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--ai-light)" }}>Seller Takeaway</p>
                    <p className="text-[12px] leading-relaxed font-medium" style={{ color: "var(--text-1)" }}>{ai.sellerTakeaway}</p>
                  </div>
                </div>
              </div>

              {/* Signals + Strategy/Compete — 2 col */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[10px] p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Performance Signals</p>
                  <div className="flex flex-col gap-2">
                    {ai.performanceSignals.slice(0, 5).map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[11px] flex-shrink-0 mt-px">{s.icon}</span>
                        <div>
                          <p className="text-[10px] font-bold leading-tight" style={{ color: s.color ?? "var(--text-1)" }}>{s.label}</p>
                          <p className="text-[9px] leading-snug" style={{ color: "var(--text-3)" }}>{s.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="rounded-[10px] p-3" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px]">🎨</span>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Creative Strategy</p>
                    </div>
                    <p className="text-[10px] leading-snug" style={{ color: "var(--text-2)" }}>{ai.creativeStrategy}</p>
                  </div>
                  <div className="rounded-[10px] p-3" style={{ background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)" }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[11px]">⚔️</span>
                      <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#34D399" }}>How to Compete</p>
                    </div>
                    <p className="text-[10px] leading-snug" style={{ color: "var(--text-2)" }}>{ai.competitiveEdge}</p>
                  </div>
                </div>
              </div>

              {/* Claude AI Analysis */}
              <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.04)" }}>
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
                    Analyzing with Claude...
                  </div>
                )}

                {claudeResult && claudeOpen && (
                  <div className="px-3 pb-3 border-t flex flex-col gap-2" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
                    <div className="flex items-center justify-between pt-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-display text-[24px] font-black leading-none" style={{ color: "#A78BFA" }}>{claudeResult.score}</span>
                        <span className="text-[10px]" style={{ color: "#A78BFA", opacity: 0.5 }}>/100</span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(167,139,250,0.12)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.2)" }}>
                          {claudeResult.productCategory}
                        </span>
                      </div>
                      <p className="text-[9px] text-right max-w-[140px] leading-snug" style={{ color: "var(--text-3)" }}>{claudeResult.scoreReason}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(167,139,250,0.2)", color: "#C4B5FD", border: "1px solid rgba(167,139,250,0.3)" }}>
                        {claudeResult.offerType}
                      </span>
                      {claudeResult.emotionalTriggers.map(t => (
                        <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                          style={{ background: "rgba(167,139,250,0.08)", color: "#A78BFA", border: "1px solid rgba(167,139,250,0.15)" }}>
                          {t}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Hook", text: claudeResult.hookAnalysis, bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", tc: "var(--text-2)", lc: "var(--text-3)" },
                        { label: "Audience", text: claudeResult.targetAudience, bg: "rgba(255,255,255,0.02)", border: "rgba(255,255,255,0.06)", tc: "var(--text-2)", lc: "var(--text-3)" },
                        { label: "Why Works", text: claudeResult.whyItWorks, bg: "rgba(52,211,153,0.05)", border: "rgba(52,211,153,0.12)", tc: "#6ee7b7", lc: "#34D399" },
                        { label: "Weakness", text: claudeResult.weaknesses, bg: "rgba(248,113,113,0.05)", border: "rgba(248,113,113,0.12)", tc: "#FCA5A5", lc: "#F87171" },
                      ].map(({ label, text, bg, border, tc, lc }) => (
                        <div key={label} className="rounded-[7px] px-2 py-1.5" style={{ background: bg, border: `1px solid ${border}` }}>
                          <p className="text-[8px] font-bold uppercase mb-0.5" style={{ color: lc }}>{label}</p>
                          <p className="text-[10px] leading-snug" style={{ color: tc }}>{text}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[11px] flex-shrink-0">🎯</span>
                      <div>
                        <p className="text-[8px] font-bold uppercase mb-0.5" style={{ color: "#34D399" }}>Strategy</p>
                        <p className="text-[10px] leading-snug" style={{ color: "#6ee7b7" }}>{claudeResult.replicationStrategy}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-bold uppercase mb-1" style={{ color: "var(--text-3)" }}>Tips</p>
                      {claudeResult.recommendations.map((r, i) => (
                        <p key={i} className="text-[10px] leading-snug mb-0.5" style={{ color: "var(--text-2)" }}>
                          <span className="font-bold" style={{ color: "#A78BFA" }}>{i + 1}.</span> {r}
                        </p>
                      ))}
                    </div>
                    <p className="text-[9px] text-right" style={{ color: "var(--text-3)" }}>
                      {claudeResult.scansCharged} scan{claudeResult.scansCharged > 1 ? "s" : ""} · claude-sonnet-4-6
                    </p>
                  </div>
                )}
              </div>


            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </>
  );
}
