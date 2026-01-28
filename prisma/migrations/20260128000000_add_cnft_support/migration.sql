-- AlterTable: Add cNFT fields to events
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "merkleTreeAddress" TEXT;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "merkleTreeDepth" INTEGER;
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "nftType" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable: Add cNFT fields to tickets
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "assetId" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "leafIndex" INTEGER;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "dataHash" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "creatorHash" TEXT;
ALTER TABLE "tickets" ADD COLUMN IF NOT EXISTS "nftType" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable: Add cNFT fields to listings
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "assetId" TEXT;
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "nftType" TEXT NOT NULL DEFAULT 'legacy';

-- AlterTable: Make auctionHouseAddress optional for cNFT listings
ALTER TABLE "listings" ALTER COLUMN "auctionHouseAddress" DROP NOT NULL;

-- CreateIndex: Unique constraint on merkleTreeAddress
CREATE UNIQUE INDEX IF NOT EXISTS "events_merkleTreeAddress_key" ON "events"("merkleTreeAddress");

-- CreateIndex: Unique constraint on assetId for tickets
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_assetId_key" ON "tickets"("assetId");

-- CreateIndex: Index for efficient cNFT listing queries
CREATE INDEX IF NOT EXISTS "listings_nftType_status_idx" ON "listings"("nftType", "status");
