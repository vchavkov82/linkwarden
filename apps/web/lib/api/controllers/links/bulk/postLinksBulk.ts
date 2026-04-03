import { prisma } from "@linkwarden/prisma";
import { createFolder } from "@linkwarden/filesystem";
import setCollection from "../../../setCollection";
import {
  PostLinksBulkSchema,
  PostLinkSchemaType,
} from "@linkwarden/lib/schemaValidation";
import { hasPassedLimit, normalizeUrl } from "@linkwarden/lib";

interface BulkCreateResult {
  created: any[];
  existing: any[];
  errors: { index: number; url?: string; error: string }[];
}

export default async function postLinksBulk(
  body: { links: PostLinkSchemaType[] },
  userId: number
): Promise<{ response: BulkCreateResult; status: number }> {
  const dataValidation = PostLinksBulkSchema.safeParse(body);

  if (!dataValidation.success) {
    return {
      response: {
        created: [],
        existing: [],
        errors: [{ index: -1, error: dataValidation.error.issues[0].message }],
      },
      status: 400,
    };
  }

  const { links } = dataValidation.data;

  // Resolve unique collections from all links in the batch
  const collectionKeys = new Map<string, { id?: number; name?: string }>();
  for (const link of links) {
    const key = link.collection?.id
      ? `id:${link.collection.id}`
      : link.collection?.name
        ? `name:${link.collection.name}`
        : "default";
    if (!collectionKeys.has(key)) {
      collectionKeys.set(key, link.collection || {});
    }
  }

  const resolvedCollections = new Map<string, any>();
  for (const [key, col] of Array.from(collectionKeys)) {
    const resolved = await setCollection({
      userId,
      collectionId: col.id,
      collectionName: col.name,
    });
    if (resolved) {
      resolvedCollections.set(key, resolved);
    }
  }

  // Normalize URLs and deduplicate within the batch
  const normalized: { link: PostLinkSchemaType; url: string | null; index: number; collectionKey: string }[] = [];
  const seenUrls = new Set<string>();
  const errors: BulkCreateResult["errors"] = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const collectionKey = link.collection?.id
      ? `id:${link.collection.id}`
      : link.collection?.name
        ? `name:${link.collection.name}`
        : "default";

    if (!resolvedCollections.has(collectionKey)) {
      errors.push({ index: i, url: link.url, error: "Collection is not accessible." });
      continue;
    }

    const url = normalizeUrl(link.url);

    // Deduplicate within the batch
    if (url && seenUrls.has(url)) continue;
    if (url) seenUrls.add(url);

    normalized.push({ link, url, index: i, collectionKey });
  }

  if (normalized.length === 0) {
    return { response: { created: [], existing: [], errors }, status: 200 };
  }

  // Single capacity check for the entire batch
  const hasTooManyLinks = await hasPassedLimit(userId, normalized.length);
  if (hasTooManyLinks) {
    return {
      response: {
        created: [],
        existing: [],
        errors: [{ index: -1, error: "Your subscription has reached the maximum number of links allowed." }],
      },
      status: 400,
    };
  }

  // Batch duplicate detection — single query for all URLs
  const urlsToCheck = normalized.map((n) => n.url).filter(Boolean) as string[];
  const existingLinks = urlsToCheck.length > 0
    ? await prisma.link.findMany({
        where: {
          url: { in: urlsToCheck },
          ownerId: userId,
        },
        include: { tags: true, collection: true },
      })
    : [];

  const existingByUrl = new Map(existingLinks.map((l) => [l.url, l]));

  // Split into new vs existing
  const toCreate: typeof normalized = [];
  const existing: any[] = [];

  for (const item of normalized) {
    if (item.url && existingByUrl.has(item.url)) {
      existing.push(existingByUrl.get(item.url)!);
    } else {
      toCreate.push(item);
    }
  }

  if (toCreate.length === 0) {
    return { response: { created: [], existing, errors }, status: 200 };
  }

  // Batch create in a single transaction
  const created: any[] = [];
  const collectionIds = new Set<number>();

  await prisma.$transaction(async (tx) => {
    for (const item of toCreate) {
      const collection = resolvedCollections.get(item.collectionKey)!;
      const linkName = item.link.name || "";

      try {
        const newLink = await tx.link.create({
          data: {
            url: item.url || null,
            name: linkName,
            description: item.link.description,
            type: item.link.type || "url",
            needsTitleFetch: !!item.url && !linkName,
            createdBy: { connect: { id: userId } },
            owner: { connect: { id: collection.ownerId } },
            collection: { connect: { id: collection.id } },
            tags: item.link.tags?.length
              ? {
                  connectOrCreate: item.link.tags.map((tag) => ({
                    where: {
                      name_ownerId: {
                        name: tag.name.trim(),
                        ownerId: collection.ownerId,
                      },
                    },
                    create: {
                      name: tag.name.trim(),
                      owner: { connect: { id: collection.ownerId } },
                    },
                  })),
                }
              : undefined,
          },
          include: { tags: true, collection: true },
        });

        created.push(newLink);
        collectionIds.add(collection.id);
      } catch (err: any) {
        // Race condition: another request created it between our check and insert
        if (err?.code === "P2002") {
          const raceExisting = await tx.link.findFirst({
            where: { url: item.url, ownerId: collection.ownerId },
            include: { tags: true, collection: true },
          });
          if (raceExisting) existing.push(raceExisting);
        } else {
          errors.push({ index: item.index, url: item.link.url, error: err.message });
        }
      }
    }
  });

  // Create archive folders for all affected collections
  for (const collectionId of Array.from(collectionIds)) {
    createFolder({ filePath: `archives/${collectionId}` });
  }

  return { response: { created, existing, errors }, status: 200 };
}
