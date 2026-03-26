"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Store, Zap, BarChart2, Calendar, Pause,
  ExternalLink, Play, Sparkles, ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import type { ShopAnalysisResult } from "@/app/api/ai/analyze-shop/route";
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

  const [shopAI,        setShopAI]        = useState<ShopAnalysisResult | null>(null);
  const [shopAILoading, setShopAILoading] = useState(false);
  const [shopAIError,   setShopAIError]   = useState("");
  const [shopAIOpen,    setShopAIOpen]    = useState(false);

  async function runShopAnalysis() {
    if (!pageId) return;
    setShopAILoading(true);
    setShopAIError("");
    setShopAIOpen(true);
    try {
      const r    = await fetch("/api/ai/analyze-shop", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pageId }),
      });
      const data = await r.json() as ShopAnalysisResult & { error?: string };
      if (!r.ok) setShopAIError(data.error ?? "Analysis failed");
      else       setShopAI(data);
    } catch {
      setShopAIError("Network error. Vui lòng thử lại.");
    } finally {
      setShopAILoading(false);
    }
  }

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

      {/* ── Shop AI Insights ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="rounded-[14px] overflow-hidden mb-5"
        style={{ border: "1px solid rgba(124,58,237,0.25)", background: "rgba(124,58,237,0.04)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles size={14} style={{ color: "#A78BFA" }} />
            <span className="font-semibold text-[13px]" style={{ color: "#A78BFA" }}>Shop AI Intelligence</span>
            {shopAI?.cached && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: "rgba(52,211,153,0.12)", color: "#34D399" }}>cached</span>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            {!shopAI && !shopAILoading && (
              <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-3)" }}>
                <Zap size={9} style={{ color: "#A78BFA" }} />10 scans · Premium+
              </span>
            )}
            {shopAI && (
              <button onClick={() => setShopAIOpen(o => !o)} className="p-1" style={{ color: "var(--text-3)" }}>
                {shopAIOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            )}
          </div>
        </div>

        {/* Generate button */}
        {!shopAI && !shopAILoading && (
          <div className="px-5 pb-5">
            <button
              onClick={() => void runShopAnalysis()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-[10px] text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.35)", color: "var(--ai-light)" }}
            >
              <Sparkles size={13} />
              Generate Shop AI Analysis
            </button>
            {shopAIError && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[12px]" style={{ color: "#F87171" }}>
                <AlertCircle size={12} />{shopAIError}
              </div>
            )}
          </div>
        )}

        {shopAILoading && (
          <div className="px-5 pb-5 flex items-center gap-2.5 text-[12px]" style={{ color: "var(--text-3)" }}>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-[#A78BFA] border-t-transparent animate-spin" />
            Claude đang phân tích {store.pageName}...
          </div>
        )}

        {shopAI && shopAIOpen && (
          <div className="px-5 pb-5 border-t flex flex-col gap-4" style={{ borderColor: "rgba(124,58,237,0.15)" }}>
            {/* Overall strategy */}
            <div className="pt-4">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>Overall Strategy</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-1)" }}>{shopAI.overallStrategy}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left column */}
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Target Market</p>
                  <div className="rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{shopAI.targetMarket}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Brand Voice</p>
                  <div className="rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{shopAI.brandVoice}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Pricing Strategy</p>
                  <div className="rounded-[8px] px-3 py-2.5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{shopAI.pricingStrategy}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Ad Cadence</p>
                  <p className="text-[12px]" style={{ color: "var(--text-2)" }}>{shopAI.adCadence}</p>
                </div>
              </div>

              {/* Right column */}
              <div className="flex flex-col gap-3">
                {/* Top Hooks */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Top Hook Patterns</p>
                  <div className="flex flex-col gap-1.5">
                    {shopAI.topHooks.map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                        <span className="font-bold mt-0.5 flex-shrink-0" style={{ color: "#A78BFA" }}>{i + 1}.</span>{h}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Strengths</p>
                  <div className="flex flex-col gap-1">
                    {shopAI.strengths.map((s, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[12px]" style={{ color: "#6ee7b7" }}>
                        <span className="flex-shrink-0 mt-0.5">✓</span>{s}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Weaknesses */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "var(--text-3)" }}>Weaknesses</p>
                  <div className="flex flex-col gap-1">
                    {shopAI.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-[12px]" style={{ color: "#F87171" }}>
                        <span className="flex-shrink-0 mt-0.5">✗</span>{w}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Competitive position */}
            <div className="rounded-[10px] px-4 py-3" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.15)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#34D399" }}>Competitive Position</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{shopAI.competitivePosition}</p>
            </div>

            {/* Market opportunity */}
            <div className="rounded-[10px] px-4 py-3" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: "#A78BFA" }}>Market Opportunity</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-2)" }}>{shopAI.marketOpportunity}</p>
            </div>

            {/* Recommendations */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: "var(--text-3)" }}>How to Compete</p>
              <div className="flex flex-col gap-2">
                {shopAI.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text-2)" }}>
                    <span className="font-bold text-[11px] mt-0.5 flex-shrink-0" style={{ color: "#A78BFA" }}>{i + 1}.</span>{r}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-right" style={{ color: "var(--text-3)" }}>
              {shopAI.scansCharged} scans charged · claude-sonnet-4-6
            </p>
          </div>
        )}
      </motion.div>

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
