export function register() {
  const required = ["NEXTAUTH_SECRET", "DATABASE_URL"] as const;
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}. ` +
        `See .env.sample for reference.`
    );
  }
}
