import type { FbAd } from "@/lib/facebook-ads";

export interface StoreAd {
  adArchiveId: string;
  pageName: string | null;
  pageId: string | null;
  bodyText: string | null;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  adLibraryUrl: string | null;
  ctaType: string | null;
  platforms: string[];
  country: string;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  pausedAt: string | null;
  niche: string | null;
  rawData: unknown;
}

export interface StoreData {
  pageId: string;
  pageName: string;
  profilePicture?: string;
  totalAds: number;
  activeAds: number;
  pausedAds: number;
  niches: string[];
  platforms: string[];
  countries: string[];
  firstSeenAt: string | null;
  lastAdSeenAt: string | null;
  ads: StoreAd[];
}

export function extractVideoUrl(rawData: unknown): string | undefined {
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

export function extractThumbnailUrl(rawData: unknown): string | undefined {
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

export function extractProfilePic(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (typeof snap?.["page_profile_picture_url"] === "string") return snap["page_profile_picture_url"] as string;
  return undefined;
}

export function extractCtaText(rawData: unknown): string | undefined {
  if (!rawData || typeof rawData !== "object") return undefined;
  const snap = (rawData as Record<string, unknown>)["snapshot"] as Record<string, unknown> | undefined;
  if (!snap) return undefined;
  const cards = snap["cards"] as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(cards) && cards.length > 0 && typeof cards[0]["cta_text"] === "string") return cards[0]["cta_text"] as string;
  if (typeof snap["cta_text"] === "string") return snap["cta_text"] as string;
  return undefined;
}

export function mapToFbAd(ad: StoreAd): FbAd {
  return {
    id: ad.adArchiveId,
    page_id: ad.pageId ?? undefined,
    page_name: ad.pageName ?? undefined,
    ad_creative_bodies: ad.bodyText ? [ad.bodyText] : undefined,
    ad_creative_link_titles: ad.title ? [ad.title] : undefined,
    ad_creative_link_descriptions: ad.description ? [ad.description] : undefined,
    ad_snapshot_url: ad.adLibraryUrl ?? undefined,
    image_url: ad.imageUrl ?? extractThumbnailUrl(ad.rawData) ?? undefined,
    video_url: ad.videoUrl ?? extractVideoUrl(ad.rawData),
    thumbnail_url: extractThumbnailUrl(ad.rawData) ?? ad.imageUrl ?? undefined,
    publisher_platforms: ad.platforms.length ? ad.platforms : undefined,
    ad_delivery_start_time: ad.startDate ?? undefined,
    ad_delivery_stop_time: ad.endDate ?? undefined,
    is_active: ad.isActive,
    country: ad.country,
    countries: [ad.country],
    page_profile_picture_url: extractProfilePic(ad.rawData),
    cta_text: ad.ctaType ?? extractCtaText(ad.rawData),
    niche: ad.niche ?? undefined,
  };
}

const PALETTE = ["#A78BFA", "#60A5FA", "#F472B6", "#34D399", "#FCD34D", "#FB923C"];
export function avatarColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return PALETTE[h % PALETTE.length];
}

export function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function daysActive(firstSeenAt: string | null): number | null {
  if (!firstSeenAt) return null;
  return Math.floor((Date.now() - new Date(firstSeenAt).getTime()) / 86_400_000);
}

export const PLATFORM_COLORS: Record<string, string> = {
  facebook: "#60A5FA",
  instagram: "#F472B6",
  messenger: "#38BDF8",
  audience_network: "#A78BFA",
  threads: "#E5E7EB",
};
