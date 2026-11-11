// app/api/app/citizen/subscriptions/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { beginSubscriptionCancellation, cancelSubscription, getSubscription } from "@/services/subscriptionService";
import { cancelRemainingEscrow } from "@/services/escrowService";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const { subscriptionId, reason } = await req.json();

    const sub = await getSubscription(subscriptionId);
    if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (sub.citizenId !== decoded.uid) {
      return NextResponse.json({ error: "Not your subscription" }, { status: 403 });
    }

    const cancelReason = reason ?? "Cancelled by citizen";
    await beginSubscriptionCancellation(subscriptionId, decoded.uid, cancelReason);
    await cancelRemainingEscrow({
      escrowId: sub.escrowId,
      reason: cancelReason,
      actorUserId: decoded.uid,
    });

    const updated = await cancelSubscription(subscriptionId, decoded.uid, cancelReason);
    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
