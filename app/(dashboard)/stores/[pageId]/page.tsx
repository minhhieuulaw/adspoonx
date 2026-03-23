"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  ArrowLeft, Store, Zap, BarChart2, Calendar, Globe,
  ExternalLink,
} from "lucide-react";
import type { FbAd } from "@/lib/facebook-ads";
import { getAIInsights } from "@/lib/ai-insights";
import AdCard from "@/components/ads/AdCard";

interface StoreData {
  pageId: string;
  pageName: string;
  profilePicture?: string;
  totalAds: number;
  activeAds: number;
  niches: string[];
  platforms: string[];
  earliestStart: string | null;
  ads: Array<{
    adArchiveId: string;
    pageName: string | null;
    pageId: string | null;
    bodyText: string | null;
    title: string | null;
    description: string | null;
    imageUrl: string | null;
    adLibraryUrl: string | null;
    platforms: string[];
    country: string;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
    niche: string | null;
    rawData: unknown;
  }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractVideoUrl(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const r = rawData as Record<string, unknown>;
  if (typeof r["videoUrl"] === "string" && r["videoUrl"]) return r["videoUrl"] as string;
  const snap = r["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const videos = snap["videos"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(videos) && videos.length > 0) {
    if (typeof videos[0]["video_hd_url"] === "string") return videos[0]["video_hd_url"] as string;
    if (typeof videos[0]["video_sd_url"] === "string") return videos[0]["video_sd_url"] as string;
  }
  if (typeof snap["video_hd_url"] === "string") return snap["video_hd_url"] as string;
  if (typeof snap["video_sd_url"] === "string") return snap["video_sd_url"] as string;
  return undefined;
}

function extractThumbnailUrl(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const r = rawData as Record<string, unknown>;
  if (typeof r["thumbnailUrl"] === "string") return r["thumbnailUrl"] as string;
  const snap = r["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const images = snap["images"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(images) && images.length > 0) {
    if (typeof images[0]["resized_image_url"] === "string") return images[0]["resized_image_url"] as string;
    if (typeof images[0]["original_image_url"] === "string") return images[0]["original_image_url"] as string;
  }
  return undefined;
}

function extractProfilePic(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (typeof snap?.["page_profile_picture_url"] === "string") return snap["page_profile_picture_url"] as string;
  return undefined;
}

function extractCtaText(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0 && typeof cards[0]["cta_text"] === "string") return cards[0]["cta_text"] as string;
  if (typeof snap["cta_text"] === "string") return snap["cta_text"] as string;
  return undefined;
}

function mapToFbAd(ad: StoreData["ads"][number]): FbAd {
  return {
    id: ad.adArchiveId,
    page_id: ad.pageId ?? undefined,
    page_name: ad.pageName ?? undefined,
    ad_creative_bodies: ad.bodyText ? [ad.bodyText] : undefined,
    ad_creative_link_titles: ad.title ? [ad.title] : undefined,
    ad_creative_link_descriptions: ad.description ? [ad.description] : undefined,
    ad_snapshot_url: ad.adLibraryUrl ?? undefined,
    image_url: ad.imageUrl ?? extractThumbnailUrl(ad.rawData) ?? undefined,
    video_url: extractVideoUrl(ad.rawData),
    thumbnail_url: extractThumbnailUrl(ad.rawData) ?? ad.imageUrl ?? undefined,
    publisher_platforms: ad.platforms.length ? ad.platforms : undefined,
    ad_delivery_start_time: ad.startDate ?? undefined,
    ad_delivery_stop_time: ad.endDate ?? undefined,
    is_active: ad.isActive,
    country: ad.country,
    countries: [ad.country],
    page_profile_picture_url: extractProfilePic(ad.rawData),
    cta_text: extractCtaText(ad.rawData),
    niche: ad.niche ?? undefined,
  };
}

// ── Avatar helpers ──────────────────────────────────────────────────────────

const PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C"];
function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#60A5FA", instagram: "#F472B6", messenger: "#38BDF8",
  audience_network: "#A78BFA", threads: "#E5E7EB",
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function StoreProfilePage() {
  const { pageId } = useParams<{ pageId: string }>();
  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pageId) return;
    setLoading(true);
    fetch(`/api/stores/${encodeURIComponent(pageId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setStore)
      .catch(() => setError("Store not found"))
      .finally(() => setLoading(false));
  }, [pageId]);

  const fbAds = useMemo(() => store?.ads.map(mapToFbAd) ?? [], [store]);

  const avgScore = useMemo(() => {
    if (!fbAds.length) return 0;
    const sum = fbAds.reduce((acc, ad) => acc + getAIInsights(ad).winningScore, 0);
    return Math.round(sum / fbAds.length);
  }, [fbAds]);

  if (loading) {
    return (
      <div className="max-w-6xl page-enter">
        <div className="h-32 rounded-[14px] skeleton mb-5" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-[12px] skeleton" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "1/1", borderRadius: 10 }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Store size={32} style={{ color: "var(--text-3)" }} />
        <p className="text-[14px] font-medium mt-3" style={{ color: "var(--text-2)" }}>{error ?? "Store not found"}</p>
        <Link href="/stores" className="mt-3 text-[13px] font-medium flex items-center gap-1" style={{ color: "var(--ai-light)" }}>
          <ArrowLeft size={14} /> Back to stores
        </Link>
      </div>
    );
  }

  const color = avatarColor(store.pageName);
  const daysActive = store.earliestStart
    ? Math.floor((Date.now() - new Date(store.earliestStart).getTime()) / 86_400_000)
    : null;

  return (
    <div className="max-w-6xl page-enter">
      {/* Back link */}
      <Link href="/stores" className="inline-flex items-center gap-1.5 text-[12px] font-medium mb-4" style={{ color: "var(--text-3)" }}>
        <ArrowLeft size={13} /> All Stores
      </Link>

      {/* ── Store Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[14px] p-5 mb-5 flex items-center gap-4"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        {store.profilePicture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.profilePicture} alt={store.pageName}
            className="w-14 h-14 rounded-full object-cover flex-shrink-0"
            style={{ border: `2px solid ${color}40` }} />
        ) : (
          <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-[18px] font-bold"
            style={{ background: `${color}20`, color, border: `2px solid ${color}35` }}>
            {store.pageName.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[20px] font-bold truncate" style={{ color: "var(--text-1)" }}>
            {store.pageName}
          </h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {store.platforms.map((p) => (
              <span key={p} className="text-[10px] font-bold px-2 py-[2px] rounded-[5px]"
                style={{
                  color: PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8",
                  background: `${PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8"}15`,
                  border: `1px solid ${PLATFORM_COLORS[p.toLowerCase()] ?? "#94A3B8"}30`,
                }}>
                {p}
              </span>
            ))}
            {store.niches.slice(0, 3).map((n) => (
              <span key={n} className="text-[10px] font-medium px-2 py-[2px] rounded-[5px]"
                style={{ color: "var(--ai-light)", background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.2)" }}>
                {n}
              </span>
            ))}
          </div>
        </div>
        <a href={`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=US&media_type=all&search_type=page&q=${encodeURIComponent(store.pageName)}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-[8px] text-[12px] font-semibold flex-shrink-0"
          style={{ background: "var(--ai-soft)", border: "1px solid rgba(124,58,237,0.3)", color: "var(--ai-light)" }}>
          <ExternalLink size={12} /> Ad Library
        </a>
      </motion.div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "var(--ai-soft)" }}>
            <BarChart2 size={16} strokeWidth={1.8} style={{ color: "var(--ai-light)" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Total Ads</p>
            <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>{store.totalAds}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(52,211,153,0.12)" }}>
            <Zap size={16} strokeWidth={1.8} style={{ color: "#34D399" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Active</p>
            <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>{store.activeAds}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
            <Globe size={16} strokeWidth={1.8} style={{ color: "#60A5FA" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Avg AI Score</p>
            <p className="font-display text-[22px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>{avgScore}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10 }}
          className="rounded-[12px] p-4 flex items-center gap-3"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)" }}>
            <Calendar size={16} strokeWidth={1.8} style={{ color: "#FCD34D" }} />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)" }}>Active Since</p>
            <p className="font-display text-[16px] font-bold leading-none mt-0.5" style={{ color: "var(--text-1)" }}>
              {daysActive !== null ? `${daysActive}d` : "—"}
            </p>
          </div>
        </motion.div>
      </div>

      {/* ── Ads Grid ── */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[14px] font-semibold" style={{ color: "var(--text-1)" }}>
          All Ads ({fbAds.length})
        </h2>
      </div>
      <div className="ads-grid-container">
        <div className="ads-grid">
          {fbAds.map((ad, i) => (
            <AdCard key={ad.id} ad={ad} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
