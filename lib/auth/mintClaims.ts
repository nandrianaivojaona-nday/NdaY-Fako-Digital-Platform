// lib/auth/mintClaims.ts
//
// Shared helper to resolve a user's role model from Firestore
// and produce the custom claims that Firestore rules depend on.
//
// Called from:
//   - app/api/session/route.ts      (on login)
//   - app/api/internal/session/...  (on refresh)
//
// Rules depend on: role, operatorRole, operatorId, admin, super_admin

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";

export type TopLevelRole = "ADMIN" | "AUTHORITY" | "OPERATOR" | "CITIZEN";
export type OperatorRole = "COLLECTOR" | "SUPERVISOR" | "MANAGER" | "OPERATOR_ADMIN" | "CEO";

export interface MintedClaims {
  role: TopLevelRole;
  operatorRole?: OperatorRole;
  operatorId?: string;
  authorityId?: string;
  authorityLevel?: "FOKONTANY" | "MUNICIPALITY" | "REGIONAL" | "NATIONAL";
  collectorId?: string;
  // Legacy — retained for backward compat with pre-existing rules
  admin?: boolean;
  super_admin?: boolean;
}

// These are the claims managed by this application. Keep other custom claims
// owned by integrations, while removing stale role data when a user's role
// changes (for example, OPERATOR to CITIZEN).
export const MANAGED_CLAIM_KEYS = [
  "role",
  "operatorRole",
  "operatorId",
  "authorityId",
  "authorityLevel",
  "collectorId",
  "admin",
  "super_admin",
] as const;

export async function resolveClaimsForUser(uid: string): Promise<MintedClaims> {
  const db = getFirestore(getAdminApp());

  // Default is CITIZEN — anyone authenticated is at least a citizen
  const defaults: MintedClaims = { role: "CITIZEN" };

  const userDoc = await db.collection(collections.users).doc(uid).get();
  if (!userDoc.exists) return defaults;

  const user = userDoc.data()!;

  // -------- Administrator --------
  if (user.role === "ADMIN" || user.isAdmin === true) {
    return {
      role: "ADMIN",
      admin: user.isAdmin === true,
      super_admin: user.isSuperAdmin === true,
    };
  }

  // -------- Authority --------
  if (user.role === "AUTHORITY" && user.authorityId) {
    return {
      role: "AUTHORITY",
      authorityId: user.authorityId,
      authorityLevel: user.authorityLevel,
    };
  }

  // -------- Operator --------
  if (user.role === "OPERATOR" && user.operatorId) {
    const claims: MintedClaims = {
      role: "OPERATOR",
      operatorId: user.operatorId,
      operatorRole: (user.operatorRole ?? "MANAGER") as OperatorRole,
    };

    // If this is a collector, resolve the collector record so we can stamp collectorId
    if (user.operatorRole === "COLLECTOR" && user.collectorId) {
      claims.collectorId = user.collectorId;
    }

    return claims;
  }

  // -------- Citizen (default) --------
  return defaults;
}

export async function applyClaimsToUser(uid: string, claims: MintedClaims): Promise<void> {
  const auth = getAuth(getAdminApp());
  const existing = (await auth.getUser(uid)).customClaims ?? {};

  // Preserve claims owned by other systems, but replace this app's role model
  // as a unit so old operator/authority fields cannot survive a role change.
  const managedKeys = new Set<string>(MANAGED_CLAIM_KEYS);
  const merged = Object.fromEntries(
    Object.entries(existing).filter(([key]) => !managedKeys.has(key))
  );
  Object.assign(merged, claims);

  // Strip undefined values — Firestore rules treat missing as null
  Object.keys(merged).forEach((k) => {
    if ((merged as any)[k] === undefined) delete (merged as any)[k];
  });

  await auth.setCustomUserClaims(uid, merged);
}
