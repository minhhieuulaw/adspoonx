import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, AI_MODEL, SCAN_COSTS, PLAN_REQUIREMENTS } from "@/lib/anthropic";
import { getUserPlan, deductScans } from "@/lib/subscription";

const TTL_DAYS = 7;

export interface AdAnalysisResult {
  hookAnalysis:        string;
  targetAudience:      string;
  emotionalTriggers:   string[];
  offerType:           string;
  whyItWorks:          string;
  weaknesses:          string;
  replicationStrategy: string;
  score:               number;
  scoreReason:         string;
  productCategory:     string;
  recommendations:     string[];
  cached:              boolean;
  scansCharged:        number;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { adArchiveId } = await req.json() as { adArchiveId: string };
  if (!adArchiveId) return NextResponse.json({ error: "adArchiveId required" }, { status: 400 });

  // Plan check
  const plan = await getUserPlan(session.user.id);
  if (!PLAN_REQUIREMENTS.ad.includes(plan as never)) {
    return NextResponse.json({ error: "Upgrade to Starter or higher to use AI Analysis" }, { status: 403 });
  }

  // Check cache first
  const now = new Date();
  const cached = await prisma.aiAnalysis.findUnique({
    where: { targetType_targetId: { targetType: "ad", targetId: adArchiveId } },
  });

  if (cached && cached.expiresAt > now) {
    // Deduct 1 scan for cache hit (still costs something, but cheap)
    await deductScans(session.user.id, 1);
    return NextResponse.json({ ...(cached.analysis as object), cached: true, scansCharged: 1 });
  }

  // Deduct full scans before API call
  const ok = await deductScans(session.user.id, SCAN_COSTS.ad);
  if (!ok) {
    return NextResponse.json({ error: "Không đủ scans. Mua thêm trong Settings." }, { status: 402 });
  }

  // Fetch ad from DB
  const ad = await prisma.ad.findUnique({
    where: { adArchiveId },
    select: {
      pageName: true, bodyText: true, title: true, description: true,
      ctaType: true, country: true, imageUrl: true, videoUrl: true,
      isActive: true, startDate: true, platforms: true, niche: true,
    },
  });

  if (!ad) return NextResponse.json({ error: "Ad not found" }, { status: 404 });

  const daysRunning = ad.startDate
    ? Math.floor((Date.now() - new Date(ad.startDate).getTime()) / 86_400_000)
    : null;

  // Build Claude message content
  const textContent = `You are an expert Facebook ads analyst helping ecommerce sellers find winning ads to replicate.

Analyze this Facebook ad and return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

Ad data:
- Page/Brand: ${ad.pageName ?? "Unknown"}
- Body text: ${ad.bodyText ?? "(none)"}
- Title: ${ad.title ?? "(none)"}
- Description: ${ad.description ?? "(none)"}
- CTA type: ${ad.ctaType ?? "Unknown"}
- Country: ${ad.country}
- Platforms: ${(ad.platforms ?? []).join(", ") || "Unknown"}
- Niche: ${ad.niche ?? "Unknown"}
- Days running: ${daysRunning ?? "Unknown"}
- Status: ${ad.isActive ? "Active" : "Paused/Inactive"}
- Has image: ${!!ad.imageUrl}
- Has video: ${!!ad.videoUrl}

Return this exact JSON structure:
{
  "hookAnalysis": "2-3 sentences analyzing the opening hook, what attention mechanism it uses",
  "targetAudience": "Age range, gender lean, interests, buying intent — be specific",
  "emotionalTriggers": ["trigger1", "trigger2", "trigger3"],
  "offerType": "discount | bundle | freeShipping | urgency | curiosity | socialProof | ugc | educational | other",
  "whyItWorks": "2-3 sentences on WHY this ad is effective from a conversion psychology standpoint",
  "weaknesses": "1-2 sentences on what could be improved or where this ad might fail",
  "replicationStrategy": "Concrete 2-3 step guide for a seller wanting to create a similar winning ad",
  "score": 85,
  "scoreReason": "1 sentence explaining the score (0-100)",
  "productCategory": "Specific product category this ad is selling",
  "recommendations": ["actionable tip 1", "actionable tip 2", "actionable tip 3"]
}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const msgContent: any[] = [{ type: "text", text: textContent }];

  // Add image if available (Claude is multimodal)
  if (ad.imageUrl) {
    msgContent.push({
      type: "image",
      source: { type: "url", url: ad.imageUrl },
    });
  }

  try {
    const response = await anthropic.messages.create({
      model:      AI_MODEL,
      max_tokens: 1024,
      messages:   [{ role: "user", content: msgContent }],
    });

    const raw = (response.content[0] as { type: string; text: string }).text.trim();
    // Strip markdown fences if Claude adds them
    const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const analysis = JSON.parse(jsonStr) as AdAnalysisResult;

    const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);

    // Upsert cache
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const analysisJson = analysis as any;
    await prisma.aiAnalysis.upsert({
      where:  { targetType_targetId: { targetType: "ad", targetId: adArchiveId } },
      create: { targetType: "ad", targetId: adArchiveId, model: AI_MODEL, analysis: analysisJson, expiresAt },
      update: { analysis: analysisJson, expiresAt, model: AI_MODEL },
    });

    return NextResponse.json({ ...analysis, cached: false, scansCharged: SCAN_COSTS.ad });

  } catch (e) {
    // Refund scans if API call fails
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { scansBalance: { increment: SCAN_COSTS.ad } },
    });
    console.error("[ai/analyze-ad]", e);
    return NextResponse.json({ error: "AI analysis failed. Scans đã được hoàn lại." }, { status: 500 });
  }
}
