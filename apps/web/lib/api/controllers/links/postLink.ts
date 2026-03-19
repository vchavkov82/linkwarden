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

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

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

  const checkDuplicates = user?.preventDuplicateLinks && link.url;

  const normalized = normalizeUrl(link.url);

  const result = await withRetry(
    async () => {
      return await prisma.$transaction(
        async (tx) => {
          if (checkDuplicates && normalized) {
            const existingLink = await tx.link.findFirst({
              where: {
                url: normalized,
                ownerId: userId,
              },
              select: { id: true },
            });

            if (existingLink) {
              return { duplicate: true as const, link: null };
            }
          }

          const newLink = await tx.link.create({
            data: {
              url: normalized || null,
              name,
              description: link.description,
              type: linkType,
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

          return { duplicate: false as const, link: newLink };
        },
        { isolationLevel: "Serializable" }
      );
    },
    5,
    ["P2034"]
  );

  if (result.duplicate) {
    return {
      response: "Link already exists",
      status: 409,
    };
  }

  const newLink = result.link!;

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
