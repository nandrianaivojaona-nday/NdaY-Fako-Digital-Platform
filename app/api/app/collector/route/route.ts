import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getTodayRoute } from "@/services/collectorService";

export async function GET(req: NextRequest) {
  try {
    const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    const sessionCookie = req.cookies.get("session")?.value;

    const decoded = sessionCookie
      ? await getAuth(getAdminApp()).verifySessionCookie(sessionCookie, true)
      : await getAuth(getAdminApp()).verifyIdToken(token);

    if ((decoded as any).operatorRole !== "COLLECTOR") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const data = await getTodayRoute((decoded as any).operatorId, decoded.uid);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
