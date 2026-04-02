import type { NextApiRequest, NextApiResponse } from "next";
import searchLinks from "@/lib/api/controllers/search/searchLinks";
import { LinkRequestQuery } from "@linkwarden/types/global";
import verifyUser from "@/lib/api/verifyUser";
import { withDebugLogging } from "@/lib/api/debugLogger";

async function searchHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method === "GET") {
    // Convert the type of the request query to "LinkRequestQuery"
    const convertedData: LinkRequestQuery = {
      sort: Number(req.query.sort as string),
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
      omitMedia: req.query.omitMedia === "true" ? true : undefined,
    };

    const { statusCode, ...data } = await searchLinks({
      userId: user.id,
      query: convertedData,
    });

    return res.status(statusCode).json(data);
  }
}

export default process.env.DEBUG_API === "true"
  ? withDebugLogging(searchHandler)
  : searchHandler;
