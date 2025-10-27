/*
  Warnings:

  - A unique constraint covering the columns `[collectionNftAddress]` on the table `events` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[candyMachineAddress]` on the table `events` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "events" ADD COLUMN     "candyMachineAddress" TEXT,
ADD COLUMN     "collectionNftAddress" TEXT,
ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "totalPrice" SET DATA TYPE DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "events_collectionNftAddress_key" ON "events"("collectionNftAddress");

-- CreateIndex
CREATE UNIQUE INDEX "events_candyMachineAddress_key" ON "events"("candyMachineAddress");
