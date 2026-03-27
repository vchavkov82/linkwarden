import { prisma } from "@linkwarden/prisma";
import { Prisma } from "@linkwarden/prisma/client";

type PickLinksOptions = {
  maxBatchLinks: number;
};

const TRIAL_PERIOD_DAYS = process.env.NEXT_PUBLIC_TRIAL_PERIOD_DAYS || 14;
const REQUIRE_CC = process.env.NEXT_PUBLIC_REQUIRE_CC === "true";

export default async function getLinkBatchFairly({
  maxBatchLinks,
}: PickLinksOptions) {
  if (maxBatchLinks <= 0) return [];

  const baseLinkWhere: Prisma.LinkWhereInput = {
    url: { not: null },
    OR: [
      { lastPreserved: null },
      {
        createdBy: {
          is: {
            aiTagExistingLinks: true,
            NOT: { aiTaggingMethod: "DISABLED" },
          },
        },
        aiTagged: false,
      },
    ],
  };

  const users = await prisma.user.findMany({
    where: {
      createdLinks: {
        some: {
          ...baseLinkWhere,
        },
      },
      ...(process.env.STRIPE_SECRET_KEY
        ? {
            OR: [
              { subscriptions: { is: { active: true } } },
              { parentSubscription: { is: { active: true } } },
              ...(REQUIRE_CC
                ? []
                : [
                    {
                      createdAt: {
                        gte: new Date(
                          new Date().getTime() -
                            Number(TRIAL_PERIOD_DAYS) * 86400000
                        ),
                      },
                    },
                  ]),
            ],
          }
        : {}),
      ...(process.env.NEXT_PUBLIC_EMAIL_PROVIDER === "true"
        ? {
            emailVerified: { not: null },
          }
        : {}),
    },
    orderBy: [{ lastPickedAt: { sort: "asc", nulls: "first" } }, { id: "asc" }],
    select: { id: true },
    take: maxBatchLinks,
  });

  if (users.length === 0) return [];

  const userIds = users.map((u) => u.id);

  const candidateLinks = await prisma.link.findMany({
    where: {
      ...baseLinkWhere,
      createdById: { in: userIds },
    },
    orderBy: [{ createdAt: "desc" }],
    select: { id: true, createdById: true },
    take: maxBatchLinks * users.length,
  });

  if (candidateLinks.length === 0) return [];

  const byUser = new Map<number, number[]>();
  for (const link of candidateLinks) {
    if (!link.createdById) continue;
    const list = byUser.get(link.createdById);
    if (list) {
      list.push(link.id);
    } else {
      byUser.set(link.createdById, [link.id]);
    }
  }

  const picked: number[] = [];
  const offsets = new Map<number, number>();

  while (picked.length < maxBatchLinks) {
    let addedThisRound = 0;
    for (const userId of userIds) {
      if (picked.length >= maxBatchLinks) break;
      const userLinks = byUser.get(userId);
      if (!userLinks) continue;
      const offset = offsets.get(userId) ?? 0;
      if (offset >= userLinks.length) continue;
      picked.push(userLinks[offset]);
      offsets.set(userId, offset + 1);
      addedThisRound++;
    }
    if (addedThisRound === 0) break;
  }

  if (picked.length === 0) return [];

  const batch = await prisma.link.findMany({
    where: { id: { in: picked } },
    include: {
      collection: { include: { owner: true } },
      tags: true,
    },
  });

  const pickedUserIds = [...new Set(
    batch.map((l) => l.createdById).filter((id): id is number => id !== null)
  )];

  await prisma.user.updateMany({
    where: { id: { in: pickedUserIds } },
    data: { lastPickedAt: new Date() },
  });

  const order = new Map<number, number>();
  picked.forEach((id, i) => order.set(id, i));
  batch.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  console.log(
    "\x1b[34m%s\x1b[0m",
    `Processing ${batch.length} ${
      batch.length > 1 ? "links" : "link"
    } for the following ${
      pickedUserIds.length > 1 ? "userIds" : "userId"
    }: ${pickedUserIds.join(", ")}`
  );

  return batch;
}
