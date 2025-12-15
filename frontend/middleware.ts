import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Apply COOP for auth pages to avoid blank popup issues with GIS
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPath =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password";

  const response = NextResponse.next();
  if (isAuthPath) {
    response.headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  }
  return response;
}

// Limit middleware to auth routes only
export const config = {
  matcher: ["/login", "/register", "/forgot-password"],
};
