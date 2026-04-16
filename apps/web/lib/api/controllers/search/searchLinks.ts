import { prisma } from "@linkwarden/prisma";
import { LinkRequestQuery, Order, Sort } from "@linkwarden/types/global";
import { meiliClient } from "@linkwarden/lib/meilisearchClient";
import {
  buildMeiliFilters,
  buildMeiliQuery,
  parseSearchTokens,
} from "../../searchQueryBuilder";
import { normalizeUrl } from "@linkwarden/lib";

function stripMediaFieldsFromLinks<
  T extends { preview?: string | null; image?: string | null },
>(links: T[], omitMedia?: boolean): T[] {
  if (!omitMedia) return links;
  return links.map((link) => ({ ...link, preview: null, image: null }));
}

interface SearchLinksParams {
  query: LinkRequestQuery;
  userId?: number;
  publicOnly?: boolean;
}

export default async function searchLinks({
  query,
  userId,
  publicOnly,
}: SearchLinksParams) {
  const POSTGRES_IS_ENABLED =
    process.env.DATABASE_URL?.startsWith("postgresql");

  const caseInsensitive = POSTGRES_IS_ENABLED
    ? ("insensitive" as const)
    : undefined;

  const paginationTakeCount = Number(process.env.PAGINATION_TAKE_COUNT) || 50;

  let order: Order = { id: "desc" };
  if (query.sort === Sort.DateNewestFirst) order = { id: "desc" };
  else if (query.sort === Sort.DateOldestFirst) order = { id: "asc" };
  else if (query.sort === Sort.NameAZ) order = { name: "asc" };
  else if (query.sort === Sort.NameZA) order = { name: "desc" };
  else if (query.sort === Sort.Manual) order = { sortOrder: "asc" };

  const tagCondition = [];
  if (query.tagId) {
    tagCondition.push({
      tags: {
        some: { id: query.tagId },
      },
    });
  }

  const collectionCondition = [];
  if (query.collectionId || publicOnly) {
    collectionCondition.push({
      collection: {
        id: query.collectionId,
        ...(publicOnly ? { isPublic: true } : {}),
      },
    });
  }

  const pinnedCondition =
    query.pinnedOnly && userId ? { pinnedBy: { some: { id: userId } } } : {};
  const tokens = query.searchQueryString
    ? parseSearchTokens(query.searchQueryString)
    : [];

  if (meiliClient && query.searchQueryString) {
    const meiliQuery = buildMeiliQuery(tokens);

    const meiliFilters = buildMeiliFilters({
      tokens,
      userId,
      publicOnly,
    });

    const limit = paginationTakeCount;
    const offset = query.cursor || 0;

    const meiliResp = await meiliClient.index("links").search(meiliQuery, {
      filter: meiliFilters,
      attributesToRetrieve: ["id"],
      limit,
      offset,
      sort:
        query.sort === Sort.DateNewestFirst
          ? ["id:desc"]
          : query.sort === Sort.DateOldestFirst
            ? ["id:asc"]
            : query.sort === Sort.NameAZ
              ? ["name:asc"]
              : query.sort === Sort.NameZA
                ? ["name:desc"]
                : query.sort === Sort.Manual
                  ? ["sortOrder:asc"]
                  : ["id:desc"],
    });

    if (meiliResp.hits.length === 0) {
      return {
        data: [],
        statusCode: 200,
        success: true,
        message: "Nothing found.",
      };
    }

    const meiliIds = meiliResp.hits.map((h: any) => h.id);

    const links = await prisma.link.findMany({
      where: {
        id: { in: meiliIds },
        AND: [
          ...(userId
            ? [
                {
                  collection: {
                    OR: [
                      { ownerId: userId },
                      {
                        members: {
                          some: { userId },
                        },
                      },
                    ],
                  },
                },
              ]
            : []),
          ...collectionCondition,
          {
            OR: [
              ...tagCondition,
              {
                ...pinnedCondition,
              },
            ],
          },
        ],
      },
      omit: {
        textContent: true,
      },
      include: {
        tags: true,
        collection: true,
        pinnedBy: userId
          ? {
              where: { id: userId },
              select: { id: true },
            }
          : undefined,
      },
      orderBy: order,
    });

    const nextCursor = meiliResp.hits.length === limit ? offset + limit : null;

    return {
      data: {
        links: stripMediaFieldsFromLinks(links, query.omitMedia),
        nextCursor,
      },
      statusCode: 200,
      success: true,
      message: "Success",
    };
  }

  // Fallback: No Meilisearch
  const searchConditions = [];

  if (query.searchQueryString) {
    for (const token of tokens) {
      const condition = (() => {
        switch (token.field) {
          case "url": {
            const normalized = normalizeUrl(token.value) || token.value.trim();
            return {
              url: {
                equals: normalized,
                mode: caseInsensitive,
              },
            };
          }
          case "name":
            return {
              name: {
                contains: token.value,
                mode: caseInsensitive,
              },
            };
          case "description":
            return {
              description: {
                contains: token.value,
                mode: caseInsensitive,
              },
            };
          case "tag":
            return {
              tags: {
                some: {
                  name: {
                    contains: token.value,
                    mode: caseInsensitive,
                  },
                },
              },
            };
          case "collection":
            return {
              collection: {
                name: {
                  contains: token.value,
                  mode: caseInsensitive,
                },
              },
            };
          case "before":
            return isNaN(Date.parse(token.value))
              ? null
              : { createdAt: { lt: new Date(token.value) } };
          case "after":
            return isNaN(Date.parse(token.value))
              ? null
              : { createdAt: { gt: new Date(token.value) } };
          case "pinned":
            if (!userId) return null;
            if (token.value === "true") return { pinnedBy: { some: { id: userId } } };
            if (token.value === "false") return { pinnedBy: { none: { id: userId } } };
            return null;
          case "public":
            if (token.value !== "true") return null;
            return { collection: { isPublic: true } };
          case "general":
          default:
            return {
              OR: [
                {
                  name: {
                    contains: token.value,
                    mode: caseInsensitive,
                  },
                },
                {
                  url: {
                    contains: token.value,
                    mode: caseInsensitive,
                  },
                },
                {
                  description: {
                    contains: token.value,
                    mode: caseInsensitive,
                  },
                },
                {
                  tags: {
                    some: {
                      name: {
                        contains: token.value,
                        mode: caseInsensitive,
                      },
                    },
                  },
                },
              ],
            };
        }
      })();

      if (!condition) continue;

      searchConditions.push(token.isNegative ? { NOT: condition } : condition);
    }
  }

  const links = await prisma.link.findMany({
    take: paginationTakeCount,
    skip: query.cursor ? 1 : undefined,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    where: {
      AND: [
        ...(userId
          ? [
              {
                collection: {
                  OR: [
                    { ownerId: userId },
                    {
                      members: {
                        some: { userId },
                      },
                    },
                  ],
                },
              },
            ]
          : []),
        ...collectionCondition,
        {
          ...((tagCondition.length > 0 || Object.keys(pinnedCondition).length > 0)
            ? {
                OR: [
                  ...tagCondition,
                  ...(Object.keys(pinnedCondition).length > 0 ? [pinnedCondition] : []),
                ],
              }
            : {}),
          ...(searchConditions.length > 0 ? { AND: searchConditions } : {}),
        },
      ],
    },
    omit: {
      textContent: true,
    },
    include: {
      tags: true,
      collection: true,
      pinnedBy: userId
        ? {
            where: { id: userId },
            select: { id: true },
          }
        : undefined,
    },
    orderBy: order,
  });

  return {
    data: {
      links: stripMediaFieldsFromLinks(links, query.omitMedia),
      nextCursor:
        links.length === paginationTakeCount
          ? links[links.length - 1].id
          : null,
    },
    statusCode: 200,
    success: true,
    message: "Success",
  };
}
