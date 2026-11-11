// services/subscriptionService.ts
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { createHash, randomUUID } from "crypto";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import type { Subscription, PaymentMethod } from "@/lib/domain/subscription/types";
import { buildSubscriptionSnapshotFromOffer } from "@/lib/domain/subscription/subscriptionHelpers";
import { collections } from "@/lib/firebase/collections";
import { getOffer, getOfferVersion } from "./offerService";
import { createEscrow } from "./escrowService";
import { resolveHoldType } from "./paymentService";
import { scheduleCyclesForSubscription, transitionCycle } from "./serviceCycleService";

function db() { return getFirestore(getAdminApp()); }

// ----------------------------------------------------------------
// CREATE (with escrow)
// ----------------------------------------------------------------
export async function createSubscriptionFromOffer(input: {
  citizenId: string;
  offerId: string;
  paymentMethod: PaymentMethod;
  operatorId?: string;
  fokontanyId?: string;
  communeId?: string;
}): Promise<{ subscription: Subscription; escrowId: string }> {
  const lock = await acquireSubscriptionCreationLock(input.citizenId);
  try {
    return await createSubscriptionFromOfferUnlocked(input);
  } finally {
    await releaseSubscriptionCreationLock(input.citizenId, lock);
  }
}

async function createSubscriptionFromOfferUnlocked(input: {
  citizenId: string;
  offerId: string;
  paymentMethod: PaymentMethod;
  operatorId?: string;
  fokontanyId?: string;
  communeId?: string;
}): Promise<{ subscription: Subscription; escrowId: string }> {
  const [activeSubscription, pendingSubscription] = await Promise.all([
    getActiveSubscriptionForCitizen(input.citizenId),
    getPendingSubscriptionForCitizen(input.citizenId),
  ]);
  if (activeSubscription || pendingSubscription) {
    throw new Error(activeSubscription
      ? "An active subscription already exists for this citizen"
      : "A subscription is already awaiting payment confirmation");
  }

  const offer = await getOffer(input.offerId);
  if (!offer) throw new Error("Offer not found");
  if (offer.status !== "ACTIVE") throw new Error("Offer is not active");
  if (!offer.activeVersionId) throw new Error("Offer has no active version");
  if (!offer.operatorId) throw new Error("Offer has no assigned operator");
  if (input.operatorId && input.operatorId !== offer.operatorId) {
    throw new Error("Subscription operator must match the offer operator");
  }

  const version = await getOfferVersion(offer.activeVersionId);
  if (!version) throw new Error("Active version not found");

  const commercial = version.commercial;
  const amountMGA =
    commercial.monthlyPriceMGA ?? commercial.contractPriceMGA ?? commercial.perPickupPriceMGA ?? 0;
  if (!Number.isSafeInteger(amountMGA) || amountMGA <= 0) {
    throw new Error("Offer price must be a positive whole MGA amount before subscription checkout");
  }

  const freq = commercial.serviceLevel.collectionFrequency;
  const expectedCollections =
    freq === "DAILY" ? 30 : freq === "TWICE_WEEKLY" ? 8 :
    freq === "WEEKLY" ? 4 : freq === "BIWEEKLY" ? 2 :
    freq === "MONTHLY" ? 1 : 4;

  // 1. Create subscription id first (needed for escrow link)
  const subRef = db().collection(collections.subscriptions).doc();
  const holdType = resolveHoldType(input.paymentMethod);

  // 2. Create escrow
  const escrow = await createEscrow({
    subscriptionId: subRef.id,
    citizenId: input.citizenId,
    operatorId: offer.operatorId,
    method: input.paymentMethod,
    holdType,
    totalAmountMGA: amountMGA,
    expectedCollections,
  });

  // 3. Build snapshot
  const snapshot = buildSubscriptionSnapshotFromOffer({
    citizenId: input.citizenId,
    offerId: offer.id,
    offerVersionId: version.id,
    offerVersion: version,
    paymentMethod: input.paymentMethod,
    escrowId: escrow.id,
    holdType,
    escrowStatus: escrow.status,
    operatorId: offer.operatorId,
    fokontanyId: input.fokontanyId,
    communeId: input.communeId ?? offer.communeId,
  });

  const now = Date.now();
  const sub: Subscription = { id: subRef.id, ...snapshot, createdAt: now, updatedAt: now };
  await subRef.set(sub);

  return { subscription: sub, escrowId: escrow.id };
}

async function acquireSubscriptionCreationLock(citizenId: string): Promise<string> {
  const dbRef = db();
  const lockRef = dbRef.collection(collections.subscriptionCreationLocks)
    .doc(createHash("sha256").update(citizenId).digest("hex"));
  const requestId = randomUUID();
  const now = Date.now();
  await dbRef.runTransaction(async (tx) => {
    const doc = await tx.get(lockRef);
    if (doc.exists && doc.get("status") === "CREATING" && Number(doc.get("expiresAt") ?? 0) > now) {
      throw new Error("A subscription request is already being processed");
    }
    tx.set(lockRef, {
      citizenId,
      requestId,
      status: "CREATING",
      startedAt: now,
      expiresAt: now + 120_000,
    });
  });
  return requestId;
}

async function releaseSubscriptionCreationLock(citizenId: string, requestId: string): Promise<void> {
  const lockRef = db().collection(collections.subscriptionCreationLocks)
    .doc(createHash("sha256").update(citizenId).digest("hex"));
  await db().runTransaction(async (tx) => {
    const doc = await tx.get(lockRef);
    if (!doc.exists || doc.get("requestId") !== requestId) return;
    tx.update(lockRef, { status: "RELEASED", expiresAt: Date.now(), releasedAt: Date.now() });
  });
}

// ----------------------------------------------------------------
// READ
// ----------------------------------------------------------------
export async function getSubscription(id: string): Promise<Subscription | null> {
  const doc = await db().collection(collections.subscriptions).doc(id).get();
  return doc.exists ? (doc.data() as Subscription) : null;
}

export async function getActiveSubscriptionForCitizen(citizenId: string): Promise<Subscription | null> {
  const now = Date.now();
  const snap = await db()
    .collection(collections.subscriptions)
    .where("citizenId", "==", citizenId)
    .where("status", "==", "ACTIVE")
    .where("currentPeriodEnd", ">", now)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data() as Subscription;
}

export async function getPendingSubscriptionForCitizen(citizenId: string): Promise<Subscription | null> {
  const snap = await db().collection(collections.subscriptions)
    .where("citizenId", "==", citizenId)
    .get();
  const pending = snap.docs
    .map((doc) => doc.data() as Subscription)
    .filter((subscription) => subscription.status === "PENDING")
    .sort((a, b) => b.createdAt - a.createdAt);
  return pending[0] ?? null;
}

// ----------------------------------------------------------------
// ACTIVATE (after escrow authorization)
// ----------------------------------------------------------------
export async function activateSubscription(
  subscriptionId: string,
  actor: { uid: string; role: string }
): Promise<Subscription> {
  const ref = db().collection(collections.subscriptions).doc(subscriptionId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Subscription not found");
  const sub = doc.data() as Subscription;
  if (sub.cancellationPending) throw new Error("Subscription cancellation is in progress");

  if (sub.status !== "ACTIVE") {
    if (sub.status !== "PENDING" && sub.status !== "PENDING_CASH") {
      throw new Error(`Cannot activate subscription from ${sub.status}`);
    }

    const now = Date.now();
    await ref.update({
      status: "ACTIVE",
      escrowStatus: sub.holdType === "CASH_ON_DELIVERY" ? sub.escrowStatus : "HELD",
      validated: true,
      validatedBy: actor.uid,
      validatedAt: now,
      updatedAt: now,
    });
  }

  if (!sub.operatorId) throw new Error("Subscription has no assigned operator");

  // Safe to repeat after a process interruption. The cycle scheduler uses
  // deterministic IDs and preserves cycles that have already advanced.
  await scheduleCyclesForSubscription({
    subscriptionId: sub.id,
    citizenId: sub.citizenId,
    operatorId: sub.operatorId,
    offerId: sub.offerId,
    offerVersionId: sub.offerVersionId,
    expectedCollections: sub.expectedCollections,
    periodStart: sub.currentPeriodStart,
    periodEnd: sub.currentPeriodEnd,
  });
  const fresh = await ref.get();
  return fresh.data() as Subscription;
}

// ----------------------------------------------------------------
// CANCEL (releases remaining escrow)
// ----------------------------------------------------------------
export async function cancelSubscription(
  subscriptionId: string,
  citizenId: string,
  reason?: string
): Promise<Subscription> {
  const ref = db().collection(collections.subscriptions).doc(subscriptionId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Subscription not found");
  const sub = doc.data() as Subscription;
  if (sub.citizenId !== citizenId) throw new Error("Not the owner");

  const now = Date.now();
  await ref.update({
    status: "CANCELLED",
    cancellationPending: false,
    cancelledAt: now,
    cancelReason: reason ?? null,
    updatedAt: now,
  });
  return { ...sub, status: "CANCELLED", cancellationPending: false, cancelledAt: now, cancelReason: reason ?? null, updatedAt: now };
}

export async function beginSubscriptionCancellation(subscriptionId: string, citizenId: string, reason?: string): Promise<void> {
  const dbRef = db();
  const subscriptionRef = dbRef.collection(collections.subscriptions).doc(subscriptionId);
  const now = Date.now();
  await dbRef.runTransaction(async (tx) => {
    const doc = await tx.get(subscriptionRef);
    if (!doc.exists) throw new Error("Subscription not found");
    const sub = doc.data() as Subscription;
    if (sub.citizenId !== citizenId) throw new Error("Not the owner");
    if (sub.status === "CANCELLED") return;
    if (!sub.cancellationPending) {
      tx.update(subscriptionRef, { cancellationPending: true, cancellationRequestedAt: now, updatedAt: now });
    }
  });

  const scheduledCycles = await db().collection(collections.serviceCycles)
    .where("subscriptionId", "==", subscriptionId)
    .get();
  const inProgress = scheduledCycles.docs.find((cycleDoc) =>
    ["PERFORMED", "PROOF_CAPTURED", "VERIFIED", "ACCEPTED", "DISPUTED"].includes(cycleDoc.get("status"))
  );
  if (inProgress) {
    await subscriptionRef.update({ cancellationPending: false, updatedAt: Date.now() });
    throw new Error("A service cycle is already in progress. Let it finish or be resolved before cancelling.");
  }
  for (const cycleDoc of scheduledCycles.docs) {
    if (!["SCHEDULED", "ASSIGNED"].includes(cycleDoc.get("status"))) continue;
    await transitionCycle({
      cycleId: cycleDoc.id,
      transition: "CANCEL",
      actor: "SYSTEM",
      actorUserId: citizenId,
      patch: { cancelledReason: reason ?? "Subscription cancelled" },
    });
  }
}

// ----------------------------------------------------------------
// USAGE
// ----------------------------------------------------------------
export async function incrementCollectionUsage(subscriptionId: string): Promise<void> {
  const ref = db().collection(collections.subscriptions).doc(subscriptionId);
  await ref.update({
    collectionsUsed: FieldValue.increment(1),
    collectionsRemaining: FieldValue.increment(-1),
    updatedAt: Date.now(),
  });
}

/** Rebuilds denormalized usage counters from the cycle ledger. */
export async function recomputeSubscriptionCounters(subscriptionId: string): Promise<void> {
  const dbRef = db();
  const subRef = dbRef.collection(collections.subscriptions).doc(subscriptionId);
  const [subDoc, cycles] = await Promise.all([
    subRef.get(),
    dbRef.collection(collections.serviceCycles).where("subscriptionId", "==", subscriptionId).get(),
  ]);
  if (!subDoc.exists) throw new Error("Subscription not found");

  const used = cycles.docs.filter((doc) => {
    const cycle = doc.data();
    return !!cycle.proof || ["PERFORMED", "PROOF_CAPTURED", "VERIFIED", "ACCEPTED", "SETTLED"].includes(cycle.status);
  }).length;
  const expected = Number(subDoc.get("expectedCollections") ?? 0);
  await subRef.update({
    collectionsUsed: used,
    collectionsRemaining: Math.max(0, expected - used),
    updatedAt: Date.now(),
  });
}
