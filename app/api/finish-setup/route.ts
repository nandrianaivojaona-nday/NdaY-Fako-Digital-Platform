import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST() {
  const db = adminDb();

  return NextResponse.json({ ok: true });
}
