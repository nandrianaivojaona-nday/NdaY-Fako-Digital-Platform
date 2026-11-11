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
    const subscriptionId = req.nextUrl.searchParams.get("subscriptionId");
    if (!subscriptionId) return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });

    const snap = await getFirestore(getAdminApp())
      .collection(collections.serviceCycles)
      .where("subscriptionId", "==", subscriptionId)
      .where("citizenId", "==", decoded.uid)
      .orderBy("cycleNumber", "asc")
      .get();

    return NextResponse.json({ cycles: snap.docs.map((d) => d.data()) });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}