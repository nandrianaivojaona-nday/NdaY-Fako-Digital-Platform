// services/collectorService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { captureProof, transitionCycle, verifyCycle } from "./serviceCycleService";
import { recomputeSubscriptionCounters } from "./subscriptionService";

function db() { return getFirestore(getAdminApp()); }

export async function getTodayRoute(operatorId: string, collectorId: string) {
  const dbRef = db();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const snap = await dbRef.collection("collectorRoutes")
    .where("operatorId", "==", operatorId)
    .where("collectorId", "==", collectorId)
    .where("date", "==", today.getTime())
    .limit(1).get();
  if (snap.empty) return { route: null, stops: [] };

  const routeDoc = snap.docs[0];
  const route = { id: routeDoc.id, zoneName: routeDoc.data().zoneName };
  const stopsSnap = await dbRef.collection("collectorRoutes").doc(routeDoc.id)
    .collection("stops").orderBy("sequence", "asc").get();
  return { route, stops: stopsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) };
}

// ----------------------------------------------------------------
// PICKUP → capture service proof. Financial settlement waits for
// verification and citizen acceptance in the settlement pipeline.
// ----------------------------------------------------------------
export async function logPickupWithChain(input: {
  collectorId: string;
  subscriptionId: string;
  stopId: string;
  weights: { organicKg: number; recyclableKg: number; otherKg: number };
  sortingCompliant: boolean;
  gps?: { lat: number; lng: number; accuracyM: number };
  photoUrls?: string[];
}) {
  const dbRef = db();
  const now = Date.now();

  // Confirm this stop is on a route assigned to the authenticated collector.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const routes = await dbRef.collection("collectorRoutes")
    .where("collectorId", "==", input.collectorId)
    .where("date", "==", today.getTime())
    .get();
  let stop: Record<string, any> | null = null;
  let operatorId = "";
  for (const routeDoc of routes.docs) {
    const stopDoc = await routeDoc.ref.collection("stops").doc(input.stopId).get();
    if (stopDoc.exists && stopDoc.get("subscriptionId") === input.subscriptionId) {
      stop = stopDoc.data() ?? {};
      operatorId = routeDoc.get("operatorId") ?? "";
      break;
    }
  }
  if (!stop || !operatorId) throw new Error("Stop is not assigned to this collector today");

  const subDoc = await dbRef.collection(collections.subscriptions).doc(input.subscriptionId).get();
  if (!subDoc.exists) throw new Error("Subscription not found");
  const sub = subDoc.data()!;
  if (sub.status !== "ACTIVE") throw new Error("Subscription is not active");
  if (sub.operatorId !== operatorId) throw new Error("Subscription belongs to another operator");

  const binId = String(stop.binId ?? "");
  const bagId = String(stop.bagId ?? "");
  const cycleId = String(stop.cycleId ?? "");
  if (!binId || !bagId || !cycleId) throw new Error("Route stop is missing its bin, bag, or service cycle assignment");

  const binDoc = await dbRef.collection("bins").doc(binId).get();
  if (!binDoc.exists) throw new Error("Bin not registered");
  if (binDoc.data()!.subscriptionId !== input.subscriptionId) {
    throw new Error("Bin does not belong to this household");
  }

  const bagDoc = await dbRef.collection("bags").doc(bagId).get();
  if (!bagDoc.exists) throw new Error("Bag not registered");
  const bag = bagDoc.data()!;
  if (bag.operatorId !== operatorId) throw new Error("Bag belongs to another operator");

  const cycleRef = dbRef.collection(collections.serviceCycles).doc(cycleId);
  const cycleDoc = await cycleRef.get();
  if (!cycleDoc.exists) throw new Error("Assigned service cycle not found");
  const cycle = cycleDoc.data()!;
  if (cycle.subscriptionId !== input.subscriptionId || cycle.collectorId !== input.collectorId) {
    throw new Error("Service cycle is not assigned to this collector and subscription");
  }

  const proofRef = dbRef.collection("serviceProofs").doc(`proof_${cycleId}`);
  const priorProof = await proofRef.get();
  if (priorProof.exists && cycle.proof?.proofId === priorProof.id && cycle.status !== "ASSIGNED") {
    if (cycle.status === "PROOF_CAPTURED" && !cycle.verification) {
      await verifyCapturedPickup(cycleId, input.collectorId, sub, cycle.proof!);
    }
    await recomputeSubscriptionCounters(input.subscriptionId);
    await markBagCollected(bagId, input.collectorId, input.subscriptionId, priorProof.id, cycle.proof!.weights);
    return { serviceProofId: priorProof.id, cycleId, duplicate: true };
  }
  if (cycle.status !== "ASSIGNED") throw new Error(`Cannot record pickup for cycle in ${cycle.status}`);

  const proof = {
    proofId: proofRef.id,
    capturedAt: now,
    gps: input.gps,
    photoUrls: input.photoUrls ?? [],
    weights: input.weights,
    binId,
    bagId,
    sortingCompliant: input.sortingCompliant,
  };
  await proofRef.set({
    id: proofRef.id,
    type: "PICKUP",
    collectorId: input.collectorId,
    operatorId,
    citizenId: sub.citizenId,
    subscriptionId: input.subscriptionId,
    cycleId,
    binId,
    bagId,
    weights: input.weights,
    sortingCompliant: input.sortingCompliant,
    gps: input.gps ?? null,
    photoUrls: input.photoUrls ?? [],
    collectedAt: now,
    disputeDeadline: now + 72 * 60 * 60 * 1000, // 72h
    disputed: false,
  });

  await transitionCycle({ cycleId, transition: "PERFORM", actor: "COLLECTOR", actorUserId: input.collectorId });
  await captureProof({ cycleId, actorUserId: input.collectorId, proof });
  await verifyCapturedPickup(cycleId, input.collectorId, sub, proof);
  await markBagCollected(bagId, input.collectorId, input.subscriptionId, proofRef.id, input.weights);
  await recomputeSubscriptionCounters(input.subscriptionId);

  return { serviceProofId: proofRef.id, cycleId, duplicate: false };
}

async function verifyCapturedPickup(
  cycleId: string,
  collectorId: string,
  subscription: Record<string, any>,
  proof: { weights: { organicKg: number; recyclableKg: number; otherKg: number }; sortingCompliant: boolean },
) {
  const weights = Object.values(proof.weights);
  const weightsValid = weights.every((value) => Number.isFinite(value) && value >= 0) && weights.some((value) => value > 0);
  const requiresSorting = subscription.planSnapshot?.verification?.requiresSortingCompliance === true;
  const warnings = [
    ...(!weightsValid ? ["WEIGHTS_INVALID_OR_EMPTY"] : []),
    ...(requiresSorting && !proof.sortingCompliant ? ["SORTING_NON_COMPLIANT"] : []),
  ];
  await verifyCycle({
    cycleId,
    actorUserId: "SYSTEM",
    actor: "SYSTEM",
    verification: {
      outcome: warnings.length ? "FLAGGED_FOR_SUPERVISOR" : "PASSED",
      verifiedAt: Date.now(),
      verifiedBy: "SYSTEM_SERVICE_PROOF_RULES",
      rules: ["WEIGHTS_FINITE_NON_NEGATIVE", "REQUIRED_SORTING_COMPLIANCE"],
      warnings,
    },
  });
}

async function markBagCollected(
  bagId: string,
  collectorId: string,
  subscriptionId: string,
  serviceProofId: string,
  weights: { organicKg: number; recyclableKg: number; otherKg: number },
) {
  const totalKg = weights.organicKg + weights.recyclableKg + weights.otherKg;
  await db().collection("bags").doc(bagId).update({
    status: "COLLECTED",
    issuedToCollectorId: collectorId,
    collectedAt: Date.now(),
    collectedFromSubscriptionId: subscriptionId,
    weightKg: totalKg,
    serviceProofId,
  });
}

export async function logPickup(input: {
  collectorId: string;
  subscriptionId: string;
  stopId: string;
  weights: { organicKg: number; recyclableKg: number; otherKg: number };
  sortingCompliant: boolean;
  gps?: { lat: number; lng: number; accuracyM: number };
  photoUrls?: string[];
}) {
  return logPickupWithChain(input);
}

export async function reportIncident(input: {
  collectorId: string;
  stopId: string;
  type: string;
  note?: string;
}) {
  const route = await getAssignedRouteForStop(input.collectorId, input.stopId);
  if (!route) throw new Error("Stop is not assigned to this collector today");
  const ref = db().collection(collections.collectorIncidents).doc();
  const incident = {
    id: ref.id,
    collectorId: input.collectorId,
    operatorId: route.operatorId,
    routeId: route.routeId,
    stopId: input.stopId,
    type: input.type,
    note: input.note ?? "",
    status: "OPEN",
    createdAt: Date.now(),
  };
  await ref.create(incident);
  return incident;
}

export async function validateCash(input: {
  collectorId: string;
  operatorId: string;
  subscriptionId: string;
  cycleId: string;
  amountMGA: number;
}) {
  const dbRef = db();
  const [subDoc, cycleDoc] = await Promise.all([
    dbRef.collection(collections.subscriptions).doc(input.subscriptionId).get(),
    dbRef.collection(collections.serviceCycles).doc(input.cycleId).get(),
  ]);
  if (!subDoc.exists || !cycleDoc.exists) throw new Error("Subscription or service cycle not found");
  const sub = subDoc.data()!;
  const cycle = cycleDoc.data()!;
  if (sub.paymentMethod !== "CASH") throw new Error("Subscription does not use cash payment");
  if (sub.status !== "ACTIVE") throw new Error("Cash subscription is not active");
  if (cycle.subscriptionId !== input.subscriptionId || cycle.collectorId !== input.collectorId || cycle.operatorId !== input.operatorId) {
    throw new Error("Service cycle is not assigned to this collector and subscription");
  }
  if (sub.operatorId !== input.operatorId) throw new Error("Collector does not belong to the subscription operator");
  if (!["PROOF_CAPTURED", "VERIFIED", "ACCEPTED"].includes(cycle.status)) {
    throw new Error("Cash can only be recorded after service proof is captured");
  }
  if (input.amountMGA !== cycle.entitlementValueMGA) throw new Error("Cash amount does not match the cycle amount");

  const ref = dbRef.collection(collections.paymentEvents).doc(`cash_${input.cycleId}`);
  return dbRef.runTransaction(async (tx) => {
    const existing = await tx.get(ref);
    if (existing.exists) {
      if (
        existing.get("amountMGA") === input.amountMGA &&
        existing.get("collectorId") === input.collectorId &&
        existing.get("operatorId") === input.operatorId
      ) {
        return { id: ref.id, duplicate: true };
      }
      throw new Error("A different cash payment is already recorded for this cycle");
    }
    tx.create(ref, {
      id: ref.id,
      subscriptionId: input.subscriptionId,
      cycleId: input.cycleId,
      amountMGA: input.amountMGA,
      method: "CASH",
      status: "CAPTURED",
      collectorId: input.collectorId,
      operatorId: input.operatorId,
      recordedAt: Date.now(),
    });
    return { id: ref.id, duplicate: false };
  });
}

async function getAssignedRouteForStop(collectorId: string, stopId: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const routes = await db().collection("collectorRoutes")
    .where("collectorId", "==", collectorId)
    .where("date", "==", today.getTime())
    .get();
  for (const doc of routes.docs) {
    const stop = await doc.ref.collection("stops").doc(stopId).get();
    if (stop.exists) return { routeId: doc.id, operatorId: doc.get("operatorId") as string | undefined };
  }
  return null;
}
