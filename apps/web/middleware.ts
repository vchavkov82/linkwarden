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

export function middleware(request: NextRequest) {
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
