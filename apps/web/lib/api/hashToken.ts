import crypto from "crypto";

/**
 * Hash a token JTI with SHA-256 for secure storage.
 * Tokens are high-entropy random UUIDs, so SHA-256 is sufficient
 * (no need for bcrypt/scrypt which are designed for low-entropy passwords).
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
