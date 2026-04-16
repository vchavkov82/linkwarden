import { prisma } from "@linkwarden/prisma";
import { createFolder } from "@linkwarden/filesystem";
import { hasPassedLimit, normalizeUrl } from "@linkwarden/lib";

type OmnivoreItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  author: string;
  url: string;
  state: string;
  readingProgress: number;
  thumbnail: string;
  labels: string[];
  savedAt: string;
  updatedAt: string;
  publishedAt: string;
};

type OmnivoreMetadata = OmnivoreItem[];

export default async function importFromOmnivore(
  userId: number,
  rawData: string
) {
  const data: OmnivoreMetadata = JSON.parse(rawData);

  const backup = data.filter((item) => !!item.url);

  const totalImports = backup.length;
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
        const newCollection = await tx.collection.create({
          data: {
            owner: {
              connect: {
                id: userId,
              },
            },
            name: "Omnivore Imports",
            createdBy: {
              connect: {
                id: userId,
              },
            },
          },
        });

        createFolder({ filePath: `archives/${newCollection.id}` });

        for (const item of backup) {
          try {
            new URL(item.url.trim());
          } catch (err) {
            continue;
          }

          const trimmedUrl = item.url?.trim().slice(0, 2047);
          const normalized = normalizeUrl(trimmedUrl) || trimmedUrl;

          const existing = await tx.link.findFirst({
            where: { url: normalized, collectionId: newCollection.id },
            select: { id: true },
          });
          if (existing) continue;

          await tx.link.create({
            data: {
              url: normalized,
              name: item.title?.trim().slice(0, 254) || "",
              description: item.description?.trim().slice(0, 2047) || "",
              image: item.thumbnail || "",
              importDate: item.savedAt ? new Date(item.savedAt) : null,
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

              tags:
                item.labels && item.labels.length > 0
                  ? {
                      connectOrCreate: item.labels.map((label) => ({
                        where: {
                          name_ownerId: {
                            name: label?.trim().slice(0, 49),
                            ownerId: userId,
                          },
                        },
                        create: {
                          name: label?.trim().slice(0, 49),
                          owner: {
                            connect: {
                              id: userId,
                            },
                          },
                        },
                      })),
                    }
                  : undefined,
            },
          });
        }
      },
      { timeout: 30000 }
    );
  } catch (err) {
    console.error("Omnivore import failed:", err);
    return {
      response: "Import failed. Please check your file and try again.",
      status: 500,
    };
  }

  return { response: "Success.", status: 200 };
}
