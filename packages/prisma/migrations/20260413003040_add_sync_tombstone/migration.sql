-- CreateTable
CREATE TABLE "SyncTombstone" (
    "id" SERIAL NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "collectionId" INTEGER,
    "url" TEXT,
    "userId" INTEGER NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncTombstone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SyncTombstone_userId_deletedAt_idx" ON "SyncTombstone"("userId", "deletedAt");

-- CreateIndex
CREATE INDEX "SyncTombstone_collectionId_deletedAt_idx" ON "SyncTombstone"("collectionId", "deletedAt");
