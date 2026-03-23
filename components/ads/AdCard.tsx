"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Bookmark, Sparkles, Play, Eye, DollarSign, Calendar } from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { useSavedAds } from "@/lib/hooks/useSavedAds";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import AdDetailModal from "./AdDetailModal";

interface AdCardProps {
  ad: FbAd;
  index?: number;
  onSelect?: (ad: FbAd) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function FlagImg({ code }: { code: string }) {
  if (!code || code.length !== 2) return null;
  const c = code.toLowerCase();
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/20x15/${c}.png`}
      srcSet={`https://flagcdn.com/40x30/${c}.png 2x`}
      width={14} height={10} alt={code}
      style={{ borderRadius: 2, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    />
  );
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function daysRunning(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function fmtImpressions(lower?: string, upper?: string): string | null {
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
  if (avg >= 1_000) return `$${(avg / 1_000).toFixed(1)}k`;
  return `$${avg.toFixed(1)}`;
}

const AVATAR_PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#38BDF8"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

// ── Fade image (lazy load + smooth reveal) ─────────────────────────────────────

function FadeImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="ad-creative-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={alt} loading="lazy"
        className="w-full h-full object-cover"
        style={{ display: "block", opacity: loaded ? 1 : 0, transition: "opacity 350ms" }}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && <div className="absolute inset-0 skeleton" />}
    </div>
  );
}

// ── Video creative ─────────────────────────────────────────────────────────────

function VideoCreative({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className="ad-creative-wrap"
      onMouseEnter={() => { ref.current?.play().then(() => setPlaying(true)).catch(() => {}); }}
      onMouseLeave={() => {
        if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
        setPlaying(false);
      }}
    >
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full h-full object-cover"
        style={{ pointerEvents: "none" }}
        aria-label={alt}
      />
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ pointerEvents: "none" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)",
            border: "1.5px solid rgba(255,255,255,0.35)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play size={13} fill="white" color="white" style={{ marginLeft: 1 }} />
          </div>
        </div>
      )}
      {/* VIDEO badge */}
      <div style={{
        position: "absolute", top: 6, left: 6, pointerEvents: "none",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 4, padding: "1px 5px",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <Play size={7} fill="white" color="white" />
        <span style={{ fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em" }}>VIDEO</span>
      </div>
    </div>
  );
}

// ── AI Score badge (compact) ──────────────────────────────────────────────────

function AIScoreBadge({
  score, color, bg, border, glow,
}: { score: number; color: string; bg: string; border: string; glow: boolean }) {
  const r = 5.5;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  return (
    <div
      className={`flex items-center gap-0.5 px-1 py-[2px] rounded-[4px] flex-shrink-0 ${glow ? "ai-glow" : ""}`}
      style={{ background: bg, border: `1px solid ${border}` }}
      title={`AI Score: ${score}`}
    >
      <svg width={12} height={12} viewBox="0 0 12 12" style={{ flexShrink: 0 }}>
        <circle cx={6} cy={6} r={r} fill="none" stroke={`${color}22`} strokeWidth={1.5} />
        <circle cx={6} cy={6} r={r} fill="none" stroke={color} strokeWidth={1.5}
          strokeDasharray={`${fill} ${circ - fill}`} strokeLinecap="round" transform="rotate(-90 6 6)" />
      </svg>
      <span className="font-data text-[9px] font-bold tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function AdCard({ ad, index = 0, onSelect }: AdCardProps) {
  const { savedIds, toggleSave } = useSavedAds();
  const [modalOpen, setModalOpen] = useState(false);

  const isSaved    = savedIds.has(ad.id);
  const storeName  = ad.page_name ?? "Unknown";
  const isActive   = ad.is_active !== false;
  const days       = daysRunning(ad.ad_delivery_start_time);
  const startDate  = fmtDate(ad.ad_delivery_start_time);
  const countries  = ad.countries ?? (ad.country ? [ad.country] : []);
  const primary    = countries[0];
  const extra      = countries.length > 1 ? countries.length - 1 : 0;
  const color      = avatarColor(storeName);
  const impressFmt = fmtImpressions(ad.impressions?.lower_bound, ad.impressions?.upper_bound);
  const spendFmt   = fmtSpend(ad.spend?.lower_bound, ad.spend?.upper_bound);
  const ai         = getAIInsights(ad);

  function handleInspect() {
    if (onSelect) onSelect(ad);
    else setModalOpen(true);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.18, delay: Math.min(index * 0.02, 0.3) } }}
        className="ad-card rounded-[10px] overflow-hidden flex flex-col cursor-pointer"
        onClick={handleInspect}
      >
        {/* ── Creative (full-bleed, square aspect) ── */}
        <div className="overflow-hidden relative" style={{ background: "rgba(0,0,0,0.25)" }}>
          {ad.video_url ? (
            <VideoCreative src={ad.video_url} poster={ad.thumbnail_url ?? ad.image_url} alt={storeName} />
          ) : ad.image_url ? (
            <FadeImage src={ad.image_url} alt={storeName} />
          ) : (
            <div className="ad-creative-wrap flex items-center justify-center">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold"
                style={{ background: `${color}18`, color }}>
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}

          {/* AI score overlay — top right */}
          <div style={{ position: "absolute", top: 6, right: 6 }}>
            <AIScoreBadge
              score={ai.winningScore} color={ai.scoreColor}
              bg={getScoreBg(ai.winningScore)} border={getScoreBorder(ai.winningScore)}
              glow={ai.scoreGlow}
            />
          </div>

          {/* LIVE badge overlay — bottom left */}
          <div style={{
            position: "absolute", bottom: 6, left: 6,
            display: "flex", alignItems: "center", gap: 4,
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
            borderRadius: 4, padding: "2px 6px",
          }}>
            <span
              className={isActive ? "live-dot" : ""}
              style={{
                display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.3)",
                flexShrink: 0,
              }}
            />
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: "0.04em",
              color: isActive ? "var(--green-light)" : "rgba(255,255,255,0.5)",
            }}>
              {isActive ? "LIVE" : "OFF"}
            </span>
            {days !== null && (
              <span className="font-data" style={{ fontSize: 9, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>
                {days}d
              </span>
            )}
          </div>
        </div>

        {/* ── Footer: all info compact ── */}
        <div className="px-2.5 py-2 flex flex-col gap-1.5">
          {/* Brand row */}
          <div className="flex items-center gap-1.5 min-w-0">
            {ad.page_profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ad.page_profile_picture_url} alt={storeName}
                className="w-5 h-5 rounded-full flex-shrink-0 object-cover"
                style={{ border: `1px solid ${color}30` }}
                onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold"
                style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}>
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-[11px] font-medium flex-1 truncate" style={{ color: "var(--text-1)" }}>
              {storeName}
            </span>
            <button
              onClick={e => { e.stopPropagation(); toggleSave(ad); }}
              className="p-1 rounded-[4px] flex-shrink-0"
              style={{
                color: isSaved ? "var(--ai-light)" : "var(--text-3)",
                background: isSaved ? "var(--ai-soft)" : "transparent",
                transition: "all 100ms",
              }}
              title={isSaved ? "Saved" : "Save"}
            >
              <Bookmark size={11} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
            </button>
          </div>

          {/* Stats row: country · impressions · spend · date */}
          <div className="flex items-center gap-1.5 flex-wrap" style={{ fontSize: 9, color: "var(--text-3)" }}>
            {primary && (
              <span className="flex items-center gap-0.5">
                <FlagImg code={primary} />
                <span style={{ color: "var(--text-2)", fontWeight: 500 }}>{primary}</span>
                {extra > 0 && <span>+{extra}</span>}
              </span>
            )}
            {impressFmt && (
              <span className="flex items-center gap-0.5 tabular-nums">
                <Eye size={8} strokeWidth={1.5} />{impressFmt}
              </span>
            )}
            {spendFmt && (
              <span className="flex items-center gap-0.5 tabular-nums">
                <DollarSign size={8} strokeWidth={1.5} />{spendFmt}
              </span>
            )}
            {startDate && (
              <span className="flex items-center gap-0.5">
                <Calendar size={8} strokeWidth={1.5} />{startDate}
              </span>
            )}
          </div>

          {/* AI tags + Analyze button */}
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <span className="text-[8px] font-semibold px-1.5 py-[2px] rounded-[4px]"
              style={{ background: ai.hookBg, color: ai.hookColor, border: `1px solid ${ai.hookColor}22` }}>
              {ai.hookType}
            </span>
            <span className="text-[8px] font-semibold px-1.5 py-[2px] rounded-[4px]"
              style={{ background: `${ai.trendColor}12`, color: ai.trendColor, border: `1px solid ${ai.trendColor}22` }}>
              {ai.trendIcon} {ai.trendLabel}
            </span>
            <div className="flex-1" />
            <button
              onClick={e => { e.stopPropagation(); handleInspect(); }}
              className="flex items-center gap-1 px-2 py-[3px] rounded-[4px] text-[9px] font-semibold"
              style={{
                background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.2)",
                color: "var(--ai-light)", transition: "background 100ms",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.2)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--ai-soft)"; }}
            >
              <Sparkles size={8} strokeWidth={2} />
              Analyze
            </button>
          </div>
        </div>
      </motion.div>

      {!onSelect && (
        <AdDetailModal ad={modalOpen ? ad : null} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
