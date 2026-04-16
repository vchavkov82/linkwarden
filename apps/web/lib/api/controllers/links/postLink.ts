import { prisma } from "@linkwarden/prisma";
import fetchTitleAndHeaders from "@/lib/shared/fetchTitleAndHeaders";
import { createFolder } from "@linkwarden/filesystem";
import setCollection from "../../setCollection";
import {
  PostLinkSchema,
  PostLinkSchemaType,
} from "@linkwarden/lib/schemaValidation";
import { hasPassedLimit, withRetry, normalizeUrl } from "@linkwarden/lib";

export default async function postLink(
  body: PostLinkSchemaType,
  userId: number
) {
  const dataValidation = PostLinkSchema.safeParse(body);

  if (!dataValidation.success) {
    return {
      response: `Error: ${
        dataValidation.error.issues[0].message
      } [${dataValidation.error.issues[0].path.join(", ")}]`,
      status: 400,
    };
  }

  const link = dataValidation.data;

  const linkCollection = await setCollection({
    userId,
    collectionId: link.collection?.id,
    collectionName: link.collection?.name,
  });

  if (!linkCollection)
    return { response: "Collection is not accessible.", status: 400 };

  // Normalize URL early so we can check for duplicates before the expensive title fetch
  const normalized = normalizeUrl(link.url);

  // Early duplicate check — skip fetchTitleAndHeaders entirely if URL already exists
  if (normalized) {
    const existingLink = await prisma.link.findFirst({
      where: {
        url: normalized,
        collectionId: linkCollection.id,
      },
      include: { tags: true, collection: true },
    });

    if (existingLink) {
      return { response: existingLink, status: 200 };
    }
  }

  const hasTooManyLinks = await hasPassedLimit(userId, 1);

  if (hasTooManyLinks) {
    return {
      response: `Your subscription has reached the maximum number of links allowed.`,
      status: 400,
    };
  }

  const { title = "", headers = new Headers() } = link.url
    ? await fetchTitleAndHeaders(link.url)
    : {};

  const name =
    link.name && link.name !== "" ? link.name : link.url ? title : "";

  const contentType = headers?.get("content-type");
  let linkType = "url";
  let imageExtension = "png";

  if (!link.url) linkType = link.type || "url";
  else if (contentType === "application/pdf") linkType = "pdf";
  else if (contentType?.startsWith("image")) {
    linkType = "image";
    if (contentType === "image/jpeg") imageExtension = "jpeg";
    else if (contentType === "image/png") imageExtension = "png";
  }

  if (!link.tags) link.tags = [];

  let newLink;

  try {
    newLink = await withRetry(
      async () => {
        return await prisma.$transaction(
          async (tx) => {
            await tx.$executeRawUnsafe(
              `SELECT pg_advisory_xact_lock($1::integer, $2::integer)`,
              0x4C574C4B,
              userId
            );

            const maxOrder = await tx.link.aggregate({
              where: { collectionId: linkCollection.id },
              _max: { sortOrder: true },
            });
            const nextSortOrder = (maxOrder._max.sortOrder ?? 0) + 1000;

            const created = await tx.link.create({
              data: {
                url: normalized || null,
                name,
                description: link.description,
                type: linkType,
                sortOrder: nextSortOrder,
                createdBy: {
                  connect: {
                    id: userId,
                  },
                },
                owner: {
                  connect: {
                    id: linkCollection.ownerId,
                  },
                },
                collection: {
                  connect: {
                    id: linkCollection.id,
                  },
                },
                tags: {
                  connectOrCreate: link.tags?.map((tag) => ({
                    where: {
                      name_ownerId: {
                        name: tag.name.trim(),
                        ownerId: linkCollection.ownerId,
                      },
                    },
                    create: {
                      name: tag.name.trim(),
                      owner: {
                        connect: {
                          id: linkCollection.ownerId,
                        },
                      },
                    },
                  })),
                },
              },
              include: { tags: true, collection: true },
            });

            return created;
          },
          { isolationLevel: "Serializable" }
        );
      },
      5,
      ["P2034"]
    );
  } catch (error: any) {
    // Race condition: another request created the same link between our check and insert
    if (error?.code === "P2002") {
      const existingLink = await prisma.link.findFirst({
        where: {
          url: normalized,
          collectionId: linkCollection.id,
        },
        include: { tags: true, collection: true },
      });
      return { response: existingLink, status: 200 };
    }
    throw error;
  }

  await prisma.link.update({
    where: { id: newLink.id },
    data: {
      image: link.image
        ? `archives/${newLink.collectionId}/${newLink.id}.${
            link.image === "png" ? "png" : "jpeg"
          }`
        : undefined,
    },
  });

  createFolder({ filePath: `archives/${newLink.collectionId}` });

  return { response: newLink, status: 200 };
}
