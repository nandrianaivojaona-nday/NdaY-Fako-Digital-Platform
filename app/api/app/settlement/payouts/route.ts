import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getFirestore } from "firebase-admin/firestore";
import { collections } from "@/lib/firebase/collections";

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const claims = decoded as typeof decoded & { role?: string; admin?: boolean; super_admin?: boolean; operatorId?: string };
    const isAdmin = claims.role === "ADMIN" || claims.admin === true || claims.super_admin === true;
    const operatorId = claims.operatorId;
    if (!isAdmin && !operatorId) return NextResponse.json({ error: "Not an operator" }, { status: 403 });

    let query = getFirestore(getAdminApp()).collection(collections.settlementPayouts)
      .orderBy("createdAt", "desc").limit(100);
    const requestedOperatorId = req.nextUrl.searchParams.get("operatorId");
    if (isAdmin && requestedOperatorId) query = query.where("operatorId", "==", requestedOperatorId) as typeof query;
    else if (!isAdmin) query = query.where("operatorId", "==", operatorId) as typeof query;
    const snap = await query.get();

    return NextResponse.json({ payouts: snap.docs.map((d) => d.data()) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
