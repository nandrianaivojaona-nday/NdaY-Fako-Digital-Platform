import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { confirmPayout, failPayout, instructPayout, retryPayout } from "@/services/payoutService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ payoutId: string }> },
) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let decoded;
  try {
    decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
  const claims = decoded as typeof decoded & { role?: string; admin?: boolean; super_admin?: boolean };
  if (claims.role !== "ADMIN" && claims.admin !== true && claims.super_admin !== true) {
    return NextResponse.json({ error: "Finance administrator access required" }, { status: 403 });
  }

  try {
    const { payoutId } = await context.params;
    const body = await req.json();
    if (body.action === "INSTRUCT") {
      await instructPayout(payoutId, String(body.providerReference ?? ""), decoded.uid);
    } else if (body.action === "CONFIRM") {
      await confirmPayout(payoutId, decoded.uid);
    } else if (body.action === "FAIL") {
      await failPayout(payoutId, String(body.reason ?? ""), decoded.uid);
    } else if (body.action === "RETRY") {
      await retryPayout(payoutId, decoded.uid);
    } else {
      return NextResponse.json({ error: "action must be INSTRUCT, CONFIRM, FAIL, or RETRY" }, { status: 400 });
    }

    const payout = await getFirestore(getAdminApp())
      .collection(collections.settlementPayouts).doc(payoutId).get();
    return NextResponse.json({ payout: payout.data() ?? null });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not update payout" }, { status: 409 });
  }
}
