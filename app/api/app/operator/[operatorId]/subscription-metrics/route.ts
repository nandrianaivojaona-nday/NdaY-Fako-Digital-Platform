import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ operatorId: string }> }
) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
  const { operatorId } = await context.params;
  const role = (decoded as any).operatorRole;
  if ((decoded as any).operatorId !== operatorId && role !== "CEO") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const db = getFirestore(getAdminApp());
  const snap = await db
    .collection(collections.subscriptions)
    .where("operatorId", "==", operatorId)
    .get();

  let active = 0;
  let pending = 0;
  let revenueMGA = 0;

  snap.forEach((doc) => {
    const s = doc.data();
    if (s.status === "ACTIVE") active++;
    if (s.status === "PENDING" || s.status === "PENDING_CASH") pending++;
    if (s.validated) revenueMGA += s.amountMGA ?? 0;
  });

  return NextResponse.json({ active, pending, revenueMGA });
}
