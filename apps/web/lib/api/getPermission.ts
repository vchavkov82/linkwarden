import { prisma } from "@linkwarden/prisma";

type Props = {
  userId: number;
  collectionId?: number;
  linkId?: number;
};

export default async function getPermission({
  userId,
  collectionId,
  linkId,
}: Props) {
  const membersInclude = {
    members: {
      select: {
        userId: true,
        collectionId: true,
        canCreate: true,
        canUpdate: true,
        canDelete: true,
        createdAt: true,
        updatedAt: true,
      },
    },
  } as const;

  if (linkId) {
    const check = await prisma.collection.findFirst({
      where: {
        links: {
          some: {
            id: linkId,
          },
        },
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: membersInclude,
    });

    return check;
  } else if (collectionId) {
    const check = await prisma.collection.findFirst({
      where: {
        id: collectionId,
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: membersInclude,
    });

    return check;
  }
}
