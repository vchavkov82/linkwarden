import { prisma } from "@linkwarden/prisma";
import { createFolder } from "@linkwarden/filesystem";
import setCollection from "../../../setCollection";
import {
  PostLinksBulkSchema,
  PostLinkSchemaType,
} from "@linkwarden/lib/schemaValidation";
import { hasPassedLimit, normalizeUrl, withRetry } from "@linkwarden/lib";

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
  const normalized: {
    link: PostLinkSchemaType;
    url: string | null;
    index: number;
    collectionKey: string;
  }[] = [];
  const seenCollectionUrls = new Set<string>();
  const errors: BulkCreateResult["errors"] = [];

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const collectionKey = link.collection?.id
      ? `id:${link.collection.id}`
      : link.collection?.name
        ? `name:${link.collection.name}`
        : "default";

    if (!resolvedCollections.has(collectionKey)) {
      errors.push({
        index: i,
        url: link.url,
        error: "Collection is not accessible.",
      });
      continue;
    }

    const url = normalizeUrl(link.url);

    // Deduplicate within the batch
    const dedupeKey = url ? `${collectionKey}:${url}` : null;
    if (dedupeKey && seenCollectionUrls.has(dedupeKey)) continue;
    if (dedupeKey) seenCollectionUrls.add(dedupeKey);

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
        errors: [
          {
            index: -1,
            error:
              "Your subscription has reached the maximum number of links allowed.",
          },
        ],
      },
      status: 400,
    };
  }

  // Batch duplicate detection — single query for all URLs
  const collectionUrlPairs = normalized
    .filter((item) => item.url)
    .map((item) => ({
      collectionId: resolvedCollections.get(item.collectionKey)!.id,
      url: item.url as string,
    }));

  const existingLinks =
    collectionUrlPairs.length > 0
      ? await prisma.link.findMany({
          where: {
            OR: collectionUrlPairs,
          },
          include: { tags: true, collection: true },
        })
      : [];

  const existingByCollectionUrl = new Map(
    existingLinks.map((link) => [`${link.collectionId}:${link.url}`, link])
  );

  // Split into new vs existing
  const toCreate: typeof normalized = [];
  const existingFromPreCheck: any[] = [];

  for (const item of normalized) {
    const collection = resolvedCollections.get(item.collectionKey)!;
    const existingKey = item.url ? `${collection.id}:${item.url}` : null;

    if (existingKey && existingByCollectionUrl.has(existingKey)) {
      existingFromPreCheck.push(existingByCollectionUrl.get(existingKey)!);
    } else {
      toCreate.push(item);
    }
  }

  if (toCreate.length === 0) {
    return { response: { created: [], existing: existingFromPreCheck, errors }, status: 200 };
  }

  const result = await withRetry(async () => {
    const created: any[] = [];
    const existing: any[] = [...existingFromPreCheck]; // existing found before tx
    const collectionIds = new Set<number>();

    await prisma.$transaction(async (tx) => {
      // Advisory lock to serialize concurrent sync per user
      await tx.$executeRawUnsafe(
        `SELECT pg_advisory_xact_lock($1::integer, $2::integer)`,
        0x4C574255,
        userId
      );

      // Re-check duplicates inside the lock to eliminate TOCTOU race
      const freshExisting = collectionUrlPairs.length > 0
        ? await tx.link.findMany({
            where: { OR: collectionUrlPairs },
            include: { tags: true, collection: true },
          })
        : [];

      const freshExistingMap = new Map(
        freshExisting.map((link) => [`${link.collectionId}:${link.url}`, link])
      );

      for (const item of toCreate) {
        const collection = resolvedCollections.get(item.collectionKey)!;
        const existingKey = item.url ? `${collection.id}:${item.url}` : null;

        // Skip if another concurrent request created it since our pre-check
        if (existingKey && freshExistingMap.has(existingKey)) {
          existing.push(freshExistingMap.get(existingKey)!);
          continue;
        }

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
          if (err?.code === "P2002") {
            const raceExisting = await tx.link.findFirst({
              where: { url: item.url, collectionId: collection.id },
              include: { tags: true, collection: true },
            });
            if (raceExisting) existing.push(raceExisting);
          } else {
            errors.push({
              index: item.index,
              url: item.link.url,
              error: err.message,
            });
          }
        }
      }
    });

    return { created, existing, collectionIds };
  }, 5, ["P2034"]);

  // Create archive folders for all affected collections
  for (const collectionId of Array.from(result.collectionIds)) {
    createFolder({ filePath: `archives/${collectionId}` });
  }

  return { response: { created: result.created, existing: result.existing, errors }, status: 200 };
}
