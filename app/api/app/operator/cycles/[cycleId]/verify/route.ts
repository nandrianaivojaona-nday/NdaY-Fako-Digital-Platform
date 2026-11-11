import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { verifyCycle } from "@/services/serviceCycleService";
import { refundForRejectedCycle } from "@/services/escrowService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> },
) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const claims = decoded as typeof decoded & { operatorRole?: string; operatorId?: string };
    if (!["SUPERVISOR", "MANAGER", "CEO"].includes(claims.operatorRole ?? "")) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
    const { cycleId } = await context.params;
    const cycleRef = getFirestore(getAdminApp()).collection(collections.serviceCycles).doc(cycleId);
    const cycleDoc = await cycleRef.get();
    if (!cycleDoc.exists) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    const cycle = cycleDoc.data()!;
    if (claims.operatorRole !== "CEO" && claims.operatorId !== cycle.operatorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = await req.json() as { outcome?: string; note?: string };
    if (!["PASSED", "PASSED_WITH_WARNINGS", "REJECTED"].includes(body.outcome ?? "")) {
      return NextResponse.json({ error: "outcome must be PASSED, PASSED_WITH_WARNINGS, or REJECTED" }, { status: 400 });
    }
    const verification = {
      outcome: body.outcome as "PASSED" | "PASSED_WITH_WARNINGS" | "REJECTED",
      verifiedAt: Date.now(),
      verifiedBy: decoded.uid,
      rules: ["SUPERVISOR_REVIEW"],
      warnings: body.note ? [body.note] : [],
    };
    let updated = cycle;
    if (cycle.status === "PROOF_CAPTURED") {
      updated = await verifyCycle({
        cycleId,
        actorUserId: decoded.uid,
        actor: "SUPERVISOR",
        verification,
      });
    } else if (cycle.status !== "REJECTED" || verification.outcome !== "REJECTED") {
      return NextResponse.json({ error: `Cannot review cycle in ${cycle.status}` }, { status: 409 });
    }
    if (verification.outcome === "REJECTED") {
      const subDoc = await getFirestore(getAdminApp()).collection(collections.subscriptions).doc(cycle.subscriptionId).get();
      if (!subDoc.exists) throw new Error("Subscription not found");
      const refund = await refundForRejectedCycle({
        escrowId: subDoc.get("escrowId"),
        cycleId,
        serviceProofId: cycle.proof?.proofId,
        reason: body.note ?? "Service proof rejected during supervisor review",
      });
      return NextResponse.json({ cycle: updated, refund });
    }
    return NextResponse.json({ cycle: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Verification failed" }, { status: 400 });
  }
}
