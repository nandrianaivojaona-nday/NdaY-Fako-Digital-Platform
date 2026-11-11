// Phase 0 regression fix — server-side operator self-registration into a campaign.
// Admin SDK bypasses the isAdminLike() campaign-write rule; this route enforces
// the correct authorization: caller must be an admin, OR belong to that operator.
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { resolveClaimsForUser } from "@/lib/auth/mintClaims";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ campaignId: string; operatorId: string }> }
) {
  const { campaignId, operatorId } = await params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let decoded;
  try { decoded = await getAuth(getAdminApp()).verifyIdToken(token); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

  const claims = await resolveClaimsForUser(decoded.uid);
  const isAdmin = claims.role === "ADMIN" || claims.super_admin === true;
  const isOwnOperator = claims.role === "OPERATOR" && claims.operatorId === operatorId;
  if (!isAdmin && !isOwnOperator) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null) as { name?: string } | null;
  const name = (body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const db = getFirestore(getAdminApp());
  const campRef = db.collection("campaigns").doc(campaignId);
  const campSnap = await campRef.get();
  if (!campSnap.exists) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  await campRef.update({
    [`operators.${operatorId}`]: {
      name,
      status: "active",
      joinedAt: Date.now(),
    },
  });

  return NextResponse.json({ ok: true });
}
