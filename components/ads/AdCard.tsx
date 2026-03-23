"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bookmark, Play, Pause, Eye, DollarSign, Calendar, Volume2, VolumeX } from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { useSavedAds } from "@/lib/hooks/useSavedAds";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { detectLanguage, getLanguageFlag } from "@/lib/detect-language";
import AdDetailModal from "./AdDetailModal";

interface AdCardProps {
  ad: FbAd;
  index?: number;
  onSelect?: (ad: FbAd) => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────


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

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    const a = document.createElement("a");
    a.href = src;
    a.download = `${alt || "image"}.jpg`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  return (
    <div className="ad-creative-wrap group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={alt} loading="lazy"
        className="w-full h-full object-cover"
        style={{ display: "block", opacity: loaded ? 1 : 0, transition: "opacity 350ms" }}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && <div className="absolute inset-0 skeleton" />}
      {/* Download button — visible on hover */}
      <button
        onClick={handleDownload}
        className="absolute bottom-2 right-2 vid-btn opacity-0 group-hover:opacity-100"
        style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", borderRadius: 5, padding: 4, transition: "opacity 150ms" }}
        title="Download image"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>
    </div>
  );
}

// ── Format time (seconds → "0:05") ───────────────────────────────────────────

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Video creative with full controls ────────────────────────────────────────

function VideoCreative({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [hovered, setHovered] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTimeUpdate = useCallback(() => {
    const v = ref.current;
    if (v && v.duration) {
      setProgress((v.currentTime / v.duration) * 100);
      setCurrentTime(v.currentTime);
      setDuration(v.duration);
    }
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const handleMeta = () => setDuration(v.duration || 0);
    v.addEventListener("timeupdate", handleTimeUpdate);
    v.addEventListener("loadedmetadata", handleMeta);
    return () => {
      v.removeEventListener("timeupdate", handleTimeUpdate);
      v.removeEventListener("loadedmetadata", handleMeta);
    };
  }, [handleTimeUpdate]);

  // Auto-play only after deliberate hover (300ms delay)
  function handleMouseEnter() {
    setHovered(true);
    hoverTimerRef.current = setTimeout(() => {
      ref.current?.play().then(() => setPlaying(true)).catch(() => {});
    }, 300);
  }
  function handleMouseLeave() {
    setHovered(false);
    setShowMenu(false);
    if (hoverTimerRef.current) { clearTimeout(hoverTimerRef.current); hoverTimerRef.current = null; }
    if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
    setPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  }

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

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    const v = ref.current;
    if (!v) return;
    setVolume(val);
    v.volume = val;
    if (val === 0) { v.muted = true; setMuted(true); }
    else if (muted) { v.muted = false; setMuted(false); }
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

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    setShowMenu(false);
    const a = document.createElement("a");
    a.href = src;
    a.download = `${alt || "video"}.mp4`;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  function handleFullscreen(e: React.MouseEvent) {
    e.stopPropagation();
    ref.current?.requestFullscreen?.().catch(() => {});
  }

  function handleSpeed(e: React.MouseEvent, rate: number) {
    e.stopPropagation();
    if (ref.current) ref.current.playbackRate = rate;
    setShowMenu(false);
  }

  return (
    <div
      className="ad-creative-wrap"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full h-full object-cover"
        style={{ pointerEvents: "none" }}
        aria-label={alt}
      />

      {/* Center play — only when not hovered & not playing */}
      {!hovered && !playing && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.15)" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
            border: "1.5px solid rgba(255,255,255,0.25)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Play size={14} fill="white" color="white" style={{ marginLeft: 2 }} />
          </div>
        </div>
      )}

      {/* Bottom controls — always visible when hovered */}
      <div
        className="absolute bottom-0 left-0 right-0 transition-opacity"
        style={{
          background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          padding: "16px 6px 4px",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Progress bar */}
        <div ref={progressRef} onClick={seekTo}
          className="w-full h-1 rounded-full cursor-pointer mb-1.5"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          <div className="h-full rounded-full"
            style={{ width: `${progress}%`, background: "var(--ai-light)", transition: "width 80ms linear" }} />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-1">
          {/* Play/pause */}
          <button onClick={togglePlay} className="vid-btn">
            {playing ? <Pause size={11} fill="white" color="white" /> : <Play size={11} fill="white" color="white" style={{ marginLeft: 1 }} />}
          </button>

          {/* Timestamp */}
          <span className="font-data text-[8px] tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>

          <div className="flex-1" />

          {/* Volume */}
          <div className="relative" style={{ position: "relative" }}
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}>
            {showVolumeSlider && (
              <div onClick={e => e.stopPropagation()} style={{
                position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                marginBottom: 4, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
                borderRadius: 6, padding: "8px 6px", height: 60,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <input type="range" min={0} max={1} step={0.01}
                  value={muted ? 0 : volume} onChange={handleVolumeChange}
                  onClick={e => e.stopPropagation()}
                  style={{
                    width: 44, height: 3, appearance: "none", WebkitAppearance: "none",
                    background: `linear-gradient(to right, var(--ai-light) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.2) ${(muted ? 0 : volume) * 100}%)`,
                    borderRadius: 2, outline: "none", cursor: "pointer",
                    transform: "rotate(-90deg)", transformOrigin: "center center",
                  }}
                />
              </div>
            )}
            <button onClick={toggleMute} className="vid-btn">
              {muted ? <VolumeX size={10} strokeWidth={2} /> : <Volume2 size={10} strokeWidth={2} />}
            </button>
          </div>

          {/* Fullscreen */}
          <button onClick={handleFullscreen} className="vid-btn">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/>
            </svg>
          </button>

          {/* 3-dot menu */}
          <div style={{ position: "relative" }}>
            <button onClick={e => { e.stopPropagation(); setShowMenu(!showMenu); }} className="vid-btn">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/>
              </svg>
            </button>
            {showMenu && (
              <div onClick={e => e.stopPropagation()} style={{
                position: "absolute", bottom: "100%", right: 0, marginBottom: 4,
                background: "rgba(20,20,25,0.95)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                padding: "4px 0", minWidth: 130, zIndex: 10,
              }}>
                <button onClick={handleDownload} className="vid-menu-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download
                </button>
                <button onClick={e => handleSpeed(e, 0.5)} className="vid-menu-item">⏱ 0.5x Speed</button>
                <button onClick={e => handleSpeed(e, 1)} className="vid-menu-item">⏱ 1x Speed</button>
                <button onClick={e => handleSpeed(e, 1.5)} className="vid-menu-item">⏱ 1.5x Speed</button>
                <button onClick={e => handleSpeed(e, 2)} className="vid-menu-item">⏱ 2x Speed</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* VIDEO badge — top left */}
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

// ── AI Score Ribbon (prominent flag + fire for ≥80) ──────────────────────────

function AIScoreRibbon({ score }: { score: number }) {
  const isHot = score >= 80;
  const isGood = score >= 65;
  const isMid = score >= 50;

  let gradient: string;
  let shadow: string;
  if (isHot) {
    gradient = "linear-gradient(135deg, #DC2626, #F97316, #FBBF24)";
    shadow = "0 2px 16px rgba(239,68,68,0.6), 0 0 24px rgba(249,115,22,0.3)";
  } else if (isGood) {
    gradient = "linear-gradient(135deg, #7C3AED, #A78BFA)";
    shadow = "0 2px 12px rgba(124,58,237,0.5)";
  } else if (isMid) {
    gradient = "linear-gradient(135deg, #2563EB, #60A5FA)";
    shadow = "0 2px 12px rgba(37,99,235,0.4)";
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
      <span style={{
        fontSize: 7,
        fontWeight: 700,
        color: "rgba(255,255,255,0.8)",
        letterSpacing: "0.08em",
        lineHeight: 1,
      }}>
        AI
      </span>
      <span className="font-data" style={{
        fontSize: isHot ? 15 : 14,
        fontWeight: 800,
        color: "#fff",
        lineHeight: 1.1,
        letterSpacing: "-0.02em",
      }}>
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
  const adLang     = detectLanguage(ad.ad_creative_bodies?.[0]);
  const langFlag   = getLanguageFlag(adLang);
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
            <span className="flex items-center gap-0.5">
              <span style={{ fontSize: 11, lineHeight: 1 }}>{langFlag}</span>
              <span style={{ color: "var(--text-2)", fontWeight: 500, textTransform: "uppercase" }}>{adLang}</span>
            </span>
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
            {/* Niche tag */}
            {ad.niche && ad.niche !== "Other" && (
              <span className="ad-tag" style={{
                background: "rgba(124,58,237,0.10)",
                color: "#a78bfa",
                borderColor: "rgba(124,58,237,0.20)",
              }}>
                {ad.niche}
              </span>
            )}
            {/* Dropshipping tag */}
            {ad.ds_tag === "dropshipping" && (
              <span className="ad-tag" style={{
                background: "rgba(245,158,11,0.12)",
                color: "#FCD34D",
                borderColor: "rgba(245,158,11,0.25)",
              }}>
                🚀 DS
              </span>
            )}
            {ad.ds_tag === "brand" && (
              <span className="ad-tag" style={{
                background: "rgba(52,211,153,0.10)",
                color: "#34D399",
                borderColor: "rgba(52,211,153,0.20)",
              }}>
                ✦ Brand
              </span>
            )}
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
