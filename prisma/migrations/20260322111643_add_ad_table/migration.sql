-- CreateTable
CREATE TABLE "Ad" (
    "id" TEXT NOT NULL,
    "adArchiveId" TEXT NOT NULL,
    "pageId" TEXT,
    "pageName" TEXT,
    "bodyText" TEXT,
    "title" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "adLibraryUrl" TEXT,
    "platforms" TEXT[],
    "country" TEXT NOT NULL DEFAULT 'US',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "rawData" JSONB NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ad_adArchiveId_key" ON "Ad"("adArchiveId");

-- CreateIndex
CREATE INDEX "Ad_country_isActive_idx" ON "Ad"("country", "isActive");

-- CreateIndex
CREATE INDEX "Ad_pageName_idx" ON "Ad"("pageName");

-- CreateIndex
CREATE INDEX "Ad_scrapedAt_idx" ON "Ad"("scrapedAt");
