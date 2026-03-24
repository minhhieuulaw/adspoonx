-- AdSpoonX: PostgreSQL setup script for Hetzner migration
-- Run after Prisma schema push: DATABASE_URL=... npx prisma db push

-- Enable pg_trgm for fast ILIKE / regex search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- GIN indexes for text search (auto-accelerates ILIKE and ~* operators)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_pagename_trgm
  ON "Ad" USING gin ("pageName" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_bodytext_trgm
  ON "Ad" USING gin ("bodyText" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_title_trgm
  ON "Ad" USING gin ("title" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_description_trgm
  ON "Ad" USING gin ("description" gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_niche_trgm
  ON "Ad" USING gin ("niche" gin_trgm_ops);

-- Partial index for video detection (used in media filter)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ad_has_video
  ON "Ad" (("rawData"->>'videoUrl'))
  WHERE ("rawData"->>'videoUrl') IS NOT NULL;

-- Verify indexes
SELECT indexname, pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'Ad'
ORDER BY indexname;
