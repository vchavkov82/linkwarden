export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  retryableCodes = ["P2002", "P2034"]
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (retryableCodes.includes(error?.code) && attempt < maxRetries) {
        const jitter = Math.random() * 50;
        const delay = Math.min(100 * Math.pow(2, attempt - 1) + jitter, 2000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error("withRetry exhausted"); // unreachable
}
