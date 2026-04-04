-- Migration: cache media URLs on Ad + reconcile fb-scraper drift
-- Fully idempotent: safe to re-run on any environment.

-- ── 1. Cached media fields on Ad (populated by the scraper R2 pipeline) ─────
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "pageProfilePictureUrl" TEXT;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "videoUrlWeb"           TEXT;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "thumbnailR2Url"        TEXT;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "videoBytes"            INTEGER;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "videoDurationSec"      INTEGER;

-- ── 2. fb-scraper numeric spend fields (EU data from Graph API) ─────────────
-- These columns exist in production (added manually via fb-scraper/migrate.sql)
-- but were never in prisma/schema.prisma — add with IF NOT EXISTS so both fresh
-- and legacy databases converge.
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "spendLower" DOUBLE PRECISION;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "spendUpper" DOUBLE PRECISION;
ALTER TABLE "Ad" ADD COLUMN IF NOT EXISTS "currency"   TEXT;

-- ── 3. Opportunistic backfill of pageProfilePictureUrl from legacy rawData ──
-- Apify / HTML scraper ads stored the avatar under rawData.snapshot — lift it
-- into the dedicated column so the API doesn't need a runtime extractor.
UPDATE "Ad"
   SET "pageProfilePictureUrl" = ("rawData" -> 'snapshot' ->> 'page_profile_picture_url')
 WHERE "pageProfilePictureUrl" IS NULL
   AND "rawData" -> 'snapshot' ->> 'page_profile_picture_url' IS NOT NULL;

-- ── 4. KeywordPerformance table (scraper analytics) ─────────────────────────
-- Mirror of fb-scraper/migrate_keyword_perf.sql so `prisma migrate deploy`
-- converges the schema on fresh databases.
CREATE TABLE IF NOT EXISTS "KeywordPerformance" (
    id           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    keyword      TEXT NOT NULL,
    country      TEXT NOT NULL,
    date         DATE NOT NULL DEFAULT CURRENT_DATE,
    total_found  INTEGER NOT NULL DEFAULT 0,
    new_unique   INTEGER NOT NULL DEFAULT 0,
    quality_ads  INTEGER NOT NULL DEFAULT 0,
    run_count    INTEGER NOT NULL DEFAULT 0,
    avg_pages    DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KeywordPerformance_pkey" PRIMARY KEY (id)
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'KeywordPerformance_unique'
    ) THEN
        ALTER TABLE "KeywordPerformance"
          ADD CONSTRAINT "KeywordPerformance_unique"
          UNIQUE (keyword, country, date);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS "KeywordPerformance_date_idx"       ON "KeywordPerformance"(date);
CREATE INDEX IF NOT EXISTS "KeywordPerformance_new_unique_idx" ON "KeywordPerformance"(new_unique DESC);
CREATE INDEX IF NOT EXISTS "KeywordPerformance_keyword_idx"    ON "KeywordPerformance"(keyword, country);
