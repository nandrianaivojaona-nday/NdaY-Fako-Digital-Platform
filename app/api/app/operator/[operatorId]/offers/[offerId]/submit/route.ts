import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { submitOffer } from "@/services/offerService";
import type { OperatorRole } from "@/lib/domain/subscription/operatorRoles";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await context.params;
  try {
    const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const result = await submitOffer({
      offerId: offerId,
      actorUserId: decoded.uid,
      actorRole: ((decoded as any).operatorRole ?? "COLLECTOR") as OperatorRole,
    });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}