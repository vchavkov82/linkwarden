import type { NextApiRequest, NextApiResponse } from "next";
import verifyUser from "@/lib/api/verifyUser";
import getSyncStatus from "@/lib/api/controllers/sync/getSyncStatus";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const user = await verifyUser({ req, res });
  if (!user) return;

  if (req.method === "GET") {
    const result = await getSyncStatus(user.id);
    return res.status(result.status).json({ response: result.response });
  }

  return res.status(405).json({ response: "Method not allowed." });
}
