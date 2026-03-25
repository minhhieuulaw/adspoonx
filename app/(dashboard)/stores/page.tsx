"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Store, Search, ChevronDown, ChevronUp, Play, Pause, Clock,
} from "lucide-react";
import StoreDetailModal from "@/components/stores/StoreDetailModal";
import { relativeTime, daysActive, PLATFORM_COLORS } from "@/lib/store-helpers";

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

const COLUMNS: { key: SortKey | null; label: string; width: string; sortable: boolean }[] = [
  { key: null,            label: "Store",       width: "minmax(220px, 2fr)", sortable: false },
  { key: "activeAds",     label: "Ads",         width: "160px",             sortable: true },
  { key: null,            label: "Days",        width: "80px",              sortable: false },
  { key: null,            label: "Platforms",   width: "120px",             sortable: false },
  { key: null,            label: "Countries",   width: "140px",             sortable: false },
  { key: "lastAdSeenAt",  label: "Last Seen",   width: "100px",             sortable: true },
];

export default function StoresPage() {
  const [stores, setStores] = useState<ShopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("activeAds");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "30", sort });
      if (query.trim()) params.set("q", query.trim());
      const r = await fetch(`/api/stores?${params}`);
      const d = await r.json();
      setStores(d.data ?? []);
      setTotalPages(d.pagination?.pages ?? 1);
    } catch (e) {
      console.error("Failed to fetch stores:", e);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [page, sort, query]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStores();
  };

  const toggleSort = (key: SortKey) => {
    setSort(key);
    setPage(1);
  };

  const gridTemplate = COLUMNS.map(c => c.width).join(" ");

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(124,58,237,0.12)" }}>
          <Store size={18} style={{ color: "#A78BFA" }} />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Stores</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Top advertisers ranked by active ad volume
          </p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-5 relative max-w-md">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Search store name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-colors"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "var(--text-primary)",
          }}
        />
      </form>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="overflow-x-auto">
          {/* Header row */}
          <div
            className="grid items-center px-4 py-2.5 gap-3"
            style={{
              gridTemplateColumns: gridTemplate,
              background: "rgba(255,255,255,0.03)",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {COLUMNS.map((col, i) => (
              <div key={i}>
                {col.sortable && col.key ? (
                  <button
                    onClick={() => toggleSort(col.key!)}
                    className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors"
                    style={{ color: sort === col.key ? "#A78BFA" : "var(--text-muted)" }}
                  >
                    {col.label}
                    {sort === col.key ? <ChevronDown size={10} /> : <ChevronUp size={10} style={{ opacity: 0.3 }} />}
                  </button>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                    {col.label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading && Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid items-center px-4 py-3.5 gap-3 animate-pulse"
              style={{ gridTemplateColumns: gridTemplate, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
              {COLUMNS.map((_, j) => (
                <div key={j} className="h-4 rounded skeleton" />
              ))}
            </div>
          ))}

          {/* Empty */}
          {!loading && stores.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {query ? "No stores match your search" : "No stores found"}
              </p>
            </div>
          )}

          {/* Rows */}
          {!loading && stores.map((store, i) => {
            const days = daysActive(store.firstSeenAt);
            const activeRatio = store.totalAds > 0 ? store.activeAds / store.totalAds : 0;

            return (
              <motion.div
                key={store.pageId}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedStore(store.pageId)}
                className="grid items-center px-4 py-3 gap-3 cursor-pointer transition-colors"
                style={{
                  gridTemplateColumns: gridTemplate,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(124,58,237,0.04)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                {/* Store */}
                <div className="flex items-center gap-3 min-w-0">
                  {store.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.profilePicture} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                      style={{ background: "rgba(124,58,237,0.12)", color: "#A78BFA" }}>
                      {store.pageName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {store.pageName}
                  </span>
                </div>

                {/* Ads Active/Paused */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "#34D399" }}>
                      <Play size={9} fill="#34D399" /> {store.activeAds}
                    </span>
                    {store.pausedAds > 0 && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "rgba(239,68,68,0.7)" }}>
                        <Pause size={9} /> {store.pausedAds}
                      </span>
                    )}
                  </div>
                  <div className="flex h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-l-full" style={{ width: `${activeRatio * 100}%`, background: "#34D399" }} />
                    {store.pausedAds > 0 && (
                      <div className="h-full" style={{ width: `${((store.pausedAds / store.totalAds) * 100)}%`, background: "rgba(239,68,68,0.4)" }} />
                    )}
                  </div>
                </div>

                {/* Days */}
                <span className="text-xs font-medium" style={{ color: days && days > 30 ? "#34D399" : "var(--text-muted)" }}>
                  {days !== null ? `${days}d` : "—"}
                </span>

                {/* Platforms */}
                <div className="flex items-center gap-1">
                  {store.platforms.slice(0, 3).map((p) => (
                    <span key={p} className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                      style={{
                        color: PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8",
                        background: `${PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8"}12`,
                      }}>
                      {p.slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                </div>

                {/* Countries */}
                <div className="flex items-center gap-1 flex-wrap">
                  {store.countries.slice(0, 3).map((c) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ color: "var(--text-muted)", background: "rgba(255,255,255,0.04)" }}>
                      {c}
                    </span>
                  ))}
                  {store.countries.length > 3 && (
                    <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+{store.countries.length - 3}</span>
                  )}
                </div>

                {/* Last Seen */}
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <Clock size={10} />
                  {relativeTime(store.lastAdSeenAt)}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
            Prev
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30 transition-colors"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-primary)" }}>
            Next
          </button>
        </div>
      )}

      {/* Store Detail Modal */}
      <StoreDetailModal pageId={selectedStore} onClose={() => setSelectedStore(null)} />
    </div>
  );
}
