import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const decoded = await getAuth(getAdminApp()).verifySessionCookie(session, true);
  const db = getFirestore(getAdminApp());
  const snap = await db.collection("bins").where("citizenId", "==", decoded.uid).get();

  return NextResponse.json({
    bins: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
}
