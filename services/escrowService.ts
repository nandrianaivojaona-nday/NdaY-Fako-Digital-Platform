// services/escrowService.ts
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { createHash } from "crypto";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import type {
  EscrowRecord, EscrowStatus, HoldType, EscrowEventType, DisputeRecord,
} from "@/lib/domain/payment/escrowTypes";
import type { PaymentStatus } from "@/lib/domain/payment/types";
import type { PaymentMethod } from "@/lib/domain/subscription/types";
import { canTransition, nextStatus } from "@/lib/domain/payment/escrowStateMachine";
import { captureForDelivery, refundForDispute, voidHold } from "./paymentService";
import { collections } from "@/lib/firebase/collections";

function db() { return getFirestore(getAdminApp()); }
const COOLING_HOURS = 72;

export async function getEscrow(escrowId: string): Promise<EscrowRecord | null> {
  const doc = await db().collection("escrow").doc(escrowId).get();
  return doc.exists ? (doc.data() as EscrowRecord) : null;
}

export async function createEscrow(input: {
  subscriptionId: string;
  citizenId: string;
  operatorId: string;
  method: PaymentMethod;
  holdType: HoldType;
  totalAmountMGA: number;
  expectedCollections: number;
}): Promise<EscrowRecord> {
  const now = Date.now();
  const ref = db().collection("escrow").doc();

  const rec: EscrowRecord = {
    id: ref.id,
    subscriptionId: input.subscriptionId,
    citizenId: input.citizenId,
    operatorId: input.operatorId,
    method: input.method,
    holdType: input.holdType,
    totalAmountMGA: input.totalAmountMGA,
    heldAmountMGA: 0,
    releasedAmountMGA: 0,
    refundedAmountMGA: 0,
    voidedAmountMGA: 0,
    expectedCollections: input.expectedCollections,
    releasedCount: 0,
    refundedCount: 0,
    perDeliveryAmountMGA: Math.round(input.totalAmountMGA / input.expectedCollections),
    status: "PENDING",
    createdAt: now,
    lastEventAt: now,
  };

  await ref.set(rec);
  await logEscrowEvent({
    escrowId: ref.id, subscriptionId: input.subscriptionId,
    type: "ESCROW_CREATED", actorRole: "SYSTEM",
    note: `Hold requested for ${input.totalAmountMGA} MGA`,
  });
  return rec;
}

export async function markEscrowAuthorized(
  escrowId: string, providerReference: string, providerName: string,
  authExpiresAt?: number, providerStatus: PaymentStatus = "HELD",
): Promise<EscrowRecord> {
  const ref = db().collection("escrow").doc(escrowId);
  const eventRef = db().collection("escrowEvents").doc(`authorize_${escrowId}`);
  const now = Date.now();
  const result = await db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("Escrow not found");
    const e = doc.data() as EscrowRecord;
    if (e.cancellationPending) throw new Error("Escrow cancellation is in progress");
    if (e.paymentOperationId) throw new Error("An escrow payment operation is in progress");
    if (e.status === "HELD" && e.providerReference === providerReference) {
      return { escrow: e, changed: false };
    }
    if (!canTransition(e.status, "AUTHORIZE")) throw new Error(`Cannot authorize from ${e.status}`);
    tx.update(ref, {
      status: "HELD" as EscrowStatus,
      providerName, providerReference,
      heldAmountMGA: e.totalAmountMGA,
      authorizedAt: now,
      ...(authExpiresAt === undefined ? {} : { expiresAt: authExpiresAt }),
      lastEventAt: now,
    });
    tx.create(eventRef, {
      id: eventRef.id,
      escrowId,
      subscriptionId: e.subscriptionId,
      type: providerStatus === "AUTHORIZED" ? "ESCROW_AUTHORIZED" : "ESCROW_HELD",
      amountMGA: e.totalAmountMGA,
      providerStatus,
      actorRole: "SYSTEM",
      timestamp: now,
    });
    return {
      escrow: {
        ...e, status: "HELD" as EscrowStatus, heldAmountMGA: e.totalAmountMGA,
        providerName, providerReference, authorizedAt: now,
        ...(authExpiresAt === undefined ? {} : { expiresAt: authExpiresAt }),
      },
      changed: true,
    };
  });

  return result.escrow;
}

export async function releaseForDelivery(input: {
  escrowId: string;
  cycleId: string;
  serviceProofId: string;
  settlementId: string;
  actorUserId: string;
  amountMGA?: number;
  operationId?: string;
}): Promise<{ escrow: EscrowRecord; releasedMGA: number }> {
  return await db().runTransaction(async (tx) => {
    const ref = db().collection("escrow").doc(input.escrowId);
    const evtRef = db().collection("escrowEvents").doc(`release_${input.cycleId}`);
    const [doc, priorEvent] = await Promise.all([tx.get(ref), tx.get(evtRef)]);
    if (!doc.exists) throw new Error("Escrow not found");
    const e = doc.data() as EscrowRecord;
    if (e.cancellationPending) throw new Error("Escrow cancellation is in progress");
    if (e.paymentOperationId && e.paymentOperationId !== input.operationId) {
      throw new Error("A different escrow payment operation is in progress");
    }
    if (input.operationId && e.paymentOperationId !== input.operationId) {
      throw new Error("Escrow payment operation lock was lost");
    }
    if (priorEvent.exists) {
      if (priorEvent.get("escrowId") !== input.escrowId) throw new Error("Cycle already released from another escrow");
      return { escrow: e, releasedMGA: Number(priorEvent.get("amountMGA") ?? 0) };
    }

    if (e.status !== "HELD" && e.status !== "PARTIALLY_RELEASED" && e.status !== "PARTIALLY_REFUNDED") {
      throw new Error(`Cannot release from ${e.status}`);
    }
    const requestedMGA = input.amountMGA ?? e.perDeliveryAmountMGA;
    if (requestedMGA > e.heldAmountMGA) throw new Error("Escrow has insufficient held funds for this cycle");
    const releaseMGA = requestedMGA;
    if (releaseMGA <= 0) throw new Error("Nothing to release");

    const newReleasedCount = e.releasedCount + 1;
    const newReleasedAmount = e.releasedAmountMGA + releaseMGA;
    const newHeld = e.heldAmountMGA - releaseMGA;

    const newStatus = nextStatus(e.status, "RELEASE", {
      releasedCount: newReleasedCount,
      refundedCount: e.refundedCount,
      expectedCollections: e.expectedCollections,
    });

    const now = Date.now();
    tx.update(ref, {
      releasedAmountMGA: newReleasedAmount,
      heldAmountMGA: newHeld,
      releasedCount: newReleasedCount,
      status: newStatus,
      lastEventAt: now,
      ...(input.operationId ? { paymentOperationId: FieldValue.delete(), paymentOperationStartedAt: FieldValue.delete() } : {}),
      settledAt: newStatus === "SETTLED" ? now : e.settledAt,
    });

    tx.create(evtRef, {
      id: evtRef.id, escrowId: input.escrowId, subscriptionId: e.subscriptionId,
      type: "ESCROW_RELEASED", amountMGA: releaseMGA,
      cycleId: input.cycleId,
      serviceProofId: input.serviceProofId,
      settlementId: input.settlementId,
      actorUserId: input.actorUserId, actorRole: "SYSTEM",
      timestamp: now,
    });

    return {
      escrow: { ...e, releasedAmountMGA: newReleasedAmount, heldAmountMGA: newHeld,
                releasedCount: newReleasedCount, status: newStatus, lastEventAt: now },
      releasedMGA: releaseMGA,
    };
  });
}

export async function refundForFailedDelivery(input: {
  escrowId: string;
  cycleId: string;
  serviceProofId?: string;
  reason: string;
  actorUserId: string;
  amountMGA?: number;
  operationId?: string;
}): Promise<{ escrow: EscrowRecord; refundedMGA: number }> {
  return await db().runTransaction(async (tx) => {
    const ref = db().collection("escrow").doc(input.escrowId);
    const evtRef = db().collection("escrowEvents").doc(`refund_${input.cycleId}`);
    const [doc, priorEvent] = await Promise.all([tx.get(ref), tx.get(evtRef)]);
    if (!doc.exists) throw new Error("Escrow not found");
    const e = doc.data() as EscrowRecord;
    if (e.cancellationPending) throw new Error("Escrow cancellation is in progress");
    if (e.paymentOperationId && e.paymentOperationId !== input.operationId) {
      throw new Error("A different escrow payment operation is in progress");
    }
    if (input.operationId && e.paymentOperationId !== input.operationId) {
      throw new Error("Escrow payment operation lock was lost");
    }
    if (priorEvent.exists) {
      if (priorEvent.get("escrowId") !== input.escrowId) throw new Error("Cycle already refunded from another escrow");
      return { escrow: e, refundedMGA: Number(priorEvent.get("amountMGA") ?? 0) };
    }

    const requestedMGA = input.amountMGA ?? e.perDeliveryAmountMGA;
    if (requestedMGA > e.heldAmountMGA) throw new Error("Escrow has insufficient held funds for this refund");
    const refundMGA = requestedMGA;
    if (refundMGA <= 0) throw new Error("Nothing to refund");

    const newRefundedCount = e.refundedCount + 1;
    const newRefundedAmount = e.refundedAmountMGA + refundMGA;
    const newHeld = e.heldAmountMGA - refundMGA;

    const newStatus = nextStatus(e.status, "REFUND", {
      releasedCount: e.releasedCount,
      refundedCount: newRefundedCount,
      expectedCollections: e.expectedCollections,
    });

    const now = Date.now();
    tx.update(ref, {
      refundedAmountMGA: newRefundedAmount,
      heldAmountMGA: newHeld,
      refundedCount: newRefundedCount,
      status: newStatus,
      lastEventAt: now,
      ...(input.operationId ? { paymentOperationId: FieldValue.delete(), paymentOperationStartedAt: FieldValue.delete() } : {}),
    });

    tx.create(evtRef, {
      id: evtRef.id, escrowId: input.escrowId, subscriptionId: e.subscriptionId,
      type: "ESCROW_REFUNDED", amountMGA: refundMGA,
      cycleId: input.cycleId,
      serviceProofId: input.serviceProofId,
      actorUserId: input.actorUserId, actorRole: "SYSTEM",
      note: input.reason,
      timestamp: now,
    });

    return {
      escrow: { ...e, refundedAmountMGA: newRefundedAmount, heldAmountMGA: newHeld,
                refundedCount: newRefundedCount, status: newStatus, lastEventAt: now },
      refundedMGA: refundMGA,
    };
  });
}

export async function releaseForSettledCycle(input: {
  escrowId: string;
  cycleId: string;
  serviceProofId: string;
  settlementId: string;
  amountMGA: number;
}): Promise<{ escrow: EscrowRecord; releasedMGA: number }> {
  const escrow = await getEscrow(input.escrowId);
  if (!escrow) throw new Error("Escrow not found");
  const operationId = `CAPTURE:${input.cycleId}`;
  if (escrow.holdType === "PROVIDER_NATIVE") {
    if (!escrow.providerReference) throw new Error("Provider authorization reference is missing");
    await beginEscrowPaymentOperation(input.escrowId, operationId);
    const capture = await captureForDelivery({
      method: escrow.method,
      escrowId: escrow.id,
      providerReference: escrow.providerReference,
      amountMGA: input.amountMGA,
      idempotencyKey: `${escrow.id}:cycle:${input.cycleId}:capture`,
    });
    if (!capture.ok) throw new Error("Payment provider did not capture the accepted cycle");
  }
  const result = await releaseForDelivery({
    escrowId: input.escrowId,
    cycleId: input.cycleId,
    serviceProofId: input.serviceProofId,
    settlementId: input.settlementId,
    actorUserId: "SYSTEM",
    amountMGA: input.amountMGA,
    ...(escrow.holdType === "PROVIDER_NATIVE" ? { operationId } : {}),
  });

  if (result.releasedMGA !== input.amountMGA) {
    throw new Error(`Escrow release ${result.releasedMGA} does not match settlement ${input.amountMGA}`);
  }
  return result;
}

export async function refundForRejectedCycle(input: {
  escrowId: string;
  cycleId: string;
  serviceProofId?: string;
  reason: string;
}): Promise<{ escrow: EscrowRecord; refundedMGA: number; refundPendingMGA: number }> {
  const dbRef = db();
  const [cycleDoc, escrow] = await Promise.all([
    dbRef.collection("serviceCycles").doc(input.cycleId).get(),
    getEscrow(input.escrowId),
  ]);
  if (!cycleDoc.exists || !escrow) throw new Error("Cycle or escrow not found");
  const amountMGA = Number(cycleDoc.get("entitlementValueMGA"));
  if (!Number.isFinite(amountMGA) || amountMGA <= 0) throw new Error("Cycle entitlement is invalid");

  if (escrow.holdType === "CASH_ON_DELIVERY") {
    const cashPaymentRef = dbRef.collection(collections.paymentEvents).doc(`cash_${input.cycleId}`);
    const cashPayment = await cashPaymentRef.get();
    if (!cashPayment.exists) return { escrow, refundedMGA: 0, refundPendingMGA: 0 };
    const refundRef = dbRef.collection("cashRefunds").doc(`cash_refund_${input.cycleId}`);
    await refundRef.set({
      id: refundRef.id,
      cycleId: input.cycleId,
      subscriptionId: escrow.subscriptionId,
      operatorId: escrow.operatorId,
      citizenId: escrow.citizenId,
      amountMGA,
      status: "PENDING_MANUAL_REFUND",
      reason: input.reason,
      createdAt: Date.now(),
    }, { merge: true });
    return { escrow, refundedMGA: 0, refundPendingMGA: amountMGA };
  }

  if (!escrow.providerReference) throw new Error("Provider authorization reference is missing");
  const operationId = `REFUND:${input.cycleId}`;
  await beginEscrowPaymentOperation(input.escrowId, operationId);
  const providerRefund = await refundForDispute({
    method: escrow.method,
    escrowId: escrow.id,
    providerReference: escrow.providerReference,
    amountMGA,
    reason: input.reason,
    idempotencyKey: `${escrow.id}:cycle:${input.cycleId}:refund`,
  });
  if (!providerRefund.ok) throw new Error("Payment provider did not refund the rejected cycle");
  const result = await refundForFailedDelivery({
    escrowId: input.escrowId,
    cycleId: input.cycleId,
    serviceProofId: input.serviceProofId,
    reason: input.reason,
    actorUserId: "SYSTEM",
    amountMGA,
    operationId,
  });
  return { ...result, refundPendingMGA: 0 };
}

export async function voidEscrow(input: {
  escrowId: string; reason: string; actorUserId: string;
}): Promise<void> {
  const dbRef = db();
  const ref = dbRef.collection("escrow").doc(input.escrowId);
  const evtRef = dbRef.collection("escrowEvents").doc(`void_${input.escrowId}`);
  await dbRef.runTransaction(async (tx) => {
    const [doc, priorEvent] = await Promise.all([tx.get(ref), tx.get(evtRef)]);
    if (!doc.exists) return null;
    const e = doc.data() as EscrowRecord;
    if (priorEvent.exists || ["SETTLED", "REFUNDED", "VOIDED", "EXPIRED"].includes(e.status) || e.heldAmountMGA < 0) return null;
    const status = nextStatus(e.status, "VOID", {
      releasedCount: e.releasedCount,
      refundedCount: e.refundedCount,
      expectedCollections: e.expectedCollections,
    });
    const now = Date.now();
    tx.update(ref, {
      status,
      voidedAmountMGA: (e.voidedAmountMGA ?? 0) + e.heldAmountMGA,
      heldAmountMGA: 0,
      lastEventAt: now,
    });
    tx.create(evtRef, {
      id: evtRef.id,
      escrowId: input.escrowId,
      subscriptionId: e.subscriptionId,
      type: "ESCROW_VOIDED",
      amountMGA: e.heldAmountMGA,
      actorUserId: input.actorUserId,
      actorRole: "CITIZEN",
      note: input.reason,
      timestamp: now,
    });
  });
}

/** Refund internal funds, void native authorizations, and close cash obligations. */
export async function cancelRemainingEscrow(input: {
  escrowId: string;
  reason: string;
  actorUserId: string;
}): Promise<void> {
  const dbRef = db();
  const escrowRef = dbRef.collection(collections.escrow).doc(input.escrowId);
  const eventRef = dbRef.collection("escrowEvents").doc(`cancel_${input.escrowId}`);
  const requestId = `cancel:${input.escrowId}`;

  const lockedEscrow = await dbRef.runTransaction(async (tx) => {
    const [doc, priorEvent] = await Promise.all([tx.get(escrowRef), tx.get(eventRef)]);
    if (!doc.exists) throw new Error("Escrow not found");
    if (priorEvent.exists) return null;
    const escrow = doc.data() as EscrowRecord;
    if (["SETTLED", "REFUNDED", "VOIDED", "EXPIRED"].includes(escrow.status)) return null;
    if (escrow.status === "DISPUTED") throw new Error("Resolve the open dispute before cancelling this escrow");
    if (escrow.paymentOperationId) throw new Error("A cycle payment operation is in progress; retry cancellation after it completes");
    if (escrow.cancellationPending && escrow.cancellationRequestId !== requestId) {
      throw new Error("A different escrow cancellation is already in progress");
    }
    if (!escrow.cancellationPending) {
      tx.update(escrowRef, {
        cancellationPending: true,
        cancellationRequestId: requestId,
        cancellationPendingAmountMGA: escrow.heldAmountMGA,
        lastEventAt: Date.now(),
      });
    }
    return escrow;
  });

  if (!lockedEscrow) return;
  const amountMGA = lockedEscrow.cancellationPendingAmountMGA ?? lockedEscrow.heldAmountMGA;
  if (amountMGA > 0 && lockedEscrow.holdType === "PLATFORM_INTERNAL") {
    if (!lockedEscrow.providerReference) throw new Error("Provider refund reference is missing");
    const result = await refundForDispute({
      method: lockedEscrow.method,
      escrowId: lockedEscrow.id,
      providerReference: lockedEscrow.providerReference,
      amountMGA,
      reason: input.reason,
      idempotencyKey: `${lockedEscrow.id}:cancel:refund`,
    });
    if (!result.ok) throw new Error("Payment provider did not refund the remaining subscription funds");
  } else if (amountMGA > 0 && lockedEscrow.holdType === "PROVIDER_NATIVE") {
    if (!lockedEscrow.providerReference) throw new Error("Provider authorization reference is missing");
    const result = await voidHold({
      method: lockedEscrow.method,
      escrowId: lockedEscrow.id,
      providerReference: lockedEscrow.providerReference,
      idempotencyKey: `${lockedEscrow.id}:cancel:void`,
    });
    if (!result.ok) throw new Error("Payment provider did not void the remaining authorization");
  }

  await dbRef.runTransaction(async (tx) => {
    const [doc, priorEvent] = await Promise.all([tx.get(escrowRef), tx.get(eventRef)]);
    if (!doc.exists || priorEvent.exists) return;
    const escrow = doc.data() as EscrowRecord;
    if (escrow.cancellationRequestId !== requestId || !escrow.cancellationPending) {
      throw new Error("Escrow cancellation lock was lost");
    }
    const lockedAmount = escrow.cancellationPendingAmountMGA ?? 0;
    if (escrow.heldAmountMGA !== lockedAmount) throw new Error("Escrow balance changed during cancellation");

    const now = Date.now();
    const nextStatus = lockedAmount > 0
      ? escrow.holdType === "PLATFORM_INTERNAL"
        ? (escrow.releasedAmountMGA > 0 || escrow.refundedAmountMGA > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED")
        : "VOIDED"
      : escrow.status === "PENDING" ? "VOIDED" : escrow.status;
    const update: Record<string, unknown> = {
      status: nextStatus,
      heldAmountMGA: 0,
      cancellationPending: false,
      cancellationCompletedAt: now,
      lastEventAt: now,
    };
    if (lockedAmount > 0 && escrow.holdType === "PLATFORM_INTERNAL") {
      update.refundedAmountMGA = escrow.refundedAmountMGA + lockedAmount;
    } else if (lockedAmount > 0 && escrow.holdType === "PROVIDER_NATIVE") {
      update.voidedAmountMGA = (escrow.voidedAmountMGA ?? 0) + lockedAmount;
    }
    tx.update(escrowRef, update);
    tx.create(eventRef, {
      id: eventRef.id,
      escrowId: input.escrowId,
      subscriptionId: escrow.subscriptionId,
      type: escrow.holdType === "PLATFORM_INTERNAL" && lockedAmount > 0 ? "ESCROW_REFUNDED" : "ESCROW_VOIDED",
      amountMGA: lockedAmount,
      actorUserId: input.actorUserId,
      actorRole: "CITIZEN",
      note: input.reason,
      timestamp: now,
    });
  });
}

async function beginEscrowPaymentOperation(escrowId: string, operationId: string): Promise<void> {
  const ref = db().collection(collections.escrow).doc(escrowId);
  await db().runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    if (!doc.exists) throw new Error("Escrow not found");
    const escrow = doc.data() as EscrowRecord;
    if (escrow.cancellationPending) throw new Error("Escrow cancellation is in progress");
    if (escrow.paymentOperationId && escrow.paymentOperationId !== operationId) {
      throw new Error("Another escrow payment operation is in progress");
    }
    if (escrow.paymentOperationId === operationId) return;
    tx.update(ref, { paymentOperationId: operationId, paymentOperationStartedAt: Date.now() });
  });
}

/** Safely unwind a funding confirmation that arrives after the escrow was cancelled. */
export async function resolveLateFundingAfterCancellation(input: {
  escrowId: string;
  transactionId: string;
  providerName: string;
  status: PaymentStatus;
  amountMGA: number;
}): Promise<void> {
  const escrow = await getEscrow(input.escrowId);
  if (!escrow || escrow.status !== "VOIDED") throw new Error("Escrow is not cancelled");
  if (escrow.providerReference === input.transactionId) return;
  if (input.amountMGA !== escrow.totalAmountMGA) {
    throw new Error("Late payment amount does not match the cancelled subscription hold");
  }

  const internalFunding = escrow.holdType === "PLATFORM_INTERNAL" &&
    (input.status === "HELD" || input.status === "CAPTURED");
  const nativeAuthorization = escrow.holdType === "PROVIDER_NATIVE" &&
    (input.status === "HELD" || input.status === "AUTHORIZED");
  if (!internalFunding && !nativeAuthorization) return;

  const operation = internalFunding ? "refund" : "void";
  const eventSuffix = createHash("sha256").update(input.transactionId).digest("hex").slice(0, 32);
  const eventRef = db().collection("escrowEvents").doc(`late_cancel_${operation}_${input.escrowId}_${eventSuffix}`);
  if ((await eventRef.get()).exists) return;

  if (internalFunding) {
    const result = await refundForDispute({
      method: escrow.method,
      escrowId: escrow.id,
      providerReference: input.transactionId,
      amountMGA: input.amountMGA,
      reason: "Payment confirmed after subscription cancellation",
      idempotencyKey: `${escrow.id}:late-cancel:${input.transactionId}:refund`,
    });
    if (!result.ok) throw new Error("Provider could not refund the late payment");
  } else {
    const result = await voidHold({
      method: escrow.method,
      escrowId: escrow.id,
      providerReference: input.transactionId,
      idempotencyKey: `${escrow.id}:late-cancel:${input.transactionId}:void`,
    });
    if (!result.ok) throw new Error("Provider could not void the late authorization");
  }

  const escrowRef = db().collection(collections.escrow).doc(input.escrowId);
  await db().runTransaction(async (tx) => {
    const [doc, priorEvent] = await Promise.all([tx.get(escrowRef), tx.get(eventRef)]);
    if (priorEvent.exists) return;
    if (!doc.exists) throw new Error("Escrow not found");
    const current = doc.data() as EscrowRecord;
    if (current.status !== "VOIDED" || current.heldAmountMGA !== 0) {
      throw new Error("Cancelled escrow changed while resolving its late payment");
    }
    const now = Date.now();
    const changes = internalFunding
      ? {
          status: current.releasedAmountMGA > 0 ? "PARTIALLY_REFUNDED" : "REFUNDED",
          refundedAmountMGA: current.refundedAmountMGA + input.amountMGA,
        }
      : { voidedAmountMGA: (current.voidedAmountMGA ?? 0) + input.amountMGA };
    tx.update(escrowRef, { ...changes, lastEventAt: now });
    tx.create(eventRef, {
      id: eventRef.id,
      escrowId: current.id,
      subscriptionId: current.subscriptionId,
      type: internalFunding ? "ESCROW_REFUNDED" : "ESCROW_VOIDED",
      amountMGA: input.amountMGA,
      actorRole: "SYSTEM",
      note: "Late provider confirmation unwound after cancellation",
      providerName: input.providerName,
      providerReference: input.transactionId,
      providerStatus: input.status,
      timestamp: now,
    });
  });
}

export async function openDispute(input: {
  escrowId: string;
  subscriptionId: string;
  serviceProofId: string;
  cycleId: string;
  citizenId: string;
  operatorId: string;
  reason: string;
  amountMGA: number;
}): Promise<DisputeRecord> {
  const now = Date.now();
  const ref = db().collection("disputes").doc();
  const rec: DisputeRecord = {
    id: ref.id,
    escrowId: input.escrowId,
    subscriptionId: input.subscriptionId,
    serviceProofId: input.serviceProofId,
    citizenId: input.citizenId,
    operatorId: input.operatorId,
    reason: input.reason,
    status: "OPEN",
    amountMGA: input.amountMGA,
    createdAt: now,
    coolingWindowHours: COOLING_HOURS,
  };
  await ref.set({ ...rec, cycleId: input.cycleId });
  await logEscrowEvent({
    escrowId: input.escrowId, subscriptionId: input.subscriptionId,
    type: "ESCROW_DISPUTED", amountMGA: input.amountMGA,
    cycleId: input.cycleId,
    actorUserId: input.citizenId, actorRole: "CITIZEN",
    note: input.reason,
  });
  return rec;
}

async function logEscrowEvent(input: {
  escrowId: string;
  subscriptionId: string;
  type: EscrowEventType;
  amountMGA?: number;
  cycleId?: string;
  serviceProofId?: string;
  settlementId?: string;
  reversalOfSettlementId?: string;
  actorUserId?: string;
  actorRole?: string;
  note?: string;
}) {
  const ref = db().collection("escrowEvents").doc();
  await ref.set({ id: ref.id, ...input, timestamp: Date.now() });
}
