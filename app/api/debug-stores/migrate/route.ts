import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const steps: Array<{ name: string; status: string }> = [];

  const run = async (name: string, sql: string) => {
    try {
      await prisma.$executeRawUnsafe(sql);
      steps.push({ name, status: "OK" });
    } catch (e) {
      steps.push({ name, status: String(e) });
    }
  };

  await run("Create Shop table", `
    CREATE TABLE IF NOT EXISTS "Shop" (
      id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "pageId" TEXT NOT NULL,
      "pageName" TEXT NOT NULL,
      "profilePicture" TEXT,
      website TEXT,
      platforms TEXT[] DEFAULT '{}',
      countries TEXT[] DEFAULT '{}',
      "totalAds" INTEGER NOT NULL DEFAULT 0,
      "activeAds" INTEGER NOT NULL DEFAULT 0,
      "pausedAds" INTEGER NOT NULL DEFAULT 0,
      "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastAdSeenAt" TIMESTAMP(3),
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Shop_pkey" PRIMARY KEY (id),
      CONSTRAINT "Shop_pageId_key" UNIQUE ("pageId")
    )
  `);

  await run("Shop indexes", `
    CREATE INDEX IF NOT EXISTS "Shop_pageName_idx" ON "Shop"("pageName");
    CREATE INDEX IF NOT EXISTS "Shop_activeAds_idx" ON "Shop"("activeAds" DESC);
    CREATE INDEX IF NOT EXISTS "Shop_lastAdSeenAt_idx" ON "Shop"("lastAdSeenAt")
  `);

  await run("Ad new columns", `
    ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
    ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "ctaType" TEXT;
    ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
    ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "lastCheckedAt" TIMESTAMP(3);
    ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "checkCount" INTEGER NOT NULL DEFAULT 0
  `);

  await run("Ad new indexes", `
    CREATE INDEX IF NOT EXISTS "Ad_isActive_lastCheckedAt_idx" ON "Ad"("isActive", "lastCheckedAt");
    CREATE INDEX IF NOT EXISTS "Ad_pageId_idx" ON "Ad"("pageId")
  `);

  await run("Populate Shop from Ads", `
    INSERT INTO "Shop" (id, "pageId", "pageName", platforms, countries,
      "totalAds", "activeAds", "pausedAds", "firstSeenAt", "lastAdSeenAt", "updatedAt")
    SELECT
      gen_random_uuid()::text, "pageId", MAX("pageName"), '{}',
      array_agg(DISTINCT country),
      COUNT(*),
      COUNT(*) FILTER (WHERE "isActive" = true),
      COUNT(*) FILTER (WHERE "isActive" = false),
      MIN("scrapedAt"), MAX("scrapedAt"), CURRENT_TIMESTAMP
    FROM "Ad"
    WHERE "pageId" IS NOT NULL AND "pageId" != ''
    GROUP BY "pageId"
    ON CONFLICT ("pageId") DO NOTHING
  `);

  await run("Backfill lastCheckedAt", `
    UPDATE "Ad" SET "lastCheckedAt" = "scrapedAt" WHERE "lastCheckedAt" IS NULL
  `);

  // Verify
  let shopCount = 0;
  try {
    const cnt = await prisma.$queryRawUnsafe<[{ count: bigint }]>(
      `SELECT COUNT(*) as count FROM "Shop"`
    );
    shopCount = Number(cnt[0]?.count ?? 0);
  } catch (_) {}

  return NextResponse.json({ steps, shopCount });
}
