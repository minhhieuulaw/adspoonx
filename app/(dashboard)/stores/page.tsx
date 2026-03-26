"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Search, Play, Pause, Clock, DollarSign,
  TrendingUp, BarChart3, Globe, SlidersHorizontal, X, ChevronLeft, ChevronRight,
} from "lucide-react";
import StoreDetailModal from "@/components/stores/StoreDetailModal";
import { relativeTime, daysActive } from "@/lib/store-helpers";

// ── Types ────────────────────────────────────────────────────────────────────

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

interface Filters {
  q: string;
  sort: string;
  countries: string[];
  platforms: string[];
  minAds: string;
  maxAds: string;
}

const INIT_FILTERS: Filters = { q: "", sort: "activeAds", countries: [], platforms: [], minAds: "", maxAds: "" };

const COUNTRIES = [
  { code: "US", label: "United States", flag: "🇺🇸" },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧" },
  { code: "CA", label: "Canada", flag: "🇨🇦" },
  { code: "AU", label: "Australia", flag: "🇦🇺" },
  { code: "DE", label: "Germany", flag: "🇩🇪" },
  { code: "FR", label: "France", flag: "🇫🇷" },
  { code: "NL", label: "Netherlands", flag: "🇳🇱" },
  { code: "IT", label: "Italy", flag: "🇮🇹" },
  { code: "SG", label: "Singapore", flag: "🇸🇬" },
  { code: "MY", label: "Malaysia", flag: "🇲🇾" },
  { code: "TH", label: "Thailand", flag: "🇹🇭" },
  { code: "PH", label: "Philippines", flag: "🇵🇭" },
];

const PLATFORMS = [
  { id: "FACEBOOK", label: "Facebook", color: "#60A5FA" },
  { id: "INSTAGRAM", label: "Instagram", color: "#F472B6" },
  { id: "MESSENGER", label: "Messenger", color: "#38BDF8" },
  { id: "AUDIENCE_NETWORK", label: "Audience Network", color: "#A78BFA" },
  { id: "THREADS", label: "Threads", color: "#E5E7EB" },
];

const SORT_OPTIONS = [
  { value: "activeAds", label: "Most Active Ads" },
  { value: "totalAds", label: "Most Total Ads" },
  { value: "lastAdSeenAt", label: "Recently Active" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function estimateProfit(activeAds: number): { label: string; color: string } {
  if (activeAds >= 500) return { label: "$50K-200K", color: "#34D399" };
  if (activeAds >= 200) return { label: "$20K-80K", color: "#34D399" };
  if (activeAds >= 100) return { label: "$10K-40K", color: "#60A5FA" };
  if (activeAds >= 50)  return { label: "$5K-20K", color: "#60A5FA" };
  if (activeAds >= 20)  return { label: "$2K-8K", color: "#FCD34D" };
  if (activeAds >= 5)   return { label: "$500-3K", color: "#FCD34D" };
  return { label: "<$500", color: "var(--text-muted)" };
}

const PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#F87171", "#38BDF8"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

function MiniChart({ activeAds, totalAds }: { activeAds: number; totalAds: number }) {
  const points = useMemo(() => {
    const ratio = totalAds > 0 ? activeAds / totalAds : 0;
    const seed = activeAds * 7 + totalAds * 3;
    return Array.from({ length: 7 }, (_, i) => {
      const noise = ((seed * (i + 1) * 13) % 40 - 20) / 100;
      return Math.max(0.1, Math.min(1, ratio * 0.6 + (i / 6) * 0.4 + noise));
    });
  }, [activeAds, totalAds]);

  const w = 72, h = 24, px = 2;
  const stepX = (w - px * 2) / 6;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${px + i * stepX} ${h - px - p * (h - px * 2)}`).join(" ");
  const areaD = pathD + ` L ${px + 6 * stepX} ${h - px} L ${px} ${h - px} Z`;
  const isUp = points[6] >= points[0];
  const color = isUp ? "#34D399" : "#EF4444";

  return (
    <svg width={w} height={h} className="flex-shrink-0">
      <defs><linearGradient id={`sg-${activeAds}-${totalAds}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={areaD} fill={`url(#sg-${activeAds}-${totalAds})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Filter Sidebar ───────────────────────────────────────────────────────────

function FilterSidebar({ filters, onChange, onReset, total }: {
  filters: Filters; onChange: (f: Filters) => void; onReset: () => void; total: number;
}) {
  const hasFilters = filters.q || filters.countries.length || filters.platforms.length || filters.minAds || filters.maxAds;

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  return (
    <div className="w-[260px] flex-shrink-0 hidden lg:block">
      <div className="sticky top-0 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 80px)" }}>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search store..." value={filters.q}
            onChange={e => onChange({ ...filters, q: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }} />
        </div>

        {/* Sort */}
        <Section label="Sort By">
          <select value={filters.sort} onChange={e => onChange({ ...filters, sort: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Section>

        {/* Countries */}
        <Section label="Countries">
          <div className="space-y-1">
            {COUNTRIES.map(c => (
              <label key={c.code} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                style={{ background: filters.countries.includes(c.code) ? "rgba(124,58,237,0.08)" : "transparent" }}>
                <input type="checkbox" checked={filters.countries.includes(c.code)} className="hidden"
                  onChange={() => onChange({ ...filters, countries: toggleArr(filters.countries, c.code) })} />
                <div className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                  style={{
                    background: filters.countries.includes(c.code) ? "#7C3AED" : "rgba(255,255,255,0.08)",
                    color: filters.countries.includes(c.code) ? "#fff" : "transparent",
                    border: `1px solid ${filters.countries.includes(c.code) ? "#7C3AED" : "rgba(255,255,255,0.12)"}`,
                  }}>
                  {filters.countries.includes(c.code) && "✓"}
                </div>
                <span className="text-sm">{c.flag}</span>
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{c.label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Platforms */}
        <Section label="Platforms">
          <div className="space-y-1">
            {PLATFORMS.map(p => (
              <label key={p.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors"
                style={{ background: filters.platforms.includes(p.id) ? "rgba(124,58,237,0.08)" : "transparent" }}>
                <input type="checkbox" checked={filters.platforms.includes(p.id)} className="hidden"
                  onChange={() => onChange({ ...filters, platforms: toggleArr(filters.platforms, p.id) })} />
                <div className="w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold flex-shrink-0"
                  style={{
                    background: filters.platforms.includes(p.id) ? "#7C3AED" : "rgba(255,255,255,0.08)",
                    color: filters.platforms.includes(p.id) ? "#fff" : "transparent",
                    border: `1px solid ${filters.platforms.includes(p.id) ? "#7C3AED" : "rgba(255,255,255,0.12)"}`,
                  }}>
                  {filters.platforms.includes(p.id) && "✓"}
                </div>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{p.label}</span>
              </label>
            ))}
          </div>
        </Section>

        {/* Active Ads Range */}
        <Section label="Active Ads">
          <div className="flex gap-2">
            <input type="number" placeholder="Min" value={filters.minAds}
              onChange={e => onChange({ ...filters, minAds: e.target.value })}
              className="w-1/2 px-2.5 py-2 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }} />
            <input type="number" placeholder="Max" value={filters.maxAds}
              onChange={e => onChange({ ...filters, maxAds: e.target.value })}
              className="w-1/2 px-2.5 py-2 rounded-lg text-xs outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }} />
          </div>
        </Section>

        {/* Reset */}
        {hasFilters && (
          <button onClick={onReset} className="w-full mt-3 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ color: "#A78BFA", background: "rgba(124,58,237,0.08)" }}>
            Reset all filters
          </button>
        )}

        <p className="text-[10px] mt-4 text-center" style={{ color: "var(--text-muted)" }}>
          {total.toLocaleString()} stores found
        </p>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      {children}
    </div>
  );
}

// ── Store Card Row ───────────────────────────────────────────────────────────

function StoreCardRow({ store, index, onClick }: { store: ShopRow; index: number; onClick: () => void }) {
  const days = daysActive(store.firstSeenAt);
  const profit = estimateProfit(store.activeAds);
  const color = avatarColor(store.pageName);
  const activeRatio = store.totalAds > 0 ? Math.round((store.activeAds / store.totalAds) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
      onClick={onClick}
      className="group flex items-center gap-4 px-5 py-4 rounded-xl cursor-pointer transition-all duration-200"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(124,58,237,0.25)";
        e.currentTarget.style.background = "rgba(124,58,237,0.03)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
      }}
    >
      {/* Avatar */}
      {store.profilePicture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={store.profilePicture} alt="" className="w-11 h-11 rounded-xl object-cover flex-shrink-0"
          style={{ border: `2px solid ${color}25` }} />
      ) : (
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
          style={{ background: `${color}12`, color, border: `2px solid ${color}20` }}>
          {store.pageName.slice(0, 2).toUpperCase()}
        </div>
      )}

      {/* Name + Tags */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate group-hover:text-purple-400 transition-colors"
          style={{ color: "var(--text-primary)" }}>
          {store.pageName}
        </p>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {store.platforms.slice(0, 3).map(p => {
            const pi = PLATFORMS.find(x => x.id === p);
            return (
              <span key={p} className="text-[7px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: `${pi?.color ?? "#94A3B8"}12`, color: pi?.color ?? "#94A3B8" }}>
                {p === "AUDIENCE_NETWORK" ? "AN" : p.slice(0, 2)}
              </span>
            );
          })}
          {store.countries.slice(0, 2).map(c => {
            const ci = COUNTRIES.find(x => x.code === c);
            return <span key={c} className="text-[9px]">{ci?.flag ?? c}</span>;
          })}
          {store.countries.length > 2 && (
            <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>+{store.countries.length - 2}</span>
          )}
        </div>
      </div>

      {/* Active */}
      <div className="w-16 flex-shrink-0 hidden sm:block">
        <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Active</p>
        <div className="flex items-center gap-1">
          <Play size={9} fill="#34D399" style={{ color: "#34D399" }} />
          <span className="text-sm font-bold" style={{ color: "#34D399" }}>{store.activeAds}</span>
        </div>
      </div>

      {/* Paused */}
      <div className="w-14 flex-shrink-0 hidden md:block">
        <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Paused</p>
        <div className="flex items-center gap-1">
          <Pause size={9} style={{ color: store.pausedAds > 0 ? "#EF4444" : "var(--text-muted)" }} />
          <span className="text-sm font-bold" style={{ color: store.pausedAds > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
            {store.pausedAds}
          </span>
        </div>
      </div>

      {/* Profit */}
      <div className="w-20 flex-shrink-0 hidden lg:block">
        <p className="text-[8px] uppercase tracking-wider mb-0.5" style={{ color: "var(--text-muted)" }}>Est. Profit</p>
        <span className="text-xs font-bold" style={{ color: profit.color }}>{profit.label}</span>
      </div>

      {/* Chart */}
      <div className="hidden xl:block flex-shrink-0">
        <MiniChart activeAds={store.activeAds} totalAds={store.totalAds} />
      </div>

      {/* Ratio bar */}
      <div className="w-20 flex-shrink-0 hidden xl:block">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>Ratio</span>
          <span className="text-[9px] font-bold"
            style={{ color: activeRatio > 70 ? "#34D399" : activeRatio > 40 ? "#FCD34D" : "#EF4444" }}>
            {activeRatio}%
          </span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full" style={{
            width: `${activeRatio}%`,
            background: activeRatio > 70 ? "#34D399" : activeRatio > 40 ? "#FCD34D" : "#EF4444",
          }} />
        </div>
      </div>

      {/* Meta */}
      <div className="w-20 flex-shrink-0 text-right hidden sm:block">
        <div className="flex items-center justify-end gap-1 mb-0.5">
          <Clock size={9} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{relativeTime(store.lastAdSeenAt)}</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <TrendingUp size={9} style={{ color: "var(--text-muted)" }} />
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{days ? `${days}d` : "New"}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function StoresPage() {
  const [stores, setStores] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(INIT_FILTERS);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", sort: filters.sort });
      if (filters.q) params.set("q", filters.q);
      if (filters.countries.length) params.set("countries", filters.countries.join(","));
      if (filters.platforms.length) params.set("platforms", filters.platforms.join(","));
      if (filters.minAds) params.set("minAds", filters.minAds);
      if (filters.maxAds) params.set("maxAds", filters.maxAds);
      const r = await fetch(`/api/stores?${params}`);
      const d = await r.json();
      setStores(d.data ?? []);
      setTotalPages(d.pagination?.pages ?? 1);
      setTotal(d.pagination?.total ?? 0);
    } catch { setStores([]); }
    finally { setLoading(false); }
  }, [page, filters]);

  useEffect(() => { fetchStores(); }, [fetchStores]);
  useEffect(() => { setPage(1); }, [filters]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.15))" }}>
            <Store size={20} style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Stores</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {total > 0 ? `${total.toLocaleString()} advertisers tracked` : "Discover top advertisers"}
            </p>
          </div>
        </div>
        {/* Mobile filter toggle */}
        <button onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
          style={{ background: "rgba(124,58,237,0.1)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.2)" }}>
          <SlidersHorizontal size={14} /> Filters
        </button>
      </div>

      {/* Mobile filter overlay */}
      <AnimatePresence>
        {showMobileFilter && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 lg:hidden" style={{ background: "rgba(0,0,0,0.5)" }}
              onClick={() => setShowMobileFilter(false)} />
            <motion.div initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              className="fixed left-0 top-0 bottom-0 z-50 w-[280px] p-4 overflow-y-auto lg:hidden"
              style={{ background: "var(--bg-base, #0A0A0F)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Filters</span>
                <button onClick={() => setShowMobileFilter(false)}><X size={16} style={{ color: "var(--text-muted)" }} /></button>
              </div>
              <FilterSidebar filters={filters} onChange={setFilters} onReset={() => setFilters(INIT_FILTERS)} total={total} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Layout: Sidebar + Content */}
      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <FilterSidebar filters={filters} onChange={setFilters} onReset={() => setFilters(INIT_FILTERS)} total={total} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[76px] rounded-xl animate-pulse"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }} />
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && stores.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: "rgba(124,58,237,0.1)" }}>
                <Store size={24} style={{ color: "#A78BFA" }} />
              </div>
              <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>No stores found</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Try adjusting your filters</p>
            </div>
          )}

          {/* Store rows */}
          {!loading && stores.length > 0 && (
            <div className="space-y-2">
              {stores.map((store, i) => (
                <StoreCardRow key={store.pageId} store={store} index={i}
                  onClick={() => setSelectedStore(store.pageId)} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-2 rounded-lg disabled:opacity-20 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}>
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page + i - 3;
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
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-2 rounded-lg disabled:opacity-20 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-primary)" }}>
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <StoreDetailModal pageId={selectedStore} onClose={() => setSelectedStore(null)} />
    </div>
  );
}
