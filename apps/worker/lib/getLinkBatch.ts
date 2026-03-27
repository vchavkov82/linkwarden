import { prisma } from "@linkwarden/prisma";
import { Prisma } from "@linkwarden/prisma/client";

const getLinkBatch = async <T extends Prisma.LinkFindManyArgs>(
  params: T
): Promise<Array<Prisma.LinkGetPayload<T>>> => {
  try {
    const { where = {}, take = 10, orderBy, include } = params;

    const firstTake = Math.floor(take / 2);
    const secondTake = Math.ceil(take / 2);

    let oldToNew: any[] = [];
    if (firstTake > 0)
      oldToNew = await prisma.link.findMany({
        where,
        take: firstTake,
        orderBy: orderBy ?? { id: "asc" },
        include,
      });

    let newToOld: any[] = [];
    if (secondTake > 0)
      newToOld = await prisma.link.findMany({
        where,
        take: secondTake,
        orderBy: orderBy ?? { id: "desc" },
        include,
      });

    const seen = new Set<number>();
    const links: any[] = [];
    for (const link of [...oldToNew, ...newToOld]) {
      if (!seen.has(link.id)) {
        seen.add(link.id);
        links.push(link);
      }
    }

    return links as Array<Prisma.LinkGetPayload<T>>;
  } catch (error) {
    console.error("getLinkBatch error, returning empty array instead:", error);
    return [] as Array<Prisma.LinkGetPayload<T>>;
  }
};

export default getLinkBatch;
