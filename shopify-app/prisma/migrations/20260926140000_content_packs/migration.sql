-- CreateTable
CREATE TABLE "ContentPack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "model" TEXT,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "assetsJson" TEXT NOT NULL,
    "personaIdsJson" TEXT NOT NULL,
    "undoJson" TEXT,
    "resultJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" DATETIME,
    "revertedAt" DATETIME
);

-- CreateIndex
CREATE INDEX "ContentPack_shopId_status_idx" ON "ContentPack"("shopId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPack_shopId_eventId_key" ON "ContentPack"("shopId", "eventId");
