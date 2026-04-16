import { prisma } from "@linkwarden/prisma";

export default async function getSyncStatus(userId: number) {
  const collections = await prisma.collection.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: {
      id: true,
      name: true,
      updatedAt: true,
      _count: { select: { links: true } },
    },
  });

  const totalLinks = collections.reduce((sum, c) => sum + c._count.links, 0);

  return {
    response: {
      serverTime: new Date().toISOString(),
      totalLinks,
      collections: collections.map((c) => ({
        id: c.id,
        name: c.name,
        linkCount: c._count.links,
        latestUpdate: c.updatedAt.toISOString(),
      })),
    },
    status: 200,
  };
}
