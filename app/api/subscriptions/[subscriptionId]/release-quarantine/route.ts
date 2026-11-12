// Admin releases a quarantined subscription once the operator is validated.
// Does NOT clear legacy:true — the subscription remains marked as pre-gate.
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { resolveClaimsForUser } from "@/lib/auth/mintClaims";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subscriptionId: string }> }
) {
  const { subscriptionId } = await params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let decoded;
  try { decoded = await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const claims = await resolveClaimsForUser(decoded.uid);
  if (claims.role !== "ADMIN" && claims.super_admin !== true) {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { rationale?: string } | null;
  const rationale = (body?.rationale ?? "").trim();
  if (!rationale) return NextResponse.json({ error: "rationale required" }, { status: 400 });

  const db = getFirestore(getAdminApp());
  const subRef = db.collection(collections.subscriptions).doc(subscriptionId);
  const subSnap = await subRef.get();
  if (!subSnap.exists) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  const sub = subSnap.data()!;

  if (sub.quarantined !== true) {
    return NextResponse.json({ error: "Subscription is not quarantined" }, { status: 409 });
  }
  if (!sub.territoryId || !sub.operatorId) {
    return NextResponse.json({ error: "Subscription missing territoryId or operatorId" }, { status: 409 });
  }

  const validationSnap = await db.collection(collections.operatorTerritoryValidations)
    .doc(`${sub.operatorId}_${sub.territoryId}`).get();
  if (!validationSnap.exists || validationSnap.data()?.validated !== true) {
    return NextResponse.json({
      error: `Operator ${sub.operatorId} is not validated for territory ${sub.territoryId}`,
    }, { status: 409 });
  }

  await subRef.update({
    quarantined: false,
    releasedAt: Date.now(),
    releasedBy: decoded.uid,
    releaseRationale: rationale,
    // legacy stays true — the subscription was created before gate enforcement
  });

  return NextResponse.json({
    ok: true,
    subscriptionId,
    operatorId: sub.operatorId,
    territoryId: sub.territoryId,
    note: "legacy:true retained — this subscription predates validation coherence",
  });
}
