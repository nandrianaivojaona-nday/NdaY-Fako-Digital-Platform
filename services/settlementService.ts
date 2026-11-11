// services/settlementService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { SettlementEntitlement } from "@/lib/domain/settlement/settlementTypes";
import {
  computeSettlementEntitlement, computeReversal,
} from "@/lib/domain/settlement/settlementEngine";
import { getReferencePlan } from "@/lib/domain/subscription/planTypes";
import { getOfferVersion } from "./offerService";

function db() { return getFirestore(getAdminApp()); }

export async function emitSettlementEntitlement(cycleId: string): Promise<SettlementEntitlement> {
  const dbRef = db();
  const existingId = `ent_${cycleId}`;
  const existing = await dbRef.collection(collections.settlements).doc(existingId).get();
  if (existing.exists) return existing.data() as SettlementEntitlement;

  const cycleDoc = await dbRef.collection(collections.serviceCycles).doc(cycleId).get();
  if (!cycleDoc.exists) throw new Error("Cycle not found");
  const cycle = cycleDoc.data()!;
  if (cycle.status !== "ACCEPTED") {
    throw new Error(`Cycle must be ACCEPTED, got ${cycle.status}`);
  }

  const subDoc = await dbRef.collection(collections.subscriptions).doc(cycle.subscriptionId).get();
  if (!subDoc.exists) throw new Error("Subscription not found");
  const sub = subDoc.data()!;

  const offerVersion = await getOfferVersion(sub.offerVersionId);
  if (!offerVersion) throw new Error("Offer version not found");

  const planType = getReferencePlan(sub.planTypeId);

  const record = computeSettlementEntitlement({
    cycleId,
    serviceProofId: cycle.proof?.proofId ?? "",
    subscriptionId: cycle.subscriptionId,
    offerId: sub.offerId,
    offerVersionId: sub.offerVersionId,
    offerVersionNumber: offerVersion.versionNumber,
    citizenId: cycle.citizenId,
    operatorId: cycle.operatorId,
    entitlementValueMGA: cycle.entitlementValueMGA,
    planType,
    offerVersion,
    paymentMethod: sub.paymentMethod,
    escrowId: sub.escrowId,
    acceptanceMethod: cycle.acceptance?.method ?? "AUTO_ACCEPT_CONTRACTUAL",
    acceptanceStatus: cycle.acceptance?.status ?? "AUTO_ACCEPTED",
  });

  await dbRef.collection(collections.settlements).doc(record.id).set(record);
  return record;
}

export async function reverseEntitlement(
  entitlementId: string, reason: string
): Promise<SettlementEntitlement> {
  const dbRef = db();
  const doc = await dbRef.collection(collections.settlements).doc(entitlementId).get();
  if (!doc.exists) throw new Error("Entitlement not found");
  const original = doc.data() as SettlementEntitlement;

  const reversal = computeReversal(original, reason);
  await dbRef.collection(collections.settlements).doc(reversal.id).set(reversal);
  await dbRef.collection(collections.settlements).doc(entitlementId).update({ status: "REVERSED" });
  return reversal;
}

export async function getEntitlementsForOperator(
  operatorId: string, from: number, to: number
): Promise<SettlementEntitlement[]> {
  const snap = await db()
    .collection(collections.settlements)
    .where("operatorId", "==", operatorId)
    .where("emittedAt", ">=", from)
    .where("emittedAt", "<=", to)
    .orderBy("emittedAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as SettlementEntitlement);
}

export async function getEntitlementsForCycle(cycleId: string): Promise<SettlementEntitlement | null> {
  const doc = await db().collection(collections.settlements).doc(`ent_${cycleId}`).get();
  return doc.exists ? (doc.data() as SettlementEntitlement) : null;
}