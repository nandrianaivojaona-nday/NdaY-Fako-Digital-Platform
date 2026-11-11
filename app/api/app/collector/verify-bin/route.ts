// app/api/app/collector/verify-bin/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getBin } from "@/services/binService";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await getAuth(getAdminApp()).verifySessionCookie(session, true);
    const binId = req.nextUrl.searchParams.get("binId");
    const subscriptionId = req.nextUrl.searchParams.get("subscriptionId");
    if (!binId || !subscriptionId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const bin = await getBin(binId);
    if (!bin) {
      return NextResponse.json({ matches: false, reason: "Bin not registered" });
    }
    if (bin.status === "RETIRED" || bin.status === "LOST") {
      return NextResponse.json({ matches: false, reason: `Bin is ${bin.status.toLowerCase()}` });
    }
    if (bin.subscriptionId !== subscriptionId) {
      return NextResponse.json({ matches: false, reason: "Bin belongs to another household" });
    }

    return NextResponse.json({ matches: true, stream: bin.stream });
  } catch {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }
}
