// Phase 1 scaffold: APPROVED -> LOCKED with contentHash; sets campaigns.currentConfigVersionId.
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import crypto from "node:crypto";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  try { await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  if ((decoded as any).role !== "ADMIN" && (decoded as any).super_admin !== true) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { versionId } = await req.json().catch(() => ({}));
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });

  const db = getFirestore(getAdminApp());
  const vRef = db.collection("campaignConfigVersions").doc(versionId);
  const snap = await vRef.get();
  if (!snap.exists) return NextResponse.json({ error: "not found" }, { status: 404 });
  const v = snap.data()!;
  if (v.status !== "APPROVED") return NextResponse.json({ error: `expected APPROVED, got ${v.status}` }, { status: 409 });

  const canonical = JSON.stringify({
    pricingFramework: v.pricingFramework,
    financialRules: v.financialRules,
    operatorRequirements: v.operatorRequirements,
  });
  const contentHash = crypto.createHash("sha256").update(canonical).digest("hex");
  const now = Date.now();

  await db.runTransaction(async (tx) => {
    // supersede previous LOCKED version for the same campaign
    const prev = await tx.get(db.collection("campaignConfigVersions")
      .where("campaignId", "==", v.campaignId)
      .where("status", "==", "LOCKED"));
    prev.forEach((d) => tx.update(d.ref, { status: "SUPERSEDED" }));
    tx.update(vRef, { status: "LOCKED", contentHash });
    tx.set(db.collection("campaigns").doc(v.campaignId),
           { currentConfigVersionId: versionId, configLockedAt: now }, { merge: true });
  });

  return NextResponse.json({ ok: true, versionId, contentHash });
}
