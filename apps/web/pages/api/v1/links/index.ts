import type { NextApiRequest, NextApiResponse } from "next";
import getLinks from "@/lib/api/controllers/links/getLinks";
import postLink from "@/lib/api/controllers/links/postLink";
import postLinksBulk from "@/lib/api/controllers/links/bulk/postLinksBulk";
import { LinkRequestQuery } from "@linkwarden/types/global";
import verifyUser from "@/lib/api/verifyUser";
import deleteLinksById from "@/lib/api/controllers/links/bulk/deleteLinksById";
import updateLinks from "@/lib/api/controllers/links/bulk/updateLinks";
import { withDebugLogging } from "@/lib/api/debugLogger";

async function linksHandler(req: NextApiRequest, res: NextApiResponse) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method === "GET") {
    const sortNum = Number(req.query.sort as string);
    const convertedData: LinkRequestQuery = {
      sort: Number.isNaN(sortNum) ? 0 : sortNum,
      cursor: req.query.cursor ? Number(req.query.cursor as string) : undefined,
      collectionId: req.query.collectionId
        ? Number(req.query.collectionId as string)
        : undefined,
      tagId: req.query.tagId ? Number(req.query.tagId as string) : undefined,
      pinnedOnly: req.query.pinnedOnly
        ? req.query.pinnedOnly === "true"
        : undefined,
      searchQueryString: req.query.searchQueryString
        ? (req.query.searchQueryString as string)
        : undefined,
    };

    const links = await getLinks(user.id, convertedData);
    return res.status(links.status).json({ response: links.response });
  } else if (req.method === "POST") {
    if (process.env.NEXT_PUBLIC_DEMO === "true")
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });

    if (Array.isArray(req.body.links)) {
      const result = await postLinksBulk(req.body, user.id);
      return res.status(result.status).json({ response: result.response });
    }

    const newlink = await postLink(req.body, user.id);
    return res.status(newlink.status).json({
      response: newlink.response,
    });
  } else if (req.method === "PUT") {
    if (process.env.NEXT_PUBLIC_DEMO === "true")
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });

    if (
      !req.body.links ||
      !Array.isArray(req.body.links) ||
      req.body.links.length === 0
    ) {
      return res.status(400).json({ response: "Invalid or missing links array." });
    }

    const updated = await updateLinks(
      user.id,
      req.body.links,
      req.body.removePreviousTags,
      req.body.newData
    );

    return res.status(updated.status).json({
      response: updated.response,
    });
  } else if (req.method === "DELETE") {
    if (process.env.NEXT_PUBLIC_DEMO === "true")
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Linkwarden.",
      });

    if (
      !req.body.linkIds ||
      !Array.isArray(req.body.linkIds) ||
      req.body.linkIds.length === 0
    ) {
      return res.status(400).json({ response: "Invalid or missing linkIds array." });
    }

    const deleted = await deleteLinksById(user.id, req.body.linkIds);
    return res.status(deleted.status).json({
      response: deleted.response,
    });
  } else {
    return res.status(405).json({ response: "Method not allowed." });
  }
}

export default process.env.DEBUG_API === "true"
  ? withDebugLogging(linksHandler)
  : linksHandler;
