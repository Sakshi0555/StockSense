import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyToken } from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const session = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);

  // Stale session (user deleted): drop the cookie instead of bouncing to /dashboard forever.
  if (pathname === "/login" && req.nextUrl.searchParams.has("expired")) {
    const res = NextResponse.redirect(new URL("/login", req.url));
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (!session && !isPublic) return NextResponse.redirect(new URL("/login", req.url));
  if (session && isPublic) return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
