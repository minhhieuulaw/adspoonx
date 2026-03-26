"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Play, Pause, Zap, Calendar, ExternalLink, BarChart2,
} from "lucide-react";
import type { StoreData } from "@/lib/store-helpers";
import { mapToFbAd, avatarColor, PLATFORM_COLORS, daysActive } from "@/lib/store-helpers";
import { getAIInsights } from "@/lib/ai-insights";
import AdCard from "@/components/ads/AdCard";

type TabKey = "active" | "paused" | "all";

const TABS: { key: TabKey; label: string; icon: typeof Play }[] = [
  { key: "active", label: "Active", icon: Play },
  { key: "paused", label: "Paused", icon: Pause },
  { key: "all", label: "All", icon: BarChart2 },
];

interface Props {
  pageId: string | null;
  onClose: () => void;
}

export default function StoreDetailModal({ pageId, onClose }: Props) {
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tab, setTab] = useState<TabKey>("active");
  const [hasMore, setHasMore] = useState(true);

  const fetchStore = useCallback(async (pid: string, status: string, offset = 0) => {
    const params = new URLSearchParams({ limit: "30", offset: String(offset), status });
    const r = await fetch(`/api/stores/${encodeURIComponent(pid)}?${params}`);
    if (!r.ok) throw new Error();
    return r.json();
  }, []);

  useEffect(() => {
    if (!pageId) { setStore(null); return; }
    setLoading(true);
    setTab("active");
    setHasMore(true);
    fetchStore(pageId, "all")
      .then(setStore)
      .catch(() => setStore(null))
      .finally(() => setLoading(false));
  }, [pageId, fetchStore]);

  const loadMore = useCallback(async () => {
    if (!pageId || !store || loadingMore) return;
    setLoadingMore(true);
    try {
      const status = tab === "active" ? "active" : tab === "paused" ? "paused" : "all";
      const data = await fetchStore(pageId, status, store.ads.length);
      if (data.ads.length === 0) { setHasMore(false); return; }
      setStore(prev => prev ? { ...prev, ads: [...prev.ads, ...data.ads] } : prev);
    } finally {
      setLoadingMore(false);
    }
  }, [pageId, store, tab, loadingMore, fetchStore]);

  // ESC to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const allAds = useMemo(() => store?.ads.map(mapToFbAd) ?? [], [store]);
  const activeAds = useMemo(() => allAds.filter((a) => a.is_active), [allAds]);
  const pausedAds = useMemo(() => allAds.filter((a) => !a.is_active), [allAds]);
  const displayAds = tab === "active" ? activeAds : tab === "paused" ? pausedAds : allAds;

  const avgScore = useMemo(() => {
    if (!activeAds.length) return 0;
    return Math.round(activeAds.reduce((s, a) => s + getAIInsights(a).winningScore, 0) / activeAds.length);
  }, [activeAds]);

  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const isOpen = !!pageId;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={handleOverlayClick}
          />

          {/* Slide-over Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col overflow-hidden"
            style={{
              width: "min(72vw, 960px)",
              minWidth: 380,
              background: "var(--bg-base, #0A0A0F)",
              borderLeft: "1px solid var(--border, #1E1E2A)",
            }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-lg transition-colors"
              style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}
            >
              <X size={16} />
            </button>

            {/* Loading */}
            {loading && (
              <div className="flex-1 p-6 space-y-4">
                <div className="h-20 rounded-xl skeleton" />
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl skeleton" />)}
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 10 }} />)}
                </div>
              </div>
            )}

            {/* Content */}
            {!loading && store && (() => {
              const color = avatarColor(store.pageName);
              const days = daysActive(store.firstSeenAt);
              return (
                <div className="flex-1 overflow-y-auto">
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-4 mb-5">
                      {store.profilePicture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={store.profilePicture} alt={store.pageName}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          style={{ border: `2px solid ${color}40` }} />
                      ) : (
                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-base font-bold"
                          style={{ background: `${color}20`, color, border: `2px solid ${color}35` }}>
                          {store.pageName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0 mr-8">
                        <h2 className="text-lg font-bold truncate" style={{ color: "var(--text-primary, #fff)" }}>
                          {store.pageName}
                        </h2>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {store.platforms.map((p) => (
                            <span key={p} className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                color: PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8",
                                background: `${PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8"}15`,
                              }}>
                              {p}
                            </span>
                          ))}
                          {store.countries.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.05)" }}>
                              {store.countries.slice(0, 4).join(", ")}
                              {store.countries.length > 4 && ` +${store.countries.length - 4}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
                      {[
                        { label: "Active", value: store.activeAds, color: "#34D399", icon: Play, fill: true },
                        { label: "Paused", value: store.pausedAds, color: "#EF4444", icon: Pause },
                        { label: "AI Score", value: avgScore, color: "#A78BFA", icon: Zap },
                        { label: "Tracking", value: days !== null ? `${days}d` : "—", color: "#FCD34D", icon: Calendar },
                      ].map((kpi) => (
                        <div key={kpi.label} className="rounded-xl p-3 flex items-center gap-2.5"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                            <kpi.icon size={14} style={{ color: kpi.color }} fill={kpi.fill ? kpi.color : "none"} />
                          </div>
                          <div>
                            <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{kpi.label}</p>
                            <p className="text-lg font-bold leading-none" style={{ color: "var(--text-primary, #fff)" }}>{kpi.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Ad Library link */}
                    <a href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&search_type=page&q=${encodeURIComponent(store.pageName)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                      style={{ color: "#A78BFA", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                      <ExternalLink size={12} /> View on Facebook Ad Library
                    </a>
                  </div>

                  {/* Tabs */}
                  <div className="px-6 mb-3">
                    <div className="flex items-center gap-1 p-1 rounded-lg w-fit"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      {TABS.map((t) => {
                        const count = t.key === "active" ? activeAds.length : t.key === "paused" ? pausedAds.length : allAds.length;
                        const isActive = tab === t.key;
                        return (
                          <button key={t.key} onClick={() => setTab(t.key)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
                            style={{
                              background: isActive ? "rgba(124,58,237,0.15)" : "transparent",
                              color: isActive ? "#A78BFA" : "var(--text-muted)",
                            }}>
                            <t.icon size={11} fill={t.key === "active" && isActive ? "#A78BFA" : "none"} />
                            {t.label}
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{
                                background: isActive ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.05)",
                                color: isActive ? "#A78BFA" : "var(--text-muted)",
                              }}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ads Grid */}
                  <div className="px-6 pb-6">
                    {displayAds.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                          {tab === "paused" ? "No paused ads yet" : "No ads found"}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                          {displayAds.map((ad, i) => (
                            <AdCard key={ad.id} ad={ad} index={i} />
                          ))}
                        </div>
                        {hasMore && displayAds.length >= 10 && (
                          <div className="flex justify-center mt-4">
                            <button
                              onClick={loadMore}
                              disabled={loadingMore}
                              className="px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                              style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", color: "#A78BFA" }}
                            >
                              {loadingMore ? "Loading..." : "Load more ads"}
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
