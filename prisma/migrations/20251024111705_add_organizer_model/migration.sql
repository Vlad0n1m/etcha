/*
  Warnings:

  - You are about to drop the column `company` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `organizerAvatar` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `organizerDescription` on the `events` table. All the data in the column will be lost.
  - You are about to drop the column `organizerName` on the `events` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "events" DROP COLUMN "company",
DROP COLUMN "organizerAvatar",
DROP COLUMN "organizerDescription",
DROP COLUMN "organizerName",
ADD COLUMN     "organizerId" TEXT;

-- CreateTable
CREATE TABLE "organizers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "description" TEXT,
    "avatar" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizers_userId_key" ON "organizers"("userId");

-- AddForeignKey
ALTER TABLE "organizers" ADD CONSTRAINT "organizers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "organizers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
