"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import type { FbAd, FbAdsResponse } from "@/lib/facebook-ads";
import { getAIInsights, getDropshippingScore } from "@/lib/ai-insights";
import { detectLanguage } from "@/lib/detect-language";
import AdCard from "@/components/ads/AdCard";
import AdsFilter, { type FilterValues, AI_SCORE_TIERS } from "@/components/ads/AdsFilter";
import AdDetailModal from "@/components/ads/AdDetailModal";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Search, ChevronRight, Sparkles, Zap, Globe, Brain, SlidersHorizontal, X, ChevronDown, Save, Trash2, Code, Loader2, CheckSquare, Square, Bookmark, Play, Users, TrendingUp } from "lucide-react";
import { useSavedAds } from "@/lib/hooks/useSavedAds";

// ── Filter persistence (localStorage) ─────────────────────────────────────────

const FILTER_STORAGE_KEY = "adspoonx_filters";
const SEARCH_HISTORY_KEY = "adspoonx_search_history";
const MAX_SEARCH_HISTORY = 8;

function loadSavedFilters(): Partial<FilterValues> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveFiltersToStorage(filters: FilterValues) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(filters)); } catch {}
}

function loadSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function addToSearchHistory(term: string) {
  if (typeof window === "undefined" || !term.trim()) return;
  try {
    const history = loadSearchHistory().filter(h => h !== term);
    history.unshift(term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SEARCH_HISTORY)));
  } catch {}
}

// ── Live animated counters ───────────────────────────────────────────────────

/** Users online: drifts smoothly between 50–5000, looks realistic */
function useUsersOnline() {
  const [count, setCount] = useState(0);
  const targetRef = useRef(0);
  const currentRef = useRef(0);

  useEffect(() => {
    // Seed initial value based on hour-of-day pattern (more users during business hours)
    const hour = new Date().getHours();
    const hourWeight = Math.sin((hour - 6) * Math.PI / 12) * 0.5 + 0.5; // peaks at noon
    const base = Math.floor(200 + hourWeight * 3500 + Math.random() * 800);
    currentRef.current = base;
    targetRef.current = base;
    setCount(base);

    // Pick new target every 8–20 seconds (slow drift)
    const pickTarget = () => {
      const drift = (Math.random() - 0.48) * 120; // small, slight upward bias
      const next = Math.max(50, Math.min(5000, Math.round(targetRef.current + drift)));
      targetRef.current = next;
    };
    const targetInterval = setInterval(pickTarget, 8000 + Math.random() * 12000);

    // Smooth animation tick every 2 seconds — slow, natural feel
    const tick = setInterval(() => {
      const diff = targetRef.current - currentRef.current;
      if (Math.abs(diff) < 2) return;
      const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) * 0.08));
      currentRef.current += step;
      setCount(currentRef.current);
    }, 2000);

    return () => { clearInterval(targetInterval); clearInterval(tick); };
  }, []);

  return count;
}

/** New products today: seeded by date, only goes up throughout the day */
function useNewProductsToday() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Deterministic base from today's date
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    const dailyBase = 80 + (seed * 7 + 13) % 170; // 80–250 range

    // Scale by time-of-day (more products discovered as day progresses)
    const minuteOfDay = today.getHours() * 60 + today.getMinutes();
    const dayProgress = minuteOfDay / 1440;
    const initial = Math.floor(dailyBase * (0.3 + dayProgress * 0.7));
    setCount(initial);

    // Occasionally bump up (never down)
    const bump = setInterval(() => {
      if (Math.random() < 0.3) { // 30% chance every tick
        setCount(prev => prev + Math.floor(Math.random() * 3) + 1);
      }
    }, 8000 + Math.random() * 12000);

    return () => clearInterval(bump);
  }, []);

  return count;
}

/** Format number with commas: 10234567 → "10,234,567" */
function fmtNum(n: number): string {
  return n.toLocaleString("en-US");
}

/** Live stats bar — total ads (fake 10M+), users online, new today, top score */
function LiveStatsBar({ topScore }: { topScore: number }) {
  const usersOnline = useUsersOnline();
  const newToday = useNewProductsToday();

  // Total ads in database: fake ~10M, slight random offset per session
  const totalAds = useMemo(() => {
    const base = 10_234_567;
    const dayOffset = new Date().getDate() * 1247;
    return base + dayOffset;
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-0 mb-3 rounded-[10px] overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Total Ads */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0">
        <Sparkles size={13} style={{ color: "#A78BFA" }} strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Total Ads</p>
          <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            {fmtNum(totalAds)}
          </p>
        </div>
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />

      {/* Users Online */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0">
        <div className="relative flex-shrink-0">
          <Users size={13} style={{ color: "#34D399" }} strokeWidth={2} />
          <span
            className="live-dot"
            style={{
              position: "absolute", top: -2, right: -2,
              width: 5, height: 5, borderRadius: "50%",
              background: "#34D399",
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Users Online</p>
          <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color: "#34D399", letterSpacing: "-0.02em", transition: "all 300ms ease" }}>
            {fmtNum(usersOnline)}
          </p>
        </div>
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />

      {/* New Products Today */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0">
        <TrendingUp size={13} style={{ color: "#FCD34D" }} strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>New Today</p>
          <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            +{fmtNum(newToday)}
          </p>
        </div>
      </div>

      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} />

      {/* Top AI Score */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-1 min-w-0">
        <Brain size={13} style={{ color: "#60A5FA" }} strokeWidth={2} />
        <div className="min-w-0">
          <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Top AI Score</p>
          <p className="text-[15px] font-bold tabular-nums leading-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.02em" }}>
            {topScore}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/** Skeleton ad card — mimics real AdCard layout */
function SkeletonAdCard({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-[10px] overflow-hidden flex flex-col"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
    >
      {/* Creative area */}
      <div className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 0 }} />

      {/* Footer */}
      <div className="px-2.5 py-2.5 flex flex-col gap-2">
        {/* Brand row */}
        <div className="flex items-center gap-2">
          <div className="skeleton-circle" style={{ width: 22, height: 22, flexShrink: 0 }} />
          <div className="skeleton-line" style={{ width: "65%", height: 9 }} />
        </div>
        {/* Stats row */}
        <div className="flex items-center gap-2">
          <div className="skeleton-line" style={{ width: 28, height: 7 }} />
          <div className="skeleton-line" style={{ width: 40, height: 7 }} />
          <div className="skeleton-line" style={{ width: 50, height: 7 }} />
        </div>
        {/* Tags row */}
        <div className="flex items-center gap-1.5">
          <div className="skeleton-line" style={{ width: 52, height: 16, borderRadius: 4 }} />
          <div className="skeleton-line" style={{ width: 44, height: 16, borderRadius: 4 }} />
          <div className="skeleton-line" style={{ width: 36, height: 16, borderRadius: 4 }} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Infinite scroll sentinel ──────────────────────────────────────────────────

function InfiniteScrollSentinel({ onVisible, loading }: { onVisible: () => void; loading: boolean }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);
  useEffect(() => { onVisibleRef.current = onVisible; });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onVisibleRef.current(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sentinelRef} className="flex justify-center py-8">
      {loading ? (
        <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "var(--text-3)" }}>
          <Loader2 size={14} className="animate-spin" style={{ color: "var(--ai-light)" }} />
          Loading more ads...
        </div>
      ) : (
        <div className="w-6 h-0.5 rounded-full" style={{ background: "var(--border)" }} />
      )}
    </div>
  );
}

// ── Client-side filter + sort ─────────────────────────────────────────────────

function applyClientFilters(ads: FbAd[], filters: FilterValues, userPlan: string): FbAd[] {
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

  // 2. Hide Elite (85+) ads for non-premium users (unless explicitly filtering for elite)
  if (userPlan !== "premium" && userPlan !== "business" && filters.aiScore !== "elite") {
    result = result.filter(ad => getAIInsights(ad).winningScore < 85);
  }

  // 3. Client-side media type filter (video filter handled server-side, image is client-side only)
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

  // 5. AI Score tier filter
  if (filters.aiScore !== "all") {
    const tier = AI_SCORE_TIERS.find(t => t.id === filters.aiScore);
    if (tier) {
      result = result.filter(ad => {
        const score = getAIInsights(ad).winningScore;
        return score >= tier.min && score <= tier.max;
      });
    }
  }

  // 6. Preset filter
  if (filters.preset) {
    result = result.filter(ad => {
      const ai   = getAIInsights(ad);
      const days = Math.floor((Date.now() - new Date(ad.ad_delivery_start_time ?? 0).getTime()) / 86_400_000);
      const active = ad.is_active !== false;
      switch (filters.preset) {
        case "top":          return ai.winningScore >= 80;
        case "trending":     return active && days < 30;
        case "evergreen":    return days > 90 && ai.winningScore >= 65;
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

  // 7. Niche filter
  if (filters.niche) {
    result = result.filter(ad => ad.niche === filters.niche);
  }

  // 8. Language filter
  if (filters.language !== "all") {
    result = result.filter(ad => {
      const lang = detectLanguage(ad.ad_creative_bodies?.[0]);
      return lang === filters.language;
    });
  }

  // 9. Sort ("mixed" = keep API's random order)
  if (filters.sortBy !== "mixed") {
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case "score":
          return getAIInsights(b).winningScore - getAIInsights(a).winningScore;
        case "newest":
          return new Date(b.ad_delivery_start_time ?? 0).getTime() - new Date(a.ad_delivery_start_time ?? 0).getTime();
        case "longest":
          return new Date(a.ad_delivery_start_time ?? 0).getTime() - new Date(b.ad_delivery_start_time ?? 0).getTime();
        default:
          return 0;
      }
    });
  }

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
  const { toggleSave } = useSavedAds();

  const [ads, setAds]               = useState<FbAd[]>([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<FbAd | null>(null);
  const [gridFade, setGridFade]     = useState(false); // filter transition
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") ?? "");
  const [userPlan, setUserPlan]       = useState<string>("free");
  const [filterOpen, setFilterOpen]   = useState(false);
  const [visibleCount, setVisibleCount] = useState(20);

  // Bulk select
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());

  // Advanced search
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [searchPage, setSearchPage]   = useState("");
  const [searchBody, setSearchBody]   = useState("");
  const [searchNiche, setSearchNiche] = useState("");
  const [useRegex, setUseRegex]       = useState(false);

  // Refs for search params (avoid stale closures in filter useEffect)
  const searchRef = useRef({ searchTerm: "", searchPage: "", searchBody: "", searchNiche: "", useRegex: false });
  useEffect(() => { searchRef.current = { searchTerm, searchPage, searchBody, searchNiche, useRegex }; });

  // Saved searches
  interface SavedSearchItem { id: string; name: string; filters: Record<string, unknown> }
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [savedOpen, setSavedOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);

  const [filters, setFilters] = useState<FilterValues>(() => {
    const saved = loadSavedFilters();
    return {
      country:      searchParams.get("country") ?? saved?.country ?? "US",
      status:       (searchParams.get("status") as FilterValues["status"]) ?? saved?.status ?? "ACTIVE",
      mediaType:    saved?.mediaType ?? null,
      preset:       null,
      platforms:    saved?.platforms ?? [],
      sortBy:       saved?.sortBy ?? "mixed",
      dropshipping: saved?.dropshipping ?? "all",
      duration:     saved?.duration ?? "any",
      aiScore:      saved?.aiScore ?? "all",
      niche:        saved?.niche ?? null,
      language:     saved?.language ?? "all",
    };
  });

  // Persist filters to localStorage on change
  useEffect(() => { saveFiltersToStorage(filters); }, [filters]);

  // Search history
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => { setSearchHistory(loadSearchHistory()); }, []);

  const [nextPage, setNextPage] = useState<number | null>(null);
  // Random seed: generated once per page load, sent to API so same seed = same shuffled order
  // New seed on each reload = different ads order
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  const fetchAds = useCallback(
    async (params: {
      q: string; country: string; status: string; mediaType?: string; page?: number;
      searchPage?: string; searchBody?: string; searchNiche?: string; useRegex?: boolean;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const fetchLimit = params.mediaType === "video" ? 300 : 200;
        const apiParams: Record<string, unknown> = {
          ...params, limit: fetchLimit, seed,
          ...(params.useRegex ? { useRegex: "1" } : {}),
        };
        // Xóa field rỗng để không gửi lên API
        for (const key of Object.keys(apiParams)) {
          if (apiParams[key] === "" || apiParams[key] === undefined || apiParams[key] === false) {
            delete apiParams[key];
          }
        }
        const res = await axios.get<FbAdsResponse & { plan?: string; seed?: number }>("/api/ads", {
          params: apiParams,
        });
        // Dedup: remove ads with same page + same body/image
        const dedup = (list: FbAd[]) => {
          const seen = new Set<string>();
          return list.filter(ad => {
            const key = `${ad.page_id ?? ""}|${ad.ad_creative_bodies?.[0] ?? ""}|${ad.image_url ?? ""}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        };
        if (params.page && params.page > 1) {
          setAds(prev => dedup([...prev, ...res.data.data]));
        } else {
          setAds(dedup(res.data.data));
        }
        setNextPage(res.data.hasMore ? (params.page ?? 1) + 1 : null);
        if (res.data.plan) setUserPlan(res.data.plan);
      } catch (err: unknown) {
        const axErr = err as { response?: { data?: { error?: string } } };
        if (axErr?.response?.data?.error === "upgrade_required") {
          setError("This filter requires a premium plan. Upgrade to unlock.");
        } else {
          setError("Failed to load ads. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    },
    [seed]
  );

  // Fetch saved searches on mount
  useEffect(() => {
    fetch("/api/saved-searches").then(r => r.json()).then(d => setSavedSearches(d.data ?? [])).catch(() => {});
  }, []);

  // Re-fetch when server-side params change (uses refs to avoid stale closures)
  useEffect(() => {
    setVisibleCount(20);
    const s = searchRef.current;
    fetchAds({
      q: s.searchTerm, country: filters.country, status: filters.status,
      mediaType: filters.mediaType ?? undefined,
      searchPage: s.searchPage, searchBody: s.searchBody,
      searchNiche: s.searchNiche, useRegex: s.useRegex,
    });
  }, [filters.country, filters.status, filters.mediaType, fetchAds]);

  function handleSearch(value?: string) {
    const q = value ?? searchTerm;
    setSearchTerm(q);
    setVisibleCount(20);
    setShowHistory(false);
    if (q.trim()) { addToSearchHistory(q.trim()); setSearchHistory(loadSearchHistory()); }
    const params = new URLSearchParams({ q, country: filters.country, status: filters.status });
    router.push(`/ads?${params.toString()}`);
    const apiMedia = filters.mediaType ?? undefined;
    fetchAds({
      q, country: filters.country, status: filters.status, mediaType: apiMedia,
      searchPage, searchBody, searchNiche, useRegex,
    });
  }

  async function handleSaveSearch() {
    if (!saveName.trim()) return;
    const payload = {
      name: saveName.trim(),
      filters: {
        q: searchTerm, searchPage, searchBody, searchNiche, useRegex,
        ...filters,
      },
    };
    try {
      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.data) {
        setSavedSearches(prev => [data.data, ...prev]);
        setSaveName("");
        setShowSaveInput(false);
      }
    } catch { /* ignore */ }
  }

  async function handleDeleteSearch(id: string) {
    await fetch(`/api/saved-searches?id=${id}`, { method: "DELETE" });
    setSavedSearches(prev => prev.filter(s => s.id !== id));
  }

  function handleApplySearch(s: SavedSearchItem) {
    const f = s.filters as Record<string, string | boolean | string[] | null>;
    setSearchTerm((f.q as string) ?? "");
    setSearchPage((f.searchPage as string) ?? "");
    setSearchBody((f.searchBody as string) ?? "");
    setSearchNiche((f.searchNiche as string) ?? "");
    setUseRegex(!!f.useRegex);
    setSavedOpen(false);
    // Trigger fetch
    setTimeout(() => handleSearch((f.q as string) ?? ""), 50);
  }

  function loadMore() {
    // First: show more from already-fetched & filtered ads
    if (visibleCount < filteredAds.length) {
      setVisibleCount(prev => prev + 20);
      return;
    }
    // Then: fetch more from API
    if (nextPage) {
      const apiMedia = filters.mediaType ?? undefined;
      fetchAds({
        q: searchTerm, country: filters.country, status: filters.status, mediaType: apiMedia, page: nextPage,
        searchPage, searchBody, searchNiche, useRegex,
      });
      setVisibleCount(prev => prev + 20);
    }
  }

  // Bulk actions
  function toggleBulkSelect(id: string) {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function bulkSelectAll() {
    if (bulkSelected.size === visibleAds.length) setBulkSelected(new Set());
    else setBulkSelected(new Set(visibleAds.map(a => a.id)));
  }
  function bulkSaveAll() {
    const toSave = visibleAds.filter(a => bulkSelected.has(a.id));
    toSave.forEach(a => toggleSave(a));
    setBulkSelected(new Set());
    setBulkMode(false);
  }
  function exitBulk() { setBulkMode(false); setBulkSelected(new Set()); }

  // Filter change handler with fade transition
  const handleFilterChange = useCallback((newFilters: FilterValues) => {
    setGridFade(true);
    setVisibleCount(20);
    setTimeout(() => {
      setFilters(newFilters);
      setGridFade(false);
    }, 150);
  }, []);

  // Client-side filtered + sorted ads (instant, no API call)
  const filteredAds = useMemo(() => applyClientFilters(ads, filters, userPlan), [ads, filters, userPlan]);
  // Display 20 ads per page, load more adds 20
  const visibleAds = useMemo(() => filteredAds.slice(0, visibleCount), [filteredAds, visibleCount]);
  const canShowMore = visibleCount < filteredAds.length || nextPage !== null;

  // KPI computed from ALL fetched ads (not filtered)
  const kpi = useMemo(() => {
    const active     = ads.filter(a => a.is_active !== false).length;
    const scores     = ads.map(a => getAIInsights(a).winningScore);
    const topScore   = scores.length ? Math.max(...scores) : 0;
    const videoCount = ads.filter(a => !!a.video_url).length;
    return { total: ads.length, active, topScore, videoCount };
  }, [ads]);

  // Container queries handle responsive grid cols automatically

  return (
    // Negate parent p-5 to let filter panel sit flush at content edges
    <div className="page-enter flex" style={{ margin: "-20px", minHeight: "calc(100vh - 56px)" }}>

      {/* ── Left: Filter panel — hidden on mobile (CSS), sticky on desktop ── */}
      <div className="hidden md:block flex-shrink-0 no-scrollbar"
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
            onChange={handleFilterChange}
            totalResults={ads.length}
            filteredResults={filteredAds.length}
            loading={loading}
            vertical
          />
        </div>

      {/* ── Mobile: filter drawer overlay ── */}
      <div className="md:hidden">
        <AnimatePresence>
          {filterOpen && (
            <>
              <motion.div
                key="filter-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.6)" }}
                onClick={() => setFilterOpen(false)}
              />
              <motion.div
                key="filter-drawer"
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                style={{
                  position: "fixed", top: 56, left: 0, bottom: 0, width: 280, zIndex: 41,
                  background: "var(--bg-surface)", borderRight: "1px solid var(--border)", overflowY: "auto",
                }}
                className="no-scrollbar"
              >
                <div className="flex items-center justify-between px-3 pt-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <div className="flex items-center gap-2">
                    <Brain size={13} style={{ color: "var(--ai-light)" }} />
                    <span className="font-display text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>Filters</span>
                  </div>
                  <button onClick={() => setFilterOpen(false)}
                    className="p-1.5 rounded-[7px]"
                    style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}>
                    <X size={13} strokeWidth={2} />
                  </button>
                </div>
                <AdsFilter
                  values={filters}
                  onChange={handleFilterChange}
                  totalResults={ads.length}
                  filteredResults={filteredAds.length}
                  loading={loading}
                  vertical
                />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* ── Center: Content area ── */}
      <div className="flex-1 min-w-0 flex flex-col" style={{ padding: 16 }}>

        {/* Search bar */}
        <div className="mb-2 command-bar flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setFilterOpen(true)}
            className="md:hidden p-1.5 rounded-[7px] flex-shrink-0"
            style={{ color: "var(--text-3)", background: "var(--bg-hover)", border: "1px solid var(--border)" }}
          >
            <SlidersHorizontal size={14} strokeWidth={1.5} />
          </button>
          <Search size={15} strokeWidth={1.5} style={{ color: "var(--text-3)", flexShrink: 0 }} />
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              onFocus={() => { if (searchHistory.length > 0 && !searchTerm) setShowHistory(true); }}
              onBlur={() => { setTimeout(() => setShowHistory(false), 150); }}
              placeholder="Search ads, products, brands…"
              className="w-full bg-transparent text-[13px] outline-none"
              style={{ color: "var(--text-1)" }}
            />
            {/* Search history dropdown */}
            {showHistory && searchHistory.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-30 rounded-[10px] py-1.5 overflow-hidden"
                style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                <p className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Recent Searches</p>
                {searchHistory.map((h, i) => (
                  <button key={i}
                    onMouseDown={e => { e.preventDefault(); handleSearch(h); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] font-medium text-left"
                    style={{ color: "var(--text-2)" }}
                    onMouseEnter={e => { e.currentTarget.style.background = "var(--bg-hover)"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Search size={10} strokeWidth={1.5} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                    {h}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Toggle regex */}
          <button
            onClick={() => setUseRegex(!useRegex)}
            className="p-1.5 rounded-[6px] flex-shrink-0"
            style={{
              color: useRegex ? "var(--ai-light)" : "var(--text-3)",
              background: useRegex ? "var(--ai-soft)" : "transparent",
              border: useRegex ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
            }}
            title={useRegex ? "Regex đang bật" : "Bật chế độ Regex"}
          >
            <Code size={13} strokeWidth={1.8} />
          </button>
          {/* Toggle advanced */}
          <button
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-medium flex-shrink-0"
            style={{
              color: advancedOpen ? "var(--ai-light)" : "var(--text-3)",
              background: advancedOpen ? "var(--ai-soft)" : "var(--bg-hover)",
              border: `1px solid ${advancedOpen ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
            }}
          >
            <ChevronDown size={11} style={{ transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
            Advanced
          </button>
          {/* Saved searches */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setSavedOpen(!savedOpen)}
              className="p-1.5 rounded-[6px] flex-shrink-0"
              style={{
                color: savedSearches.length > 0 ? "var(--ai-light)" : "var(--text-3)",
                background: "var(--bg-hover)",
                border: "1px solid var(--border)",
              }}
              title="Saved searches"
            >
              <Save size={13} strokeWidth={1.8} />
            </button>
            {savedOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-20 rounded-[10px] overflow-hidden"
                style={{
                  width: 280, background: "var(--bg-elevated)",
                  border: "1px solid var(--border-strong)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}
              >
                <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text-2)" }}>Saved searches</span>
                  <button onClick={() => setShowSaveInput(!showSaveInput)}
                    className="text-[10px] font-medium px-2 py-0.5 rounded-[5px]"
                    style={{ color: "var(--ai-light)", background: "var(--ai-soft)" }}>
                    + Save current
                  </button>
                </div>
                {showSaveInput && (
                  <div className="px-3 py-2 flex gap-2" style={{ borderBottom: "1px solid var(--border)" }}>
                    <input
                      type="text"
                      value={saveName}
                      onChange={e => setSaveName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleSaveSearch()}
                      placeholder="Search name…"
                      className="flex-1 bg-transparent text-[12px] outline-none"
                      style={{ color: "var(--text-1)" }}
                      autoFocus
                    />
                    <button onClick={handleSaveSearch}
                      className="text-[10px] font-bold px-2 py-1 rounded-[5px]"
                      style={{ background: "var(--ai)", color: "white" }}>
                      Save
                    </button>
                  </div>
                )}
                {savedSearches.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px]" style={{ color: "var(--text-3)" }}>
                    No saved searches yet
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    {savedSearches.map(s => (
                      <div key={s.id} className="px-3 py-2 flex items-center gap-2 group"
                        style={{ borderBottom: "1px solid var(--border)" }}>
                        <button onClick={() => handleApplySearch(s)}
                          className="flex-1 text-left text-[12px] font-medium truncate"
                          style={{ color: "var(--text-1)" }}>
                          {s.name}
                        </button>
                        <button onClick={() => handleDeleteSearch(s.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded transition-opacity"
                          style={{ color: "var(--red-light)" }}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <span className="kbd hidden sm:inline-flex">↵</span>
        </div>

        {/* Advanced search panel */}
        <AnimatePresence>
          {advancedOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden mb-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 rounded-[10px]"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: "var(--text-3)" }}>
                    Page Name
                  </label>
                  <input
                    type="text"
                    value={searchPage}
                    onChange={e => setSearchPage(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder={useRegex ? "e.g. nike|adidas" : "e.g. Nike"}
                    className="w-full bg-transparent text-[12px] outline-none px-2.5 py-2 rounded-[7px]"
                    style={{ color: "var(--text-1)", border: "1px solid var(--border)", background: "var(--bg-hover)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: "var(--text-3)" }}>
                    Body / Title
                  </label>
                  <input
                    type="text"
                    value={searchBody}
                    onChange={e => setSearchBody(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder={useRegex ? "e.g. free.?shipping|sale" : "e.g. free shipping"}
                    className="w-full bg-transparent text-[12px] outline-none px-2.5 py-2 rounded-[7px]"
                    style={{ color: "var(--text-1)", border: "1px solid var(--border)", background: "var(--bg-hover)" }}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest mb-1 block" style={{ color: "var(--text-3)" }}>
                    Niche
                  </label>
                  <input
                    type="text"
                    value={searchNiche}
                    onChange={e => setSearchNiche(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder={useRegex ? "e.g. fashion|beauty" : "e.g. Fashion"}
                    className="w-full bg-transparent text-[12px] outline-none px-2.5 py-2 rounded-[7px]"
                    style={{ color: "var(--text-1)", border: "1px solid var(--border)", background: "var(--bg-hover)" }}
                  />
                </div>
              </div>
              {useRegex && (
                <div className="mt-1.5 flex items-center gap-1.5 px-1">
                  <Code size={10} style={{ color: "var(--ai-light)" }} />
                  <span className="text-[10px]" style={{ color: "var(--text-3)" }}>
                    Regex enabled — PostgreSQL syntax: <code style={{ color: "var(--ai-light)" }}>word1|word2</code>, <code style={{ color: "var(--ai-light)" }}>free.?ship</code>, <code style={{ color: "var(--ai-light)" }}>^Sale</code>
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live stats bar */}
        <LiveStatsBar topScore={kpi.topScore} />

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

        {/* Skeleton loading — staggered card placeholders */}
        {loading && ads.length === 0 && (
          <div className="ads-grid-container">
            <div className="ads-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <SkeletonAdCard key={`sk-${i}`} delay={i * 0.04} />
              ))}
            </div>
          </div>
        )}

        {/* Active filter tags */}
        {(() => {
          const tags: string[] = [];
          if (filters.preset) tags.push(`Preset: ${filters.preset.charAt(0).toUpperCase() + filters.preset.slice(1)}`);
          if (filters.mediaType) tags.push(`Media: ${filters.mediaType === "video" ? "Video" : "Image"}`);
          if (filters.duration !== "any") tags.push(`Duration: ${filters.duration}`);
          if (filters.dropshipping !== "all") tags.push(`Type: ${filters.dropshipping === "dropshipping" ? "Dropshipping" : "Brand"}`);
          if (filters.aiScore !== "all") tags.push(`AI: ${filters.aiScore}`);
          if (filters.platforms.length > 0) tags.push(`Platform: ${filters.platforms.join(", ")}`);
          if (filters.niche) tags.push(`Niche: ${filters.niche}`);
          if (filters.language !== "all") tags.push(`Lang: ${filters.language.toUpperCase()}`);
          if (filters.country !== "US") tags.push(`Market: ${filters.country}`);
          if (tags.length === 0) return null;
          return (
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-3)" }}>Active:</span>
              {tags.map(t => (
                <span key={t} className="text-[10px] font-semibold px-2 py-1 rounded-[6px]"
                  style={{ background: "rgba(124,58,237,0.10)", color: "var(--ai-light)", border: "1px solid rgba(124,58,237,0.20)" }}>
                  {t}
                </span>
              ))}
              <span className="text-[10px] font-medium ml-1" style={{ color: "var(--text-3)" }}>
                → {filteredAds.length} results
              </span>
            </div>
          );
        })()}

        {/* Bulk action bar */}
        {visibleAds.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => bulkMode ? exitBulk() : setBulkMode(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium"
              style={{
                background: bulkMode ? "var(--ai-soft)" : "var(--bg-hover)",
                border: `1px solid ${bulkMode ? "rgba(124,58,237,0.3)" : "var(--border)"}`,
                color: bulkMode ? "var(--ai-light)" : "var(--text-3)",
              }}
            >
              <CheckSquare size={12} strokeWidth={1.8} />
              {bulkMode ? "Cancel" : "Select"}
            </button>
            {bulkMode && (
              <>
                <button onClick={bulkSelectAll}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-[7px] text-[10px] font-medium"
                  style={{ background: "var(--bg-hover)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                  {bulkSelected.size === visibleAds.length ? <CheckSquare size={10} /> : <Square size={10} />}
                  All ({visibleAds.length})
                </button>
                {bulkSelected.size > 0 && (
                  <button onClick={bulkSaveAll}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[10px] font-semibold"
                    style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
                    <Bookmark size={10} strokeWidth={2} />
                    Save {bulkSelected.size} ads
                  </button>
                )}
                <span className="text-[10px] ml-auto" style={{ color: "var(--text-3)" }}>
                  {bulkSelected.size} selected
                </span>
              </>
            )}
          </div>
        )}

        {/* Ads grid — container query responsive */}
        <AnimatePresence>
          {visibleAds.length > 0 && (
            <div className="ads-grid-container"
              style={{ opacity: gridFade ? 0.3 : 1, transform: gridFade ? "translateY(4px)" : "translateY(0)", transition: "opacity 150ms ease, transform 150ms ease" }}>
              <div className="ads-grid">
                {visibleAds.map((ad, i) => (
                  <div key={ad.id} className="relative">
                    {bulkMode && (
                      <button
                        onClick={e => { e.stopPropagation(); toggleBulkSelect(ad.id); }}
                        className="absolute top-2 left-2 z-10 w-5 h-5 rounded-[4px] flex items-center justify-center"
                        style={{
                          background: bulkSelected.has(ad.id) ? "var(--ai-light)" : "rgba(0,0,0,0.6)",
                          border: `1.5px solid ${bulkSelected.has(ad.id) ? "var(--ai-light)" : "rgba(255,255,255,0.3)"}`,
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        {bulkSelected.has(ad.id) && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    )}
                    <AdCard ad={ad} index={i} onSelect={bulkMode ? () => toggleBulkSelect(ad.id) : setSelectedAd} />
                  </div>
                ))}
                {loading && ads.length > 0 &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonAdCard key={`sk-more-${i}`} delay={i * 0.05} />
                  ))}
              </div>

              {/* Free plan upgrade prompt */}
              {userPlan === "free" && !loading && visibleAds.length > 0 && (
                <div className="mt-6 rounded-[12px] p-4 flex items-center gap-4"
                  style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <div className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 16px rgba(124,58,237,0.35)" }}>
                    <Zap size={16} className="text-white" strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text-1)" }}>
                      Unlock Elite Ads &amp; Advanced Filters
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                      Upgrade to see 85+ score ads, video filters, and export data.
                    </p>
                  </div>
                  <a href="/pricing"
                    className="flex-shrink-0 px-3.5 py-2 rounded-[8px] text-[12px] font-semibold"
                    style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
                    Upgrade →
                  </a>
                </div>
              )}

              {/* Infinite scroll sentinel */}
              {canShowMore && <InfiniteScrollSentinel onVisible={loadMore} loading={loading} />}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Ad Detail Modal (all screen sizes) ── */}
      <AdDetailModal
        ad={selectedAd}
        onClose={() => setSelectedAd(null)}
        allAds={ads}
      />
    </div>
  );
}
