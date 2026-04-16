import { prisma } from "@linkwarden/prisma";
import { createFolder } from "@linkwarden/filesystem";
import { JSDOM } from "jsdom";
import { decodeHTML } from "entities";
import { parse, Node, Element, TextNode } from "himalaya";
import { hasPassedLimit, normalizeUrl } from "@linkwarden/lib";

export default async function importFromHTMLFile(
  userId: number,
  rawData: string
) {
  // Parse in a sandboxed JSDOM — no script execution
  const dom = new JSDOM(rawData, { runScripts: undefined });
  const document = dom.window.document;

  // Strip script/style/iframe tags that have no place in bookmark exports
  document
    .querySelectorAll("script, style, iframe, object, embed")
    .forEach((e) => e.remove());

  // Remove bad tags
  document.querySelectorAll("meta").forEach((e) => (e.outerHTML = e.innerHTML));
  document.querySelectorAll("META").forEach((e) => (e.outerHTML = e.innerHTML));
  document.querySelectorAll("P").forEach((e) => (e.outerHTML = e.innerHTML));

  const bookmarks = document.querySelectorAll("A");
  const totalImports = bookmarks.length;

  const hasTooManyLinks = await hasPassedLimit(userId, totalImports);

  if (hasTooManyLinks) {
    return {
      response: `Your subscription has reached the maximum number of links allowed.`,
      status: 400,
    };
  }

  const jsonData = parse(document.documentElement.outerHTML);

  const processedArray = processNodes(jsonData);
  const importRootCollectionId = await createCollection(
    userId,
    getImportRootName()
  );

  for (const item of processedArray) {
    await processBookmarks(userId, item as Element, importRootCollectionId);
  }

  return { response: "Success.", status: 200 };
}

async function processBookmarks(
  userId: number,
  data: Node,
  parentCollectionId?: number
) {
  if (data.type === "element") {
    for (const item of data.children) {
      if (item.type === "element" && item.tagName === "dt") {
        // process collection or sub-collection

        let collectionId;
        const collectionName = item.children.find(
          (e) => e.type === "element" && e.tagName === "h3"
        ) as Element;

        if (collectionName) {
          const collectionNameContent = (collectionName.children[0] as TextNode)
            ?.content;
          if (collectionNameContent) {
            collectionId = await createCollection(
              userId,
              collectionNameContent,
              parentCollectionId
            );
          } else {
            // Handle the case when the collection name is empty
            collectionId = await createCollection(
              userId,
              "Untitled Collection",
              parentCollectionId
            );
          }
        }
        await processBookmarks(
          userId,
          item,
          collectionId || parentCollectionId
        );
      } else if (item.type === "element" && item.tagName === "a") {
        // process link

        const rawLinkUrl = item?.attributes.find(
          (e) => e.key.toLowerCase() === "href"
        )?.value;
        const linkUrl = decodeEntities(rawLinkUrl);
        const linkName = (
          item?.children.find((e) => e.type === "text") as TextNode
        )?.content;
        const linkTags = item?.attributes
          .find((e) => e.key === "tags")
          ?.value.split(",")
          .map(decodeEntities);

        // set date if available
        const linkDateValue = item?.attributes.find(
          (e) => e.key.toLowerCase() === "add_date"
        )?.value;

        const linkDate = linkDateValue
          ? new Date(Number(linkDateValue) * 1000)
          : undefined;

        let linkDesc =
          (
            (
              item?.children?.find(
                (e) => e.type === "element" && e.tagName === "dd"
              ) as Element
            )?.children[0] as TextNode
          )?.content || "";

        if (linkUrl && parentCollectionId) {
          await createLink(
            userId,
            linkUrl,
            parentCollectionId,
            linkName,
            linkDesc,
            linkTags,
            linkDate
          );
        } else if (linkUrl) {
          const collectionId = await createCollection(
            userId,
            getImportRootName()
          );

          await createLink(
            userId,
            linkUrl,
            collectionId,
            linkName,
            linkDesc,
            linkTags,
            linkDate
          );
        }

        await processBookmarks(userId, item, parentCollectionId);
      } else {
        // process anything else
        await processBookmarks(userId, item, parentCollectionId);
      }
    }
  }
}

const createCollection = async (
  userId: number,
  collectionName: string,
  parentId?: number
) => {
  collectionName = collectionName.trim().slice(0, 254);

  let collectionId;

  try {
    collectionId = await prisma.collection.create({
      data: {
        name: collectionName,
        parent: parentId
          ? {
              connect: {
                id: parentId,
              },
            }
          : undefined,
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
      },
    });
  } catch (error: any) {
    if (error?.code !== "P2002") throw error;

    const existing = await prisma.collection.findFirst({
      where: {
        name: collectionName,
        ownerId: userId,
        parentId: parentId ?? null,
      },
    });

    if (!existing) throw error;
    collectionId = existing;
  }

  createFolder({ filePath: `archives/${collectionId.id}` });

  return collectionId.id;
};

const getImportRootName = () =>
  `Imported Bookmarks - ${new Date()
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC")}`;

const createLink = async (
  userId: number,
  url: string,
  collectionId: number,
  name?: string,
  description?: string,
  tags?: string[],
  importDate?: Date
) => {
  url = url.trim().slice(0, 2047);
  try {
    new URL(url);
  } catch (e) {
    return;
  }
  tags = tags?.map((tag) => tag.trim().slice(0, 49));
  name = name?.trim().slice(0, 254);
  description = description?.trim().slice(0, 254);
  if (importDate) {
    const dateString = importDate.toISOString();
    if (dateString.length > 50) {
      importDate = undefined;
    }
  }

  const normalized = normalizeUrl(url) || url;

  const existing = await prisma.link.findFirst({
    where: { url: normalized, collectionId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.link.create({
    data: {
      name: name || "",
      url: normalized,
      description,
      collectionId,
      ownerId: userId,
      createdById: userId,
      tags:
        tags && tags[0]
          ? {
              connectOrCreate: tags.map((tag: string) => {
                return {
                  where: {
                    name_ownerId: {
                      name: tag.trim(),
                      ownerId: userId,
                    },
                  },
                  create: {
                    name: tag.trim(),
                    owner: {
                      connect: {
                        id: userId,
                      },
                    },
                  },
                };
              }),
            }
          : undefined,
      importDate: importDate || undefined,
    },
  });
};

function processNodes(nodes: Node[]) {
  const findAndProcessDL = (node: Node) => {
    if (node.type === "element" && node.tagName === "dl") {
      processDLChildren(node);
    } else if (
      node.type === "element" &&
      node.children &&
      node.children.length
    ) {
      node.children.forEach((child) => findAndProcessDL(child));
    }
  };

  const processDLChildren = (dlNode: Element) => {
    dlNode.children.forEach((child, i) => {
      if (child.type === "element" && child.tagName === "dt") {
        const nextSibling = dlNode.children[i + 1];
        if (
          nextSibling &&
          nextSibling.type === "element" &&
          nextSibling.tagName === "dd"
        ) {
          const aElement = child.children.find(
            (el) => el.type === "element" && el.tagName === "a"
          );
          if (aElement && aElement.type === "element") {
            // Add the 'dd' element as a child of the 'a' element
            aElement.children.push(nextSibling);
            // Remove the 'dd' from the parent 'dl' to avoid duplicate processing
            dlNode.children.splice(i + 1, 1);
            // Adjust the loop counter due to the removal
          }
        }
      }
    });
  };

  nodes.forEach(findAndProcessDL);
  return nodes;
}

function decodeEntities(encoded: string | undefined): string {
  return decodeHTML(encoded ?? "");
}
