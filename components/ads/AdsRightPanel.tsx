"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Target, Lightbulb, TrendingUp, ExternalLink, Bookmark } from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights, getScoreBg, getScoreBorder } from "@/lib/ai-insights";
import { useSavedAds } from "@/lib/hooks/useSavedAds";

interface AdsRightPanelProps {
  ad: FbAd | null;
  onClose: () => void;
}

function daysRunning(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

const PLATFORM_LABEL: Record<string, string> = {
  instagram: "Instagram", facebook: "Facebook", messenger: "Messenger", audience_network: "Audience Network",
};
const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#F472B6", facebook: "#60A5FA", messenger: "#38BDF8", audience_network: "#A78BFA",
};

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={13} style={{ color: "var(--ai-light)" }} />
        <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--text-3)", letterSpacing: "0.08em" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function AdsRightPanel({ ad, onClose }: AdsRightPanelProps) {
  const { savedIds, toggleSave } = useSavedAds();

  return (
    <AnimatePresence>
      {ad && (
        <motion.div
          key="right-panel"
          initial={{ x: 380, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 380, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            bottom: 0,
            width: 380,
            zIndex: 50,
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          <PanelContent ad={ad} onClose={onClose} savedIds={savedIds} toggleSave={toggleSave} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PanelContent({
  ad,
  onClose,
  savedIds,
  toggleSave,
}: {
  ad: FbAd;
  onClose: () => void;
  savedIds: Set<string>;
  toggleSave: (ad: FbAd) => void;
}) {
  const ai = getAIInsights(ad);
  const isSaved = savedIds.has(ad.id);
  const storeName = ad.page_name ?? "Unknown";
  const days = daysRunning(ad.ad_delivery_start_time);
  const startDate = fmtDate(ad.ad_delivery_start_time);
  const stopDate  = fmtDate(ad.ad_delivery_stop_time);
  const isActive  = ad.is_active !== false;
  const platforms = ad.publisher_platforms ?? ["facebook"];
  const body      = ad.ad_creative_bodies?.[0] ?? ad.ad_creative_link_descriptions?.[0];
  const title     = ad.ad_creative_link_titles?.[0];

  return (
    <>
      {/* ── Panel header ── */}
      <div
        className="flex items-center gap-3 px-5 py-4 flex-shrink-0"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 1,
          background: "var(--bg-surface)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(12px)",
        }}
      >
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--bg-hover)", color: "var(--text-3)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-1)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-active)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
        >
          <X size={13} strokeWidth={2} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-display text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>
            {storeName}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {platforms.slice(0, 2).map((p) => {
              const color = PLATFORM_COLOR[p.toLowerCase()] ?? "#94A3B8";
              return (
                <span key={p} className="text-[9px] font-semibold px-1.5 py-[1px] rounded-[3px]"
                  style={{ color, background: `${color}15`, border: `1px solid ${color}25` }}>
                  {PLATFORM_LABEL[p.toLowerCase()] ?? p}
                </span>
              );
            })}
            <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
              {days !== null ? `${days}d running` : ""}
            </span>
          </div>
        </div>

        <button
          onClick={() => toggleSave(ad)}
          className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
          style={{
            color: isSaved ? "var(--ai-light)" : "var(--text-3)",
            background: isSaved ? "var(--ai-soft)" : "var(--bg-hover)",
            border: `1px solid ${isSaved ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
          }}
        >
          <Bookmark size={13} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* ── Creative preview ── */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="rounded-[10px] overflow-hidden" style={{ background: "rgba(0,0,0,0.3)" }}>
          {ad.image_url ? (
            <div style={{ aspectRatio: "16/9", overflow: "hidden" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.image_url} alt={storeName} className="w-full h-full object-cover" />
            </div>
          ) : ad.ad_snapshot_url ? (
            <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
              <iframe
                src={ad.ad_snapshot_url}
                className="w-full h-full border-0 pointer-events-none"
                style={{ transform: "scale(0.85)", transformOrigin: "top center" }}
                title={storeName}
                sandbox="allow-scripts allow-same-origin"
              />
              <div style={{ position: "absolute", inset: 0 }} />
            </div>
          ) : (
            <div className="flex items-center justify-center text-[12px]"
              style={{ height: 120, color: "var(--text-3)" }}>
              No creative preview
            </div>
          )}
        </div>

        {/* Copy */}
        {(title || body) && (
          <div className="mt-3">
            {title && (
              <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--text-1)" }}>{title}</p>
            )}
            {body && (
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>
                {body.length > 200 ? body.slice(0, 200) + "…" : body}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Winning Score ── */}
      <Section title="AI Winning Score" icon={Sparkles}>
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-[8px] ${ai.scoreGlow ? "ai-glow" : ""}`}
            style={{ background: getScoreBg(ai.winningScore), border: `1px solid ${getScoreBorder(ai.winningScore)}` }}
          >
            <Sparkles size={14} style={{ color: ai.scoreColor }} />
            <span className="font-display text-[24px] font-black tabular-nums" style={{ color: ai.scoreColor }}>
              {ai.winningScore}
            </span>
            <span className="text-[11px]" style={{ color: "var(--text-3)" }}>/100</span>
          </div>
          <div>
            <p className="text-[11px] font-medium" style={{ color: "var(--text-2)" }}>
              {ai.winningScore >= 80 ? "High Performer" : ai.winningScore >= 65 ? "Solid Performer" : "Early Stage"}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
              Based on delivery, platforms & copy
            </p>
          </div>
        </div>

        {/* Score bar */}
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-hover)" }}>
          <div
            className="score-bar h-full rounded-full"
            style={{
              width: `${ai.winningScore}%`,
              background: `linear-gradient(90deg, ${ai.scoreColor}aa, ${ai.scoreColor})`,
              boxShadow: ai.scoreGlow ? `0 0 8px ${ai.scoreColor}80` : "none",
            }}
          />
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 mt-3">
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-[5px]"
            style={{ background: ai.hookBg, color: ai.hookColor, border: `1px solid ${ai.hookColor}28` }}
          >
            🧠 {ai.hookType}
          </span>
          <span
            className="text-[10px] font-semibold px-2 py-1 rounded-[5px]"
            style={{ background: `${ai.trendColor}15`, color: ai.trendColor, border: `1px solid ${ai.trendColor}28` }}
          >
            {ai.trendIcon} {ai.trendLabel}
          </span>
        </div>
      </Section>

      {/* ── Why this ad works ── */}
      <Section title="Why This Ad Works" icon={Lightbulb}>
        <p className="text-[12px] leading-[1.7]" style={{ color: "var(--text-2)" }}>
          {ai.whyWorking}
        </p>
      </Section>

      {/* ── Target Audience ── */}
      <Section title="Target Audience" icon={Target}>
        {ai.targetAudience.split("\n").map((line, i) => (
          <p key={i} className="text-[12px]" style={{ color: i === 0 ? "var(--text-1)" : "var(--text-2)", marginBottom: i === 0 ? "4px" : 0 }}>
            {line}
          </p>
        ))}
      </Section>

      {/* ── Creative Strategy ── */}
      <Section title="Creative Strategy" icon={Lightbulb}>
        <p className="text-[12px] leading-[1.7]" style={{ color: "var(--text-2)" }}>
          {ai.creativeStrategy}
        </p>
      </Section>

      {/* ── Metrics ── */}
      <Section title="Delivery Metrics" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Status",    value: isActive ? "🟢 Active" : "⏸ Paused" },
            { label: "Running",   value: days !== null ? `${days} days` : "—" },
            { label: "Started",   value: startDate ?? "—" },
            { label: "Stopped",   value: stopDate ?? (isActive ? "Still running" : "—") },
            { label: "Platforms", value: platforms.map(p => PLATFORM_LABEL[p.toLowerCase()] ?? p).join(", ") || "—" },
            { label: "Country",   value: ad.country ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-[8px] px-3 py-2.5" style={{ background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
              <p className="text-[10px] mb-0.5" style={{ color: "var(--text-3)" }}>{label}</p>
              <p className="text-[12px] font-medium" style={{ color: "var(--text-1)" }}>{value}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Actions ── */}
      <div className="px-5 py-4 flex gap-2 flex-shrink-0">
        {ad.ad_snapshot_url && (
          <a
            href={ad.ad_snapshot_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[8px] text-[12px] font-semibold"
            style={{
              background: "var(--ai-soft)",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "var(--ai-light)",
            }}
          >
            <ExternalLink size={12} />
            View on Facebook
          </a>
        )}
        <button
          onClick={() => toggleSave(ad)}
          className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-[8px] text-[12px] font-semibold"
          style={{
            background: isSaved ? "var(--ai-soft)" : "var(--bg-hover)",
            border: `1px solid ${isSaved ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
            color: isSaved ? "var(--ai-light)" : "var(--text-2)",
          }}
        >
          <Bookmark size={12} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
          {isSaved ? "Saved" : "Save"}
        </button>
      </div>
    </>
  );
}
