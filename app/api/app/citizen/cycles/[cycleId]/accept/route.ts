import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/collections";
import { acknowledgeCycle } from "@/services/serviceCycleService";
import { runSettlementPipeline } from "@/services/settlementPipelineService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ cycleId: string }> }
) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const cycleDoc = await getFirestore(getAdminApp())
      .collection(collections.serviceCycles).doc((await context.params).cycleId).get();
    if (!cycleDoc.exists) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const cycle = cycleDoc.data()!;
    if (cycle.citizenId !== decoded.uid) {
      return NextResponse.json({ error: "Not your cycle" }, { status: 403 });
    }

    await acknowledgeCycle({
      cycleId: (await context.params).cycleId,
      method: "CITIZEN_APP",
      actorUserId: decoded.uid,
    });

    const pipeline = await runSettlementPipeline((await context.params).cycleId);

    return NextResponse.json({ ok: true, pipelineState: pipeline.state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}