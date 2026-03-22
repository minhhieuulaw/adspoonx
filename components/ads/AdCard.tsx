"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Bookmark, Sparkles, Play, Calendar, Eye, DollarSign } from "lucide-react";
import Link from "next/link";
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
      width={16}
      height={12}
      alt={code}
      style={{ borderRadius: 2, display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
    />
  );
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "2-digit" });
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
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ aspectRatio: "4/3", overflow: "hidden", position: "relative", background: "rgba(255,255,255,0.03)" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src} alt={alt} loading="lazy"
        className="w-full h-full object-cover"
        style={{
          display: "block",
          opacity: loaded ? 1 : 0,
          transform: hovered ? "scale(1.05)" : "scale(1)",
          transition: "opacity 350ms, transform 0.5s var(--ease)",
        }}
        onLoad={() => setLoaded(true)}
      />
      {/* Skeleton shimmer while loading */}
      {!loaded && (
        <div className="absolute inset-0 skeleton" />
      )}
    </div>
  );
}

// ── Video creative ─────────────────────────────────────────────────────────────

function VideoCreative({ src, poster, alt }: { src: string; poster?: string; alt: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ aspectRatio: "4/3", overflow: "hidden", position: "relative" }}
      onMouseEnter={() => {
        setHovered(true);
        ref.current?.play().then(() => setPlaying(true)).catch(() => {});
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (ref.current) { ref.current.pause(); ref.current.currentTime = 0; }
        setPlaying(false);
      }}
    >
      <video
        ref={ref} src={src} poster={poster} muted playsInline loop preload="metadata"
        className="w-full h-full object-cover"
        style={{ pointerEvents: "none", transition: "transform 0.4s var(--ease)", transform: hovered ? "scale(1.03)" : "scale(1)" }}
        aria-label={alt}
      />
      {/* Dim overlay on idle */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: playing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.22)",
        transition: "background 300ms",
      }} />
      {/* Play button */}
      {!playing && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)",
            border: "1.5px solid rgba(255,255,255,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: hovered ? "scale(1.1)" : "scale(1)",
            transition: "transform 200ms var(--ease), box-shadow 200ms",
            boxShadow: hovered ? "0 0 20px rgba(255,255,255,0.2)" : "none",
          }}>
            <Play size={15} fill="white" color="white" style={{ marginLeft: 2 }} />
          </div>
        </div>
      )}
      {/* VIDEO badge */}
      <div style={{
        position: "absolute", top: 8, left: 8, pointerEvents: "none",
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 5, padding: "2px 6px",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <Play size={7} fill="white" color="white" />
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.9)", letterSpacing: "0.06em" }}>
          VIDEO
        </span>
      </div>
    </div>
  );
}

// ── Brand avatar ───────────────────────────────────────────────────────────────

function BrandAvatar({ name, src, color }: { name: string; src?: string; color: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src} alt={name}
        className="w-7 h-7 rounded-full flex-shrink-0 object-cover"
        style={{ border: `1.5px solid ${color}40` }}
        onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      />
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold"
      style={{ background: `${color}20`, color, border: `1.5px solid ${color}35`, letterSpacing: "-0.02em" }}
    >
      {initials}
    </div>
  );
}

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value }: { icon: React.ElementType; value: string }) {
  return (
    <span className="flex items-center gap-0.5 text-[10px] tabular-nums" style={{ color: "var(--text-3)" }}>
      <Icon size={9} strokeWidth={1.5} />
      {value}
    </span>
  );
}

// ── AI Score badge (circular gauge) ────────────────────────────────────────────

function AIScoreBadge({
  score, color, bg, border, glow,
}: { score: number; color: string; bg: string; border: string; glow: boolean }) {
  const r = 6.5;
  const circ = 2 * Math.PI * r;
  const fill = circ * (score / 100);
  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-[3px] rounded-[5px] flex-shrink-0 ${glow ? "ai-glow" : ""}`}
      style={{ background: bg, border: `1px solid ${border}` }}
      title={`AI Winning Score: ${score}/100`}
    >
      {/* mini gauge ring */}
      <svg width={14} height={14} viewBox="0 0 14 14" style={{ flexShrink: 0 }}>
        {/* track */}
        <circle cx={7} cy={7} r={r} fill="none" stroke={`${color}22`} strokeWidth={2} />
        {/* fill */}
        <circle
          cx={7} cy={7} r={r} fill="none"
          stroke={color} strokeWidth={2}
          strokeDasharray={`${fill} ${circ - fill}`}
          strokeLinecap="round"
          transform="rotate(-90 7 7)"
        />
      </svg>
      <span className="font-data text-[10px] font-bold tabular-nums" style={{ color }}>
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

  const ai = getAIInsights(ad);

  function handleInspect() {
    if (onSelect) onSelect(ad);
    else setModalOpen(true);
  }

  const liveColor  = isActive ? "var(--green-light)" : "var(--text-3)";
  const hasMeta    = primary || impressFmt || spendFmt;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: index * 0.03 } }}
        className="rounded-[12px] overflow-hidden flex flex-col cursor-pointer"
        style={{
          background: "var(--bg-card)",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
          transition: "border-color 150ms var(--ease), box-shadow 150ms var(--ease), transform 150ms var(--ease)",
        }}
        onClick={handleInspect}
        onMouseEnter={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(255,255,255,0.16)";
          el.style.boxShadow   = "0 8px 28px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)";
          el.style.transform   = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          const el = e.currentTarget as HTMLElement;
          el.style.borderColor = "rgba(255,255,255,0.09)";
          el.style.boxShadow   = "0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)";
          el.style.transform   = "translateY(0)";
        }}
      >
        {/* ── Header: avatar + brand + AI score ── */}
        <div className="flex items-center gap-2 px-3 pt-3 pb-2.5">
          <BrandAvatar name={storeName} src={ad.page_profile_picture_url} color={color} />
          <p className="font-display text-[12px] font-semibold flex-1 truncate" style={{ color: "var(--text-1)" }}>
            {storeName}
          </p>
          <AIScoreBadge
            score={ai.winningScore}
            color={ai.scoreColor}
            bg={getScoreBg(ai.winningScore)}
            border={getScoreBorder(ai.winningScore)}
            glow={ai.scoreGlow}
          />
        </div>

        {/* ── Status row: LIVE Xd + date range ── */}
        <div className="flex items-center justify-between px-3 pb-2.5">
          {/* LIVE · Xd — đồng màu xanh */}
          <span className="flex items-center gap-1 text-[10px] font-bold" style={{ color: liveColor }}>
            <span
              className={isActive ? "live-dot" : ""}
              style={{
                display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                background: isActive ? "var(--green-light)" : "rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            />
            {isActive ? "LIVE" : "PAUSED"}
            {days !== null && (
              <span className="font-data" style={{ fontWeight: 700 }}>{days}d</span>
            )}
          </span>

          {/* Date range */}
          {startDate && (
            <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
              <Calendar size={9} strokeWidth={1.5} />
              {startDate} → Today
            </span>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: "1px", background: "var(--border)", margin: "0 12px 8px" }} />

        {/* ── Creative ── */}
        <div className="mx-3 rounded-[8px] overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
          {ad.video_url ? (
            <VideoCreative src={ad.video_url} poster={ad.thumbnail_url ?? ad.image_url} alt={storeName} />
          ) : ad.image_url ? (
            <FadeImage src={ad.image_url} alt={storeName} />
          ) : ad.ad_snapshot_url ? (
            <div className="relative" style={{ height: 180 }}>
              <iframe
                src={ad.ad_snapshot_url}
                className="w-full h-full border-0 pointer-events-none scale-[0.85] origin-top"
                title={storeName}
                sandbox="allow-scripts allow-same-origin"
              />
              <div className="absolute inset-0" />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1" style={{ height: 120 }}>
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                style={{ background: `${color}18`, color }}
              >
                {storeName.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-3)" }}>No preview</span>
            </div>
          )}
        </div>

        {/* ── Stats row: country + impressions + spend ── */}
        {hasMeta && (
          <div className="flex items-center gap-2 px-3 pt-2.5 flex-wrap">
            {primary && (
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                <FlagImg code={primary} />
                <span className="font-medium" style={{ color: "var(--text-2)" }}>{primary}</span>
                {extra > 0 && <span className="text-[9px]" style={{ color: "var(--text-3)" }}>+{extra}</span>}
              </span>
            )}
            {(impressFmt || spendFmt) && primary && (
              <span style={{ color: "var(--text-3)", fontSize: 8, lineHeight: 1 }}>·</span>
            )}
            {impressFmt && <StatPill icon={Eye} value={impressFmt} />}
            {spendFmt   && <StatPill icon={DollarSign} value={spendFmt} />}
          </div>
        )}

        {/* ── AI tags: hook + trend ── */}
        <div className="flex items-center gap-1.5 px-3 pt-1.5">
          <span
            className="text-[9px] font-semibold px-2 py-[3px] rounded-[5px]"
            style={{ background: ai.hookBg, color: ai.hookColor, border: `1px solid ${ai.hookColor}28` }}
          >
            🧠 {ai.hookType}
          </span>
          <span
            className="text-[9px] font-semibold px-2 py-[3px] rounded-[5px]"
            style={{ background: `${ai.trendColor}15`, color: ai.trendColor, border: `1px solid ${ai.trendColor}28` }}
          >
            {ai.trendIcon} {ai.trendLabel}
          </span>
        </div>

        {/* ── Actions ── */}
        <div
          className="flex items-center gap-2 px-3 py-2.5 mt-auto"
          style={{ borderTop: "1px solid var(--border)", marginTop: "0.625rem" }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={e => { e.stopPropagation(); handleInspect(); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-[7px] text-[11px] font-semibold"
            style={{
              background: "var(--ai-soft)",
              border: "1px solid rgba(124,58,237,0.25)",
              color: "var(--ai-light)",
              transition: "background 120ms var(--ease)",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.2)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--ai-soft)"; }}
          >
            <Sparkles size={10} strokeWidth={2} />
            Analyze
          </button>

          <button
            onClick={e => { e.stopPropagation(); toggleSave(ad); }}
            className="p-1.5 rounded-[7px]"
            style={{
              color: isSaved ? "var(--ai-light)" : "var(--text-3)",
              background: isSaved ? "var(--ai-soft)" : "var(--bg-hover)",
              border: `1px solid ${isSaved ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
              transition: "all 120ms var(--ease)",
            }}
            title={isSaved ? "Saved" : "Save"}
          >
            <Bookmark size={12} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
          </button>

          {ad.ad_snapshot_url && (
            <Link
              href={ad.ad_snapshot_url}
              target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="p-1.5 rounded-[7px]"
              style={{
                color: "var(--text-3)", background: "var(--bg-hover)",
                border: "1px solid var(--border)", transition: "all 120ms var(--ease)",
                display: "flex", alignItems: "center",
              }}
              title="View on Facebook"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/>
                <line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
            </Link>
          )}
        </div>
      </motion.div>

      {!onSelect && (
        <AdDetailModal ad={modalOpen ? ad : null} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
