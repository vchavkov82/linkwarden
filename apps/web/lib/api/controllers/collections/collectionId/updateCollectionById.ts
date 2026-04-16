import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";
import {
  UpdateCollectionSchema,
  UpdateCollectionSchemaType,
} from "@linkwarden/lib/schemaValidation";
import { withRetry } from "@linkwarden/lib/withRetry";

export default async function updateCollection(
  userId: number,
  collectionId: number,
  body: UpdateCollectionSchemaType
) {
  if (!collectionId)
    return { response: "Please choose a valid collection.", status: 401 };

  const dataValidation = UpdateCollectionSchema.safeParse(body);

  if (!dataValidation.success) {
    return {
      response: `Error: ${
        dataValidation.error.issues[0].message
      } [${dataValidation.error.issues[0].path.join(", ")}]`,
      status: 400,
    };
  }

  const data = dataValidation.data;

  const collectionIsAccessible = await getPermission({
    userId,
    collectionId,
  });

  if (!(collectionIsAccessible?.ownerId === userId))
    return { response: "Collection is not accessible.", status: 401 };

  const getDescendantIds = async (
    currentCollectionId: number
  ): Promise<number[]> => {
    const children = await prisma.collection.findMany({
      where: { parentId: currentCollectionId },
      select: { id: true },
    });

    const descendantIds = [];

    for (const child of children) {
      descendantIds.push(child.id);
      descendantIds.push(...(await getDescendantIds(child.id)));
    }

    return descendantIds;
  };

  if (data.parentId) {
    if (data.parentId !== "root") {
      const findParentCollection = await prisma.collection.findUnique({
        where: {
          id: data.parentId,
        },
        select: {
          ownerId: true,
          parentId: true,
        },
      });

      if (
        findParentCollection?.ownerId !== userId ||
        typeof data.parentId !== "number"
      )
        return {
          response: "You are not authorized to create a sub-collection here.",
          status: 403,
        };

      const descendantIds = await getDescendantIds(collectionId);
      if (data.parentId === collectionId || descendantIds.includes(data.parentId))
        return {
          response: "A collection cannot be moved into itself or its descendants.",
          status: 400,
        };
    }
  }

  const uniqueMembers = data.members.filter(
    (e, i, a) =>
      a.findIndex((el) => el.userId === e.userId) === i &&
      e.userId !== collectionIsAccessible.ownerId
  );

  const descendantIdsToPropagate =
    data.propagateToSubcollections === true
      ? await getDescendantIds(collectionId)
      : [];

  const updatedCollection = await withRetry(() =>
    prisma.$transaction(
      async (tx) => {
        await tx.usersAndCollections.deleteMany({
          where: {
            collectionId,
          },
        });

        if (descendantIdsToPropagate.length > 0) {
          for (const descendantId of descendantIdsToPropagate) {
            for (const member of uniqueMembers) {
              await tx.usersAndCollections.upsert({
                where: {
                  userId_collectionId: {
                    userId: member.userId,
                    collectionId: descendantId,
                  },
                },
                update: {
                  canCreate: member.canCreate,
                  canUpdate: member.canUpdate,
                  canDelete: member.canDelete,
                },
                create: {
                  userId: member.userId,
                  collectionId: descendantId,
                  canCreate: member.canCreate,
                  canUpdate: member.canUpdate,
                  canDelete: member.canDelete,
                },
              });
            }
          }
        }

        const newParentId =
          data.parentId && data.parentId !== "root" ? data.parentId : null;

        // Compute sortOrder for the new position (append at end of new parent's children)
        const sortOrderForNewParent = await (async () => {
          const siblings = await tx.collection.findMany({
            where: { parentId: newParentId, NOT: { id: collectionId } },
            select: { sortOrder: true },
            orderBy: { sortOrder: "desc" },
            take: 1,
          });
          return siblings.length > 0 ? siblings[0].sortOrder + 1000 : 1000;
        })();

        return tx.collection.update({
          where: {
            id: collectionId,
          },
          data: {
            name: data.name.trim(),
            description: data.description,
            color: data.color,
            icon: data.icon,
            iconWeight: data.iconWeight,
            isPublic: data.isPublic,
            sortOrder: data.parentId !== undefined ? sortOrderForNewParent : undefined,
            parent:
              data.parentId && data.parentId !== "root"
                ? {
                    connect: {
                      id: data.parentId,
                    },
                  }
                : data.parentId === "root"
                  ? {
                      disconnect: true,
                    }
                  : undefined,
            members: {
              create: uniqueMembers.map((e) => ({
                user: { connect: { id: e.userId } },
                canCreate: e.canCreate,
                canUpdate: e.canUpdate,
                canDelete: e.canDelete,
              })),
            },
          },
          include: {
            _count: {
              select: { links: true },
            },
            links: {
              select: {
                id: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    image: true,
                    username: true,
                    name: true,
                    id: true,
                  },
                },
              },
            },
          },
        });
      },
      { isolationLevel: "Serializable" }
    )
  );

  const { links, ...dataResponse } = updatedCollection;

  const linkIds = links.map((link) => link.id);

  await prisma.link.updateMany({
    where: {
      id: {
        in: linkIds,
      },
    },
    data: {
      indexVersion: null,
    },
  });

  return { response: dataResponse, status: 200 };
}
