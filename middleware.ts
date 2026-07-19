// middleware.ts

import { NextRequest, NextResponse } from "next/server";

import { ROLES } from "@/lib/api/roles";


// -----------------------------
// Public routes
// -----------------------------

const PUBLIC_ROUTES = [
  "/",
  "/login",

  // citizen public flow
  "/citizen",
  "/citizen/subscribe",

  // public operator info
  "/operator",
  "/operator/",
  "/operator/register",

  // future public pages
  "/plans",
  "/about",
];


// -----------------------------
// Helpers
// -----------------------------

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(route + "/")
  );
}


// -----------------------------
// Middleware
// -----------------------------

export function middleware(req: NextRequest) {

  const { pathname } = req.nextUrl;


  // Allow Next / static

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons") ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/assets")
  ) {
    return NextResponse.next();
  }


  // Public pages

  if (isPublic(pathname)) {
    return NextResponse.next();
  }


  // -----------------------------
  // Auth cookie
  // -----------------------------

  const token = req.cookies.get("session")?.value;

  if (!token) {

    const loginUrl = new URL("/login", req.url);

    loginUrl.searchParams.set("redirect", pathname + req.nextUrl.search);


    return NextResponse.redirect(loginUrl);
  }


  // -----------------------------
  // Role cookie
  // -----------------------------

  const role = req.cookies.get("role")?.value;


  // -----------------------------
  // Municipality
  // -----------------------------

  if (pathname.startsWith("/municipality")) {

    if (
      role !== ROLES.MUNICIPALITY_ADMIN &&
      role !== ROLES.SUPER_ADMIN
    ) {
      return NextResponse.redirect(
        new URL("/", req.url)
      );
    }
  }


  // -----------------------------
  // Operator
  // -----------------------------

  if (pathname.startsWith("/operator")) {

    if (
      role !== ROLES.OPERATOR_ADMIN &&
      role !== ROLES.SUPER_ADMIN
    ) {
      return NextResponse.redirect(
        new URL("/", req.url)
      );
    }
  }


  // -----------------------------
  // Collector
  // -----------------------------

  if (pathname.startsWith("/collector")) {

    if (
      role !== ROLES.COLLECTOR &&
      role !== ROLES.SUPER_ADMIN
    ) {
      return NextResponse.redirect(
        new URL("/", req.url)
      );
    }
  }


  // -----------------------------
  // Admin
  // -----------------------------

  if (pathname.startsWith("/admin")) {

    if (role !== ROLES.SUPER_ADMIN) {
      return NextResponse.redirect(
        new URL("/", req.url)
      );
    }
  }


  return NextResponse.next();

}


// -----------------------------
// Matcher
// -----------------------------

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|assets).*)"],
};