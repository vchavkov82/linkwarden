type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean expired entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
setInterval(() => {
  const now = Date.now();
  store.forEach((entry, key) => {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  });
}, CLEANUP_INTERVAL).unref();

/**
 * Simple in-memory rate limiter. Returns true if the request is allowed,
 * false if rate limit exceeded.
 *
 * @param key - Unique identifier (e.g. IP address, username)
 * @param maxAttempts - Max attempts within the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count++;
  if (entry.count > maxAttempts) {
    return false;
  }

  return true;
}
