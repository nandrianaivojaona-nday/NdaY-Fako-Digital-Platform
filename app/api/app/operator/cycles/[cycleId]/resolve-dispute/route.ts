import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/collections";
import { transitionCycle } from "@/services/serviceCycleService";
import { runSettlementPipeline } from "@/services/settlementPipelineService";
import { refundForRejectedCycle } from "@/services/escrowService";
import type { DisputeResolutionReason } from "@/lib/domain/service/cycleTypes";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> }
) {
  const { cycleId } = await context.params;
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const role = (decoded as any).operatorRole as string;
    if (!["CEO", "OPERATOR_ADMIN", "MANAGER"].includes(role)) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { resolution, reasonCode, note } = await req.json() as {
      resolution: "release" | "refund";
      reasonCode: DisputeResolutionReason;
      note?: string;
    };

    const db = getFirestore(getAdminApp());
    const cycleDoc = await db.collection(collections.serviceCycles).doc(cycleId).get();
    if (!cycleDoc.exists) return NextResponse.json({ error: "Cycle not found" }, { status: 404 });
    const cycle = cycleDoc.data()!;
    if (role !== "CEO" && (decoded as any).operatorId !== cycle.operatorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const subDoc = await db.collection(collections.subscriptions).doc(cycle.subscriptionId).get();
    if (!subDoc.exists) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    const sub = subDoc.data()!;

    if (resolution === "release") {
      if (cycle.status === "DISPUTED") {
        await transitionCycle({
          cycleId,
          transition: "RESOLVE_DISPUTE_RELEASE",
          actor: "MANAGER",
          actorUserId: decoded.uid,
        });
        await db.collection(collections.serviceCycles).doc(cycleId).update({
          "acceptance.resolution": {
            outcome: "RELEASE", reasonCode, reasonNote: note,
            resolvedAt: Date.now(), resolvedBy: decoded.uid,
          },
        });
      } else if (cycle.status !== "ACCEPTED" && cycle.status !== "SETTLED") {
        return NextResponse.json({ error: `Cannot release dispute from ${cycle.status}` }, { status: 409 });
      }
      const pipeline = await runSettlementPipeline(cycleId);
      return NextResponse.json({ resolution: "released", pipelineState: pipeline.state });
    }

    if (resolution === "refund") {
      const refund = await refundForRejectedCycle({
        escrowId: sub.escrowId,
        cycleId,
        serviceProofId: cycle.proof?.proofId,
        reason: `${reasonCode}: ${note ?? ""}`,
      });
      if (cycle.status === "DISPUTED") {
        await transitionCycle({
          cycleId,
          transition: "RESOLVE_DISPUTE_REFUND",
          actor: "MANAGER",
          actorUserId: decoded.uid,
        });
        await db.collection(collections.serviceCycles).doc(cycleId).update({
          "acceptance.resolution": {
            outcome: "REFUND", reasonCode, reasonNote: note,
            resolvedAt: Date.now(), resolvedBy: decoded.uid,
          },
        });
      } else if (cycle.status !== "REJECTED") {
        return NextResponse.json({ error: `Cannot refund dispute from ${cycle.status}` }, { status: 409 });
      }
      return NextResponse.json({
        resolution: refund.refundPendingMGA > 0 ? "refund_pending" : "refunded",
        refundedMGA: refund.refundedMGA,
        refundPendingMGA: refund.refundPendingMGA,
      });
    }

    return NextResponse.json({ error: "Unknown resolution" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
