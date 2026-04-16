import { prisma } from "@linkwarden/prisma";
import getPermission from "@/lib/api/getPermission";

export default async function normalizeLinksOrder(
  userId: number,
  body: { collectionId: number }
) {
  const { collectionId } = body;

  if (typeof collectionId !== "number") {
    return { response: "collectionId (number) is required.", status: 400 };
  }

  const collection = await getPermission({ userId, collectionId });
  if (!collection) {
    return { response: "Collection not found or access denied.", status: 403 };
  }

  const links = await prisma.link.findMany({
    where: { collectionId },
    orderBy: { sortOrder: "asc" },
    select: { id: true, sortOrder: true },
  });

  if (links.length === 0) {
    return { response: "No links to normalize.", status: 200 };
  }

  // Check if any adjacent gap is below the threshold
  const THRESHOLD = 1e-10;
  const needsNormalization = links.some((link, i) => {
    if (i === 0) return false;
    return Math.abs(link.sortOrder - links[i - 1].sortOrder) < THRESHOLD;
  });

  if (!needsNormalization) {
    return { response: "No normalization needed.", status: 200 };
  }

  await prisma.$transaction(
    links.map((link, index) =>
      prisma.link.update({
        where: { id: link.id },
        data: { sortOrder: (index + 1) * 1000 },
      })
    )
  );

  return { response: "Links order normalized.", status: 200 };
}
