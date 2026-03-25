"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Store, TrendingUp, Search, ChevronDown, Pause, Play } from "lucide-react";

interface ShopItem {
  pageId: string;
  pageName: string;
  profilePicture: string | null;
  activeAds: number;
  pausedAds: number;
  totalAds: number;
  platforms: string[];
  countries: string[];
  lastAdSeenAt: string | null;
}

const SORT_OPTIONS = [
  { value: "activeAds", label: "Most Active Ads" },
  { value: "totalAds", label: "Most Total Ads" },
  { value: "lastAdSeenAt", label: "Recently Active" },
];

export default function StoresPage() {
  const [stores, setStores] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("activeAds");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "30", sort });
    if (query.trim()) params.set("q", query.trim());

    const r = await fetch(`/api/stores?${params}`);
    const d = await r.json();
    setStores(d.data ?? []);
    setTotalPages(d.pagination?.pages ?? 1);
    setLoading(false);
  }, [page, sort, query]);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStores();
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
          <Store size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Stores
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Top advertisers ranked by active ad volume
          </p>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            type="text"
            placeholder="Search store name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--text-primary)",
            }}
          />
        </form>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); setPage(1); }}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
            style={{
              background: "var(--card-bg)",
              border: "1px solid var(--card-border)",
              color: "var(--text-primary)",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="rounded-xl animate-pulse" style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", height: 160 }} />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && stores.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">🏪</div>
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No stores found</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {query ? "Try a different search term" : "Crawl some ads first to populate store data"}
          </p>
        </div>
      )}

      {/* Store grid */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stores.map((store, i) => (
            <Link key={store.pageId} href={`/stores/${store.pageId}`}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.025 }}
                className="rounded-xl p-4 flex flex-col gap-3 glass-card glow-hover h-full"
              >
                {/* Avatar + name */}
                <div className="flex items-center gap-3">
                  {store.profilePicture ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={store.profilePicture} alt={store.pageName}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(245,158,11,0.15)" }}>
                      <Store size={18} className="text-amber-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {store.pageName}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-xs" style={{ color: "#34D399" }}>
                        <Play size={10} fill="currentColor" /> {store.activeAds}
                      </span>
                      {store.pausedAds > 0 && (
                        <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                          <Pause size={10} /> {store.pausedAds}
                        </span>
                      )}
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {store.totalAds} total
                      </span>
                    </div>
                  </div>
                </div>

                {/* Countries */}
                {store.countries.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {store.countries.slice(0, 5).map((c) => (
                      <span key={c} className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--content-bg)", color: "var(--text-muted)", border: "1px solid var(--sidebar-border)" }}>
                        {c}
                      </span>
                    ))}
                    {store.countries.length > 5 && (
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--content-bg)", color: "var(--text-muted)", border: "1px solid var(--sidebar-border)" }}>
                        +{store.countries.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Activity bar */}
                <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--content-bg)" }}>
                  <div className="h-full rounded-l-full"
                    style={{
                      width: `${(store.activeAds / Math.max(store.totalAds, 1)) * 100}%`,
                      background: "#34D399",
                    }} />
                  {store.pausedAds > 0 && (
                    <div className="h-full rounded-r-full"
                      style={{
                        width: `${(store.pausedAds / Math.max(store.totalAds, 1)) * 100}%`,
                        background: "rgba(255,255,255,0.15)",
                      }} />
                  )}
                </div>
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
          >
            Prev
          </button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-30"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", color: "var(--text-primary)" }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
