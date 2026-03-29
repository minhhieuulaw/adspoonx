-- AlterTable: Add performance fields to Ad table (memo23 actor)
ALTER TABLE "Ad" ADD COLUMN "reach" INTEGER;
ALTER TABLE "Ad" ADD COLUMN "spend" TEXT;
ALTER TABLE "Ad" ADD COLUMN "impressions" TEXT;
ALTER TABLE "Ad" ADD COLUMN "website" TEXT;
ALTER TABLE "Ad" ADD COLUMN "totalActiveTime" INTEGER;
ALTER TABLE "Ad" ADD COLUMN "dropshippingScore" INTEGER;
