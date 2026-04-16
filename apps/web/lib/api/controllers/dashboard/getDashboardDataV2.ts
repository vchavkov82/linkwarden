import { prisma } from "@linkwarden/prisma";
import { Order } from "@linkwarden/types/global";

export default async function getDashboardData(userId: number) {
  const order: Order = { id: "desc" };
  const accessibleTagsWhere = {
    OR: [
      { ownerId: userId },
      {
        links: {
          some: {
            collection: {
              members: {
                some: { userId },
              },
            },
          },
        },
      },
    ],
  };

  const [dashboardSections, numberOfPinnedLinks, numberOfTags] =
    await Promise.all([
      prisma.dashboardSection.findMany({ where: { userId } }),
      prisma.link.count({
        where: {
          AND: [
            {
              collection: {
                OR: [{ ownerId: userId }, { members: { some: { userId } } }],
              },
            },
            { pinnedBy: { some: { id: userId } } },
          ],
        },
      }),
      prisma.tag.count({
        where: accessibleTagsWhere,
      }),
    ]);

  const viewPinned = dashboardSections.some(
    (section) => section.type === "PINNED_LINKS"
  );
  const viewRecent = dashboardSections.some(
    (section) => section.type === "RECENT_LINKS"
  );
  const collectionSections = dashboardSections.filter(
    (section) => section.type === "COLLECTION"
  );

  if (!viewRecent && !viewPinned && collectionSections.length === 0) {
    return {
      data: { links: [], numberOfPinnedLinks, numberOfTags },
      message: "Dashboard data fetched successfully.",
      statusCode: 200,
      success: true,
    };
  }

  // Prepare promises for pinned and recent links
  const pinnedLinksPromise = viewPinned
    ? prisma.link.findMany({
        take: 16,
        where: {
          AND: [
            {
              collection: {
                OR: [{ ownerId: userId }, { members: { some: { userId } } }],
              },
            },
            { pinnedBy: { some: { id: userId } } },
          ],
        },
        omit: { textContent: true },
        include: {
          tags: true,
          collection: true,
          pinnedBy: {
            where: { id: userId },
            select: { id: true },
          },
        },
        orderBy: order,
      })
    : Promise.resolve([] as any[]);

  const recentLinksPromise = viewRecent
    ? prisma.link.findMany({
        take: 16,
        where: {
          collection: {
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
        },
        omit: { textContent: true },
        include: {
          tags: true,
          collection: true,
          pinnedBy: {
            where: { id: userId },
            select: { id: true },
          },
        },
        orderBy: order,
      })
    : Promise.resolve([] as any[]);

  const collectionIds = collectionSections
    .map((section) => section.collectionId)
    .filter((id): id is number => id != null);

  // Get all descendant collection IDs using a single recursive CTE query
  const getAllDescendantIds = async (
    parentColId: number
  ): Promise<number[]> => {
    const rows = await prisma.$queryRaw<{ id: number }[]>`
      WITH RECURSIVE descendants AS (
        SELECT id FROM "Collection" WHERE id = ${parentColId}
        UNION ALL
        SELECT c.id FROM "Collection" c
        INNER JOIN descendants d ON c."parentId" = d.id
      )
      SELECT id FROM descendants
    `;
    return rows.map((r) => r.id);
  };

const collectionPromises = collectionIds.map(async (colId) => {
  // Get all descendant collection IDs including the parent
  const allCollectionIds = await getAllDescendantIds(colId);

  const links = await prisma.link.findMany({
    where: {
      AND: [
        {
          collection: {
            id: { in: allCollectionIds },
            OR: [{ ownerId: userId }, { members: { some: { userId } } }],
          },
        },
      ],
    },
    take: 16,
    omit: { textContent: true },
    include: {
      tags: true,
      collection: true,
      pinnedBy: {
        where: { id: userId },
        select: { id: true },
      },
    },
    orderBy: order,
  });

  return { colId, links };
});

  const [pinnedLinks, recentlyAddedLinks, ...collectionsResult] =
    await Promise.all([
      pinnedLinksPromise,
      recentLinksPromise,
      ...collectionPromises,
    ]);

  const collectionLinks: Record<number, any[]> = {};
  collectionsResult.forEach(({ colId, links }) => {
    collectionLinks[colId] = links;
  });

  const merged = [...recentlyAddedLinks, ...pinnedLinks].sort(
    (a, b) => new Date(b.id).getTime() - new Date(a.id).getTime()
  );
  const uniqueLinks = merged.filter(
    (link, idx, arr) => idx === arr.findIndex((l) => l.id === link.id)
  );

  return {
    data: {
      links: uniqueLinks,
      collectionLinks,
      numberOfPinnedLinks,
      numberOfTags,
    },
    message: "Dashboard data fetched successfully.",
    statusCode: 200,
    success: true,
  };
}
