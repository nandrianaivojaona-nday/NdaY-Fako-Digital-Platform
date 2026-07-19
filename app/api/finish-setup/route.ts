import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/firebase-admin";

export async function POST() {
  const db = adminDb;

  return NextResponse.json({ ok: true });
}
