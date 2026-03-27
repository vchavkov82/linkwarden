import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import { prisma } from "@linkwarden/prisma";
import { LinkArchiveActionSchema } from "@linkwarden/lib/schemaValidation";
import { removeFiles, removePreservationFiles } from "@linkwarden/filesystem";
import { ArchivalSettings } from "@linkwarden/types";
import { isArchivalTag } from "@linkwarden/lib";

export default async function links(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  const isServerAdmin = user.id === Number(process.env.NEXT_PUBLIC_ADMIN || 1);

  if (req.method === "DELETE") {
    const dataValidation = LinkArchiveActionSchema.safeParse(req.body);
    if (!dataValidation.success) {
      return res.status(400).json({
        response: `Error: ${
          dataValidation.error.issues[0].message
        } [${dataValidation.error.issues[0].path.join(", ")}]`,
      });
    }

    const { action, linkIds } = dataValidation.data;

    if (linkIds) {
      const authorizedLinks = await prisma.link.findMany({
        where: {
          id: { in: linkIds },
          url: { not: null },
          OR: [
            {
              collection: {
                ownerId: user.id,
              },
            },
            {
              collection: {
                members: {
                  some: {
                    userId: user.id,
                    canDelete: true,
                  },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          collectionId: true,
        },
      });

      if (authorizedLinks.length === 0) {
        return res.status(401).json({ response: "Permission denied." });
      }

      for (const link of authorizedLinks) {
        const collectionId = link.collectionId;

        if (!collectionId) {
          console.error(`Collection ID not found for link ${link.id}`);
          continue;
        }

        await removeFiles(link.id, collectionId);
        await prisma.link.update({
          where: { id: link.id },
          data: {
            image: null,
            pdf: null,
            readable: null,
            monolith: null,
            preview: null,
            lastPreserved: null,
            indexVersion: null,
          },
        });

        console.log("Deleted preservation link:", link.id);
      }

      return res.status(200).json({ response: "Success." });
    }

    const BATCH_SIZE = 100;

    if (action === "allAndIgnore") {
      if (!isServerAdmin) {
        return res.status(401).json({ response: "Permission denied." });
      }

      let cursor: number | undefined;
      while (true) {
        const batch = await prisma.link.findMany({
          where: { type: "url", url: { not: null } },
          select: { id: true, collectionId: true, preview: true },
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        });

        if (batch.length === 0) break;

        for (const link of batch) {
          await removePreservationFiles(link.id, link.collectionId);
          await prisma.link.update({
            where: { id: link.id },
            data: {
              preview: link.preview ? link.preview : undefined,
              image: "unavailable",
              pdf: "unavailable",
              readable: "unavailable",
              monolith: "unavailable",
            },
          });
        }

        cursor = batch[batch.length - 1].id;
        if (batch.length < BATCH_SIZE) break;
      }

      return res.status(200).json({ response: "Success." });
    } else if (action === "allAndRePreserve") {
      if (!isServerAdmin) {
        return res.status(401).json({ response: "Permission denied." });
      }

      let cursor: number | undefined;
      while (true) {
        const batch = await prisma.link.findMany({
          where: { type: "url", url: { not: null } },
          select: { id: true, collectionId: true },
          take: BATCH_SIZE,
          ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
          orderBy: { id: "asc" },
        });

        if (batch.length === 0) break;

        for (const link of batch) {
          await removeFiles(link.id, link.collectionId);
          await prisma.link.update({
            where: { id: link.id },
            data: {
              image: null,
              pdf: null,
              readable: null,
              monolith: null,
              preview: null,
              lastPreserved: null,
              indexVersion: null,
            },
          });
        }

        cursor = batch[batch.length - 1].id;
        if (batch.length < BATCH_SIZE) break;
      }

      return res.status(200).json({ response: "Success." });
    } else if (action === "allBroken") {
      if (!isServerAdmin) {
        return res.status(401).json({ response: "Permission denied." });
      }

      let brokenCursor: number | undefined;
      while (true) {
      const brokenArchives = await prisma.link.findMany({
        where: {
          type: "url",
          url: {
            not: null,
          },
          OR: [
            { image: "unavailable" },
            { pdf: "unavailable" },
            { readable: "unavailable" },
            { monolith: "unavailable" },
            { preview: "unavailable" },
          ],
        },
        include: {
          createdBy: {
            select: {
              archiveAsScreenshot: true,
              archiveAsMonolith: true,
              archiveAsPDF: true,
              archiveAsReadable: true,
              archiveAsWaybackMachine: true,
            },
          },
          tags: true,
        },
        take: BATCH_SIZE,
        ...(brokenCursor ? { skip: 1, cursor: { id: brokenCursor } } : {}),
        orderBy: { id: "asc" },
      });

      if (brokenArchives.length === 0) break;

      for (const link of brokenArchives) {
        const archivalTags = link.tags.filter(isArchivalTag);

        const shouldArchive: Omit<
          ArchivalSettings,
          "aiTag" | "archiveAsWaybackMachine"
        > =
          archivalTags.length > 0
            ? {
                archiveAsScreenshot: archivalTags.some(
                  (tag) => tag.archiveAsScreenshot
                ),
                archiveAsMonolith: archivalTags.some(
                  (tag) => tag.archiveAsMonolith
                ),
                archiveAsPDF: archivalTags.some((tag) => tag.archiveAsPDF),
                archiveAsReadable: archivalTags.some(
                  (tag) => tag.archiveAsReadable
                ),
              }
            : {
                archiveAsScreenshot:
                  link.createdBy?.archiveAsScreenshot || false,
                archiveAsMonolith: link.createdBy?.archiveAsMonolith || false,
                archiveAsPDF: link.createdBy?.archiveAsPDF || false,
                archiveAsReadable: link.createdBy?.archiveAsReadable || false,
              };

        const needsReprocessing =
          (link.image === "unavailable" && shouldArchive.archiveAsScreenshot) ||
          (link.monolith === "unavailable" &&
            shouldArchive.archiveAsMonolith) ||
          (link.pdf === "unavailable" && shouldArchive.archiveAsPDF) ||
          (link.readable === "unavailable" && shouldArchive.archiveAsReadable);

        if (needsReprocessing) {
          await prisma.link.update({
            where: { id: link.id },
            data: {
              image:
                shouldArchive.archiveAsScreenshot &&
                link.image === "unavailable"
                  ? null
                  : link.image,
              pdf:
                shouldArchive.archiveAsPDF && link.pdf === "unavailable"
                  ? null
                  : link.pdf,
              readable:
                shouldArchive.archiveAsReadable &&
                link.readable === "unavailable"
                  ? null
                  : link.readable,
              monolith:
                shouldArchive.archiveAsMonolith &&
                link.monolith === "unavailable"
                  ? null
                  : link.monolith,
              lastPreserved: null,
              indexVersion: null,
            },
          });
        }
      }

      brokenCursor = brokenArchives[brokenArchives.length - 1].id;
      if (brokenArchives.length < BATCH_SIZE) break;
      }

      return res.status(200).json({ response: "Success." });
    }
  }
}
