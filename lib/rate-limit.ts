/**
 * Simple in-memory rate limiter using sliding window.
 * No external dependencies required.
 * For production at scale, consider @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60_000);
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSec: number;
}

export const RATE_LIMITS = {
  auth: { limit: 10, windowSec: 60 } as RateLimitConfig,       // 10 req/min for login/register
  api: { limit: 60, windowSec: 60 } as RateLimitConfig,        // 60 req/min for general API
  ai: { limit: 10, windowSec: 60 } as RateLimitConfig,         // 10 req/min for AI analysis
  admin: { limit: 30, windowSec: 60 } as RateLimitConfig,      // 30 req/min for admin
  webhook: { limit: 100, windowSec: 60 } as RateLimitConfig,   // 100 req/min for webhooks
} as const;

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + config.windowSec * 1000;
    store.set(key, { count: 1, resetAt });
    return { success: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { success: true, remaining: config.limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
