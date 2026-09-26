-- CreateTable
CREATE TABLE "StorefrontAction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "cardKind" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "paramsJson" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "undoJson" TEXT,
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" DATETIME,
    "revertedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "StorefrontAction_shopId_status_idx" ON "StorefrontAction"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontAction_shopId_cardId_key" ON "StorefrontAction"("shopId", "cardId");
