// app/api/auth/collector/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { verifyCollectorLogin } from "@/services/collectorAuthService";

const SESSION_DAYS = 30;

export async function POST(req: NextRequest) {
  try {
    const { collectorId, pin } = await req.json();

    if (!collectorId || !pin || pin.length !== 4) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const collector = await verifyCollectorLogin({ collectorId, pin });
    if (!collector) {
      // Generic message — never reveal whether ID exists
      return NextResponse.json({ error: "Invalid ID or PIN" }, { status: 401 });
    }

    // Create a long-lived session cookie via Firebase
    const auth = getAuth(getAdminApp());
    const customToken = await auth.createCustomToken(collector.uid);

    // Exchange custom token for an ID token (server-side)
    // We use the REST API because Admin SDK can't mint ID tokens directly.
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
    const exchangeRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );

    if (!exchangeRes.ok) {
      return NextResponse.json({ error: "Session creation failed" }, { status: 500 });
    }

    const { idToken } = await exchangeRes.json();

    // Create a session cookie valid for SESSION_DAYS
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    const response = NextResponse.json({
      ok: true,
      collector: {
        id: collector.collectorId,
        name: collector.fullName,
      },
    });

    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("[collector-login]", err);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
