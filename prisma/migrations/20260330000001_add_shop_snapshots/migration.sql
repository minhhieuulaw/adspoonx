-- ShopSnapshot: daily snapshot of shop ad counts for sparkline charts
CREATE TABLE IF NOT EXISTS "ShopSnapshot" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "pageId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "activeAds" INT NOT NULL DEFAULT 0,
    "totalAds" INT NOT NULL DEFAULT 0,

    CONSTRAINT "ShopSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ShopSnapshot_pageId_date_key" ON "ShopSnapshot"("pageId", "date");
CREATE INDEX IF NOT EXISTS "ShopSnapshot_pageId_idx" ON "ShopSnapshot"("pageId");
