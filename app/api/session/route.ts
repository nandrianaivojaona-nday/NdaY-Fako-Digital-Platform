import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { role } = await req.json();

  const res = NextResponse.json({ ok: true });

  res.cookies.set("session", "active", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  res.cookies.set("role", role || "SUPER_ADMIN", {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
  });

  return res;
}