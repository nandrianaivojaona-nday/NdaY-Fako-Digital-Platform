import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { rejectOffer } from "@/services/offerService";
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
    if (role !== "CEO") return NextResponse.json({ error: "Only CEO can reject" }, { status: 403 });

    const { approvalRequestId, reason } = await req.json();
    await rejectOffer({
      offerId: offerId, approvalRequestId,
      actorUserId: decoded.uid, actorRole: role, reason,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}