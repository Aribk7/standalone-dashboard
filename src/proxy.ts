import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: send visitors without a session cookie straight to
// sign-in. The dashboard still validates the session on the server.
export function proxy(request: NextRequest) {
  const hasCookie = request.cookies.has("__Host-loop_session") || request.cookies.has("loop_session");
  if (!hasCookie) return NextResponse.redirect(new URL("/", request.url));
  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/:path*",
};
