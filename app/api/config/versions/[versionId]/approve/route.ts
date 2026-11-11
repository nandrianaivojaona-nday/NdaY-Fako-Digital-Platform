import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import type { CampaignConfigApproval } from "@/lib/domain/config/configVersionTypes";

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

  const body = await req.json().catch(() => null) as { decision?: string; rationale?: string } | null;
  const decision = body?.decision;
  const rationale = (body?.rationale ?? "").trim();
  if (decision !== "APPROVED" && decision !== "REJECTED") {
    return NextResponse.json({ error: "decision must be APPROVED or REJECTED" }, { status: 400 });
  }
  if (!rationale) return NextResponse.json({ error: "rationale required" }, { status: 400 });

  const db = getFirestore(getAdminApp());
  const vRef = db.collection("campaignConfigVersions").doc(versionId);
  const vSnap = await vRef.get();
  if (!vSnap.exists) return NextResponse.json({ error: "Version not found" }, { status: 404 });
  const v = vSnap.data()!;

  if (v.status !== "DRAFT") return NextResponse.json({ error: `expected DRAFT, got ${v.status}` }, { status: 409 });
  if (v.createdBy === decoded.uid) return NextResponse.json({ error: "approver must differ from creator" }, { status: 403 });

  const approvalRef = db.collection("campaignConfigApprovals").doc();
  const approval: CampaignConfigApproval = {
    approvalId: approvalRef.id, versionId, approverUserId: decoded.uid,
    decision, rationale, timestamp: Date.now(),
  };

  await db.runTransaction(async (tx) => {
    tx.set(approvalRef, approval);
    if (decision === "APPROVED") tx.update(vRef, { status: "APPROVED", approvedAt: Date.now() });
  });

  return NextResponse.json({ ok: true, approvalId: approvalRef.id, decision });
}
