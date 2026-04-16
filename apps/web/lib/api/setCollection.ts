import { prisma } from "@linkwarden/prisma";
import getPermission from "./getPermission";
import { UsersAndCollections } from "@linkwarden/prisma/client";

type SetCollectionInput = {
  userId: number;
  collectionId?: number;
  collectionName?: string;
};

const setCollection = async ({
  userId,
  collectionId,
  collectionName,
}: SetCollectionInput) => {
  if (collectionId) {
    // Check if the collection exists
    const existingCollection = await prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!existingCollection) return null;

    // Check if the user has access to the collection
    const collectionIsAccessible = await getPermission({
      userId,
      collectionId: existingCollection.id,
    });

    const memberHasAccess = collectionIsAccessible?.members.some(
      (e: UsersAndCollections) => e.userId === userId && e.canCreate
    );

    if (!(collectionIsAccessible?.ownerId === userId || memberHasAccess)) {
      return null;
    }

    return existingCollection;
  }

  if (collectionName) {
    // If the collection name is "Unorganized", find or create it
    if (collectionName === "Unorganized") {
      const firstTopLevelUnorganizedCollection =
        await prisma.collection.findFirst({
          where: {
            name: "Unorganized",
            ownerId: userId,
            parentId: null,
          },
        });

      if (firstTopLevelUnorganizedCollection)
        return firstTopLevelUnorganizedCollection;
    }

    // Create a new collection with the given name
    try {
      const newCollection = await prisma.collection.create({
        data: {
          name: collectionName.trim(),
          ownerId: userId,
          createdById: userId,
        },
      });

      // Update the user's collection order atomically
      await prisma.$executeRaw`
        UPDATE "User"
        SET "collectionOrder" = array_append("collectionOrder", ${newCollection.id}::int)
        WHERE id = ${userId}
        AND NOT (${newCollection.id}::int = ANY("collectionOrder"))
      `;

      return newCollection;
    } catch (error: any) {
      if (error?.code === "P2002") {
        // Another request created it first — just find and return it
        const existing = await prisma.collection.findFirst({
          where: { name: collectionName.trim(), ownerId: userId, parentId: null },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  // Default behavior for "Unorganized" collection if neither collectionId nor collectionName is provided
  const firstTopLevelUnorganizedCollection = await prisma.collection.findFirst({
    where: {
      name: "Unorganized",
      ownerId: userId,
      parentId: null,
    },
  });

  if (firstTopLevelUnorganizedCollection) {
    return firstTopLevelUnorganizedCollection;
  }

  try {
    const newCollection = await prisma.collection.create({
      data: {
        name: "Unorganized",
        ownerId: userId,
        parentId: null,
        createdById: userId,
      },
    });

    await prisma.$executeRaw`
      UPDATE "User"
      SET "collectionOrder" = array_append("collectionOrder", ${newCollection.id}::int)
      WHERE id = ${userId}
      AND NOT (${newCollection.id}::int = ANY("collectionOrder"))
    `;

    return newCollection;
  } catch (error: any) {
    if (error?.code === "P2002") {
      // Another request created it first — just find and return it
      const existing = await prisma.collection.findFirst({
        where: { name: "Unorganized", ownerId: userId, parentId: null },
      });
      if (existing) return existing;
    }
    throw error;
  }
};

export default setCollection;
