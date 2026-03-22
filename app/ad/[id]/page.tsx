import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getAIInsights } from "@/lib/ai-insights";
import type { FbAd } from "@/lib/facebook-ads";
import { Zap, ArrowRight, ExternalLink, Calendar, Globe } from "lucide-react";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const ad = await prisma.ad.findUnique({ where: { adArchiveId: id }, select: { pageName: true, bodyText: true, imageUrl: true } });
  if (!ad) return {};
  const title = ad.pageName ? `${ad.pageName} Ad — AdspoonX` : "Facebook Ad — AdspoonX";
  const description = ad.bodyText?.slice(0, 150) ?? "Analyze this Facebook ad with AI-powered scoring on AdspoonX.";
  return {
    title,
    description,
    openGraph: { title, description, images: ad.imageUrl ? [ad.imageUrl] : [] },
    twitter: { card: "summary_large_image", title, description, images: ad.imageUrl ? [ad.imageUrl] : [] },
  };
}

function toFbAd(ad: {
  adArchiveId: string; pageName: string | null; bodyText: string | null; title: string | null;
  imageUrl: string | null; isActive: boolean; startDate: Date | null; endDate: Date | null;
  platforms: string[]; country: string; adLibraryUrl: string | null; rawData: unknown;
}): FbAd {
  const raw = ad.rawData as Record<string, unknown> | null;
  return {
    id:                   ad.adArchiveId,
    page_name:            ad.pageName ?? undefined,
    ad_creative_bodies:   ad.bodyText ? [ad.bodyText] : undefined,
    ad_creative_link_titles: ad.title ? [ad.title] : undefined,
    image_url:            ad.imageUrl ?? undefined,
    video_url:            raw?.["videoUrl"] as string | undefined,
    thumbnail_url:        raw?.["thumbnailUrl"] as string | undefined,
    publisher_platforms:  ad.platforms,
    is_active:            ad.isActive,
    ad_delivery_start_time: ad.startDate?.toISOString(),
    ad_delivery_stop_time:  ad.endDate?.toISOString(),
    ad_snapshot_url:      ad.adLibraryUrl ?? undefined,
    country:              ad.country,
  };
}

export default async function AdPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const row = await prisma.ad.findUnique({
    where: { adArchiveId: id },
    select: { adArchiveId: true, pageName: true, bodyText: true, title: true, imageUrl: true, isActive: true, startDate: true, endDate: true, platforms: true, country: true, adLibraryUrl: true, rawData: true },
  });
  if (!row) notFound();

  const ad  = toFbAd(row);
  const ai  = getAIInsights(ad);

  const daysRunning = ad.ad_delivery_start_time
    ? Math.floor((Date.now() - new Date(ad.ad_delivery_start_time).getTime()) / 86_400_000)
    : null;

  const hasVideo = !!ad.video_url;
  const mediaSrc = hasVideo ? (ad.thumbnail_url ?? ad.image_url) : ad.image_url;

  return (
    <div className="min-h-screen" style={{ background: "#0A0A0F", color: "var(--text-primary)" }}>

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
            <Zap size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-[15px]" style={{ color: "#fff", letterSpacing: "-0.03em" }}>
            adspoon<span style={{ color: "#A78BFA" }}>X</span>
          </span>
        </Link>
        <Link href="/login"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[7px] text-[12px] font-semibold"
          style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", color: "#fff" }}>
          Try AdspoonX free <ArrowRight size={11} />
        </Link>
      </nav>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 pt-10 pb-16">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
          <Link href="/" className="hover:text-white transition-colors">AdspoonX</Link>
          <span>/</span>
          <span>Ad Analysis</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Left: Creative */}
          <div>
            <div className="rounded-[14px] overflow-hidden relative" style={{ background: "#16161E", border: "1px solid rgba(255,255,255,0.06)", aspectRatio: "4/3" }}>
              {mediaSrc ? (
                <Image src={mediaSrc} alt={ad.page_name ?? "Ad creative"} fill className="object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Zap size={32} style={{ color: "rgba(255,255,255,0.08)" }} />
                </div>
              )}
              {hasVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                    <span style={{ color: "#fff", fontSize: 18, marginLeft: 2 }}>▶</span>
                  </div>
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-2 mt-3">
              {ad.is_active && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px] font-semibold"
                  style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34D399" }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] inline-block animate-pulse" />
                  Active
                </span>
              )}
              {daysRunning !== null && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                  <Calendar size={9} strokeWidth={1.5} /> {daysRunning}d running
                </span>
              )}
              {ad.country && (
                <span className="flex items-center gap-1 px-2 py-1 rounded-[5px] text-[10px]"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}>
                  <Globe size={9} strokeWidth={1.5} /> {ad.country}
                </span>
              )}
            </div>
          </div>

          {/* Right: Analysis */}
          <div className="flex flex-col gap-4">

            {/* Page name */}
            <div>
              <p className="text-[11px] mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>Advertiser</p>
              <p className="text-[18px] font-bold" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
                {ad.page_name ?? "Unknown Brand"}
              </p>
            </div>

            {/* AI Score */}
            <div className="rounded-[12px] p-4" style={{ background: "#16161E", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>AI Winning Score</p>
                <span className="font-bold text-[22px] tabular-nums" style={{ color: ai.scoreColor }}>{ai.winningScore}</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full" style={{ width: `${ai.winningScore}%`, background: ai.scoreColor, boxShadow: ai.scoreGlow ? `0 0 8px ${ai.scoreColor}` : "none" }} />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="px-1.5 py-[3px] rounded-[5px] text-[9px] font-semibold"
                  style={{ background: ai.hookBg, color: ai.hookColor, border: `1px solid ${ai.hookColor}30` }}>
                  {ai.hookType}
                </span>
                <span className="text-[11px]" style={{ color: ai.trendColor }}>{ai.trendIcon} {ai.trendLabel}</span>
              </div>
            </div>

            {/* Why it works */}
            <div className="rounded-[12px] p-4" style={{ background: "#16161E", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>Why it works</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>{ai.whyWorking}</p>
            </div>

            {/* Body copy */}
            {ad.ad_creative_bodies?.[0] && (
              <div className="rounded-[12px] p-4" style={{ background: "#16161E", border: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-[11px] font-semibold uppercase mb-2" style={{ color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>Ad Copy</p>
                <p className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                  {ad.ad_creative_bodies[0].slice(0, 280)}{ad.ad_creative_bodies[0].length > 280 ? "…" : ""}
                </p>
              </div>
            )}

            {/* Facebook link */}
            {ad.ad_snapshot_url && (
              <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[11px]"
                style={{ color: "rgba(255,255,255,0.3)" }}>
                <ExternalLink size={10} strokeWidth={1.5} />
                View in Facebook Ad Library
              </a>
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-10 rounded-[16px] p-6 text-center"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <p className="text-[20px] font-bold mb-2" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
            Find more ads like this
          </p>
          <p className="text-[13px] mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Search 10,000+ Facebook ads, analyze with AI, and discover your next winning creative.
          </p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-[13px] font-semibold"
            style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", color: "#fff", boxShadow: "0 0 24px rgba(124,58,237,0.4)" }}>
            Start for free <ArrowRight size={14} />
          </Link>
          <p className="text-[11px] mt-3" style={{ color: "rgba(255,255,255,0.25)" }}>No credit card required</p>
        </div>
      </div>
    </div>
  );
}
