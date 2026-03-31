/**
 * GET /api/research — Deep Research keyword rankings.
 * Computes keyword metrics from ads data, scores them, returns ranked list + niche clusters.
 * POST /api/research — Refresh: recompute all keyword scores from current ads data.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SEED_KEYWORDS } from "@/lib/research/seed-keywords";
import { computeScores, generateVerdict, type KeywordMetrics } from "@/lib/research/keyword-scoring";

// ── GET: Return cached rankings ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const niche = url.searchParams.get("niche");
  const signal = url.searchParams.get("signal");
  const sort = url.searchParams.get("sort") ?? "opportunityScore";
  const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "100"));

  // Build where clause
  const where: Record<string, unknown> = {};
  if (niche && niche !== "all") where.niche = niche;
  if (signal && signal !== "all") where.signal = signal;

  const [keywords, clusters, totalKeywords] = await Promise.all([
    prisma.researchKeyword.findMany({
      where,
      orderBy: { [sort]: "desc" },
      take: limit,
    }),
    prisma.nicheCluster.findMany({
      orderBy: { avgOpportunity: "desc" },
    }),
    prisma.researchKeyword.count(),
  ]);

  // Stats
  const risingCount = keywords.filter(k => k.signal === "go" && k.growthScore >= 50).length;
  const stableCount = keywords.filter(k => k.evergreenScore >= 60).length;
  const beginnerCount = clusters.filter(c => c.beginnerSafe).length;
  const riskCount = keywords.filter(k => k.signal === "risk").length;

  // Top movers (highest growthRate)
  const topMovers = [...keywords].sort((a, b) => b.growthRate - a.growthRate).slice(0, 5);

  return NextResponse.json({
    keywords,
    clusters,
    topMovers,
    stats: {
      total: totalKeywords,
      rising: risingCount,
      stable: stableCount,
      beginnerNiches: beginnerCount,
      seasonal: riskCount,
    },
  });
}

// ── POST: Recompute scores from ads data ────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Step 1: Ensure seed keywords exist
  for (const seed of SEED_KEYWORDS) {
    await prisma.researchKeyword.upsert({
      where: { keyword: seed.keyword },
      update: { niche: seed.niche },
      create: { keyword: seed.keyword, niche: seed.niche, source: "seed" },
    });
  }

  // Step 2: Get all tracked keywords
  const allKeywords = await prisma.researchKeyword.findMany();

  // Step 3: For each keyword, compute metrics from ads data
  for (const kw of allKeywords) {
    const searchTerm = kw.keyword.toLowerCase();

    // Query ads matching this keyword (in bodyText, title, or pageName)
    const metricsResult = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      SELECT
        COUNT(*) as "adCount",
        COUNT(*) FILTER (WHERE "isActive" = true) as "activeAds",
        COALESCE(AVG(EXTRACT(EPOCH FROM (now() - "startDate")) / 86400.0) FILTER (WHERE "startDate" IS NOT NULL), 0) as "avgDays",
        COUNT(DISTINCT country) as "geoCount",
        COUNT(*) FILTER (WHERE "scrapedAt" > now() - interval '7 days') as "newAds7d"
      FROM "Ad"
      WHERE "niche" IS NOT NULL AND "niche" != 'Other'
        AND (
          LOWER("bodyText") LIKE $1
          OR LOWER(title) LIKE $1
          OR LOWER("pageName") LIKE $1
        )
    `, `%${searchTerm}%`);

    const row = metricsResult[0] ?? {};
    const adCount = Number(row.adCount ?? 0);
    const activeAds = Number(row.activeAds ?? 0);
    const avgDays = Number(row.avgDays ?? 0);
    const geoCount = Number(row.geoCount ?? 0);
    const newAds7d = Number(row.newAds7d ?? 0);

    // Approximate platform count and AI score from niche
    const platformCount = geoCount >= 3 ? 3 : geoCount >= 1 ? 2 : 1;
    const avgAiScore = adCount > 0 ? Math.min(85, 40 + adCount * 0.3 + avgDays * 0.1) : 0;

    const metrics: KeywordMetrics = {
      adCount,
      activeAds,
      activeRatio: adCount > 0 ? activeAds / adCount : 0,
      avgDaysRunning: avgDays,
      geoCount,
      platformCount,
      avgAiScore,
      newAds7d,
      growthRate: adCount > 0 ? (newAds7d / adCount) * 100 : 0,
    };

    const scores = computeScores(metrics);
    const verdict = generateVerdict(scores);

    await prisma.researchKeyword.update({
      where: { id: kw.id },
      data: {
        adCount: metrics.adCount,
        activeAds: metrics.activeAds,
        activeRatio: metrics.activeRatio,
        avgDaysRunning: metrics.avgDaysRunning,
        geoCount: metrics.geoCount,
        platformCount: metrics.platformCount,
        avgAiScore: metrics.avgAiScore,
        newAds7d: metrics.newAds7d,
        growthRate: metrics.growthRate,
        ...scores,
        aiVerdict: verdict,
      },
    });
  }

  // Step 4: Compute niche clusters
  const nicheGroups = await prisma.researchKeyword.groupBy({
    by: ["niche"],
    _count: { id: true },
    _avg: { opportunityScore: true, growthRate: true, beginnerScore: true },
    where: { niche: { not: null } },
  });

  for (const g of nicheGroups) {
    if (!g.niche) continue;
    const avgOpp = g._avg.opportunityScore ?? 0;
    const avgGrowth = g._avg.growthRate ?? 0;
    const avgBeginner = g._avg.beginnerScore ?? 0;
    const signal = avgOpp >= 60 ? "go" : avgGrowth >= 30 ? "risk" : "wait";

    await prisma.nicheCluster.upsert({
      where: { niche: g.niche },
      update: {
        keywordCount: g._count.id,
        avgOpportunity: Math.round(avgOpp),
        avgGrowth: Math.round(avgGrowth * 10) / 10,
        signal,
        beginnerSafe: avgBeginner >= 55,
      },
      create: {
        niche: g.niche,
        keywordCount: g._count.id,
        avgOpportunity: Math.round(avgOpp),
        avgGrowth: Math.round(avgGrowth * 10) / 10,
        signal,
        beginnerSafe: avgBeginner >= 55,
      },
    });
  }

  return NextResponse.json({ ok: true, keywords: allKeywords.length, niches: nicheGroups.length });
}
