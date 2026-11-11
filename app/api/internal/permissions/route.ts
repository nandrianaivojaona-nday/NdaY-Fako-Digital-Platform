import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    const uid = decodedToken.uid;

    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({
        canAccessAdmin: false,
        canAccessAuthority: false,
        canAccessOperator: false,
        canAccessCitizen: true,
      });
    }

    const userData = userDoc.data();
    const role = userData?.role || "CITIZEN";

    const permissions = {
      canAccessAdmin: role === "ADMIN",
      canAccessAuthority: role === "AUTHORITY" || role === "ADMIN",
      canAccessOperator: role === "OPERATOR" || role === "ADMIN",
      canAccessCitizen: true,
    };

    return NextResponse.json(permissions);
  } catch (error) {
    console.error("[PERMISSIONS] Error:", error);
    return NextResponse.json(
      {
        canAccessAdmin: false,
        canAccessAuthority: false,
        canAccessOperator: false,
        canAccessCitizen: true,
      },
      { status: 500 }
    );
  }
}
