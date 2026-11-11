// services/bagService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import type { BagRecord, BinRecord } from "@/lib/domain/qr/types";

function db() { return getFirestore(getAdminApp()); }

// Issue a bag tag (called by collector during pickup)
export async function issueBagTag(input: {
  operatorId: string;
  fokontanyId: string;
  stream: BinRecord["stream"];
  collectorId: string;
  subscriptionId: string;
  weightKg: number;
  serviceProofId: string;
}): Promise<BagRecord> {
  const streamCode = streamToCode(input.stream);
  const batch = `${input.fokontanyId}-${streamCode}-${yyyymm()}`;
  const serial = await nextBagSerial(batch);
  const id = `BAG:${input.fokontanyId}-${streamCode}-${batch.split("-")[2]}-${String(serial).padStart(4, "0")}`;

  const now = Date.now();
  const bag: BagRecord = {
    id,
    operatorId: input.operatorId,
    stream: input.stream,
    fokontanyId: input.fokontanyId,
    serial,
    batchId: batch,
    status: "COLLECTED",
    issuedToCollectorId: input.collectorId,
    collectedAt: now,
    collectedFromSubscriptionId: input.subscriptionId,
    weightKg: input.weightKg,
    serviceProofId: input.serviceProofId,
    createdAt: now,
  };

  await db().collection("bags").doc(id).set(bag);
  await db().collection("bagEvents").add({
    bagId: id,
    type: "COLLECTED",
    actorUserId: input.collectorId,
    timestamp: now,
    weightKg: input.weightKg,
  });

  return bag;
}

// Called at the sort facility
export async function markBagSorted(bagId: string, facilityId: string, actorUserId: string) {
  const now = Date.now();
  await db().collection("bags").doc(bagId).update({
    status: "SORTED",
    sortFacilityId: facilityId,
  });
  await db().collection("bagEvents").add({
    bagId,
    type: "SORTED",
    actorUserId,
    timestamp: now,
    facilityId,
  });
}

// Called by downstream buyer / recycler
export async function markBagRecycled(bagId: string, buyerId: string, actorUserId: string) {
  const now = Date.now();
  await db().collection("bags").doc(bagId).update({
    status: "RECYCLED",
    recycledAt: now,
    downstreamBuyerId: buyerId,
  });
  await db().collection("bagEvents").add({
    bagId,
    type: "RECYCLED",
    actorUserId,
    timestamp: now,
    buyerId,
  });
}

function streamToCode(s: BinRecord["stream"]): string {
  return { ORGANIC: "ORG", RECYCLABLE: "REC", PLASTIC: "PLA", GLASS: "GLA", METAL: "MET", CARBON: "CAR" }[s];
}
function yyyymm(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
async function nextBagSerial(batchId: string): Promise<number> {
  const ref = db().collection("_counters").doc(`bags_${batchId}`);
  return await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data()!.value : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}
