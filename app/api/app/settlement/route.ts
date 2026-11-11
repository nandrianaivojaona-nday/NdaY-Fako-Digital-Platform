import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getEntitlementsForOperator } from "@/services/settlementService";

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const operatorId = (decoded as any).operatorId;
    if (!operatorId) return NextResponse.json({ error: "Not an operator" }, { status: 403 });

    const from = Number(req.nextUrl.searchParams.get("from") ?? 0);
    const to = Number(req.nextUrl.searchParams.get("to") ?? Date.now());

    const settlements = await getEntitlementsForOperator(operatorId, from, to);
    return NextResponse.json({ settlements });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}