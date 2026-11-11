// Phase 2 scaffold: new trusted ingestion endpoint, beside the existing
// /api/app/collector/pickup (which stays live until this is proven).
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { logPickup } from "@/services/collectorService";
import { ServiceEventInput } from "@/lib/domain/events/serviceEventSchema";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const cookie = req.cookies.get("session")?.value;
  let decoded;
  try {
    decoded = cookie
      ? await getAuth(getAdminApp()).verifySessionCookie(cookie, true)
      : await getAuth(getAdminApp()).verifyIdToken(token);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const body = await req.json().catch(() => null);
  const parsed = ServiceEventInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", issues: parsed.error.issues }, { status: 400 });
  }

  const db = getFirestore(getAdminApp());
  const idemRef = db.collection("service_event_idempotency").doc(parsed.data.idempotencyKey);
  const hit = await idemRef.get();
  if (hit.exists) return NextResponse.json({ ok: true, eventId: hit.get("eventId") });

  try {
    await logPickup({
      collectorId: decoded.uid,
      subscriptionId: parsed.data.subscriptionId,
      stopId: parsed.data.stopId,
      weights: parsed.data.weights,
      sortingCompliant: parsed.data.sortingCompliant,
      gps: parsed.data.gps,
      photoUrls: parsed.data.photoUrls,
    });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 400 }); }

  const eventRef = db.collection("service_events").doc();
  await db.runTransaction(async (tx) => {
    const seen = await tx.get(idemRef);
    if (seen.exists) return;
    tx.create(eventRef, {
      eventId: eventRef.id, idempotencyKey: parsed.data.idempotencyKey,
      collectorId: decoded.uid, subscriptionId: parsed.data.subscriptionId,
      stopId: parsed.data.stopId, weights: parsed.data.weights,
      sortingCompliant: parsed.data.sortingCompliant,
      gps: parsed.data.gps ?? null, photoUrls: parsed.data.photoUrls ?? [],
      status: "SUBMITTED", serverTimestamp: Date.now(),
    });
    tx.create(idemRef, { eventId: eventRef.id, createdAt: Date.now() });
  });
  return NextResponse.json({ ok: true, eventId: eventRef.id });
}
