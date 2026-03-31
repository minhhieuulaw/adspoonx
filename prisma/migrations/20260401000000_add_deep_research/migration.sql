-- Deep Research: keyword rankings + niche clusters

CREATE TABLE IF NOT EXISTS "ResearchKeyword" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "keyword" TEXT NOT NULL,
    "niche" TEXT,
    "source" TEXT NOT NULL DEFAULT 'seed',
    "adCount" INT NOT NULL DEFAULT 0,
    "activeAds" INT NOT NULL DEFAULT 0,
    "activeRatio" FLOAT NOT NULL DEFAULT 0,
    "avgDaysRunning" FLOAT NOT NULL DEFAULT 0,
    "geoCount" INT NOT NULL DEFAULT 0,
    "platformCount" INT NOT NULL DEFAULT 0,
    "avgAiScore" FLOAT NOT NULL DEFAULT 0,
    "newAds7d" INT NOT NULL DEFAULT 0,
    "growthRate" FLOAT NOT NULL DEFAULT 0,
    "demandScore" FLOAT NOT NULL DEFAULT 0,
    "growthScore" FLOAT NOT NULL DEFAULT 0,
    "stabilityScore" FLOAT NOT NULL DEFAULT 0,
    "geoScore" FLOAT NOT NULL DEFAULT 0,
    "qualityScore" FLOAT NOT NULL DEFAULT 0,
    "opportunityScore" FLOAT NOT NULL DEFAULT 0,
    "beginnerScore" FLOAT NOT NULL DEFAULT 0,
    "evergreenScore" FLOAT NOT NULL DEFAULT 0,
    "testNowScore" FLOAT NOT NULL DEFAULT 0,
    "signal" TEXT NOT NULL DEFAULT 'wait',
    "aiVerdict" TEXT,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResearchKeyword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ResearchKeyword_keyword_key" ON "ResearchKeyword"("keyword");
CREATE INDEX IF NOT EXISTS "ResearchKeyword_opportunityScore_idx" ON "ResearchKeyword"("opportunityScore" DESC);
CREATE INDEX IF NOT EXISTS "ResearchKeyword_niche_idx" ON "ResearchKeyword"("niche");

CREATE TABLE IF NOT EXISTS "NicheCluster" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "niche" TEXT NOT NULL,
    "keywordCount" INT NOT NULL DEFAULT 0,
    "avgOpportunity" FLOAT NOT NULL DEFAULT 0,
    "avgGrowth" FLOAT NOT NULL DEFAULT 0,
    "signal" TEXT NOT NULL DEFAULT 'wait',
    "beginnerSafe" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "aiHook" TEXT,
    "aiHeadline" TEXT,
    "aiPainPoint" TEXT,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NicheCluster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NicheCluster_niche_key" ON "NicheCluster"("niche");
