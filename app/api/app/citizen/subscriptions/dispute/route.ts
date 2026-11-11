// app/api/app/citizen/subscriptions/dispute/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { openDispute } from "@/services/escrowService";
import { getSubscription } from "@/services/subscriptionService";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const { subscriptionId, cycleId, serviceProofId, reason } = await req.json();
    if (!subscriptionId || !cycleId || !serviceProofId || !reason) {
      return NextResponse.json({ error: "subscriptionId, cycleId, serviceProofId and reason required" }, { status: 400 });
    }

    const sub = await getSubscription(subscriptionId);
    if (!sub || sub.citizenId !== decoded.uid) {
      return NextResponse.json({ error: "Not your subscription" }, { status: 403 });
    }

    const proofDoc = await getFirestore(getAdminApp())
      .collection("serviceProofs").doc(serviceProofId).get();
    if (!proofDoc.exists) {
      return NextResponse.json({ error: "Service proof not found" }, { status: 404 });
    }
    const proof = proofDoc.data()!;
    if (proof.cycleId !== cycleId || proof.subscriptionId !== subscriptionId) {
      return NextResponse.json({ error: "Service proof does not match this subscription cycle" }, { status: 409 });
    }

    const cycleDoc = await getFirestore(getAdminApp()).collection("serviceCycles").doc(cycleId).get();
    if (!cycleDoc.exists || cycleDoc.get("subscriptionId") !== subscriptionId) {
      return NextResponse.json({ error: "Service cycle not found" }, { status: 404 });
    }

    // 72h window after collection
    if (Date.now() > proof.disputeDeadline) {
      return NextResponse.json({ error: "Dispute window closed" }, { status: 400 });
    }

    const dispute = await openDispute({
      escrowId: sub.escrowId,
      subscriptionId,
      cycleId,
      serviceProofId,
      citizenId: decoded.uid,
      operatorId: sub.operatorId ?? "",
      reason,
      amountMGA: cycleDoc.get("entitlementValueMGA"),
    });

    return NextResponse.json(dispute);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
