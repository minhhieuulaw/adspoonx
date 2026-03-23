"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bookmark, Play, Pause, Eye, DollarSign, Calendar, Volume2, VolumeX } from "lucide-react";
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

// Platform icon SVGs (compact)
function PlatformIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  if (p === "facebook")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#1877F2" }}>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
  if (p === "instagram")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#E4405F" }}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
      </svg>
    );
  if (p === "audience_network")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#6B7280" }}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
      </svg>
    );
  if (p === "messenger")
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ color: "#0084FF" }}>
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.2l3.131 3.259L19.752 8.2l-6.561 6.763z"/>
      </svg>
    );
  return null;
}

// ── Fade image ─────────────────────────────────────────────────────────────────

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

// ── Video creative with controls ──────────────────────────────────────────────

function VideoCreative({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  const handleTimeUpdate = useCallback(() => {
    const v = ref.current;
    if (v && v.duration) setProgress((v.currentTime / v.duration) * 100);
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.addEventListener("timeupdate", handleTimeUpdate);
    return () => v.removeEventListener("timeupdate", handleTimeUpdate);
  }, [handleTimeUpdate]);

  function togglePlay(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    if (playing) { v.pause(); setPlaying(false); }
    else { v.play().then(() => setPlaying(true)).catch(() => {}); }
  }

  function toggleMute(e: React.MouseEvent) {
    e.stopPropagation();
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
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

  return (
    <div className="ad-creative-wrap group">
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full h-full object-cover"
        style={{ pointerEvents: "none" }}
        aria-label={alt}
      />

      {/* Center play/pause — only visible when paused or on hover */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-opacity"
        style={{ opacity: playing ? 0 : 1, pointerEvents: playing ? "none" : "auto" }}
      >
        <button onClick={togglePlay} style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)",
          border: "1.5px solid rgba(255,255,255,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
        }}>
          {playing
            ? <Pause size={14} fill="white" color="white" />
            : <Play size={14} fill="white" color="white" style={{ marginLeft: 2 }} />
          }
        </button>
      </div>

      {/* Bottom controls bar */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center gap-1.5 px-1.5 py-1 transition-opacity"
        style={{
          background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
          opacity: playing ? 1 : 0,
          pointerEvents: playing ? "auto" : "none",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Play/pause mini */}
        <button onClick={togglePlay} className="flex-shrink-0" style={{ color: "white", cursor: "pointer", background: "none", border: "none", padding: 2 }}>
          {playing ? <Pause size={10} fill="white" /> : <Play size={10} fill="white" style={{ marginLeft: 1 }} />}
        </button>

        {/* Progress bar */}
        <div
          ref={progressRef}
          onClick={seekTo}
          className="flex-1 h-1 rounded-full cursor-pointer"
          style={{ background: "rgba(255,255,255,0.2)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: "var(--ai-light)",
              transition: "width 100ms linear",
            }}
          />
        </div>

        {/* Mute/unmute */}
        <button onClick={toggleMute} className="flex-shrink-0" style={{ color: "white", cursor: "pointer", background: "none", border: "none", padding: 2 }}>
          {muted ? <VolumeX size={10} strokeWidth={2} /> : <Volume2 size={10} strokeWidth={2} />}
        </button>
      </div>

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

// ── AI Score Ribbon (prominent flag design) ─────────────────────────────────────

function AIScoreRibbon({ score }: { score: number }) {
  // Tier-based gradient
  let gradient: string;
  let shadow: string;
  if (score >= 80) {
    gradient = "linear-gradient(135deg, #7C3AED, #A78BFA)";
    shadow = "0 2px 12px rgba(124,58,237,0.5)";
  } else if (score >= 65) {
    gradient = "linear-gradient(135deg, #2563EB, #60A5FA)";
    shadow = "0 2px 12px rgba(37,99,235,0.4)";
  } else if (score >= 50) {
    gradient = "linear-gradient(135deg, #D97706, #FCD34D)";
    shadow = "0 2px 12px rgba(217,119,6,0.4)";
  } else {
    gradient = "linear-gradient(135deg, #475569, #94A3B8)";
    shadow = "0 2px 8px rgba(71,85,105,0.3)";
  }

  return (
    <div
      className="ai-score-ribbon"
      style={{
        position: "absolute",
        top: -1,
        right: 10,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "4px 8px 6px",
        background: gradient,
        borderRadius: "0 0 6px 6px",
        boxShadow: shadow,
        minWidth: 32,
      }}
      title={`AI Performance Score: ${score}/100`}
    >
      <span style={{ fontSize: 7, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: "0.08em", lineHeight: 1 }}>
        AI
      </span>
      <span className="font-data" style={{ fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        {score}
      </span>
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
  const platforms  = ad.publisher_platforms ?? [];

  function handleInspect() {
    if (onSelect) onSelect(ad);
    else setModalOpen(true);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.18, delay: Math.min(index * 0.02, 0.3) } }}
        whileHover={{ y: -4, scale: 1.015, transition: { type: "spring", stiffness: 400, damping: 22 } }}
        className="ad-card rounded-[10px] overflow-hidden flex flex-col cursor-pointer relative"
        onClick={handleInspect}
      >
        {/* ── AI Score Ribbon — top right flag ── */}
        <AIScoreRibbon score={ai.winningScore} />

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

          {/* LIVE badge overlay — bottom left */}
          <div style={{
            position: "absolute", bottom: ad.video_url ? 28 : 6, left: 6,
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

        {/* ── Footer ── */}
        <div className="px-2.5 py-2 flex flex-col gap-1.5">
          {/* Brand row + bookmark */}
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
              <Bookmark size={12} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
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

          {/* Strategy + Performance tags + Platform icons */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Strategy tag — what type of ad */}
            <span className="ad-tag" style={{
              background: `${ai.hookColor}10`,
              color: ai.hookColor,
              borderColor: `${ai.hookColor}20`,
            }}>
              {ai.hookType}
            </span>
            {/* Performance tag — how it's doing */}
            <span className="ad-tag" style={{
              background: `${ai.trendColor}10`,
              color: ai.trendColor,
              borderColor: `${ai.trendColor}20`,
            }}>
              {ai.trendIcon} {ai.trendLabel}
            </span>
            {/* Spacer */}
            <div className="flex-1" />
            {/* Platform icons */}
            <div className="flex items-center gap-0.5">
              {platforms.map(p => (
                <PlatformIcon key={p} platform={p} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {!onSelect && (
        <AdDetailModal ad={modalOpen ? ad : null} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
