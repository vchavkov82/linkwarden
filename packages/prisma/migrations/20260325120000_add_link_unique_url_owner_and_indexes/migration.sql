-- DropIndex (replaced by unique constraint)
DROP INDEX IF EXISTS "Link_url_ownerId_idx";

-- CreateIndex (unique constraint replaces the old non-unique index)
CREATE UNIQUE INDEX "Link_url_ownerId_key" ON "Link"("url", "ownerId");

-- CreateIndex
CREATE INDEX "Link_createdById_idx" ON "Link"("createdById");

-- CreateIndex
CREATE INDEX "Link_ownerId_idx" ON "Link"("ownerId");

-- CreateIndex
CREATE INDEX "Link_indexVersion_idx" ON "Link"("indexVersion");

-- CreateIndex
CREATE INDEX "Link_lastPreserved_idx" ON "Link"("lastPreserved");
