/**
 * Simple in-memory rate limiter using Cloudflare's Cache API.
 * For production, pair with Cloudflare Rate Limiting rules at the edge.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * @returns true if the action should be allowed, false if rate-limited.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= maxRequests) {
    return false;
  }

  bucket.count += 1;
  return true;
}

/** Clean up expired entries (call periodically to avoid memory growth) */
export function pruneRateLimits(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}
