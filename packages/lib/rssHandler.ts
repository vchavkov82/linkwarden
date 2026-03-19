import { RssSubscription } from "@linkwarden/prisma/client";
import { hasPassedLimit } from "./verifyCapacity";
import Parser from "rss-parser";
import { prisma } from "@linkwarden/prisma";
import { withRetry } from "./withRetry";
import { normalizeUrl, getUrlVariants } from "./normalizeUrl";

export const rssHandler = async (
  rssSubscription: RssSubscription,
  parser: Parser
) => {
  try {
    const feed = await parser.parseURL(rssSubscription.url);

    const feedLastPubDate =
      feed.lastBuildDate ??
      feed.items.reduce((acc, item) => {
        const itemPubDate = item.pubDate ? new Date(item.pubDate) : null;
        return itemPubDate && itemPubDate > acc ? itemPubDate : acc;
      }, new Date(0));

    if (!feedLastPubDate)
      throw new Error(
        `No lastBuildDate or pubDate found in the following RSS feed: ${rssSubscription.url}`
      );

    if (
      !rssSubscription.lastBuildDate ||
      (rssSubscription.lastBuildDate &&
        new Date(rssSubscription.lastBuildDate) < new Date(feedLastPubDate))
    ) {
      console.log(
        "\x1b[34m%s\x1b[0m",
        `Processing new RSS feed items for ${rssSubscription.name}`
      );

      const newItems = feed.items.filter((item) => {
        const itemPubDate = item.pubDate ? new Date(item.pubDate) : null;
        return itemPubDate && itemPubDate > rssSubscription.lastBuildDate!;
      });

      const hasTooManyLinks = await hasPassedLimit(
        rssSubscription.ownerId,
        newItems.length
      );

      if (hasTooManyLinks) {
        console.log(
          "\x1b[34m%s\x1b[0m",
          `User ${rssSubscription.ownerId} has too many links. Skipping new RSS feed items.`
        );
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: rssSubscription.ownerId },
        select: { preventDuplicateLinks: true },
      });

      const checkDuplicates = user?.preventDuplicateLinks ?? false;

      await withRetry(
        async () => {
          await prisma.$transaction(
            async (tx) => {
              for (const item of newItems) {
                const normalized = normalizeUrl(item.link);

                if (checkDuplicates && normalized) {
                  const variants = getUrlVariants(normalized);
                  const existing = await tx.link.findFirst({
                    where: {
                      OR: variants.map((v) => ({ url: v })),
                      collection: { ownerId: rssSubscription.ownerId },
                    },
                    select: { id: true },
                  });

                  if (existing) {
                    console.log(
                      "\x1b[33m%s\x1b[0m",
                      `Skipping duplicate RSS item: ${item.link}`
                    );
                    continue;
                  }
                }

                await tx.link.create({
                  data: {
                    name: item.title,
                    url: normalized,
                    type: "url",
                    createdBy: {
                      connect: {
                        id: rssSubscription.ownerId,
                      },
                    },
                    collection: {
                      connect: {
                        id: rssSubscription.collectionId,
                      },
                    },
                  },
                });
              }

              await tx.rssSubscription.update({
                where: { id: rssSubscription.id },
                data: { lastBuildDate: new Date(feedLastPubDate) },
              });
            },
            { isolationLevel: "Serializable" }
          );
        },
        5,
        ["P2034"]
      );
    }
  } catch (error) {
    console.error(
      "\x1b[34m%s\x1b[0m",
      `Error processing RSS feed ${rssSubscription.url}:`,
      error
    );
  }
};
