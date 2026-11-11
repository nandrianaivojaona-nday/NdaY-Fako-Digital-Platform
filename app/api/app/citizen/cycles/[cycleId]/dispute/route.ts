import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/collections";
import { transitionCycle } from "@/services/serviceCycleService";
import { openDispute } from "@/services/escrowService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> }
) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const { reason } = await req.json();

    const { cycleId } = await context.params;

    const db = getFirestore(getAdminApp());
    const cycleDoc = await db.collection(collections.serviceCycles).doc(cycleId).get();
    if (!cycleDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const cycle = cycleDoc.data()!;
    if (cycle.citizenId !== decoded.uid) {
      return NextResponse.json({ error: "Not your cycle" }, { status: 403 });
    }
    if (cycle.status !== "VERIFIED") {
      return NextResponse.json({ error: "Can only dispute verified cycles" }, { status: 400 });
    }
    if (cycle.acceptance?.autoAcceptAt && Date.now() > cycle.acceptance.autoAcceptAt) {
      return NextResponse.json({ error: "Dispute window closed" }, { status: 400 });
    }

    await transitionCycle({
      cycleId,
      transition: "DISPUTE",
      actor: "CITIZEN",
      actorUserId: decoded.uid,
    });

    const subDoc = await db.collection(collections.subscriptions).doc(cycle.subscriptionId).get();
    const sub = subDoc.data()!;

    const dispute = await openDispute({
      escrowId: sub.escrowId,
      subscriptionId: cycle.subscriptionId,
      serviceProofId: cycle.proof?.proofId ?? cycleId,
      cycleId,
      citizenId: decoded.uid,
      operatorId: cycle.operatorId,
      reason,
      amountMGA: cycle.entitlementValueMGA ?? Math.round(sub.amountMGA / sub.expectedCollections),
    });

    return NextResponse.json(dispute);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}