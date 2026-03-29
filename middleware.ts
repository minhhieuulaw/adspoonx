import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge middleware: rate limiting for API routes.
 * Uses a simple token bucket per IP + route prefix.
 *
 * Note: Edge runtime doesn't support Node.js Map across requests in serverless,
 * but on Coolify/Docker (single instance) this works perfectly.
 * For multi-instance, migrate to Upstash Redis.
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Cleanup expired entries periodically
let lastCleanup = Date.now();
function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < 30_000) return; // every 30s
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}

function checkRate(key: string, limit: number, windowMs: number): boolean {
  cleanup();
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function getIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

// Rate limit configs per route prefix
const LIMITS: Record<string, { limit: number; windowMs: number }> = {
  "/api/auth/register": { limit: 5, windowMs: 60_000 },     // 5 registrations/min
  "/api/auth":          { limit: 20, windowMs: 60_000 },     // 20 auth requests/min
  "/api/ai/":           { limit: 10, windowMs: 60_000 },     // 10 AI calls/min
  "/api/admin/":        { limit: 30, windowMs: 60_000 },     // 30 admin calls/min
  "/api/webhook/":      { limit: 100, windowMs: 60_000 },    // 100 webhook calls/min
  "/api/":              { limit: 60, windowMs: 60_000 },      // 60 general API calls/min
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const ip = getIp(req);

  // Find matching rate limit (most specific first)
  for (const [prefix, config] of Object.entries(LIMITS)) {
    if (pathname.startsWith(prefix)) {
      const key = `${ip}:${prefix}`;
      if (!checkRate(key, config.limit, config.windowMs)) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: { "Retry-After": "60" },
          },
        );
      }
      break;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
