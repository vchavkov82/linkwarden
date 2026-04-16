-- AlterTable: Add ownerId column to Link
ALTER TABLE "Link" ADD COLUMN "ownerId" INTEGER;

-- Populate ownerId from Collection.ownerId for existing links
UPDATE "Link" l
SET "ownerId" = c."ownerId"
FROM "Collection" c
WHERE l."collectionId" = c."id";

-- AddForeignKey
ALTER TABLE "Link" ADD CONSTRAINT "Link_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Index on (url, ownerId) for fast duplicate lookups
CREATE INDEX "Link_url_ownerId_idx" ON "Link"("url", "ownerId");
