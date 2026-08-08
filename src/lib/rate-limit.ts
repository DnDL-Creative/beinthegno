/* ═══════════════════════════════════════════════════════════════════
   In-memory fixed-window rate limiter.

   Deliberately dependency-free and per-instance. This is NOT a
   distributed limiter — on serverless each instance keeps its own
   counters, so a determined attacker hitting many cold instances gets
   more than `limit`. It still removes the trivial single-client flood
   (one script hammering /api/newsletter to pollute itg_subscribers and
   burn Resend quota), which is the realistic threat for a small store.

   Upgrade path if abuse ever shows up: swap the Map for Upstash Redis
   or a Supabase table — the call signature stays the same.
   ═══════════════════════════════════════════════════════════════════ */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const MAX_TRACKED = 10_000; // bound memory against key-space flooding

/** Sweep expired buckets; called opportunistically on write. */
function prune(now: number): void {
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets (for Retry-After). */
  retryAfter: number;
};

/**
 * @param key      caller identity (IP + route)
 * @param limit    max requests per window
 * @param windowMs window length in ms
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED) prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { ok: true, remaining: limit - existing.count, retryAfter: 0 };
}

/**
 * Best-effort client IP. Vercel sets x-forwarded-for; the leftmost entry
 * is the client. Falls back to a constant so a missing header degrades to
 * a shared bucket (fails CLOSED-ish) rather than unlimited.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
