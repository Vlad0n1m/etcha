-- CreateTable
CREATE TABLE "listings" (
    "id" TEXT NOT NULL,
    "nftMintAddress" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "listingAddress" TEXT NOT NULL,
    "auctionHouseAddress" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "originalPrice" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "transactionHash" TEXT,
    "soldTo" TEXT,
    "soldAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "listings_nftMintAddress_key" ON "listings"("nftMintAddress");

-- CreateIndex
CREATE UNIQUE INDEX "listings_listingAddress_key" ON "listings"("listingAddress");

-- CreateIndex
CREATE INDEX "listings_eventId_status_idx" ON "listings"("eventId", "status");

-- CreateIndex
CREATE INDEX "listings_sellerId_status_idx" ON "listings"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "platform_configs_key_key" ON "platform_configs"("key");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
