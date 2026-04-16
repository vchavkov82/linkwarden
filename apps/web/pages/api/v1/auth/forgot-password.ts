import { prisma } from "@linkwarden/prisma";
import sendPasswordResetRequest from "@/lib/api/sendPasswordResetRequest";
import { ForgotPasswordSchema } from "@linkwarden/lib/schemaValidation";
import type { NextApiRequest, NextApiResponse } from "next";
import { rateLimit } from "@/lib/api/rateLimit";

export default async function forgotPassword(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    if (process.env.NEXT_PUBLIC_DEMO === "true")
      return res.status(400).json({
        response:
          "This action is disabled because this is a read-only demo of Links.",
      });

    const dataValidation = ForgotPasswordSchema.safeParse(req.body);

    if (!dataValidation.success) {
      return res.status(400).json({
        response: `Error: ${
          dataValidation.error.issues[0].message
        } [${dataValidation.error.issues[0].path.join(", ")}]`,
      });
    }

    const { email } = dataValidation.data;

    // In-memory rate limit as first line of defense (avoids DB hit)
    if (!rateLimit(`forgot-password:${email.toLowerCase()}`, 3, 5 * 60 * 1000)) {
      return res.status(400).json({
        response: "Too many requests. Please try again later.",
      });
    }

    const recentPasswordRequestsCount = await prisma.passwordResetToken.count({
      where: {
        identifier: email,
        createdAt: {
          gt: new Date(new Date().getTime() - 1000 * 60 * 5), // 5 minutes
        },
      },
    });

    // Rate limit password reset requests
    if (recentPasswordRequestsCount >= 3) {
      return res.status(400).json({
        response: "Too many requests. Please try again later.",
      });
    }

    const user = await prisma.user.findFirst({
      where: {
        email,
      },
    });

    if (user?.email) {
      sendPasswordResetRequest(user.email, user.name || "Links User");
    }

    return res.status(200).json({
      response:
        "If an account with this email exists, a password reset link has been sent.",
    });
  }
}
