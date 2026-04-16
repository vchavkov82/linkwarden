import { prisma } from "@linkwarden/prisma";
import { Backup } from "@linkwarden/types";
import { createFolder } from "@linkwarden/filesystem";
import { hasPassedLimit, normalizeUrl } from "@linkwarden/lib";

export default async function importFromLinkwarden(
  userId: number,
  rawData: string
) {
  const data: Backup = JSON.parse(rawData);

  let totalImports = 0;

  data.collections.forEach((collection) => {
    totalImports += collection.links.length;
  });

  const hasTooManyLinks = await hasPassedLimit(userId, totalImports);

  if (hasTooManyLinks) {
    return {
      response: `Your subscription has reached the maximum number of links allowed.`,
      status: 400,
    };
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        for (const e of data.collections) {
          e.name = e.name.trim();

          const newCollection = await tx.collection.create({
            data: {
              owner: {
                connect: {
                  id: userId,
                },
              },
              name: e.name?.trim().slice(0, 254),
              description: e.description?.trim().slice(0, 254),
              color: e.color?.trim().slice(0, 50),
              createdBy: {
                connect: {
                  id: userId,
                },
              },
            },
          });

          createFolder({ filePath: `archives/${newCollection.id}` });

          for (const link of e.links) {
            if (link.url) {
              try {
                new URL(link.url.trim());
              } catch (err) {
                continue;
              }
            }

            const trimmedUrl = link.url?.trim().slice(0, 2047);
            const normalized = normalizeUrl(trimmedUrl) || trimmedUrl;

            const existing = await tx.link.findFirst({
              where: { url: normalized, collectionId: newCollection.id },
              select: { id: true },
            });
            if (existing) continue;

            const newLink = await tx.link.create({
              data: {
                url: normalized,
                name: link.name?.trim().slice(0, 254),
                description: link.description?.trim().slice(0, 254),
                importDate: new Date(link.importDate || link.createdAt),
                collection: {
                  connect: {
                    id: newCollection.id,
                  },
                },
                owner: {
                  connect: {
                    id: userId,
                  },
                },
                createdBy: {
                  connect: {
                    id: userId,
                  },
                },
                tags: {
                  connectOrCreate: link.tags.map((tag) => ({
                    where: {
                      name_ownerId: {
                        name: tag.name?.slice(0, 49),
                        ownerId: userId,
                      },
                    },
                    create: {
                      name: tag.name?.trim().slice(0, 49),
                      owner: {
                        connect: {
                          id: userId,
                        },
                      },
                    },
                  })),
                },
              },
            });

            for (const pinnedLink of data?.pinnedLinks ?? []) {
              if (pinnedLink.url === newLink.url) {
                await tx.link.update({
                  where: { id: newLink.id },
                  data: { pinnedBy: { connect: { id: userId } } },
                });
              }
            }
          }
        }
      },
      { timeout: 30000 }
    );
  } catch (err) {
    console.error("Linkwarden import failed:", err);
    return {
      response: "Import failed. Please check your file and try again.",
      status: 500,
    };
  }

  return { response: "Success.", status: 200 };
}
