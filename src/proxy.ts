import { NextResponse, type NextRequest } from "next/server";
import { previewModeEnabled } from "@/lib/preview";

// Optimistic check only: send visitors without a session cookie straight to
// sign-in. The dashboard still validates the session on the server.
export function proxy(request: NextRequest) {
  if (previewModeEnabled()) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: { code: "setup_pending", message: "Live sign-in and reporting are disabled in this sample preview." } },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.next();
  const hasCookie = request.cookies.has("__Host-loop_session") || request.cookies.has("loop_session");
  if (!hasCookie) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
};
