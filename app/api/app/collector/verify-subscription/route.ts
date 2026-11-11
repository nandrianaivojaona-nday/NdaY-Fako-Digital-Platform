// app/api/app/collector/verify-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { getActiveSubscriptionForCitizen } from "@/services/subscriptionService";

export async function GET(req: NextRequest) {
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const decoded = await getAuth(getAdminApp()).verifyIdToken(token);
    // Optional: check decoded.role === OPERATOR
    const citizenId = req.nextUrl.searchParams.get("citizenId");
    if (!citizenId) return NextResponse.json({ error: "Missing citizenId" }, { status: 400 });

    const sub = await getActiveSubscriptionForCitizen(citizenId);
    if (!sub) return NextResponse.json({ active: false });

    return NextResponse.json({
      active: true,
      subscriptionId: sub.id,
      planId: sub.planTypeId,
      remaining: sub.collectionsRemaining,
    });
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}
