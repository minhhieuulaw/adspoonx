import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/cron/shop-snapshot — take daily snapshot of all shops
// Secured with WORKFLOW_API_KEY (same as scraper webhook)

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!apiKey || apiKey !== process.env.WORKFLOW_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Insert snapshot for each shop with current activeAds/totalAds
    const result = await prisma.$executeRawUnsafe(`
      INSERT INTO "ShopSnapshot" ("id", "pageId", "date", "activeAds", "totalAds")
      SELECT gen_random_uuid()::text, "pageId", CURRENT_DATE, "activeAds", "totalAds"
      FROM "Shop"
      WHERE "activeAds" > 0
      ON CONFLICT ("pageId", "date") DO UPDATE SET
        "activeAds" = EXCLUDED."activeAds",
        "totalAds" = EXCLUDED."totalAds"
    `);

    return NextResponse.json({ ok: true, upserted: result });
  } catch (e) {
    console.error("Shop snapshot error:", e);
    return NextResponse.json({ error: "Snapshot failed" }, { status: 500 });
  }
}
