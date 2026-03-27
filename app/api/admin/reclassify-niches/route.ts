import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/anthropic";
import { NICHES, detectNiche, nicheInputFromRaw } from "@/lib/niche-detect";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map(e => e.trim());
const HAIKU_MODEL  = "claude-haiku-4-5-20251001";
const BATCH_SIZE   = 20; // ads per batch call (parallel)

// Valid niche set for fast lookup
const VALID_NICHES = new Set<string>(NICHES);

// Niche normalization: map old/inconsistent names → standard NICHES list
const NORMALIZE_MAP: Record<string, string> = {
  // Old names from previous classification rounds
  "Skincare & Beauty":          "Health & Beauty",
  "Hair Care":                  "Health & Beauty",
  "Weight Loss & Fitness":      "Fitness & Wellness",
  "Health & Supplements":       "Supplements & Nutrition",
  "Home & Kitchen":             "Home & Living",
  "Outdoor & Sports":           "Sports & Outdoors",
  "Car & Auto":                 "E-commerce",
  // Invalid niches still in DB
  "Tech & Gadgets":             "Electronics & Tech",
  "Dropshipping & E-com Tools": "E-commerce",
  "Dental & Oral Care":         "Health & Beauty",
};

const NICHE_LIST = NICHES.filter(n => n !== "Other").join(", ");

// ── GET: stats ───────────────────────────────────────────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [distribution, normalizable, classifiedCount, nullCount] = await Promise.all([
    prisma.ad.groupBy({
      by: ["niche"],
      _count: { niche: true },
      orderBy: { _count: { niche: "desc" } },
    }),
    // Count ads with any invalid/old niche name (needs normalize)
    prisma.ad.count({
      where: { niche: { in: Object.keys(NORMALIZE_MAP) } },
    }),
    // Count properly classified (not null, not "Other", not invalid)
    prisma.ad.count({
      where: {
        niche: {
          not: null,
          notIn: ["Other", ...Object.keys(NORMALIZE_MAP)],
        },
      },
    }),
    // Safety: count remaining NULLs (should be 0 after migration)
    prisma.ad.count({ where: { niche: null } }),
  ]);

  // otherCount = "Other" + NULL (both need reclassification)
  const otherCount =
    (distribution.find(d => d.niche === "Other")?._count.niche ?? 0) + nullCount;

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

// ── POST: normalize + batch reclassify + reset ────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    action: "normalize" | "reclassify" | "reset" | "reset-invalid" | "bulk-detect";
    limit?: number;
    confirm?: boolean;
  };

  // ── Action: normalize old niche names ────────────────────────────────────
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

  // ── Action: reset ALL classifications → "Other" (nuclear option) ─────────
  if (body.action === "reset") {
    if (!body.confirm) {
      const total = await prisma.ad.count({ where: { niche: { not: null, notIn: ["Other"] } } });
      return NextResponse.json({
        ok: false,
        needsConfirm: true,
        willReset: total,
        estimatedCostUsd: +(total * 0.000063).toFixed(2),
        message: `This will reset ${total.toLocaleString()} classified ads to "Other". Pass confirm:true to proceed.`,
      });
    }
    const { count } = await prisma.ad.updateMany({
      where: { niche: { not: null, notIn: ["Other"] } },
      data:  { niche: "Other" },
    });
    return NextResponse.json({ ok: true, action: "reset", updated: count });
  }

  // ── Action: reset only invalid niche names → "Other" ────────────────────
  if (body.action === "reset-invalid") {
    const invalidNames = Object.keys(NORMALIZE_MAP).filter(k => !VALID_NICHES.has(k));
    // Also catch any niche not in current valid list
    const allNiches = await prisma.ad.groupBy({
      by: ["niche"],
      _count: { niche: true },
    });
    const allInvalid = allNiches
      .filter(d => d.niche !== null && d.niche !== "Other" && !VALID_NICHES.has(d.niche))
      .map(d => d.niche as string);

    const toReset = [...new Set([...invalidNames, ...allInvalid])];
    if (toReset.length === 0) {
      return NextResponse.json({ ok: true, action: "reset-invalid", updated: 0, niches: [] });
    }
    const { count } = await prisma.ad.updateMany({
      where: { niche: { in: toReset } },
      data:  { niche: "Other" },
    });
    return NextResponse.json({ ok: true, action: "reset-invalid", updated: count, niches: toReset });
  }

  // ── Action: bulk classify using detectNiche() — free, instant, no AI cost ──
  if (body.action === "bulk-detect") {
    const limit = Math.min(body.limit ?? 5000, 10000);

    const ads = await prisma.ad.findMany({
      where: { OR: [{ niche: "Other" }, { niche: null }] },
      select: { adArchiveId: true, bodyText: true, title: true, rawData: true },
      take: limit,
      orderBy: { updatedAt: "asc" },
    });

    if (ads.length === 0) {
      return NextResponse.json({ ok: true, action: "bulk-detect", processed: 0, updated: 0, breakdown: {} });
    }

    // Group adArchiveIds by detected niche
    const groups: Record<string, string[]> = {};
    for (const ad of ads) {
      const input = nicheInputFromRaw(ad.rawData as Record<string, unknown>, ad);
      const niche = detectNiche(input);
      if (niche !== "Other") {
        groups[niche] ??= [];
        groups[niche].push(ad.adArchiveId);
      }
    }

    // Bulk update per niche group (single updateMany per niche — very fast)
    let updated = 0;
    const breakdown: Record<string, number> = {};
    for (const [niche, ids] of Object.entries(groups)) {
      const { count } = await prisma.ad.updateMany({
        where: { adArchiveId: { in: ids } },
        data:  { niche },
      });
      updated += count;
      breakdown[niche] = count;
    }

    return NextResponse.json({ ok: true, action: "bulk-detect", processed: ads.length, updated, breakdown });
  }

  // ── Action: reclassify "Other" (and NULL) ads using Claude Haiku ─────────
  if (body.action === "reclassify") {
    const limit = Math.min(body.limit ?? 100, 500); // cap at 500 per request

    const ads = await prisma.ad.findMany({
      where: {
        OR: [
          { niche: "Other" },
          { niche: null },
        ],
      },
      select: {
        adArchiveId: true,
        bodyText:    true,
        title:       true,
        imageUrl:    true,
        pageName:    true,
        rawData:     true,
      },
      take: limit,
      // updatedAt ASC: ads least-recently-touched come first.
      // Every processed ad gets lastCheckedAt touched → bumps updatedAt → moves to back.
      // This creates a self-healing queue: fresh/unprocessed ads always at front.
      orderBy: { updatedAt: "asc" },
    });

    if (ads.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, updated: 0, results: [] });
    }

    // Extract product link URL from rawData snapshot
    function extractLinkUrl(rawData: unknown): string {
      try {
        const snap = ((rawData as Record<string, unknown>)?.snapshot ?? {}) as Record<string, unknown>;
        return (snap.link_url as string) ?? (snap.caption as string) ?? "";
      } catch { return ""; }
    }

    // Helper: classify one ad, with image-fallback to text-only on CDN errors
    async function classifyAd(ad: typeof ads[0]): Promise<{ niche: string; confidence: string }> {
      const linkUrl = extractLinkUrl(ad.rawData);
      const textContent = `Classify this Facebook ad into exactly ONE of these product niches:\n${NICHE_LIST}\n\nAd info:\n- Brand: ${ad.pageName ?? "Unknown"}\n- Body: ${(ad.bodyText ?? "").slice(0, 300)}\n- Title: ${ad.title ?? ""}${linkUrl ? `\n- Product URL: ${linkUrl}` : ""}\n\nReturn ONLY a JSON object, no markdown:\n{"niche": "exact niche name from list", "confidence": "high|medium|low", "reason": "1 sentence"}`;

      // Phase 1: try with image (if available)
      if (ad.imageUrl) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const withImg: any[] = [
            { type: "text", text: textContent },
            { type: "image", source: { type: "url", url: ad.imageUrl } },
          ];
          const resp = await anthropic.messages.create({
            model: HAIKU_MODEL, max_tokens: 100,
            messages: [{ role: "user", content: withImg }],
          });
          const raw = (resp.content[0] as { text: string }).text.trim();
          return JSON.parse(raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()) as { niche: string; confidence: string };
        } catch {
          // Image URL likely expired → fall through to text-only
        }
      }

      // Phase 2: text-only fallback
      const resp = await anthropic.messages.create({
        model: HAIKU_MODEL, max_tokens: 100,
        messages: [{ role: "user", content: [{ type: "text", text: textContent }] }],
      });
      const raw = (resp.content[0] as { text: string }).text.trim();
      return JSON.parse(raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()) as { niche: string; confidence: string };
    }

    // Process in parallel batches of BATCH_SIZE
    const results: { id: string; oldNiche: string; newNiche: string; confidence: string }[] = [];
    let updated = 0;

    for (let i = 0; i < ads.length; i += BATCH_SIZE) {
      const chunk = ads.slice(i, i + BATCH_SIZE);

      const chunkResults = await Promise.all(chunk.map(async ad => {
        try {
          const parsed    = await classifyAd(ad);
          const validNiche = VALID_NICHES.has(parsed.niche) ? parsed.niche : null;

          if (validNiche && validNiche !== "Other" && parsed.confidence !== "low") {
            await prisma.ad.update({
              where: { adArchiveId: ad.adArchiveId },
              data:  { niche: validNiche },
            });
            return { id: ad.adArchiveId, oldNiche: "Other", newNiche: validNiche, confidence: parsed.confidence };
          }
          // Low confidence / unclassifiable: touch lastCheckedAt to bump updatedAt
          // → this ad moves to BACK of updatedAt ASC queue next run
          await prisma.ad.update({
            where: { adArchiveId: ad.adArchiveId },
            data:  { lastCheckedAt: new Date() },
          });
          return { id: ad.adArchiveId, oldNiche: "Other", newNiche: "Other", confidence: parsed.confidence ?? "low" };
        } catch {
          // Total failure: also touch to push to back
          await prisma.ad.update({
            where: { adArchiveId: ad.adArchiveId },
            data:  { lastCheckedAt: new Date() },
          }).catch(() => null);
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
