import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { computeContentHash } from "@/lib/domain/config/hashConfig";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ versionId: string }> }
) {
  const { versionId } = await params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let decoded;
  try { decoded = await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const role = (decoded as any).role;
  if (role !== "ADMIN" && (decoded as any).super_admin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const db = getFirestore(getAdminApp());
  const vRef = db.collection("campaignConfigVersions").doc(versionId);
  const vSnap = await vRef.get();
  if (!vSnap.exists) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  const v = vSnap.data()!;

  if (v.status !== "APPROVED") return NextResponse.json({ error: `expected APPROVED, got ${v.status}` }, { status: 409 });

  const contentHash = computeContentHash({
    pricingFramework: v.pricingFramework, financialRules: v.financialRules,
    operatorRequirements: v.operatorRequirements,
  });
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    const prev = await tx.get(db.collection("campaignConfigVersions")
      .where("campaignId", "==", v.campaignId)
      .where("status", "==", "LOCKED"));
    prev.forEach((d) => tx.update(d.ref, { status: "SUPERSEDED" }));
    tx.update(vRef, { status: "LOCKED", contentHash, lockedAt: now });
    tx.set(db.collection("campaigns").doc(v.campaignId),
      { currentConfigVersionId: versionId, configLockedAt: now }, { merge: true });
  });

  return NextResponse.json({ ok: true, versionId, contentHash });
}
