"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, Search, Play, Pause, Clock,
  TrendingUp, SlidersHorizontal, X, ChevronLeft, ChevronRight,
  Bookmark, ExternalLink, ChevronUp, ChevronDown, Info,
} from "lucide-react";
import StoreDetailModal from "@/components/stores/StoreDetailModal";
import { relativeTime, daysActive } from "@/lib/store-helpers";
import { useSavedShops } from "@/lib/hooks/useSavedShops";

// ── Types ────────────────────────────────────────────────────────────────────

interface CountryDist { country: string; pct: number }

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
  website: string | null;
  adThumbnails: string[];
  countryDistribution: CountryDist[];
  sparkline: { date: string; activeAds: number }[];
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
  { code: "US", label: "United States" }, { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" }, { code: "AU", label: "Australia" },
  { code: "DE", label: "Germany" }, { code: "FR", label: "France" },
  { code: "NL", label: "Netherlands" }, { code: "IT", label: "Italy" },
  { code: "SG", label: "Singapore" }, { code: "MY", label: "Malaysia" },
  { code: "TH", label: "Thailand" }, { code: "PH", label: "Philippines" },
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

function estimateRevenue(activeAds: number): string {
  if (activeAds >= 500) return "~$10,000";
  if (activeAds >= 300) return "~$6,000";
  if (activeAds >= 200) return "~$5,000";
  if (activeAds >= 100) return "~$3,000";
  if (activeAds >= 50) return "~$2,000";
  if (activeAds >= 20) return "~$1,000";
  return "<$500";
}

const PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C", "#F87171", "#38BDF8"];
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function extractDomain(url: string | null): string {
  if (!url) return "";
  try { return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace("www.", ""); }
  catch { return ""; }
}

// ── Country Flag (circle SVG) ───────────────────────────────────────────────

function CountryFlag({ code, size = 18 }: { code: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://hatscripts.github.io/circle-flags/flags/${code.toLowerCase()}.svg`}
      alt={code} width={size} height={size}
      className="rounded-full flex-shrink-0"
      style={{ border: "1px solid rgba(255,255,255,0.08)" }}
    />
  );
}

// ── MiniChart ───────────────────────────────────────────────────────────────

function MiniChart({ activeAds, totalAds, sparkline }: { activeAds: number; totalAds: number; sparkline?: { date: string; activeAds: number }[] }) {
  const points = useMemo(() => {
    // Use real sparkline data if available (≥2 data points)
    if (sparkline && sparkline.length >= 2) {
      const max = Math.max(...sparkline.map(s => s.activeAds), 1);
      return sparkline.map(s => Math.max(0.05, s.activeAds / max));
    }
    // Fallback: deterministic fake data from current counts
    const ratio = totalAds > 0 ? activeAds / totalAds : 0;
    const seed = activeAds * 7 + totalAds * 3;
    return Array.from({ length: 7 }, (_, i) => {
      const noise = ((seed * (i + 1) * 13) % 40 - 20) / 100;
      return Math.max(0.1, Math.min(1, ratio * 0.6 + (i / 6) * 0.4 + noise));
    });
  }, [activeAds, totalAds, sparkline]);
  const w = 80, h = 32, px = 2;
  const stepX = (w - px * 2) / Math.max(1, points.length - 1);
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${px + i * stepX} ${h - px - p * (h - px * 2)}`).join(" ");
  const lastIdx = points.length - 1;
  const areaD = pathD + ` L ${px + lastIdx * stepX} ${h - px} L ${px} ${h - px} Z`;
  const isUp = points[lastIdx] >= points[0];
  const color = isUp ? "#34D399" : "#EF4444";
  return (
    <svg width={w} height={h}>
      <defs><linearGradient id={`mc-${activeAds}-${totalAds}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.3" /><stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient></defs>
      <path d={areaD} fill={`url(#mc-${activeAds}-${totalAds})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Est Winrate ─────────────────────────────────────────────────────────────

function calcWinrate(store: ShopRow): number {
  const activeRatio = store.totalAds > 0 ? store.activeAds / store.totalAds : 0;
  const volNorm = Math.min(1, Math.log10(Math.max(1, store.activeAds)) / 3);
  const days = store.firstSeenAt ? Math.floor((Date.now() - new Date(store.firstSeenAt).getTime()) / 86_400_000) : 0;
  const longevityNorm = Math.min(1, days / 365);
  const geoNorm = Math.min(1, store.countries.length / 5);
  const platNorm = Math.min(1, store.platforms.length / 4);
  const raw = (activeRatio * 0.30 + volNorm * 0.25 + longevityNorm * 0.20 + geoNorm * 0.15 + platNorm * 0.10) * 85;
  return Math.round(Math.min(85, Math.max(5, raw)));
}

function winrateColor(pct: number): string {
  if (pct >= 70) return "#34D399";
  if (pct >= 50) return "#A78BFA";
  if (pct >= 30) return "rgba(251,191,36,0.7)";
  return "rgba(255,255,255,0.35)";
}

function WinrateCell({ store }: { store: ShopRow }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pct = calcWinrate(store);
  const color = winrateColor(pct);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const days = store.firstSeenAt ? Math.floor((Date.now() - new Date(store.firstSeenAt).getTime()) / 86_400_000) : 0;

  // Calculate position for fixed tooltip
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const openTooltip = useCallback(() => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 8, left: Math.max(8, rect.left - 120) });
    }
    setOpen(true);
  }, []);

  return (
    <div ref={ref} className="relative inline-flex items-center gap-1">
      <span className="text-[15px] font-bold tabular-nums" style={{ color }}>{pct}%</span>
      <button
        ref={btnRef}
        onClick={e => { e.stopPropagation(); open ? setOpen(false) : openTooltip(); }}
        onMouseEnter={openTooltip}
        className="p-0.5 rounded-full transition-colors"
        style={{ color: "rgba(255,255,255,0.25)" }}
      >
        <Info size={12} />
      </button>
      {open && pos && (
        <div className="fixed z-[100] rounded-lg"
          style={{ top: pos.top, left: pos.left, width: 280, background: "rgba(15,15,22,0.97)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", padding: "12px 14px" }}>
          <p className="text-[11px] font-semibold mb-2" style={{ color: "var(--text-1)" }}>How is Est Winrate calculated?</p>
          <p className="text-[10px] leading-relaxed mb-2.5" style={{ color: "rgba(255,255,255,0.55)" }}>
            Winrate is estimated by AI based on ad performance metrics: active ratio, ad volume, market longevity, geographic reach, and platform diversity.
          </p>
          <div className="space-y-1.5 mb-2.5">
            {[
              { label: "Active Ratio", val: store.totalAds > 0 ? `${Math.round(store.activeAds / store.totalAds * 100)}%` : "0%", w: "30%" },
              { label: "Ad Volume", val: `${store.activeAds} active`, w: "25%" },
              { label: "Longevity", val: `${days}d`, w: "20%" },
              { label: "Geo Reach", val: `${store.countries.length} countries`, w: "15%" },
              { label: "Platforms", val: `${store.platforms.length} channels`, w: "10%" },
            ].map(f => (
              <div key={f.label} className="flex items-center justify-between">
                <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.4)" }}>{f.label} ({f.w})</span>
                <span className="text-[10px] font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.7)" }}>{f.val}</span>
              </div>
            ))}
          </div>
          <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              The remaining {85 - pct}% depends on your product images, ad creatives, and landing page quality.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sort Header ─────────────────────────────────────────────────────────────

function SortHeader({ label, sortKey, currentSort, onSort }: { label: string; sortKey: string; currentSort: string; onSort: (k: string) => void }) {
  const active = currentSort === sortKey;
  return (
    <button onClick={() => onSort(sortKey)} className="flex items-center gap-1 group cursor-pointer select-none"
      style={{ color: active ? "#A78BFA" : "rgba(255,255,255,0.35)" }}>
      <span className="text-[10px] font-semibold uppercase tracking-wider group-hover:text-white/60 transition-colors">{label}</span>
      <span className="flex flex-col -space-y-0.5">
        <ChevronUp size={8} strokeWidth={2.5} style={{ color: active ? "#A78BFA" : "rgba(255,255,255,0.12)" }} />
        <ChevronDown size={8} strokeWidth={2.5} style={{ color: "rgba(255,255,255,0.12)" }} />
      </span>
    </button>
  );
}

function ColLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{children}</span>;
}

// ── Filter Sidebar ──────────────────────────────────────────────────────────

function FilterSidebar({ filters, onChange, onReset, total }: {
  filters: Filters; onChange: (f: Filters) => void; onReset: () => void; total: number;
}) {
  const hasFilters = filters.q || filters.countries.length || filters.platforms.length || filters.minAds || filters.maxAds;
  const toggleArr = (arr: string[], val: string) => arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val];

  return (
    <div className="w-[260px] flex-shrink-0 hidden lg:block">
      <div className="sticky top-0 overflow-y-auto pr-1" style={{ maxHeight: "calc(100vh - 80px)" }}>
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search store..." value={filters.q}
            onChange={e => onChange({ ...filters, q: e.target.value })}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs outline-none"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }} />
        </div>
        <Section label="Sort By">
          <select value={filters.sort} onChange={e => onChange({ ...filters, sort: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-xs outline-none cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Section>
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
                <CountryFlag code={c.code} size={14} />
                <span className="text-xs flex-1" style={{ color: "var(--text-secondary)" }}>{c.label}</span>
              </label>
            ))}
          </div>
        </Section>
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
    <div className="mb-4 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <p className="text-[9px] font-bold uppercase mb-2.5" style={{ color: "rgba(167,139,250,0.55)", letterSpacing: "0.12em" }}>{label}</p>
      {children}
    </div>
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
  const { savedIds: savedShopIds, toggleSave: toggleSaveShop } = useSavedShops();

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", sort: filters.sort });
      if (filters.q) params.set("q", filters.q);
      if (filters.countries.length) params.set("countries", filters.countries.join(","));
      if (filters.platforms.length) params.set("platforms", filters.platforms.join(","));
      if (filters.minAds) params.set("minAds", filters.minAds);
      if (filters.maxAds) params.set("maxAds", filters.maxAds);
      const r = await fetch(`/api/stores?${params}`, { cache: "no-store" });
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
      <div className="flex items-center justify-between mb-7">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(99,102,241,0.14))", border: "1px solid rgba(124,58,237,0.22)", boxShadow: "0 0 16px rgba(124,58,237,0.12)" }}>
            <Store size={20} style={{ color: "#A78BFA" }} />
          </div>
          <div>
            <h1 className="text-[22px] font-bold leading-tight" style={{ color: "var(--text-1)", letterSpacing: "-0.025em" }}>Stores</h1>
            <p className="text-[12px] mt-0.5" style={{ color: "var(--text-3)" }}>
              {total > 0 ? `${total.toLocaleString()} advertisers tracked` : "Discover top advertisers"}
            </p>
          </div>
        </div>
        <button onClick={() => setShowMobileFilter(!showMobileFilter)}
          className="lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-medium"
          style={{ background: "rgba(124,58,237,0.10)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.22)" }}>
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
        <FilterSidebar filters={filters} onChange={setFilters} onReset={() => setFilters(INIT_FILTERS)} total={total} />

        <div className="flex-1 min-w-0">
          {/* Quick filter pills */}
          <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
            {[
              { label: "All Shops", filter: INIT_FILTERS },
              { label: "Top Performers", filter: { ...INIT_FILTERS, minAds: "100", sort: "activeAds" } },
              { label: "New Shops", filter: { ...INIT_FILTERS, sort: "lastAdSeenAt" } },
              { label: "Most Active", filter: { ...INIT_FILTERS, minAds: "50", sort: "activeAds" } },
            ].map((pill, i) => {
              const isActive = i === 0
                ? JSON.stringify(filters) === JSON.stringify(INIT_FILTERS)
                : filters.sort === pill.filter.sort && filters.minAds === pill.filter.minAds && !filters.q;
              return (
                <button key={pill.label} onClick={() => { setFilters(pill.filter); setPage(1); }}
                  className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all"
                  style={{
                    background: isActive ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.04)",
                    color: isActive ? "#A78BFA" : "rgba(255,255,255,0.45)",
                    border: `1px solid ${isActive ? "rgba(124,58,237,0.3)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  {pill.label}
                </button>
              );
            })}
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div className="overflow-hidden">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-[88px] animate-pulse" style={{ background: "rgba(255,255,255,0.015)", borderBottom: "1px solid rgba(255,255,255,0.06)" }} />
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

          {/* Table */}
          {!loading && stores.length > 0 && (
            <div className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: 1050 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      <th className="text-left px-5 py-3.5" style={{ minWidth: 240 }}><ColLabel>Shop</ColLabel></th>
                      <th className="text-left px-4 py-3.5" style={{ width: 100 }}><ColLabel>Est Revenue</ColLabel></th>
                      <th className="text-center px-4 py-3.5" style={{ width: 100 }}><ColLabel>Trend</ColLabel></th>
                      <th className="text-left px-4 py-3.5" style={{ width: 220 }}>
                        <SortHeader label="Total Active Ads" sortKey="activeAds" currentSort={filters.sort}
                          onSort={s => setFilters(f => ({ ...f, sort: s }))} />
                      </th>
                      <th className="text-left px-4 py-3.5" style={{ width: 100 }}><ColLabel>Est Winrate</ColLabel></th>
                      <th className="text-left px-4 py-3.5" style={{ width: 160 }}><ColLabel>Traffic</ColLabel></th>
                      <th className="text-center px-4 py-3.5" style={{ width: 50 }}><ColLabel>Save</ColLabel></th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => {
                      const color = avatarColor(store.pageName);
                      const domain = extractDomain(store.website);

                      return (
                        <tr key={store.pageId} className="store-table-row cursor-pointer"
                          onClick={() => setSelectedStore(store.pageId)}>
                          {/* Shop */}
                          <td className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="relative flex-shrink-0">
                                {store.profilePicture ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={store.profilePicture} alt="" className="w-10 h-10 rounded-xl object-cover"
                                    style={{ border: `1.5px solid ${color}25` }} />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-bold"
                                    style={{ background: `${color}15`, color, border: `1.5px solid ${color}25` }}>
                                    {store.pageName.slice(0, 1).toUpperCase()}
                                  </div>
                                )}
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                                  style={{ background: store.activeAds > 0 ? "#34D399" : "#6B7280", borderColor: "var(--bg-base, #0a0a0f)" }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text-1)" }}>{store.pageName}</p>
                                {domain && (
                                  <a href={store.website ?? "#"} target="_blank" rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="text-[11px] flex items-center gap-1 mt-0.5 hover:underline"
                                    style={{ color: "rgba(167,139,250,0.7)" }}>
                                    {domain} <ExternalLink size={8} />
                                  </a>
                                )}
                                <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
                                  {fmtDate(store.firstSeenAt)}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Est Revenue */}
                          <td className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <span className="text-[14px] font-bold" style={{ color: "#34D399" }}>{estimateRevenue(store.activeAds)}</span>
                          </td>

                          {/* Trend */}
                          <td className="px-4 py-5 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <MiniChart activeAds={store.activeAds} totalAds={store.totalAds} sparkline={store.sparkline} />
                          </td>

                          {/* Total Active Ads */}
                          <td className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <div>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-[15px] font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>+{store.activeAds}</span>
                                {store.pausedAds > 0 && (
                                  <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                                    ({store.pausedAds.toLocaleString()} inactive)
                                  </span>
                                )}
                              </div>
                              {store.adThumbnails?.length > 0 && (
                                <div className="flex items-center gap-1 mt-2">
                                  {store.adThumbnails.slice(0, 4).map((thumb, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={thumb} alt="" className="w-9 h-9 rounded object-cover"
                                      style={{ border: "1px solid rgba(255,255,255,0.08)" }} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Est Winrate */}
                          <td className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            <WinrateCell store={store} />
                          </td>

                          {/* Traffic */}
                          <td className="px-4 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {store.countryDistribution?.length > 0 ? (
                              <div className="space-y-1">
                                {(store.countryDistribution as CountryDist[]).map((cd) => (
                                  <div key={cd.country} className="flex items-center gap-2">
                                    <CountryFlag code={cd.country} size={16} />
                                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: "rgba(255,255,255,0.6)" }}>{cd.pct}%</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {store.countries.slice(0, 3).map(c => <CountryFlag key={c} code={c} size={16} />)}
                                {store.countries.length > 3 && (
                                  <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.3)" }}>+{store.countries.length - 3}</span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Save */}
                          <td className="px-4 py-5 text-center" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                            {(() => {
                              const isSaved = savedShopIds.has(store.pageId);
                              return (
                                <button
                                  onClick={e => { e.stopPropagation(); toggleSaveShop(store.pageId); }}
                                  className={`save-btn ${isSaved ? "save-btn--active" : ""}`}
                                  title={isSaved ? "Saved" : "Save"}
                                >
                                  <Bookmark size={16} strokeWidth={isSaved ? 0 : 1.5} fill={isSaved ? "currentColor" : "none"} />
                                </button>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                    style={{ background: p === page ? "rgba(124,58,237,0.2)" : "transparent", color: p === page ? "#A78BFA" : "var(--text-muted)" }}>
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
