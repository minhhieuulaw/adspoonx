-- Migration: add AiAnalysis table for Claude AI result caching

CREATE TABLE IF NOT EXISTS "AiAnalysis" (
    "id"         TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId"   TEXT NOT NULL,
    "model"      TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
    "analysis"   JSONB NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiAnalysis_targetType_targetId_key"
    ON "AiAnalysis"("targetType", "targetId");

CREATE INDEX IF NOT EXISTS "AiAnalysis_expiresAt_idx"
    ON "AiAnalysis"("expiresAt");
