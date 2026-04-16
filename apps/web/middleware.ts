import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Log every /api request when debug is enabled.
 *
 * API routes run in Node and see DEBUG_API from the shell (mise dev:debug).
 * Middleware runs on the Edge runtime and often does NOT inherit shell-only
 * env unless it is in a .env file — Next inlines NEXT_PUBLIC_* reliably, so
 * dev:debug sets both DEBUG_API and NEXT_PUBLIC_DEBUG_API.
 */
function isApiDebugEnabled(): boolean {
  return (
    process.env.DEBUG_API === "true" ||
    process.env.NEXT_PUBLIC_DEBUG_API === "true"
  );
}

// --- IP-based API rate limiting ---
// 200 requests per minute per IP. Lightweight in-memory store.
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 200;

const ipHits = new Map<string, { count: number; resetAt: number }>();

// Lazy cleanup: prune expired entries when map grows large
function pruneExpired() {
  if (ipHits.size < 10000) return;
  const now = Date.now();
  ipHits.forEach((entry, key) => {
    if (now > entry.resetAt) ipHits.delete(key);
  });
}

function checkRateLimit(ip: string): boolean {
  pruneExpired();
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

export function middleware(request: NextRequest) {
  // Rate limit API requests
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { response: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  // Debug logging
  if (!isApiDebugEnabled()) {
    return NextResponse.next();
  }

  const url = request.nextUrl;
  const ua = request.headers.get("user-agent") ?? "";
  const ct = request.headers.get("content-type") ?? "";
  const cl = request.headers.get("content-length") ?? "";

  console.log(
    `[DEBUG_API] ${request.method} ${url.pathname}${url.search} | content-type=${ct || "-"} | content-length=${cl || "-"} | ua=${ua.slice(0, 140)}${ua.length > 140 ? "…" : ""}`
  );

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
