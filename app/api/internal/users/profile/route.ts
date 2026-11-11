import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

export async function GET(req: NextRequest) {
  try {
    // Get session cookie
    const session = req.cookies.get("session")?.value;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the token
    const decodedToken = await adminAuth.verifySessionCookie(session, true);
    const uid = decodedToken.uid;

    // Fetch user document from Firestore
    const db = getFirestore();
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      // Create a default user document if it doesn't exist
      const userData = {
        id: uid,
        email: decodedToken.email,
        role: "CITIZEN",
        createdAt: new Date().toISOString(),
      };
      await db.collection("users").doc(uid).set(userData);
      return NextResponse.json(userData);
    }

    return NextResponse.json(userDoc.data());
  } catch (error) {
    console.error("[PROFILE] Error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
