import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";

type ReorderBody = {
  collectionId: number;
  orderedIds: number[];
};

export default async function reorderLinks(userId: number, body: ReorderBody) {
  const { collectionId, orderedIds } = body;

  if (
    typeof collectionId !== "number" ||
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    orderedIds.some((id) => typeof id !== "number")
  ) {
    return {
      response: "collectionId (number) and orderedIds (number[]) are required.",
      status: 400,
    };
  }

  const collection = await getPermission({ userId, collectionId });
  if (!collection) {
    return { response: "Collection not found or access denied.", status: 403 };
  }

  // Verify all orderedIds belong to this collection and are accessible to the user
  const links = await prisma.link.findMany({
    where: {
      id: { in: orderedIds },
      collectionId,
    },
    select: { id: true },
  });

  if (links.length !== orderedIds.length) {
    return {
      response: "One or more links not found in the specified collection.",
      status: 404,
    };
  }

  // Assign sortOrder = index * 1000 in a transaction
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.link.update({
        where: { id },
        data: { sortOrder: (index + 1) * 1000 },
      })
    )
  );

  return { response: "Links reordered.", status: 200 };
}
