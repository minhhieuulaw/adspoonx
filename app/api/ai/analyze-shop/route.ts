import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, AI_MODEL, SCAN_COSTS, PLAN_REQUIREMENTS } from "@/lib/anthropic";
import { getUserPlan, deductScans } from "@/lib/subscription";

const TTL_DAYS = 7;

export interface ShopAnalysisResult {
  overallStrategy:      string;
  targetMarket:         string;
  brandVoice:           string;
  topHooks:             string[];
  adCadence:            string;
  pricingStrategy:      string;
  strengths:            string[];
  weaknesses:           string[];
  competitivePosition:  string;
  marketOpportunity:    string;
  recommendations:      string[];
  cached:               boolean;
  scansCharged:         number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pageId } = await req.json() as { pageId: string };
  if (!pageId) return NextResponse.json({ error: "pageId required" }, { status: 400 });

  // Plan check — Premium+
  const plan = await getUserPlan(session.user.id);
  if (!PLAN_REQUIREMENTS.shop.includes(plan as never)) {
    return NextResponse.json({ error: "Upgrade to Premium or higher to use Shop AI Analysis" }, { status: 403 });
  }

  // Check cache
  const now = new Date();
  const cached = await prisma.aiAnalysis.findUnique({
    where: { targetType_targetId: { targetType: "shop", targetId: pageId } },
  });

  if (cached && cached.expiresAt > now) {
    await deductScans(session.user.id, 2); // reduced cache fee
    return NextResponse.json({ ...(cached.analysis as object), cached: true, scansCharged: 2 });
  }

  // Deduct scans
  const ok = await deductScans(session.user.id, SCAN_COSTS.shop);
  if (!ok) {
    return NextResponse.json({ error: "Không đủ scans. Mua thêm trong Settings." }, { status: 402 });
  }

  // Fetch shop + top 10 active ads
  const [shop, ads] = await Promise.all([
    prisma.shop.findUnique({
      where: { pageId },
      select: { pageName: true, totalAds: true, activeAds: true, countries: true, platforms: true },
    }),
    prisma.ad.findMany({
      where:   { pageId, isActive: true },
      orderBy: { startDate: "desc" },
      take:    10,
      select:  {
        bodyText: true, title: true, ctaType: true,
        country: true, startDate: true, imageUrl: true,
      },
    }),
  ]);

  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const adsText = ads.map((a, i) => {
    const days = a.startDate
      ? Math.floor((Date.now() - new Date(a.startDate).getTime()) / 86_400_000)
      : "?";
    return `Ad ${i + 1} (${days} days, ${a.country}):
  Body: ${(a.bodyText ?? "").slice(0, 200)}
  Title: ${a.title ?? "—"} | CTA: ${a.ctaType ?? "—"}`;
  }).join("\n\n");

  const prompt = `You are an expert Facebook ads strategist analyzing a competitor's advertising strategy for ecommerce sellers.

Analyze this Facebook advertiser's marketing strategy based on their recent ads. Return ONLY a valid JSON object — no markdown, no explanation.

Advertiser: ${shop.pageName}
Total ads: ${shop.totalAds} (${shop.activeAds} active)
Countries: ${(shop.countries ?? []).join(", ") || "Unknown"}
Platforms: ${(shop.platforms ?? []).join(", ") || "Unknown"}

Recent active ads (newest first):
${adsText}

Return this exact JSON:
{
  "overallStrategy": "2-3 sentences on their overall paid advertising strategy and philosophy",
  "targetMarket": "Specific description of who they're targeting — demographics, psychographics, buying behavior",
  "brandVoice": "How they communicate — tone, style, language patterns",
  "topHooks": ["hook pattern 1", "hook pattern 2", "hook pattern 3"],
  "adCadence": "How frequently they test new creatives and rotate ads based on the data",
  "pricingStrategy": "What price point and offer structure their ads suggest",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "competitivePosition": "2 sentences on their market position and competitive advantage",
  "marketOpportunity": "What gaps or opportunities exist that a competitor could exploit",
  "recommendations": ["If you want to compete: tip 1", "tip 2", "tip 3"]
}`;

  try {
    const response = await anthropic.messages.create({
      model:      AI_MODEL,
      max_tokens: 1200,
      messages:   [{ role: "user", content: prompt }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const analysis = JSON.parse(jsonStr) as ShopAnalysisResult;

    const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisJson = analysis as any;
    await prisma.aiAnalysis.upsert({
      where:  { targetType_targetId: { targetType: "shop", targetId: pageId } },
      create: { targetType: "shop", targetId: pageId, model: AI_MODEL, analysis: analysisJson, expiresAt },
      update: { analysis: analysisJson, expiresAt, model: AI_MODEL },
    });

    return NextResponse.json({ ...analysis, cached: false, scansCharged: SCAN_COSTS.shop });

  } catch (e) {
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { scansBalance: { increment: SCAN_COSTS.shop } },
    });
    console.error("[ai/analyze-shop]", e);
    return NextResponse.json({ error: "AI analysis failed. Scans đã được hoàn lại." }, { status: 500 });
  }
}
