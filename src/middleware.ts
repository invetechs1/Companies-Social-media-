import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { publicOrigin } from "@/lib/origin";

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function middleware(req: NextRequest) {
  const token = req.cookies.get("shp_session")?.value;
  let authed = false;
  if (token) {
    try {
      await jwtVerify(token, SECRET);
      authed = true;
    } catch {}
  }
  const { pathname } = req.nextUrl;
  const origin = publicOrigin(req.headers, req.url);
  if (pathname.startsWith("/dashboard") && !authed) {
    return NextResponse.redirect(new URL("/login", origin));
  }
  if ((pathname === "/login" || pathname === "/signup") && authed) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
