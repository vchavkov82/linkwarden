import { prisma } from "@linkwarden/prisma";
import { auditLog } from "@/lib/api/auditLog";

export default async function deleteToken(userId: number, tokenId: number) {
  if (!tokenId)
    return { response: "Please choose a valid token.", status: 401 };

  const tokenExists = await prisma.accessToken.findFirst({
    where: {
      id: tokenId,
      userId,
    },
  });

  if (!tokenExists)
    return { response: "Token not found.", status: 404 };

  const revokedToken = await prisma.accessToken.update({
    where: {
      id: tokenExists.id,
    },
    data: {
      revoked: true,
    },
  });

  auditLog({
    event: "token.revoked",
    userId,
    detail: `tokenId=${tokenId}`,
  });

  return { response: revokedToken, status: 200 };
}
