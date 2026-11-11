// services/collectorAuthService.ts
//
// Collector authentication: ID + PIN. Not email.
// Rationale: basic phones, intermittent network, no personal email.
// See conversation for full rationale.

import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import crypto from "crypto";

function db() { return getFirestore(getAdminApp()); }

// ----------------------------------------------------------------
// CREATE (called by operator admin)
// ----------------------------------------------------------------
export async function createCollector(input: {
  operatorId: string;
  fullName: string;
  phone?: string;
  zoneId?: string;
  createdBy: string;
}): Promise<{ collectorId: string; pin: string }> {
  const collectorId = await generateCollectorId(input.operatorId);
  const pin = String(crypto.randomInt(1000, 9999));
  const pinHash = hashPin(pin);

  const auth = getAuth(getAdminApp());
  const firebaseUser = await auth.createUser({
    uid: `collector_${collectorId}`,
    displayName: input.fullName,
  });

  const now = Date.now();
  await db().collection(collections.collectors).doc(collectorId).set({
    id: collectorId,
    uid: firebaseUser.uid,
    operatorId: input.operatorId,
    fullName: input.fullName,
    phone: input.phone ?? null,
    zoneId: input.zoneId ?? null,
    role: "COLLECTOR",
    operatorRole: "COLLECTOR",
    pinHash,
    active: true,
    createdAt: now,
    createdBy: input.createdBy,
    pinUpdatedAt: now,
  });

  await auth.setCustomUserClaims(firebaseUser.uid, {
    role: "OPERATOR",
    operatorRole: "COLLECTOR",
    operatorId: input.operatorId,
    collectorId,
  });

  return { collectorId, pin };
}

// ----------------------------------------------------------------
// VERIFY LOGIN
// ----------------------------------------------------------------
export async function verifyCollectorLogin(input: {
  collectorId: string;
  pin: string;
}): Promise<{ uid: string; collectorId: string; operatorId: string; fullName: string } | null> {
  const doc = await db().collection(collections.collectors).doc(input.collectorId).get();
  if (!doc.exists) return null;
  const c = doc.data()!;
  if (!c.active) return null;

  const candidate = hashPin(input.pin);
  if (!timingSafeEqual(candidate, c.pinHash)) return null;

  return {
    uid: c.uid,
    collectorId: c.id,
    operatorId: c.operatorId,
    fullName: c.fullName,
  };
}

// ----------------------------------------------------------------
// RESET PIN
// ----------------------------------------------------------------
export async function resetCollectorPin(collectorId: string): Promise<string> {
  const pin = String(crypto.randomInt(1000, 9999));
  const pinHash = hashPin(pin);
  await db().collection(collections.collectors).doc(collectorId).update({
    pinHash,
    pinUpdatedAt: Date.now(),
  });
  return pin;
}

// ----------------------------------------------------------------
// DEACTIVATE
// ----------------------------------------------------------------
export async function deactivateCollector(collectorId: string): Promise<void> {
  const doc = await db().collection(collections.collectors).doc(collectorId).get();
  if (!doc.exists) return;
  const c = doc.data()!;
  await db().collection(collections.collectors).doc(collectorId).update({ active: false });
  await getAuth(getAdminApp()).updateUser(c.uid, { disabled: true });
}

// ----------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------
async function generateCollectorId(operatorId: string): Promise<string> {
  const prefix = operatorId.replace(/[^A-Z0-9]/gi, "").slice(0, 3).toUpperCase() || "COL";
  const counterRef = db().collection(collections.counters).doc(`collectors_${operatorId}`);
  return await db().runTransaction(async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists ? snap.data()!.value : 0;
    const next = current + 1;
    tx.set(counterRef, { value: next }, { merge: true });
    return `${prefix}${String(next).padStart(3, "0")}`;
  });
}

function hashPin(pin: string): string {
  const pepper = process.env.COLLECTOR_PIN_PEPPER ?? "nday-collector-pepper";
  return crypto.createHmac("sha256", pepper).update(pin).digest("hex");
}

function timingSafeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
