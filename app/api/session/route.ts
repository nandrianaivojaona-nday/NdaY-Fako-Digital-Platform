// app/api/session/route.ts
//
// Creates / refreshes / deletes the session cookie.
// On create and refresh, mints the custom claims that Firestore rules rely on.
//
// After minting new claims, the client must refresh its ID token before those
// claims appear in the session cookie. If this request detects stale claims,
// it returns 409 so the client can refresh the token and retry.

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import {
  MANAGED_CLAIM_KEYS,
  resolveClaimsForUser,
  applyClaimsToUser,
} from "@/lib/auth/mintClaims";

const SESSION_DAYS = 14;

// ================================================================
// POST — create session
// ================================================================
export async function POST(req: NextRequest) {
  let stage = "initialize";
  try {
    const auth = getAuth(getAdminApp());

    // 1. Accept either a Bearer token or a cookie refresh
    const bearer = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
    if (!bearer) {
      return NextResponse.json({ error: "Missing ID token" }, { status: 400 });
    }

    // 2. Verify the incoming token
    stage = "verify-token";
    const decoded = await auth.verifyIdToken(bearer, true);
    const currentTimeSeconds = Date.now() / 1000;
    if (
      typeof decoded.auth_time !== "number" ||
      currentTimeSeconds - decoded.auth_time > 5 * 60
    ) {
      return NextResponse.json(
        {
          error: "RECENT_SIGN_IN_REQUIRED",
          message: "Please sign in again to establish a new session.",
        },
        { status: 401 }
      );
    }

    // 3. Resolve and mint the application's role claims.
    stage = "resolve-claims";
    const claims = await resolveClaimsForUser(decoded.uid);
    stage = "apply-claims";
    await applyClaimsToUser(decoded.uid, claims);

    // 4. The ID token we hold may not contain the new claims yet. Ask the
    //    client to refresh it so the session cookie carries the current role.
    const tokenClaims = decoded as Record<string, unknown>;
    const expectedClaims: Record<string, unknown> = { ...claims };
    const claimsChanged = MANAGED_CLAIM_KEYS.some(
      (key) => (tokenClaims[key] ?? null) !== (expectedClaims[key] ?? null)
    );

    if (claimsChanged) {
      return NextResponse.json(
        {
          error: "CLAIMS_REFRESH_REQUIRED",
          message: "Your access level changed. Refreshing session.",
        },
        { status: 409 }
      );
    }

    // 5. Exchange for a session cookie
    stage = "create-session-cookie";
    const expiresIn = SESSION_DAYS * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(bearer, { expiresIn });

    const res = NextResponse.json({
      ok: true,
      claims: {
        role: claims.role,
        operatorRole: claims.operatorRole,
        operatorId: claims.operatorId,
        authorityId: claims.authorityId,
      },
    });

    res.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: expiresIn / 1000,
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error(`[session POST:${stage}]`, err);

    const tokenFailureCodes = new Set([
      "auth/argument-error",
      "auth/id-token-expired",
      "auth/id-token-revoked",
      "auth/invalid-id-token",
      "auth/user-disabled",
      "auth/user-not-found",
    ]);
    const rejectedSignInToken =
      stage === "verify-token" && tokenFailureCodes.has(err?.code);
    const adminCredentialFailure =
      err?.code === "app/invalid-credential" ||
      (stage === "verify-token" && err?.codePrefix === "app");
    const firebaseCode =
      typeof err?.code === "string" &&
      /^(auth|app)\/[a-z0-9-]+$/i.test(err.code)
        ? err.code
        : undefined;

    const response = {
      error: rejectedSignInToken
        ? "AUTH_TOKEN_REJECTED"
        : adminCredentialFailure
          ? "FIREBASE_ADMIN_CREDENTIAL_FAILURE"
          : "SESSION_CREATION_FAILED",
      stage,
      ...(stage === "verify-token" && firebaseCode
        ? { firebaseCode }
        : {}),
      message: rejectedSignInToken
        ? "Your sign-in token is no longer valid. You have been signed out; please sign in again."
        : adminCredentialFailure
          ? "The server could not obtain a Google access token from its Firebase Admin service account. Check that the account exists and that the project ID, client email, and active private key belong together, then restart the server."
        : stage === "verify-token"
          ? `The login service could not verify your token${firebaseCode ? ` (${firebaseCode})` : ""}. Please try again.`
          : stage === "resolve-claims" || stage === "apply-claims"
            ? "Your account access could not be synchronized. Please try again."
            : stage === "create-session-cookie"
              ? "The server could not issue your login session. Please try again."
              : "The login session service is unavailable. Please try again.",
    };

    return NextResponse.json(response, {
      status: rejectedSignInToken ? 401 : 500,
    });
  }
}

// ================================================================
// DELETE — clear session
// ================================================================
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return res;
}

// ================================================================
// GET — verify session (used by middleware)
// ================================================================
export async function GET(req: NextRequest) {
  try {
    const cookie = req.cookies.get("session")?.value;
    if (!cookie) return NextResponse.json({ valid: false }, { status: 401 });

    const decoded = await getAuth(getAdminApp()).verifySessionCookie(cookie, true);

    return NextResponse.json({
      valid: true,
      uid: decoded.uid,
      role: (decoded as any).role,
      operatorRole: (decoded as any).operatorRole,
      operatorId: (decoded as any).operatorId,
      authorityId: (decoded as any).authorityId,
    });
  } catch {
    return NextResponse.json({ valid: false }, { status: 401 });
  }
}
