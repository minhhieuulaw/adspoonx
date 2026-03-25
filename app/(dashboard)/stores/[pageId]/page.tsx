"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Store, Zap, BarChart2, Calendar, Pause,
  ExternalLink, Play,
} from "lucide-react";
import { getAIInsights } from "@/lib/ai-insights";
import AdCard from "@/components/ads/AdCard";
import type { StoreData } from "@/lib/store-helpers";
import { mapToFbAd, avatarColor, PLATFORM_COLORS, daysActive } from "@/lib/store-helpers";

type TabKey = "active" | "paused" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "all", label: "All" },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function StoreProfilePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("active");

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    fetch(`/api/stores/${encodeURIComponent(pageId)}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setStore)
      .catch(() => setError("Store not found"))
      .finally(() => setLoading(false));
  }, [pageId]);

  const allAds = useMemo(() => store?.ads.map(mapToFbAd) ?? [], [store]);
  const activeAds = useMemo(() => allAds.filter((a) => a.is_active), [allAds]);
  const pausedAds = useMemo(() => allAds.filter((a) => !a.is_active), [allAds]);

  const displayAds = tab === "active" ? activeAds : tab === "paused" ? pausedAds : allAds;

  const avgScore = useMemo(() => {
    if (!activeAds.length) return 0;
    const sum = activeAds.reduce((acc, ad) => acc + getAIInsights(ad).winningScore, 0);
    return Math.round(sum / activeAds.length);
  }, [activeAds]);

  if (loading) {
    return (
      <div className="max-w-6xl page-enter">
        <div className="h-32 rounded-[14px] skeleton mb-5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-[12px] skeleton" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 10 }} />)}
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Store size={32} style={{ color: "var(--text-3)" }} />
        <p className="text-[14px] font-medium mt-3" style={{ color: "var(--text-2)" }}>{error ?? "Store not found"}</p>
        <Link href="/stores" className="mt-3 text-[13px] font-medium flex items-center gap-1" style={{ color: "var(--ai-light)" }}>
          <ArrowLeft size={14} /> Back to stores
        </Link>
      </div>
    );
  }

  const color = avatarColor(store.pageName);
  const days = daysActive(store.firstSeenAt);

  return (
    <div className="max-w-6xl page-enter">
      {/* Back */}
      <Link href="/stores" className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-4" style={{ color: "var(--text-3)" }}>
        <ArrowLeft size={13} /> All Stores
      </Link>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[14px] p-5 mb-5 flex items-center gap-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {store.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.profilePicture} alt={store.pageName}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            style={{ border: `2px solid ${color}40` }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-[18px] font-bold"
            style={{ background: `${color}20`, color, border: `2px solid ${color}35` }}>
            {store.pageName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[20px] font-bold truncate" style={{ color: "var(--text-1)" }}>
            {store.pageName}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {store.platforms.map((p) => (
              <span key={p} className="text-[10px] font-bold px-2 py-[2px] rounded-[5px]"
                style={{
                  color: PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8",
                  background: `${PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8"}15`,
                  border: `1px solid ${PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8"}30`,
                }}>
                {p}
              </span>
            ))}
            {store.niches.slice(0, 3).map((n) => (
              <span key={n} className="text-[10px] font-medium px-2 py-[2px] rounded-[5px]"
                style={{ color: "var(--ai-light)", background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.2)" }}>
                {n}
              </span>
            ))}
            {store.countries.length > 0 && (
              <span className="text-[10px] font-medium px-2 py-[2px] rounded-[5px]"
                style={{ color: "var(--text-muted)", background: "var(--content-bg)", border: "1px solid var(--sidebar-border)" }}>
                {store.countries.join(", ")}
              </span>
            )}
          </div>
        </div>
        <a href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=all&search_type=page&q=${encodeURIComponent(store.pageName)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold flex-shrink-0"
          style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
          <ExternalLink size={12} /> Ad Library
        </a>
      </motion.div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(52,211,153,0.12)" }}>
            <Play size={16} strokeWidth={1.8} fill="#34D399" style={{ color: "#34D399" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Active</p>
            <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "#34D399" }}>{store.activeAds}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)" }}>
            <Pause size={16} strokeWidth={1.8} style={{ color: "#EF4444" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Paused</p>
            <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>{store.pausedAds}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "var(--ai-soft)" }}>
            <Zap size={16} strokeWidth={1.8} style={{ color: "var(--ai-light)" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Avg AI Score</p>
            <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>{avgScore}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
            <Calendar size={16} strokeWidth={1.8} style={{ color: "#FCD34D" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Tracking</p>
            <p className="font-display text-[16px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>
              {days !== null ? `${days}d` : "—"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 mb-4 p-1 rounded-[10px] w-fit"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        {TABS.map((t) => {
          const count = t.key === "active" ? activeAds.length : t.key === "paused" ? pausedAds.length : allAds.length;
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all"
              style={{
                background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                color: isActive ? "var(--ai-light)" : "var(--text-muted)",
              }}
            >
              {t.label}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                style={{
                  background: isActive ? "rgba(124,58,237,0.2)" : "var(--content-bg)",
                  color: isActive ? "var(--ai-light)" : "var(--text-muted)",
                }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Ads Grid ── */}
      {displayAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {tab === "paused" ? "No paused ads found yet" : "No ads found"}
          </p>
        </div>
      ) : (
        <div className="ads-grid-container">
          <div className="ads-grid">
            {displayAds.map((ad, i) => (
              <AdCard key={ad.id} ad={ad} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
