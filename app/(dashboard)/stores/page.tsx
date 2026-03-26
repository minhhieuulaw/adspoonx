"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Store, Search, ChevronDown, Play, Pause, Clock, DollarSign,
  TrendingUp, BarChart3, Globe, Filter,
} from "lucide-react";
import StoreDetailModal from "@/components/stores/StoreDetailModal";
import { relativeTime, daysActive } from "@/lib/store-helpers";

interface ShopRow {
  pageId: string;
  pageName: string;
  profilePicture: string | null;
  activeAds: number;
  pausedAds: number;
  totalAds: number;
  platforms: string[];
  countries: string[];
  firstSeenAt: string | null;
  lastAdSeenAt: string | null;
}

type SortKey = "activeAds" | "totalAds" | "lastAdSeenAt";

const SORT_OPTIONS = [
  { value: "activeAds", label: "Most Active", icon: Play },
  { value: "totalAds", label: "Most Ads", icon: BarChart3 },
  { value: "lastAdSeenAt", label: "Recently Active", icon: Clock },
];

// ── Estimate profit based on active ads ──────────────────────────────────────
function estimateProfit(activeAds: number): { min: number; max: number; label: string; color: string } {
  // Formula: each active ad ≈ $50-200/day spend, ~15-30% margin
  if (activeAds >= 500) return { min: 50000, max: 200000, label: "$50K-$200K/mo", color: "#34D399" };
  if (activeAds >= 200) return { min: 20000, max: 80000, label: "$20K-$80K/mo", color: "#34D399" };
  if (activeAds >= 100) return { min: 10000, max: 40000, label: "$10K-$40K/mo", color: "#60A5FA" };
  if (activeAds >= 50)  return { min: 5000, max: 20000, label: "$5K-$20K/mo", color: "#60A5FA" };
  if (activeAds >= 20)  return { min: 2000, max: 8000, label: "$2K-$8K/mo", color: "#FCD34D" };
  if (activeAds >= 5)   return { min: 500, max: 3000, label: "$500-$3K/mo", color: "#FCD34D" };
  return { min: 0, max: 500, label: "<$500/mo", color: "var(--text-muted)" };
}

// ── Mini sparkline chart ─────────────────────────────────────────────────────
function MiniChart({ activeAds, totalAds, days }: { activeAds: number; totalAds: number; days: number | null }) {
  const points = useMemo(() => {
    const d = Math.max(days ?? 1, 1);
    const ratio = totalAds > 0 ? activeAds / totalAds : 0;
    // Generate 7 synthetic data points simulating activity
    const seed = activeAds * 7 + totalAds * 3;
    return Array.from({ length: 7 }, (_, i) => {
      const noise = ((seed * (i + 1) * 13) % 40 - 20) / 100;
      const trend = i / 6;
      const base = ratio * 0.6 + trend * 0.4;
      return Math.max(0.1, Math.min(1, base + noise));
    });
  }, [activeAds, totalAds, days]);

  const w = 80, h = 28, px = 2;
  const stepX = (w - px * 2) / (points.length - 1);
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${px + i * stepX} ${h - px - p * (h - px * 2)}`)
    .join(" ");
  const areaD = pathD + ` L ${px + (points.length - 1) * stepX} ${h - px} L ${px} ${h - px} Z`;

  const isUp = points[points.length - 1] >= points[0];
  const color = isUp ? "#34D399" : "#EF4444";

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <defs>
        <linearGradient id={`g-${activeAds}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#g-${activeAds})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Platform icon ────────────────────────────────────────────────────────────
const PLAT_ICON: Record<string, { bg: string; color: string; label: string }> = {
  FACEBOOK:         { bg: "rgba(96,165,250,0.12)", color: "#60A5FA", label: "FB" },
  INSTAGRAM:        { bg: "rgba(244,114,182,0.12)", color: "#F472B6", label: "IG" },
  MESSENGER:        { bg: "rgba(56,189,248,0.12)", color: "#38BDF8", label: "MS" },
  AUDIENCE_NETWORK: { bg: "rgba(167,139,250,0.12)", color: "#A78BFA", label: "AN" },
  THREADS:          { bg: "rgba(229,231,235,0.12)", color: "#E5E7EB", label: "TH" },
};

// ── Avatar color ─────────────────────────────────────────────────────────────
const PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#F87171", "#38BDF8"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

// ── Store Card ───────────────────────────────────────────────────────────────
function StoreCard({ store, index, onClick }: { store: ShopRow; index: number; onClick: () => void }) {
  const days = daysActive(store.firstSeenAt);
  const profit = estimateProfit(store.activeAds);
  const color = avatarColor(store.pageName);
  const activeRatio = store.totalAds > 0 ? (store.activeAds / store.totalAds) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      onClick={onClick}
      className="group rounded-2xl p-5 cursor-pointer transition-all duration-200"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 32px rgba(124,58,237,0.08)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Row 1: Avatar + Name + Chart */}
      <div className="flex items-start gap-3 mb-4">
        {store.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.profilePicture} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
            style={{ border: `2px solid ${color}30` }} />
        ) : (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
            style={{ background: `${color}15`, color, border: `2px solid ${color}25` }}>
            {store.pageName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate group-hover:text-purple-400 transition-colors"
            style={{ color: "var(--text-primary)" }}>
            {store.pageName}
          </p>
          <div className="flex items-center gap-1.5 mt-1">
            {store.platforms.slice(0, 3).map((p) => {
              const pi = PLAT_ICON[p] ?? { bg: "rgba(148,163,184,0.12)", color: "#94A3B8", label: p.slice(0, 2) };
              return (
                <span key={p} className="text-[8px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: pi.bg, color: pi.color }}>
                  {pi.label}
                </span>
              );
            })}
            {store.countries.slice(0, 2).map((c) => (
              <span key={c} className="text-[8px] font-medium px-1.5 py-0.5 rounded-md"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
        <MiniChart activeAds={store.activeAds} totalAds={store.totalAds} days={days} />
      </div>

      {/* Row 2: Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Active Ads */}
        <div className="flex flex-col">
          <span className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Active</span>
          <div className="flex items-center gap-1.5">
            <Play size={10} fill="#34D399" style={{ color: "#34D399" }} />
            <span className="text-lg font-bold" style={{ color: "#34D399" }}>{store.activeAds}</span>
          </div>
        </div>

        {/* Paused */}
        <div className="flex flex-col">
          <span className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Paused</span>
          <div className="flex items-center gap-1.5">
            <Pause size={10} style={{ color: store.pausedAds > 0 ? "#EF4444" : "var(--text-muted)" }} />
            <span className="text-lg font-bold" style={{ color: store.pausedAds > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
              {store.pausedAds}
            </span>
          </div>
        </div>

        {/* Est. Profit */}
        <div className="flex flex-col">
          <span className="text-[9px] font-medium uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Est. Profit</span>
          <div className="flex items-center gap-1">
            <DollarSign size={10} style={{ color: profit.color }} />
            <span className="text-xs font-bold" style={{ color: profit.color }}>{profit.label}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Progress bar + footer */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] font-medium" style={{ color: "var(--text-muted)" }}>
            Active ratio
          </span>
          <span className="text-[9px] font-bold" style={{ color: activeRatio > 70 ? "#34D399" : activeRatio > 40 ? "#FCD34D" : "#EF4444" }}>
            {Math.round(activeRatio)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${activeRatio}%`,
              background: activeRatio > 70
                ? "linear-gradient(90deg, #10B981, #34D399)"
                : activeRatio > 40
                  ? "linear-gradient(90deg, #F59E0B, #FCD34D)"
                  : "linear-gradient(90deg, #DC2626, #EF4444)",
            }} />
        </div>
      </div>

      {/* Row 4: Footer stats */}
      <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-1">
          <TrendingUp size={10} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {days !== null ? `${days}d tracking` : "New"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={10} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {relativeTime(store.lastAdSeenAt)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart3 size={10} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {store.totalAds} total
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function StoresPage() {
  const [stores, setStores] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("activeAds");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showSort, setShowSort] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "24", sort });
      if (query.trim()) params.set("q", query.trim());
      const r = await fetch(`/api/stores?${params}`);
      const d = await r.json();
      setStores(d.data ?? []);
      setTotalPages(d.pagination?.pages ?? 1);
      setTotal(d.pagination?.total ?? 0);
    } catch {
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, query]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const sortLabel = SORT_OPTIONS.find(o => o.value === sort)?.label ?? "Most Active";

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))" }}>
            <Store size={20} style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Stores</h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {total > 0 ? `${total.toLocaleString()} advertisers tracked` : "Top advertisers by performance"}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search store name..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
          />
        </form>
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "var(--text-primary)",
            }}
          >
            <Filter size={14} style={{ color: "#A78BFA" }} />
            {sortLabel}
            <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
          </button>
          {showSort && (
            <div className="absolute right-0 top-full mt-2 z-20 rounded-xl overflow-hidden shadow-2xl"
              style={{ background: "rgba(22,22,30,0.98)", border: "1px solid rgba(255,255,255,0.1)", minWidth: 180 }}>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setSort(opt.value as SortKey); setPage(1); setShowSort(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors text-left"
                  style={{
                    color: sort === opt.value ? "#A78BFA" : "var(--text-secondary)",
                    background: sort === opt.value ? "rgba(124,58,237,0.08)" : "transparent",
                  }}
                >
                  <opt.icon size={14} />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", height: 240 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && stores.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(124,58,237,0.1)" }}>
            <Store size={28} style={{ color: "#A78BFA" }} />
          </div>
          <p className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>No stores found</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {query ? "Try a different search term" : "Data is being collected. Check back soon!"}
          </p>
        </div>
      )}

      {/* Store Cards Grid */}
      {!loading && stores.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {stores.map((store, i) => (
            <StoreCard
              key={store.pageId}
              store={store}
              index={i}
              onClick={() => setSelectedStore(store.pageId)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-20 transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
            Previous
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = page <= 3 ? i + 1 : page + i - 2;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className="w-8 h-8 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: p === page ? "rgba(124,58,237,0.2)" : "transparent",
                    color: p === page ? "#A78BFA" : "var(--text-muted)",
                  }}>
                  {p}
                </button>
              );
            })}
          </div>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-20 transition-all"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
            Next
          </button>
        </div>
      )}

      {/* Click outside to close sort */}
      {showSort && <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />}

      {/* Store Detail Modal */}
      <StoreDetailModal pageId={selectedStore} onClose={() => setSelectedStore(null)} />
    </div>
  );
}
