import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { NICHES } from "@/lib/niche-detect";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim());
const HAIKU_MODEL  = "claude-haiku-4-5-20251001";
const BATCH_SIZE   = 20; // ads per batch call (parallel)

// Niche normalization: map old/inconsistent names → standard NICHES list
const NORMALIZE_MAP: Record<string, string> = {
  "Skincare & Beauty":      "Health & Beauty",
  "Hair Care":              "Health & Beauty",
  "Weight Loss & Fitness":  "Fitness & Wellness",
  "Health & Supplements":   "Supplements & Nutrition",
  "Home & Kitchen":         "Home & Living",
  "Outdoor & Sports":       "Sports & Outdoors",
  "Car & Auto":             "E-commerce",
};

const NICHE_LIST = NICHES.filter(n => n !== "Other").join(", ");

// ── GET: stats ───────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [distribution, normalizable, classifiedCount] = await Promise.all([
    prisma.ad.groupBy({
      by: ["niche"],
      _count: { niche: true },
      orderBy: { _count: { niche: "desc" } },
    }),
    prisma.ad.count({
      where: { niche: { in: Object.keys(NORMALIZE_MAP) } },
    }),
    prisma.ad.count({
      where: { niche: { not: null, notIn: ["Other"] } },
    }),
  ]);

  const otherCount = distribution.find(d => d.niche === "Other")?._count.niche ?? 0;

  // ~0.000063 per ad (Haiku with image)
  const estimatedCostUsd = +(otherCount * 0.000063).toFixed(2);

  return NextResponse.json({
    distribution: distribution.map(d => ({ niche: d.niche ?? "null", count: d._count.niche })),
    otherCount,
    classifiedCount,
    normalizable,
    estimatedCostUsd,
  });
}

// ── POST: normalize + batch reclassify ──────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    action: "normalize" | "reclassify";
    limit?: number;
  };

  // ── Action 1: normalize old niche names ─────────────────────────────────
  if (body.action === "normalize") {
    let total = 0;
    for (const [oldNiche, newNiche] of Object.entries(NORMALIZE_MAP)) {
      const { count } = await prisma.ad.updateMany({
        where: { niche: oldNiche },
        data:  { niche: newNiche },
      });
      total += count;
    }
    return NextResponse.json({ ok: true, action: "normalize", updated: total });
  }

  // ── Action 2: reclassify "Other" ads using Claude Haiku ─────────────────
  if (body.action === "reclassify") {
    const limit = Math.min(body.limit ?? 100, 500); // cap at 500 per request

    const ads = await prisma.ad.findMany({
      where: { niche: "Other" },
      select: {
        adArchiveId: true,
        bodyText:    true,
        title:       true,
        imageUrl:    true,
        pageName:    true,
      },
      take: limit,
      orderBy: { startDate: "desc" },
    });

    if (ads.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, updated: 0, results: [] });
    }

    // Process in parallel batches of BATCH_SIZE
    const results: { id: string; oldNiche: string; newNiche: string; confidence: string }[] = [];
    let updated = 0;

    for (let i = 0; i < ads.length; i += BATCH_SIZE) {
      const chunk = ads.slice(i, i + BATCH_SIZE);

      const chunkResults = await Promise.all(chunk.map(async ad => {
        try {
          const textContent = `Classify this Facebook ad into exactly ONE of these product niches:
${NICHE_LIST}

Ad info:
- Brand: ${ad.pageName ?? "Unknown"}
- Body: ${(ad.bodyText ?? "").slice(0, 300)}
- Title: ${ad.title ?? ""}

Return ONLY a JSON object, no markdown:
{"niche": "exact niche name from list", "confidence": "high|medium|low", "reason": "1 sentence"}`;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msgContent: any[] = [{ type: "text", text: textContent }];
          if (ad.imageUrl) {
            msgContent.push({ type: "image", source: { type: "url", url: ad.imageUrl } });
          }

          const response = await anthropic.messages.create({
            model:      HAIKU_MODEL,
            max_tokens: 100,
            messages:   [{ role: "user", content: msgContent }],
          });

          const raw     = (response.content[0] as { text: string }).text.trim();
          const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
          const parsed  = JSON.parse(jsonStr) as { niche: string; confidence: string };

          // Validate niche is in our list
          const validNiche = (NICHES as readonly string[]).includes(parsed.niche)
            ? parsed.niche
            : null;

          if (validNiche && validNiche !== "Other" && parsed.confidence !== "low") {
            await prisma.ad.update({
              where: { adArchiveId: ad.adArchiveId },
              data:  { niche: validNiche },
            });
            return { id: ad.adArchiveId, oldNiche: "Other", newNiche: validNiche, confidence: parsed.confidence };
          }
          return { id: ad.adArchiveId, oldNiche: "Other", newNiche: "Other", confidence: "low" };
        } catch {
          return { id: ad.adArchiveId, oldNiche: "Other", newNiche: "Other", confidence: "error" };
        }
      }));

      results.push(...chunkResults);
      updated += chunkResults.filter(r => r.newNiche !== "Other").length;
    }

    const breakdown: Record<string, number> = {};
    for (const r of results) {
      if (r.newNiche !== "Other") {
        breakdown[r.newNiche] = (breakdown[r.newNiche] ?? 0) + 1;
      }
    }

    return NextResponse.json({
      ok:        true,
      action:    "reclassify",
      processed: ads.length,
      updated,
      breakdown,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
