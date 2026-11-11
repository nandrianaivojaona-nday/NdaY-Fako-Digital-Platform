// app/api/app/citizen/subscriptions/me/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getActiveSubscriptionForCitizen } from "@/services/subscriptionService";

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    const sub = await getActiveSubscriptionForCitizen(decoded.uid);
    return NextResponse.json(sub ?? { status: "NONE" });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
