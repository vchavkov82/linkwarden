import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * When DEBUG_API=true, log every API request (method, path, rough size).
 * Use `mise run dev:debug` or set DEBUG_API in the environment / .env.dev.
 * Extension and mobile traffic then shows up in the Next.js terminal.
 */
export function middleware(request: NextRequest) {
  if (process.env.DEBUG_API !== "true") {
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
