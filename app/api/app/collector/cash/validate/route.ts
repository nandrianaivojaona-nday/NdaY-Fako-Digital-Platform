import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { validateCash } from "@/services/collectorService";

export async function POST(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  const sessionCookie = req.cookies.get("session")?.value;
  if (!token && !sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = sessionCookie
      ? await getAuth(getAdminApp()).verifySessionCookie(sessionCookie, true)
      : await getAuth(getAdminApp()).verifyIdToken(token);
    const claims = decoded as typeof decoded & { role?: string; operatorRole?: string; operatorId?: string; collectorId?: string };
    if (claims.role !== "OPERATOR" || claims.operatorRole !== "COLLECTOR" || !claims.operatorId || !claims.collectorId) {
      return NextResponse.json({ error: "Active collector access required" }, { status: 403 });
    }

    const { subscriptionId, cycleId, amountMGA } = await req.json();
    if (!subscriptionId || !cycleId || !Number.isSafeInteger(amountMGA) || amountMGA <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    await validateCash({
      collectorId: claims.collectorId,
      operatorId: claims.operatorId,
      subscriptionId,
      cycleId,
      amountMGA,
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
