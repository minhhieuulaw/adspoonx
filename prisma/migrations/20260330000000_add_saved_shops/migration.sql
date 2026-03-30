-- SavedShop: users can bookmark shops
CREATE TABLE IF NOT EXISTS "SavedShop" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "shopPageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedShop_pkey" PRIMARY KEY ("id")
);

-- Unique constraint: one save per user per shop
CREATE UNIQUE INDEX IF NOT EXISTS "SavedShop_userId_shopPageId_key" ON "SavedShop"("userId", "shopPageId");

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS "SavedShop_userId_idx" ON "SavedShop"("userId");

-- Foreign key to User
ALTER TABLE "SavedShop" ADD CONSTRAINT "SavedShop_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
