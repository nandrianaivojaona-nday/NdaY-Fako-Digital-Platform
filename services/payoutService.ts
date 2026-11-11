// services/payoutService.ts
import { createHash } from "crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { SettlementPayout, PayoutMethod, PayoutStatus } from "@/lib/domain/settlement/payoutTypes";
import type { SettlementEntitlement } from "@/lib/domain/settlement/settlementTypes";

function db() { return getFirestore(getAdminApp()); }
function stableId(value: string) { return createHash("sha256").update(value).digest("hex"); }
function assignmentRef(entitlementId: string) {
  return db().collection(collections.payoutEntitlementAssignments).doc(stableId(entitlementId));
}

export async function createPayoutsForPeriod(input: {
  periodStart: number; periodEnd: number; method?: PayoutMethod;
}): Promise<SettlementPayout[]> {
  const dbRef = db();
  const entitlementsSnap = await dbRef
    .collection(collections.settlements)
    .where("status", "==", "EMITTED")
    .where("emittedAt", ">=", input.periodStart)
    .where("emittedAt", "<=", input.periodEnd)
    .get();

  const byOperator = new Map<string, SettlementEntitlement[]>();
  for (const doc of entitlementsSnap.docs) {
    const entitlement = doc.data() as SettlementEntitlement;
    const list = byOperator.get(entitlement.operatorId) ?? [];
    list.push(entitlement);
    byOperator.set(entitlement.operatorId, list);
  }

  const payouts: SettlementPayout[] = [];
  const method = input.method ?? "BANK";
  for (const [operatorId, entitlements] of byOperator) {
    const ordered = entitlements.sort((a, b) => a.id.localeCompare(b.id));
    // Leave room for one payout document plus assignment documents in Firestore's transaction limit.
    for (let offset = 0; offset < ordered.length; offset += 400) {
      const group = ordered.slice(offset, offset + 400);
      const payout = await batchUnassignedGroup({ ...input, method, operatorId, entitlements: group });
      if (payout) payouts.push(payout);
    }
  }
  return payouts;
}

async function batchUnassignedGroup(input: {
  periodStart: number;
  periodEnd: number;
  method: PayoutMethod;
  operatorId: string;
  entitlements: SettlementEntitlement[];
}): Promise<SettlementPayout | null> {
  const dbRef = db();
  const assignmentRefs = input.entitlements.map((entitlement) => assignmentRef(entitlement.id));

  return dbRef.runTransaction(async (tx) => {
    const assignmentDocs = await Promise.all(assignmentRefs.map((ref) => tx.get(ref)));
    const unassigned = input.entitlements.filter((_, index) => !assignmentDocs[index].exists);
    if (unassigned.length === 0) return null;

    const entitlementIds = unassigned.map((entitlement) => entitlement.id);
    const batchKey = [input.operatorId, input.periodStart, input.periodEnd, ...entitlementIds].join(":");
    const payoutRef = dbRef.collection(collections.settlementPayouts).doc(`pay_${stableId(batchKey)}`);
    const existingPayout = await tx.get(payoutRef);
    if (existingPayout.exists) return existingPayout.data() as SettlementPayout;

    const now = Date.now();
    const payout: SettlementPayout = {
      id: payoutRef.id,
      operatorId: input.operatorId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      entitlementIds,
      totalMGA: unassigned.reduce((sum, entitlement) => sum + entitlement.netToOperatorMGA, 0),
      method: input.method,
      status: "PENDING",
      createdAt: now,
      updatedAt: now,
    };

    tx.create(payoutRef, payout);
    unassigned.forEach((entitlement) => {
      const ref = assignmentRef(entitlement.id);
      tx.create(ref, {
        entitlementId: entitlement.id,
        operatorId: input.operatorId,
        payoutId: payout.id,
        assignedAt: now,
      });
    });
    return payout;
  });
}

export async function instructPayout(
  payoutId: string,
  providerReference: string,
  actorUserId = "SYSTEM",
): Promise<void> {
  const reference = providerReference.trim();
  if (!reference) throw new Error("A bank or mobile money transfer reference is required");
  await transitionPayout({
    payoutId,
    action: "INSTRUCT",
    actorUserId,
    idempotencyValue: reference,
    apply: (payout) => ({
      status: "INSTRUCTED",
      providerReference: reference,
      instructedAt: Date.now(),
      updatedAt: Date.now(),
    }),
  });
}

export async function confirmPayout(payoutId: string, actorUserId = "SYSTEM"): Promise<void> {
  await transitionPayout({
    payoutId,
    action: "CONFIRM",
    actorUserId,
    apply: () => ({ status: "CONFIRMED", confirmedAt: Date.now(), updatedAt: Date.now() }),
  });
}

export async function failPayout(
  payoutId: string,
  reason: string,
  actorUserId = "SYSTEM",
): Promise<void> {
  const failureReason = reason.trim();
  if (!failureReason) throw new Error("A reason is required to mark a payout failed");
  await transitionPayout({
    payoutId,
    action: "FAIL",
    actorUserId,
    idempotencyValue: failureReason,
    apply: () => ({ status: "FAILED", failureReason, failedAt: Date.now(), updatedAt: Date.now() }),
  });
}

export async function retryPayout(payoutId: string, actorUserId = "SYSTEM"): Promise<void> {
  await transitionPayout({
    payoutId,
    action: "RETRY",
    actorUserId,
    apply: (payout) => ({
      status: "PENDING",
      attempt: (payout.attempt ?? 0) + 1,
      providerReference: FieldValue.delete() as unknown as string,
      failureReason: FieldValue.delete() as unknown as string,
      failedAt: FieldValue.delete() as unknown as number,
      updatedAt: Date.now(),
    }),
  });
}

async function transitionPayout(input: {
  payoutId: string;
  action: "INSTRUCT" | "CONFIRM" | "FAIL" | "RETRY";
  actorUserId: string;
  idempotencyValue?: string;
  apply: (payout: SettlementPayout) => Partial<SettlementPayout>;
}): Promise<void> {
  const dbRef = db();
  const payoutRef = dbRef.collection(collections.settlementPayouts).doc(input.payoutId);
  await dbRef.runTransaction(async (tx) => {
    const doc = await tx.get(payoutRef);
    if (!doc.exists) throw new Error("Payout not found");
    const payout = doc.data() as SettlementPayout;
    const attempt = payout.attempt ?? 0;
    const eventAttempt = input.action === "RETRY"
      ? payout.status === "FAILED" ? attempt + 1 : attempt
      : attempt;
    const eventRef = dbRef.collection(collections.settlementPayoutEvents)
      .doc(`${input.action.toLowerCase()}_${input.payoutId}_${eventAttempt}`);
    const priorEvent = await tx.get(eventRef);

    if (priorEvent.exists) {
      if (input.action === "INSTRUCT" && payout.status === "INSTRUCTED" && payout.providerReference === input.idempotencyValue) return;
      if (input.action === "CONFIRM" && payout.status === "CONFIRMED") return;
      if (input.action === "FAIL" && payout.status === "FAILED" && payout.failureReason === input.idempotencyValue) return;
      if (input.action === "RETRY" && payout.status === "PENDING" && attempt === eventAttempt) return;
      throw new Error("Payout action has already been recorded");
    }

    if (input.action === "INSTRUCT" && payout.status !== "PENDING") {
      throw new Error(`Cannot instruct payout from ${payout.status}`);
    }
    if (input.action === "CONFIRM" && payout.status !== "INSTRUCTED") {
      throw new Error(`Cannot confirm payout from ${payout.status}`);
    }
    if (input.action === "FAIL" && payout.status !== "PENDING" && payout.status !== "INSTRUCTED") {
      throw new Error(`Cannot fail payout from ${payout.status}`);
    }
    if (input.action === "RETRY" && payout.status !== "FAILED") {
      throw new Error(`Cannot retry payout from ${payout.status}`);
    }

    const now = Date.now();
    const changes = input.apply(payout);
    tx.update(payoutRef, changes);
    tx.create(eventRef, {
      id: eventRef.id,
      payoutId: payout.id,
      operatorId: payout.operatorId,
      action: input.action,
      fromStatus: payout.status,
      toStatus: changes.status as PayoutStatus,
      attempt: input.action === "RETRY" ? eventAttempt : attempt,
      providerReference: input.action === "RETRY"
        ? payout.providerReference ?? null
        : changes.providerReference ?? payout.providerReference ?? null,
      reason: input.action === "RETRY" ? payout.failureReason ?? null : changes.failureReason ?? null,
      actorUserId: input.actorUserId,
      timestamp: now,
    });
  });
}
