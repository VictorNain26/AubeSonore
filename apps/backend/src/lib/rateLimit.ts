// In-memory IP rate limiter.
//
// Same multi-instance caveat as `lib/cache/ttlCache.ts`: each replica keeps
// its own counter, so the *effective* limit per IP is `limit × replicas`.
// Acceptable today (mono-instance); migrate to Redis with the other
// in-memory state when horizontal scaling is enabled. See CLAUDE.md
// "Scaling roadmap" for the trigger.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const SWEEP_INTERVAL_MS = 5 * 60_000;

// Periodic eviction of expired buckets so the Map doesn't grow unbounded.
// `unref()` so the timer doesn't block process exit in tests.
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
if (typeof sweepTimer.unref === 'function') sweepTimer.unref();

/**
 * Per-IP fixed-window rate check.
 * Returns true if the request fits in the current window, false if rejected.
 *
 * @param scope  logical bucket name (e.g. 'artist'), keeps endpoints independent
 * @param ip     caller identity (typically the first x-forwarded-for IP)
 * @param limit  max requests within the window
 * @param windowMs window size in milliseconds
 */
export function checkRate(scope: string, ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const key = `${scope}:${ip}`;
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

/**
 * Extract caller IP from request headers. Honors x-forwarded-for (the first
 * IP is the original client; subsequent entries are proxies). Falls back to
 * `'anon'` so absence of header isn't a free pass for the same caller.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip')?.trim() || 'anon';
}

/** @internal Test-only reset. */
export function __resetRateLimits(): void {
  buckets.clear();
}
