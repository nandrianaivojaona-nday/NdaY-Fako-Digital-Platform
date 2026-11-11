// services/binService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { BinRecord } from "@/lib/domain/qr/types";

function db() { return getFirestore(getAdminApp()); }

// Issue a new bin for a subscription
export async function issueBin(input: {
  operatorId: string;
  subscriptionId: string;
  citizenId: string;
  fokontanyId: string;
  planTypeId: string;
  stream: BinRecord["stream"];
  issuedBy: string;
}): Promise<BinRecord> {
  const streamCode = streamToCode(input.stream);
  const tier = planTierCode(input.planTypeId);
  const serial = await nextBinSerial(input.operatorId, input.fokontanyId, tier, streamCode);
  const id = `BIN:${input.fokontanyId}-${tier}-${streamCode}-${String(serial).padStart(3, "0")}`;

  const now = Date.now();
  const bin: BinRecord = {
    id,
    operatorId: input.operatorId,
    subscriptionId: input.subscriptionId,
    citizenId: input.citizenId,
    fokontanyId: input.fokontanyId,
    planTypeId: input.planTypeId,
    stream: input.stream,
    serial,
    status: "ASSIGNED",
    issuedAt: now,
    issuedBy: input.issuedBy,
  };

  await db().collection("bins").doc(id).set(bin);
  await db().collection("binEvents").add({
    binId: id,
    type: "ISSUED",
    actorUserId: input.issuedBy,
    timestamp: now,
    subscriptionId: input.subscriptionId,
  });

  return bin;
}

export async function retireBin(binId: string, reason: string, actorUserId: string) {
  const now = Date.now();
  await db().collection("bins").doc(binId).update({
    status: "RETIRED",
    retiredAt: now,
    retiredReason: reason,
  });
  await db().collection("binEvents").add({
    binId,
    type: "RETIRED",
    actorUserId,
    timestamp: now,
    reason,
  });
}

export async function getBin(binId: string): Promise<BinRecord | null> {
  const doc = await db().collection("bins").doc(binId).get();
  return doc.exists ? (doc.data() as BinRecord) : null;
}

export async function listBinsForSubscription(subscriptionId: string): Promise<BinRecord[]> {
  const snap = await db()
    .collection("bins")
    .where("subscriptionId", "==", subscriptionId)
    .get();
  return snap.docs.map((d) => d.data() as BinRecord);
}

function streamToCode(s: BinRecord["stream"]): string {
  return { ORGANIC: "O", RECYCLABLE: "R", PLASTIC: "P", GLASS: "G", METAL: "M", CARBON: "C" }[s];
}
function planTierCode(planTypeId: string): string {
  return { HH_PREMIUM: "PRM", HH_EXCHANGE: "EXC", B2B_COMMERCIAL: "B2B", B2G_INSTITUTIONAL: "B2G" }[planTypeId] ?? "GEN";
}

async function nextBinSerial(operatorId: string, fokontanyId: string, tier: string, streamCode: string): Promise<number> {
  const key = `bins_${operatorId}_${fokontanyId}_${tier}_${streamCode}`;
  const ref = db().collection("_counters").doc(key);
  return await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? snap.data()!.value : 0;
    const next = current + 1;
    tx.set(ref, { value: next }, { merge: true });
    return next;
  });
}
