-- DropIndex
DROP INDEX IF EXISTS "Link_url_ownerId_key";

-- DropIndex
DROP INDEX IF EXISTS "Link_ownerId_url_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Link_collectionId_url_key" ON "Link"("collectionId", "url");

-- CreateIndex
CREATE INDEX "Link_ownerId_url_idx" ON "Link"("ownerId", "url");
