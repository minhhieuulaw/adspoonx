"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Store, ExternalLink, TrendingUp, Zap } from "lucide-react";

interface PotentialStore {
  pageName: string;
  pageId: string | null;
  adCount: number;
  imageUrl: string | null;
  adLibraryUrl: string | null;
  platforms: string[];
}

export default function StoresPage() {
  const [stores, setStores] = useState<PotentialStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stores")
      .then((r) => r.json())
      .then((d) => { setStores(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,0.15)" }}>
          <Store size={18} className="text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
            Potential Store
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Top advertisers by ad volume — high-spend stores worth studying
          </p>
        </div>
      </div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl"
        style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
      >
        <Zap size={14} className="text-amber-400 flex-shrink-0" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Stores are ranked by number of active ads — more ads = more budget = higher chance of winning products.
        </p>
      </motion.div>

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl animate-pulse"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", height: 140 }}
            />
          ))}
        </div>
      )}

      {/* Store grid */}
      {!loading && stores.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-3">🏪</div>
          <p className="font-medium" style={{ color: "var(--text-secondary)" }}>No stores found</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Crawl some ads first to populate store data
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stores.map((store, i) => (
          <motion.div
            key={store.pageName + i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="rounded-xl p-4 flex flex-col gap-3 glass-card glow-hover"
          >
            {/* Store avatar + name */}
            <div className="flex items-center gap-3">
              {store.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.imageUrl}
                  alt={store.pageName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
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
                <div className="flex items-center gap-1 mt-0.5">
                  <TrendingUp size={11} className="text-amber-400" />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {store.adCount} active ads
                  </span>
                </div>
              </div>

              {store.adLibraryUrl && (
                <a
                  href={store.adLibraryUrl.replace(/id=\d+/, `id=${store.pageId}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg transition-colors hover:text-amber-400"
                  style={{ color: "var(--text-muted)" }}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {/* Platforms */}
            {store.platforms.length > 0 && (
              <div className="flex gap-1.5 flex-wrap">
                {store.platforms.map((p) => (
                  <span
                    key={p}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--content-bg)",
                      color: "var(--text-muted)",
                      border: "1px solid var(--sidebar-border)",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            )}

            {/* Ad count bar */}
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--content-bg)" }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, (store.adCount / (stores[0]?.adCount || 1)) * 100)}%`,
                  background: "linear-gradient(90deg, #f59e0b, #f97316)",
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
