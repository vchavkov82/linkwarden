-- Step 1: Normalize http→https URLs before dedup
UPDATE "Link" SET url = regexp_replace(url, '^http://', 'https://')
WHERE url LIKE 'http://%' AND url IS NOT NULL;

-- Step 2: Deduplicate links by (collectionId, url) keeping oldest
DELETE FROM "Link" WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY "collectionId", url ORDER BY "createdAt" ASC, id ASC
    ) AS rn FROM "Link" WHERE url IS NOT NULL
  ) t WHERE rn > 1
);

-- Step 3: For duplicate sub-collections (same name, ownerId, parentId),
-- deduplicate conflicting links after merge and reassign the survivors to the keeper (lowest id)
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
),
candidates AS (
  SELECT
    l.id,
    d.keeper_id,
    l.url,
    l."createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY d.keeper_id, l.url
      ORDER BY l."createdAt" ASC, l.id ASC
    ) AS rn
  FROM "Link" l
  JOIN dupes d ON l."collectionId" = d.dupe_id
  WHERE l.url IS NOT NULL
),
conflicting_existing AS (
  SELECT c.id
  FROM candidates c
  JOIN "Link" keeper_link
    ON keeper_link."collectionId" = c.keeper_id
   AND keeper_link.url = c.url
),
losing_dupe_links AS (
  SELECT id FROM candidates WHERE rn > 1
  UNION
  SELECT id FROM conflicting_existing
)
DELETE FROM "Link" WHERE id IN (SELECT id FROM losing_dupe_links);

WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
UPDATE "Link" SET "collectionId" = d.keeper_id
FROM dupes d WHERE "Link"."collectionId" = d.dupe_id;

-- Step 4: Reassign child collections from duplicates to keeper
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
UPDATE "Collection" SET "parentId" = d.keeper_id
FROM dupes d WHERE "Collection"."parentId" = d.dupe_id;

-- Step 5: Merge collection memberships from duplicates into keeper
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
INSERT INTO "UsersAndCollections" (
  "userId", "collectionId", "canCreate", "canUpdate", "canDelete", "createdAt", "updatedAt"
)
SELECT
  uc."userId",
  d.keeper_id,
  bool_or(uc."canCreate"),
  bool_or(uc."canUpdate"),
  bool_or(uc."canDelete"),
  min(uc."createdAt"),
  max(uc."updatedAt")
FROM "UsersAndCollections" uc
JOIN dupes d ON uc."collectionId" = d.dupe_id
GROUP BY uc."userId", d.keeper_id
ON CONFLICT ("userId", "collectionId") DO UPDATE SET
  "canCreate" = "UsersAndCollections"."canCreate" OR EXCLUDED."canCreate",
  "canUpdate" = "UsersAndCollections"."canUpdate" OR EXCLUDED."canUpdate",
  "canDelete" = "UsersAndCollections"."canDelete" OR EXCLUDED."canDelete",
  "updatedAt" = GREATEST("UsersAndCollections"."updatedAt", EXCLUDED."updatedAt");

-- Step 6: Reassign RSS subscriptions from duplicates to keeper
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
UPDATE "RssSubscription" SET "collectionId" = d.keeper_id
FROM dupes d WHERE "RssSubscription"."collectionId" = d.dupe_id;

-- Step 7: Reassign dashboard sections from duplicates to keeper without violating uniqueness
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
DELETE FROM "DashboardSection" ds
USING dupes d, "DashboardSection" keeper
WHERE ds."collectionId" = d.dupe_id
  AND keeper."userId" = ds."userId"
  AND keeper."collectionId" = d.keeper_id;

WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
UPDATE "DashboardSection" SET "collectionId" = d.keeper_id
FROM dupes d WHERE "DashboardSection"."collectionId" = d.dupe_id;

-- Step 8: Delete duplicate sub-collections (now empty)
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
)
DELETE FROM "Collection" c
USING keepers k
WHERE c.name = k.name AND c."ownerId" = k."ownerId" AND c."parentId" = k."parentId"
  AND c."parentId" IS NOT NULL AND c.id != k.id;

-- Step 9: Delete stale membership rows for removed duplicate collections
WITH keepers AS (
  SELECT DISTINCT ON (name, "ownerId", "parentId") id, name, "ownerId", "parentId"
  FROM "Collection"
  WHERE "parentId" IS NOT NULL
  ORDER BY name, "ownerId", "parentId", id ASC
),
dupes AS (
  SELECT c.id AS dupe_id, k.id AS keeper_id
  FROM "Collection" c
  JOIN keepers k ON k.name = c.name AND k."ownerId" = c."ownerId" AND k."parentId" = c."parentId"
  WHERE c."parentId" IS NOT NULL AND c.id != k.id
)
DELETE FROM "UsersAndCollections" uc
USING dupes d
WHERE uc."collectionId" = d.dupe_id;

-- Step 10: Add sub-collection unique constraint
CREATE UNIQUE INDEX "Collection_name_ownerId_parentId_key"
ON "Collection" ("name", "ownerId", "parentId")
WHERE "parentId" IS NOT NULL;
