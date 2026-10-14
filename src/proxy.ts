import { NextResponse, type NextRequest } from "next/server";

/*
 * Optimistic auth check: bounce visitors without a session cookie to /login
 * before rendering. The real check (session lookup + role) happens in the
 * data access layer on every request.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("cd_session")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/clients/:path*", "/projects/:path*", "/invoices/:path*", "/team/:path*", "/settings/:path*"],
};
