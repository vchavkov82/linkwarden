import { prisma } from "@linkwarden/prisma";
import { UsersAndCollections } from "@linkwarden/prisma/client";
import { removeFiles } from "@linkwarden/filesystem";
import { meiliClient } from "@linkwarden/lib/meilisearchClient";

export default async function deleteLinksById(
  userId: number,
  linkIds: number[]
) {
  if (!linkIds || linkIds.length === 0) {
    return { response: "Please choose valid links.", status: 401 };
  }

  const links = await prisma.link.findMany({
    where: { id: { in: linkIds } },
    select: {
      id: true,
      collectionId: true,
      collection: {
        select: {
          id: true,
          ownerId: true,
          members: true,
        },
      },
    },
  });

  for (const link of links) {
    const memberHasAccess = link.collection.members.some(
      (e: UsersAndCollections) => e.userId === userId && e.canDelete
    );
    if (!(link.collection.ownerId === userId || memberHasAccess)) {
      return { response: "Collection is not accessible.", status: 401 };
    }
  }

  // Fetch URLs for tombstones before deleting
  const linksForTombstones = await prisma.link.findMany({
    where: { id: { in: linkIds } },
    select: { id: true, url: true, collectionId: true },
  });

  const deletedLinks = await prisma.link.deleteMany({
    where: { id: { in: linkIds } },
  });

  if (linksForTombstones.length > 0) {
    await prisma.syncTombstone.createMany({
      data: linksForTombstones.map((link) => ({
        entityType: "link",
        entityId: link.id,
        collectionId: link.collectionId,
        url: link.url,
        userId,
      })),
    });
  }

  await Promise.allSettled(
    links.map((link) => removeFiles(link.id, link.collectionId))
  );

  await meiliClient?.index("links").deleteDocuments(linkIds);

  return { response: deletedLinks, status: 200 };
}
