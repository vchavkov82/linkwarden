import { prisma } from "@linkwarden/prisma";

interface SyncLinksQuery {
  since?: string;
  collectionId?: number;
}

export default async function getSyncLinks(
  userId: number,
  query: SyncLinksQuery
) {
  const sinceDate = query.since ? new Date(query.since) : undefined;

  const collectionFilter = query.collectionId
    ? { id: query.collectionId }
    : undefined;

  const links = await prisma.link.findMany({
    where: {
      ...(sinceDate ? { updatedAt: { gte: sinceDate } } : {}),
      ...(collectionFilter ? { collection: collectionFilter } : {}),
      collection: {
        ...collectionFilter,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
    },
    include: {
      tags: true,
      collection: true,
      pinnedBy: {
        where: { id: userId },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "asc" },
  });

  const tombstones = sinceDate
    ? await prisma.syncTombstone.findMany({
        where: {
          userId,
          entityType: "link",
          deletedAt: { gte: sinceDate },
          ...(query.collectionId
            ? { collectionId: query.collectionId }
            : {}),
        },
        orderBy: { deletedAt: "asc" },
      })
    : [];

  return {
    response: {
      links,
      tombstones: tombstones.map((t) => ({
        entityId: t.entityId,
        collectionId: t.collectionId,
        url: t.url,
        deletedAt: t.deletedAt.toISOString(),
      })),
    },
    status: 200,
  };
}
