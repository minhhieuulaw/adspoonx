"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Bookmark,
  Globe,
  Users,
  Calendar,
  DollarSign,
  Monitor,
} from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function AdDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useLanguage();

  const [ad, setAd] = useState<FbAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAd() {
      setLoading(true);
      try {
        const res = await axios.get<FbAd>(`/api/ads/${id}`);
        setAd(res.data);
      } catch {
        setError("Failed to load ad details.");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchAd();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !ad) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <p className="text-red-400 font-medium">{error ?? "Ad not found"}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-sm text-indigo-400 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  const title =
    ad.ad_creative_link_titles?.[0] ??
    ad.bylines?.[0] ??
    ad.page_name ??
    "No title";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-5xl mx-auto"
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 mb-6 text-sm transition-colors hover:text-white"
        style={{ color: "var(--text-muted)" }}
      >
        <ArrowLeft size={16} />
        Back to Ads
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left — Ad preview */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <div
              className="px-5 py-4 border-b flex items-center justify-between"
              style={{ borderColor: "var(--card-border)" }}
            >
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--accent)" }}>
                  {ad.page_name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="p-2 rounded-lg transition-colors hover:bg-white/5 hover:text-indigo-400"
                  style={{ color: "var(--text-muted)" }}
                  title={t.adCard.saveAd}
                >
                  <Bookmark size={16} />
                </button>
                {ad.ad_snapshot_url && (
                  <a
                    href={ad.ad_snapshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg transition-colors hover:bg-white/5 hover:text-indigo-400"
                    style={{ color: "var(--text-muted)" }}
                    title={t.adCard.viewOriginal}
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>
            </div>

            {/* iFrame preview */}
            {ad.ad_snapshot_url ? (
              <div className="relative w-full" style={{ height: 480 }}>
                <iframe
                  src={ad.ad_snapshot_url}
                  className="w-full h-full border-0"
                  title={title}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div
                className="h-48 flex items-center justify-center"
                style={{ color: "var(--text-muted)" }}
              >
                <Monitor size={32} className="opacity-30" />
              </div>
            )}
          </div>

          {/* Ad copy */}
          {(ad.ad_creative_bodies?.[0] || ad.ad_creative_link_descriptions?.[0]) && (
            <div
              className="rounded-2xl p-5"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Ad Copy
              </h3>
              {ad.ad_creative_bodies?.[0] && (
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-secondary)" }}>
                  {ad.ad_creative_bodies[0]}
                </p>
              )}
              {ad.ad_creative_link_descriptions?.[0] && (
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {ad.ad_creative_link_descriptions[0]}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Right — Stats & Details */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Stats cards */}
          {[
            {
              icon: Users,
              label: "Impressions",
              value:
                ad.impressions
                  ? `${Number(ad.impressions.lower_bound).toLocaleString()} – ${Number(ad.impressions.upper_bound).toLocaleString()}`
                  : "N/A",
              color: "#6366f1",
            },
            {
              icon: DollarSign,
              label: "Estimated Spend",
              value:
                ad.spend
                  ? `${Number(ad.spend.lower_bound).toLocaleString()} – ${Number(ad.spend.upper_bound).toLocaleString()} ${ad.currency ?? ""}`
                  : "N/A",
              color: "#10b981",
            },
            {
              icon: Users,
              label: "Audience Size",
              value:
                ad.estimated_audience_size
                  ? `${ad.estimated_audience_size.lower_bound.toLocaleString()} – ${ad.estimated_audience_size.upper_bound.toLocaleString()}`
                  : "N/A",
              color: "#f59e0b",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${stat.color}20` }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>{stat.label}</p>
                <p className="font-semibold text-sm mt-0.5" style={{ color: "var(--text-primary)" }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}

          {/* Details */}
          <div
            className="rounded-xl p-5 flex flex-col gap-4"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              Details
            </h3>

            {[
              {
                icon: Calendar,
                label: "Started",
                value: ad.ad_delivery_start_time
                  ? new Date(ad.ad_delivery_start_time).toLocaleDateString()
                  : "N/A",
              },
              {
                icon: Calendar,
                label: "Ended",
                value: ad.ad_delivery_stop_time
                  ? new Date(ad.ad_delivery_stop_time).toLocaleDateString()
                  : "Still running",
              },
              {
                icon: Globe,
                label: "Languages",
                value: ad.languages?.join(", ") ?? "N/A",
              },
              {
                icon: Monitor,
                label: "Platforms",
                value: ad.publisher_platforms?.join(", ") ?? "N/A",
              },
            ].map((detail) => (
              <div key={detail.label} className="flex items-start gap-3">
                <detail.icon
                  size={14}
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: "var(--text-muted)" }}
                />
                <div>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {detail.label}
                  </p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: "var(--text-secondary)" }}>
                    {detail.value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Platforms */}
          {ad.publisher_platforms && ad.publisher_platforms.length > 0 && (
            <div
              className="rounded-xl p-5"
              style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
            >
              <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
                Running on
              </h3>
              <div className="flex flex-wrap gap-2">
                {ad.publisher_platforms.map((p) => (
                  <span
                    key={p}
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      color: "#818cf8",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
