"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import type { FbAd, FbAdsResponse } from "@/lib/facebook-ads";
import AdCard from "@/components/ads/AdCard";
import { useLanguage } from "@/lib/i18n/LanguageContext";

const TRENDING_KEYWORDS = ["sale", "new", "hot", "best seller", "limited"];

export default function TrendingPage() {
  const { t } = useLanguage();
  const [ads, setAds] = useState<FbAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrending() {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled(
          TRENDING_KEYWORDS.map((kw) =>
            axios.get<FbAdsResponse>("/api/ads", {
              params: { q: kw, country: "US", status: "ACTIVE" },
            })
          )
        );

        const allAds: FbAd[] = [];
        const seenIds = new Set<string>();

        for (const result of results) {
          if (result.status === "fulfilled") {
            for (const ad of result.value.data.data) {
              if (!seenIds.has(ad.id)) {
                seenIds.add(ad.id);
                allAds.push(ad);
              }
            }
          }
        }

        allAds.sort((a, b) => {
          const aImp = Number(a.impressions?.upper_bound ?? 0);
          const bImp = Number(b.impressions?.upper_bound ?? 0);
          return bImp - aImp;
        });

        setAds(allAds.slice(0, 40));
      } catch {
        setError("Failed to load trending ads.");
      } finally {
        setLoading(false);
      }
    }

    fetchTrending();
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)" }}>
          <TrendingUp size={18} style={{ color: "#34d399" }} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
              {t.trending.pageTitle}
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ color: "#f87171", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.2)" }}>
              newbie recommend
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {t.trending.pageSubtitle}
          </p>
        </div>
      </div>

      {!loading && ads.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl"
          style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
        >
          <TrendingUp size={16} className="text-indigo-400" />
          <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
            {t.trending.statsPrefix}{" "}
            <span className="font-semibold text-indigo-400">{ads.length}</span>{" "}
            {t.trending.statsMid}{" "}
            <span className="font-semibold text-indigo-400">{TRENDING_KEYWORDS.length}</span>{" "}
            {t.trending.statsSuffix}
          </span>
        </motion.div>
      )}

      {error && (
        <div
          className="rounded-xl p-4 text-sm text-red-400 mb-6"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {ads.map((ad, i) => (
          <AdCard key={ad.id} ad={ad} index={i} />
        ))}
        {loading &&
          Array.from({ length: 12 }).map((_, i) => (
            <div
              key={`sk-${i}`}
              className="rounded-xl animate-pulse"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)", height: 320 }}
            />
          ))}
      </div>
    </div>
  );
}
