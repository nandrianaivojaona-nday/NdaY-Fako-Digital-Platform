// Gate 2 — server-side assignment. Requires campaign config LOCKED.
// Stores configVersionId on the binding (was previously done client-side).
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { resolveClaimsForUser } from "@/lib/auth/mintClaims";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ operatorId: string; campaignId: string }> }
) {
  const { operatorId, campaignId } = await params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let decoded;
  try { decoded = await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const claims = await resolveClaimsForUser(decoded.uid);
  if (claims.role !== "ADMIN" && claims.super_admin !== true) {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const db = getFirestore(getAdminApp());
  const campSnap = await db.collection("campaigns").doc(campaignId).get();
  if (!campSnap.exists) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  const camp = campSnap.data()!;
  const configVersionId = String(camp.currentConfigVersionId ?? "");
  if (!configVersionId) {
    return NextResponse.json({ error: "Campaign config must be LOCKED before assignment" }, { status: 409 });
  }
  const vSnap = await db.collection("campaignConfigVersions").doc(configVersionId).get();
  if (!vSnap.exists || vSnap.data()!.status !== "LOCKED") {
    return NextResponse.json({ error: "Config version is not LOCKED" }, { status: 409 });
  }

  const opSnap = await db.collection("operators").doc(operatorId).get();
  if (!opSnap.exists) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

  const bindingRef = db.collection("operatorCampaigns").doc(`${operatorId}_${campaignId}`);
  await bindingRef.set({
    operatorId,
    campaignId,
    status: "ASSIGNED",
    configVersionId,
    pricingMode: (camp.pricingFramework as any)?.mode ?? "BOUNDED",
    pricingMin: (camp.pricingFramework as any)?.min ?? 2000,
    pricingMax: (camp.pricingFramework as any)?.max ?? 10000,
    pricingRecommended: (camp.pricingFramework as any)?.recommended ?? 5000,
    commission: (camp.financialRules as any)?.commission ?? 10,
    paymentMethods: (camp.financialRules as any)?.methods ?? ["mobile_money"],
    assignedAt: Date.now(),
    assignedBy: decoded.uid,
    updatedAt: Date.now(),
  }, { merge: true });

  await db.collection("campaigns").doc(campaignId).set({
    assignedOperatorId: operatorId,
    status: "OPERATOR_ASSIGNED",
    updatedAt: Date.now(),
  }, { merge: true });

  return NextResponse.json({ ok: true });
}
