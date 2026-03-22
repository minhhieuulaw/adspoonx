"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import type { FbAd, FbAdsResponse } from "@/lib/facebook-ads";
import { getAIInsights, getDropshippingScore } from "@/lib/ai-insights";
import AdCard from "@/components/ads/AdCard";
import AdsFilter, { type FilterValues } from "@/components/ads/AdsFilter";
import AdDetailModal from "@/components/ads/AdDetailModal";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Search, ChevronRight, Sparkles, Zap, Globe, Brain } from "lucide-react";

// ── KPI stat card ─────────────────────────────────────────────────────────────

function KPIStat({
  label, value, sub, icon: Icon, iconColor, iconBg,
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; iconColor: string; iconBg: string;
}) {
  return (
    <div className="kpi-card flex items-start gap-3">
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
        <Icon size={15} style={{ color: iconColor }} strokeWidth={1.8} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
        <p className="font-display text-[20px] font-bold leading-none" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
          {value}
        </p>
        {sub && <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Client-side filter + sort ─────────────────────────────────────────────────

function applyClientFilters(ads: FbAd[], filters: FilterValues): FbAd[] {
  let result = [...ads];

  // 1. Dedup: same page + same first 40 chars of body
  const seen = new Set<string>();
  result = result.filter(ad => {
    const body = (ad.ad_creative_bodies?.[0] ?? "").slice(0, 40).toLowerCase().replace(/\s+/g, " ").trim();
    const key  = `${ad.page_id ?? ad.page_name ?? "?"}|${body}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 2. Client-side media type filter (video filter handled server-side, image is client-side only)
  if (filters.mediaType === "image") {
    result = result.filter(ad => !ad.video_url && !!ad.image_url);
  } else if (filters.mediaType === "video") {
    result = result.filter(ad => !!ad.video_url);
  }

  // 3. Duration filter
  if (filters.duration !== "any") {
    result = result.filter(ad => {
      const days = Math.floor((Date.now() - new Date(ad.ad_delivery_start_time ?? 0).getTime()) / 86_400_000);
      switch (filters.duration) {
        case "new":      return days <= 14;
        case "growing":  return days > 14 && days <= 60;
        case "proven":   return days > 60 && days <= 180;
        case "evergreen": return days > 180;
        default:         return true;
      }
    });
  }

  // 4. Dropshipping filter
  if (filters.dropshipping !== "all") {
    result = result.filter(ad => {
      const score = getDropshippingScore(ad);
      if (filters.dropshipping === "dropshipping") return score >= 40;
      if (filters.dropshipping === "brand")        return score < 30;
      return true;
    });
  }

  // 5. Preset filter
  if (filters.preset) {
    result = result.filter(ad => {
      const ai   = getAIInsights(ad);
      const days = Math.floor((Date.now() - new Date(ad.ad_delivery_start_time ?? 0).getTime()) / 86_400_000);
      const active = ad.is_active !== false;
      switch (filters.preset) {
        case "top":          return ai.winningScore >= 80;
        case "trending":     return active && days < 30;
        case "evergreen":    return days > 90 && ai.winningScore >= 65;
        case "fomo":         return ai.hookType === "FOMO";
        case "social_proof": return ai.hookType === "Social Proof";
        case "ugc":          return ai.hookType === "UGC";
        default:             return true;
      }
    });
  }

  // 6. Platform filter (OR — ad runs on ANY of the selected platforms)
  if (filters.platforms.length > 0) {
    result = result.filter(ad => {
      const p = (ad.publisher_platforms ?? []).map(x => x.toLowerCase());
      return filters.platforms.some(f => p.includes(f));
    });
  }

  // 7. Sort
  result.sort((a, b) => {
    switch (filters.sortBy) {
      case "score":
        return getAIInsights(b).winningScore - getAIInsights(a).winningScore;
      case "newest":
        return new Date(b.ad_delivery_start_time ?? 0).getTime() - new Date(a.ad_delivery_start_time ?? 0).getTime();
      case "longest":
        return new Date(a.ad_delivery_start_time ?? 0).getTime() - new Date(b.ad_delivery_start_time ?? 0).getTime();
      case "audience":
        return (b.estimated_audience_size?.upper_bound ?? 0) - (a.estimated_audience_size?.upper_bound ?? 0);
      default:
        return 0;
    }
  });

  // 8. Video-first: stable partition within the sorted result (only when showing all media)
  if (!filters.mediaType) {
    const videos = result.filter(a => !!a.video_url);
    const images = result.filter(a => !a.video_url);
    result = [...videos, ...images];
  }

  return result;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdsPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [ads, setAds]               = useState<FbAd[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<FbAd | null>(null);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [userPlan, setUserPlan]     = useState<string>("free");

  const [filters, setFilters] = useState<FilterValues>({
    country:      searchParams.get("country") ?? "US",
    status:       (searchParams.get("status") as FilterValues["status"]) ?? "ACTIVE",
    mediaType:    null,
    preset:       null,
    platforms:    [],
    sortBy:       "score",
    dropshipping: "all",
    duration:     "any",
  });

  const [nextPage, setNextPage] = useState<number | null>(null);

  const fetchAds = useCallback(
    async (params: { q: string; country: string; status: string; mediaType?: string; page?: number }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<FbAdsResponse & { plan?: string }>("/api/ads", { params });
        if (params.page && params.page > 1) {
          setAds(prev => [...prev, ...res.data.data]);
        } else {
          setAds(res.data.data);
        }
        setNextPage(res.data.hasMore ? (params.page ?? 1) + 1 : null);
        if (res.data.plan) setUserPlan(res.data.plan);
      } catch {
        setError("Failed to load ads. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Re-fetch when server-side params change (image filter is client-side only)
  useEffect(() => {
    const apiMedia = filters.mediaType === "video" ? "video" : undefined;
    fetchAds({ q: searchTerm, country: filters.country, status: filters.status, mediaType: apiMedia });
  }, [filters.country, filters.status, filters.mediaType, fetchAds]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(value: string) {
    setSearchTerm(value);
    const params = new URLSearchParams({ q: value, country: filters.country, status: filters.status });
    router.push(`/ads?${params.toString()}`);
    const apiMedia = filters.mediaType === "video" ? "video" : undefined;
    fetchAds({ q: value, country: filters.country, status: filters.status, mediaType: apiMedia });
  }

  function loadMore() {
    if (nextPage) {
      const apiMedia = filters.mediaType === "video" ? "video" : undefined;
      fetchAds({ q: searchTerm, country: filters.country, status: filters.status, mediaType: apiMedia, page: nextPage });
    }
  }

  // Client-side filtered + sorted ads (instant, no API call)
  const filteredAds = useMemo(() => applyClientFilters(ads, filters), [ads, filters]);

  // KPI computed from ALL fetched ads (not filtered)
  const kpi = useMemo(() => {
    const active   = ads.filter(a => a.is_active !== false).length;
    const scores   = ads.map(a => getAIInsights(a).winningScore);
    const topScore = scores.length ? Math.max(...scores) : 0;
    const countries = new Set(ads.map(a => a.country).filter(Boolean)).size;
    return { total: ads.length, active, topScore, countries };
  }, [ads]);

  return (
    // Negate parent p-5 to let filter panel sit flush at content edges
    <div className="page-enter flex" style={{ margin: "-20px", minHeight: "calc(100vh - 56px)" }}>

      {/* ── Left: Filter panel (Minea-style sticky sidebar) ── */}
      <div
        className="flex-shrink-0 no-scrollbar"
        style={{
          width: 192,
          position: "sticky",
          top: 56,
          alignSelf: "flex-start",
          height: "calc(100vh - 56px)",
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border)",
          overflowY: "auto",
        }}
      >
        {/* Page title inside filter panel */}
        <div className="px-3 pt-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2 mb-0.5">
            <Brain size={13} style={{ color: "var(--ai-light)" }} />
            <h1 className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
              AI Ads Intelligence
            </h1>
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
            {t.ads.pageSubtitle}
          </p>
        </div>

        <AdsFilter
          values={filters}
          onChange={setFilters}
          totalResults={ads.length}
          filteredResults={filteredAds.length}
          loading={loading}
          vertical
        />
      </div>

      {/* ── Right: Content area ── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ padding: 16 }}>

        {/* Search bar */}
        <div className="mb-4 command-bar flex items-center gap-3 px-4 py-3">
          <Search size={15} strokeWidth={1.5} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch(searchTerm)}
            placeholder="Search ads, products, brands…"
            className="flex-1 bg-transparent text-[13px] outline-none"
            style={{ color: "var(--text-1)" }}
          />
          <span className="kbd hidden sm:inline-flex">↵</span>
        </div>

        {/* KPI stats */}
        {ads.length > 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-2 xl:grid-cols-4 gap-2 mb-4"
          >
            <KPIStat label="Total Ads"    value={kpi.total}    sub="in current filter" icon={Sparkles} iconColor="#A78BFA" iconBg="rgba(124,58,237,0.12)" />
            <KPIStat label="Active"       value={kpi.active}   sub="currently live"    icon={Zap}      iconColor="#34D399" iconBg="rgba(52,211,153,0.12)"  />
            <KPIStat label="Top AI Score" value={kpi.topScore} sub="highest performer" icon={Brain}    iconColor="#60A5FA" iconBg="rgba(59,130,246,0.12)"  />
            <KPIStat label="Markets"      value={kpi.countries || "—"} sub="countries detected" icon={Globe} iconColor="#FCD34D" iconBg="rgba(245,158,11,0.12)" />
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-[10px] p-3.5 text-[13px] mb-4"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "var(--red-light)" }}>
            {error}
          </div>
        )}

        {/* Empty: no data */}
        {!loading && !error && filteredAds.length === 0 && ads.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-14 h-14 rounded-[12px] flex items-center justify-center mb-4"
              style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.25)" }}>
              <Brain size={24} style={{ color: "var(--ai-light)" }} />
            </div>
            <p className="text-[14px] font-medium mb-1" style={{ color: "var(--text-2)" }}>{t.ads.noResults}</p>
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>{t.ads.noResultsHint}</p>
          </motion.div>
        )}

        {/* Empty: filters too strict */}
        {!loading && !error && filteredAds.length === 0 && ads.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[14px] font-medium mb-1" style={{ color: "var(--text-2)" }}>No ads match this filter</p>
            <p className="text-[12px]" style={{ color: "var(--text-3)" }}>Try a different preset or clear the filters</p>
          </motion.div>
        )}

        {/* Skeleton loading */}
        {loading && ads.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`sk-${i}`} className="skeleton" style={{ height: 340, borderRadius: 12 }} />
            ))}
          </div>
        )}

        {/* Ads grid */}
        <AnimatePresence>
          {filteredAds.length > 0 && (
            <div>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredAds.map((ad, i) => (
                  <AdCard key={ad.id} ad={ad} index={i} onSelect={setSelectedAd} />
                ))}
                {loading && ads.length > 0 &&
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={`sk-more-${i}`} className="skeleton" style={{ height: 340, borderRadius: 12 }} />
                  ))}
              </div>

              {/* Free plan upgrade prompt */}
              {userPlan === "free" && !loading && filteredAds.length > 0 && (
                <div className="mt-6 rounded-[12px] p-4 flex items-center gap-4"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <div className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 16px rgba(124,58,237,0.35)" }}>
                    <Zap size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                      You're on the Free plan — showing up to 12 ads
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      Upgrade to Starter to unlock 48 ads per page, video filters, and more.
                    </p>
                  </div>
                  <a href="/pricing"
                    className="flex-shrink-0 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold"
                    style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
                    Upgrade →
                  </a>
                </div>
              )}

              {/* Load more */}
              {nextPage && !loading && (
                <div className="flex justify-center mt-8">
                  <button
                    onClick={loadMore}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-[8px] text-[13px] font-medium"
                    style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >
                    {t.ads.loadMore}
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail modal */}
      <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />
    </div>
  );
}
