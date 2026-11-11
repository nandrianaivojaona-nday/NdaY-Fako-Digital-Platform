import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { approveOffer } from "@/services/offerService";
import type { OperatorRole } from "@/lib/domain/subscription/operatorRoles";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await context.params;
  try {
    const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const role = ((decoded as any).operatorRole ?? "COLLECTOR") as OperatorRole;
    if (role !== "CEO") return NextResponse.json({ error: "Only CEO can approve" }, { status: 403 });

    const { approvalRequestId, note } = await req.json();
    const result = await approveOffer({
      offerId: offerId, approvalRequestId,
      actorUserId: decoded.uid, actorRole: role, note,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}