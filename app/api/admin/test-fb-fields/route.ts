/**
 * GET /api/admin/test-fb-fields?token=YOUR_FB_TOKEN&country=US&limit=5
 *
 * Lấy N adArchiveId từ DB, gọi Facebook Ads Library API,
 * trả về raw JSON để kiểm tra field nào thật sự có data.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase());

const FB_API = "https://graph.facebook.com/v19.0/ads_archive";

const FIELDS = [
  "id",
  "page_name",
  "ad_creative_bodies",
  "ad_creative_link_url",
  "estimated_audience_size",
  "demographic_distribution",
  "delivery_by_region",
  "target_ages",
  "target_gender",
  "target_locations",
  "languages",
  "publisher_platforms",
  "ad_delivery_start_time",
].join(",");

export async function GET(req: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────────────
  const session = await auth();
  const email = session?.user?.email?.toLowerCase() ?? "";
  if (!session || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const token   = searchParams.get("token") ?? process.env.FB_ACCESS_TOKEN ?? "";
  const country = searchParams.get("country") ?? "US";
  const limit   = Math.min(parseInt(searchParams.get("limit") ?? "5"), 20);

  if (!token) {
    return NextResponse.json(
      { error: "No token. Pass ?token=YOUR_FB_TOKEN or set FB_ACCESS_TOKEN env var." },
      { status: 400 }
    );
  }

  // ── Get sample adArchiveIds from DB ─────────────────────────────────────────
  const ads = await prisma.ad.findMany({
    where:  { country },
    select: { adArchiveId: true, pageName: true },
    take:   limit,
    orderBy: { scrapedAt: "desc" },
  });

  if (ads.length === 0) {
    return NextResponse.json({ error: `No ads found for country=${country}` }, { status: 404 });
  }

  const ids = ads.map((a) => a.adArchiveId);

  // ── Call Facebook Ads Library API ────────────────────────────────────────────
  const url = new URL(FB_API);
  url.searchParams.set("ad_archive_ids",    JSON.stringify(ids));
  url.searchParams.set("ad_reached_countries", JSON.stringify([country]));
  url.searchParams.set("fields",            FIELDS);
  url.searchParams.set("limit",             String(limit));
  url.searchParams.set("access_token",      token);

  const fbRes  = await fetch(url.toString());
  const fbJson = await fbRes.json() as { data?: unknown[]; error?: unknown };

  // ── Summarise which fields are non-null ─────────────────────────────────────
  const fieldSummary: Record<string, { total: number; nonNull: number }> = {};
  if (Array.isArray(fbJson.data)) {
    for (const item of fbJson.data as Record<string, unknown>[]) {
      for (const [k, v] of Object.entries(item)) {
        if (!fieldSummary[k]) fieldSummary[k] = { total: 0, nonNull: 0 };
        fieldSummary[k].total++;
        if (v !== null && v !== undefined && v !== "" &&
            !(Array.isArray(v) && v.length === 0)) {
          fieldSummary[k].nonNull++;
        }
      }
    }
  }

  return NextResponse.json({
    queried: { ids, country, limit },
    fb_status: fbRes.status,
    field_summary: fieldSummary,   // ← xem cái này trước
    raw_data: fbJson.data ?? [],   // ← data thô để inspect
    fb_error: fbJson.error ?? null,
  }, { status: 200 });
}
