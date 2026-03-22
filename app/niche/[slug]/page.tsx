import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getNicheBySlug, NICHES } from "@/lib/niches";
import { getAIInsights } from "@/lib/ai-insights";
import type { FbAd } from "@/lib/facebook-ads";
import { Zap, ArrowRight, TrendingUp } from "lucide-react";

export const revalidate = 3600; // ISR: rebuild every hour

// Pre-generate all niche slugs at build time
export function generateStaticParams() {
  return NICHES.map(n => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const niche = getNicheBySlug(slug);
  if (!niche) return {};
  return {
    title: `Top ${niche.label} Ads — AdspoonX`,
    description: `${niche.description}. Discover the highest-performing ${niche.label.toLowerCase()} ads on Facebook right now, analyzed by AI.`,
    openGraph: {
      title: `Top ${niche.label} Ads — AdspoonX`,
      description: niche.description,
      siteName: "AdspoonX",
    },
  };
}

// Minimal FbAd shape from Prisma Ad row
function toFbAd(ad: {
  adArchiveId: string; pageName: string | null; bodyText: string | null;
  imageUrl: string | null; isActive: boolean; startDate: Date | null;
  platforms: string[]; rawData: unknown;
}): FbAd {
  const raw = ad.rawData as Record<string, unknown> | null;
  const videoUrl = raw?.["videoUrl"] as string | undefined;
  return {
    id:                   ad.adArchiveId,
    page_name:            ad.pageName ?? undefined,
    ad_creative_bodies:   ad.bodyText ? [ad.bodyText] : undefined,
    image_url:            ad.imageUrl ?? undefined,
    video_url:            videoUrl,
    publisher_platforms:  ad.platforms,
    is_active:            ad.isActive,
    ad_delivery_start_time: ad.startDate?.toISOString(),
  };
}

export default async function NichePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const niche = getNicheBySlug(slug);
  if (!niche) notFound();

  const rows = await prisma.ad.findMany({
    where: {
      isActive: true,
      OR: [
        { bodyText:  { contains: niche.keyword, mode: "insensitive" } },
        { pageName:  { contains: niche.keyword, mode: "insensitive" } },
        { title:     { contains: niche.keyword, mode: "insensitive" } },
      ],
    },
    orderBy: { scrapedAt: "desc" },
    take: 12,
    select: { adArchiveId: true, pageName: true, bodyText: true, imageUrl: true, isActive: true, startDate: true, platforms: true, rawData: true },
  });

  const ads = rows.map(toFbAd);

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
        <div className="flex items-center gap-2">
          <Link href="/login"
            className="px-3.5 py-1.5 rounded-[7px] text-[12px] font-medium"
            style={{ color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
            Sign in
          </Link>
          <Link href="/login"
            className="px-3.5 py-1.5 rounded-[7px] text-[12px] font-semibold"
            style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", color: "#fff" }}>
            Try free →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-12 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[22px]">{niche.emoji}</span>
          <span className="text-[11px] font-semibold uppercase px-2.5 py-1 rounded-full"
            style={{ background: "rgba(124,58,237,0.15)", color: "#A78BFA", border: "1px solid rgba(124,58,237,0.25)", letterSpacing: "0.08em" }}>
            Live • Updated hourly
          </span>
        </div>
        <h1 className="text-[32px] sm:text-[40px] font-bold mb-3 leading-tight" style={{ color: "#fff", letterSpacing: "-0.03em" }}>
          Top {niche.label} Ads
        </h1>
        <p className="text-[15px] max-w-xl" style={{ color: "rgba(255,255,255,0.45)" }}>
          {niche.description}. Sourced live from the Facebook Ads Library and scored by AI.
        </p>

        {/* Niche tags */}
        <div className="flex flex-wrap gap-2 mt-5">
          {NICHES.filter(n => n.slug !== slug).slice(0, 6).map(n => (
            <Link key={n.slug} href={`/niche/${n.slug}`}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px]"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}>
              <span>{n.emoji}</span>{n.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Ads grid */}
      <div className="max-w-5xl mx-auto px-6 pb-12">
        {ads.length === 0 ? (
          <div className="text-center py-20 text-[14px]" style={{ color: "rgba(255,255,255,0.3)" }}>
            No ads found for this niche yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad) => {
              const ai = getAIInsights(ad);
              return (
                <Link key={ad.id} href={`/ad/${ad.id}`}
                  className="rounded-[14px] overflow-hidden flex flex-col group"
                  style={{ background: "#16161E", border: "1px solid rgba(255,255,255,0.06)" }}>

                  {/* Creative */}
                  <div className="relative aspect-[4/3] overflow-hidden" style={{ background: "#0D0D15" }}>
                    {ad.image_url ? (
                      <Image src={ad.image_url} alt={ad.page_name ?? "Ad"} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <TrendingUp size={28} style={{ color: "rgba(255,255,255,0.1)" }} />
                      </div>
                    )}
                    {/* AI Score badge */}
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-1.5 py-[3px] rounded-[5px]"
                      style={{ background: "rgba(0,0,0,0.7)", border: `1px solid ${ai.scoreColor}40`, backdropFilter: "blur(8px)" }}>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: ai.scoreColor }}>{ai.winningScore}</span>
                    </div>
                    {/* Hook type */}
                    <div className="absolute top-2.5 left-2.5 px-1.5 py-[3px] rounded-[5px] text-[9px] font-semibold"
                      style={{ background: ai.hookBg, color: ai.hookColor, border: `1px solid ${ai.hookColor}30` }}>
                      {ai.hookType}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-3 flex-1">
                    <p className="text-[12px] font-semibold truncate mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                      {ad.page_name ?? "Unknown Brand"}
                    </p>
                    {ad.ad_creative_bodies?.[0] && (
                      <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                        {ad.ad_creative_bodies[0]}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2.5">
                      <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {ai.trendIcon} {ai.trendLabel}
                      </span>
                      <span className="text-[10px]" style={{ color: "#A78BFA" }}>View →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* CTA banner */}
        <div className="mt-10 rounded-[16px] p-6 text-center"
          style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <p className="text-[22px] font-bold mb-2" style={{ color: "#fff", letterSpacing: "-0.02em" }}>
            See all {niche.label} ads
          </p>
          <p className="text-[13px] mb-5" style={{ color: "rgba(255,255,255,0.45)" }}>
            Sign up free to unlock 12 ads per search, AI scores, hook type detection, and more.
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
