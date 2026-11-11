import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { logPickup } from "@/services/collectorService";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const sessionCookie = req.cookies.get("session")?.value;

  try {
    const decoded = sessionCookie
      ? await getAuth(getAdminApp()).verifySessionCookie(sessionCookie, true)
      : await getAuth(getAdminApp()).verifyIdToken(token);

    const body = await req.json();
    await logPickup({
      collectorId: decoded.uid,
      subscriptionId: body.subscriptionId,
      stopId: body.stopId,
      weights: body.weights,
      sortingCompliant: body.sortingCompliant,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
