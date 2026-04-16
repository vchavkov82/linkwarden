import { NextApiRequest } from "next";
import { JWT, getToken } from "next-auth/jwt";
import { prisma } from "@linkwarden/prisma";
import { hashToken } from "./hashToken";

type Props = {
  req: NextApiRequest;
};

export default async function verifyToken({
  req,
}: Props): Promise<JWT | string> {
  const token = await getToken({ req });
  const userId = token?.id;

  if (!userId) {
    return "You must be logged in.";
  }

  if (token.exp < Date.now() / 1000) {
    return "Your session has expired, please log in again.";
  }

  // check if token is revoked (compare hashed JTI)
  const hashedJti = token.jti ? hashToken(token.jti) : undefined;
  const revoked = hashedJti
    ? await prisma.accessToken.findFirst({
        where: {
          token: hashedJti,
          revoked: true,
        },
      })
    : null;

  if (revoked) {
    return "Your session has expired, please log in again.";
  }

  // Update lastUsedAt for access tokens
  if (hashedJti) {
    prisma.accessToken
      .updateMany({
        where: { token: hashedJti, revoked: false },
        data: { lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return token;
}
