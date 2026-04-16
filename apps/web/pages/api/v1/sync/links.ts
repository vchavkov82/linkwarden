import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import getSyncLinks from "@/lib/api/controllers/sync/getSyncLinks";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method === "GET") {
    const result = await getSyncLinks(user.id, {
      since: req.query.since as string | undefined,
      collectionId: req.query.collectionId
        ? Number(req.query.collectionId)
        : undefined,
    });
    return res.status(result.status).json({ response: result.response });
  }

  return res.status(405).json({ response: "Method not allowed." });
}
