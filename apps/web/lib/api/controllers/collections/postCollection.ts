import { prisma } from "@linkwarden/prisma";
import { createFolder } from "@linkwarden/filesystem";
import {
  PostCollectionSchema,
  PostCollectionSchemaType,
} from "@linkwarden/lib/schemaValidation";
import getPermission from "@/lib/api/getPermission";
import { UsersAndCollections } from "@linkwarden/prisma/client";
import getCollectionRootOwnerAndMembers from "../../getCollectionRootOwnerAndMembers";

export default async function postCollection(
  body: PostCollectionSchemaType,
  userId: number
) {
  const dataValidation = PostCollectionSchema.safeParse(body);

  if (!dataValidation.success) {
    return {
      response: `Error: ${
        dataValidation.error.issues[0].message
      } [${dataValidation.error.issues[0].path.join(", ")}]`,
      status: 400,
    };
  }

  const collection = dataValidation.data;

  let rootOwnerId = userId;
  let dedupedUsers: {
    userId: number;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
  }[] = [];

  if (collection.parentId) {
    if (typeof collection.parentId !== "number") {
      return {
        response: "Invalid parentId.",
        status: 400,
      };
    }

    const permissionCheck = await getPermission({
      userId,
      collectionId: collection.parentId,
    });

    const memberHasAccess = permissionCheck?.members.some(
      (e: UsersAndCollections) =>
        e.userId === userId && e.canCreate && e.canUpdate && e.canDelete
    );

    if (!memberHasAccess && permissionCheck?.ownerId !== userId) {
      return {
        response: "You are not authorized to create a sub-collection here.",
        status: 403,
      };
    }

    const result = await getCollectionRootOwnerAndMembers(collection.parentId);

    if (!result.rootOwnerId) {
      return {
        response: "Parent collection not found.",
        status: 404,
      };
    }

    rootOwnerId = result.rootOwnerId;
    dedupedUsers = result.members;

    const exists = dedupedUsers.some((u) => u.userId === userId);
    if (!exists) {
      dedupedUsers.push({
        userId,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
      });
    }
  }

  let newCollection;
  try {
    newCollection = await prisma.collection.create({
      data: {
        name: collection.name.trim(),
        description: collection.description,
        color: collection.color,
        icon: collection.icon,
        iconWeight: collection.iconWeight,
        owner: { connect: { id: rootOwnerId } },
        createdBy: { connect: { id: userId } },
        members:
          dedupedUsers.length > 0
            ? {
                create: dedupedUsers
                  .filter((member) => member.userId !== rootOwnerId)
                  .map((member) => ({
                    userId: member.userId,
                    canCreate: member.canCreate,
                    canUpdate: member.canUpdate,
                    canDelete: member.canDelete,
                  })),
              }
            : userId !== rootOwnerId
              ? {
                  create: [
                    {
                      userId,
                      canCreate: true,
                      canUpdate: true,
                      canDelete: true,
                    },
                  ],
                }
              : undefined,
        parent: collection.parentId
          ? { connect: { id: collection.parentId } }
          : undefined,
      },
      include: {
        _count: { select: { links: true } },
        members: {
          include: {
            user: {
              select: { username: true, name: true },
            },
          },
        },
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      const existing = await prisma.collection.findFirst({
        where: {
          name: collection.name.trim(),
          ownerId: rootOwnerId,
          parentId: collection.parentId ?? null,
        },
        include: {
          _count: { select: { links: true } },
          members: {
            include: {
              user: {
                select: { username: true, name: true },
              },
            },
          },
        },
      });
      if (existing) return { response: existing, status: 200 };
    }
    throw error;
  }

  await prisma.$executeRaw`
    UPDATE "User"
    SET "collectionOrder" = array_append("collectionOrder", ${newCollection.id}::int)
    WHERE id = ${userId}
    AND NOT (${newCollection.id}::int = ANY("collectionOrder"))
  `;

  createFolder({ filePath: `archives/${newCollection.id}` });
  createFolder({ filePath: `archives/preview/${newCollection.id}` });

  return { response: newCollection, status: 200 };
}
