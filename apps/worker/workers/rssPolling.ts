import { prisma } from "@linkwarden/prisma";
import Parser from "rss-parser";
import { delay, rssHandler } from "@linkwarden/lib";

const pollingIntervalInSeconds =
  (Number(process.env.NEXT_PUBLIC_RSS_POLLING_INTERVAL_MINUTES) || 60) * 60; // Default to one hour if not set

const RSS_BATCH_SIZE = 100;

export async function startRSSPolling() {
  console.log("\x1b[34m%s\x1b[0m", "Starting RSS polling...");
  while (true) {
    const parser = new Parser();
    let skip = 0;

    while (true) {
      const batch = await prisma.rssSubscription.findMany({
        take: RSS_BATCH_SIZE,
        skip,
      });
      if (batch.length === 0) break;

      await Promise.all(
        batch.map((rssSubscription) => rssHandler(rssSubscription, parser))
      );
      skip += RSS_BATCH_SIZE;
    }

    await delay(pollingIntervalInSeconds);
  }
}
