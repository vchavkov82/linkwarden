-- CreateIndex (partial unique index for top-level collections)
-- Prevents duplicate top-level collections with the same name per user (e.g. "Unorganized").
-- Subcollections (parentId IS NOT NULL) are not constrained by this index.
CREATE UNIQUE INDEX "Collection_name_ownerId_parentId_null_key"
ON "Collection" ("name", "ownerId")
WHERE "parentId" IS NULL;
