/*
  Warnings:

  - Added the required column `internalWalletAddress` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletAddress" TEXT NOT NULL,
    "internalWalletAddress" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_users" ("createdAt", "id", "updatedAt", "walletAddress") SELECT "createdAt", "id", "updatedAt", "walletAddress" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_walletAddress_key" ON "users"("walletAddress");
CREATE UNIQUE INDEX "users_internalWalletAddress_key" ON "users"("internalWalletAddress");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
