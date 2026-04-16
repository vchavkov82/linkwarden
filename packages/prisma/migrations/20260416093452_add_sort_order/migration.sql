-- AlterTable
ALTER TABLE "Collection" ADD COLUMN     "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "sortOrder" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Seed sortOrder for links: index * 1000 within each collection, ordered by createdAt ASC
UPDATE "Link" l
SET "sortOrder" = sub.rn * 1000
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "collectionId" ORDER BY "createdAt" ASC) AS rn
  FROM "Link"
) sub
WHERE l.id = sub.id;

-- Seed sortOrder for collections: index * 1000 within each parent group, ordered by createdAt ASC
UPDATE "Collection" c
SET "sortOrder" = sub.rn * 1000
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY "parentId" ORDER BY "createdAt" ASC) AS rn
  FROM "Collection"
) sub
WHERE c.id = sub.id;
