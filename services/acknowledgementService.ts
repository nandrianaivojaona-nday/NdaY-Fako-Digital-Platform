// services/acknowledgementService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import { acknowledgeCycle } from "./serviceCycleService";
import { runSettlementPipeline } from "./settlementPipelineService";

function db() { return getFirestore(getAdminApp()); }

export async function acknowledgeViaApp(cycleId: string, citizenId: string) {
  const cycle = await acknowledgeCycle({ cycleId, method: "CITIZEN_APP", actorUserId: citizenId });
  const pipeline = await runSettlementPipeline(cycleId);
  return { cycle, pipeline };
}

export async function acknowledgeViaUSSD(input: { cycleId: string; phoneNumber: string }) {
  const citizenId = await resolveCitizenByPhone(input.phoneNumber);
  if (!citizenId) throw new Error("Unknown citizen");
  const cycle = await acknowledgeCycle({ cycleId: input.cycleId, method: "CITIZEN_USSD", actorUserId: citizenId });
  const pipeline = await runSettlementPipeline(input.cycleId);
  return { cycle, pipeline };
}

export async function acknowledgeViaSMSOTP(input: {
  cycleId: string; phoneNumber: string; otpCode: string;
}) {
  const valid = await verifyOTP(input.phoneNumber, input.otpCode);
  if (!valid) throw new Error("Invalid OTP");
  const citizenId = await resolveCitizenByPhone(input.phoneNumber);
  if (!citizenId) throw new Error("Unknown citizen");
  const cycle = await acknowledgeCycle({ cycleId: input.cycleId, method: "CITIZEN_SMS_OTP", actorUserId: citizenId });
  const pipeline = await runSettlementPipeline(input.cycleId);
  return { cycle, pipeline };
}

export async function runAutoAcceptSweep(): Promise<{ processed: number }> {
  const now = Date.now();
  const snap = await db()
    .collection(collections.serviceCycles)
    .where("status", "==", "VERIFIED")
    .where("acknowledgement.autoAcceptAt", "<=", now)
    .limit(200)
    .get();

  let processed = 0;
  const policyCache = new Map<string, boolean>();
  for (const doc of snap.docs) {
    const cycle = doc.data();
    if (cycle.acknowledgement?.status !== "PENDING") continue;
    let autoAcceptAllowed = policyCache.get(cycle.offerVersionId);
    if (autoAcceptAllowed === undefined) {
      const offerVersionDoc = await db()
        .collection(collections.subscriptionOfferVersions)
        .doc(cycle.offerVersionId).get();
      autoAcceptAllowed = offerVersionDoc.data()?.commercial?.acknowledgementPolicy?.allowAutoAccept === true;
      policyCache.set(cycle.offerVersionId, autoAcceptAllowed);
    }
    if (!autoAcceptAllowed) continue;

    await acknowledgeCycle({ cycleId: doc.id, method: "AUTO_ACCEPT_CONTRACTUAL", actorUserId: "SYSTEM" });
    await runSettlementPipeline(doc.id);
    processed++;
  }
  return { processed };
}

async function resolveCitizenByPhone(phoneNumber: string): Promise<string | null> {
  const snap = await db().collection(collections.users).where("phone", "==", phoneNumber).limit(1).get();
  return snap.empty ? null : snap.docs[0].id;
}

async function verifyOTP(phoneNumber: string, otpCode: string): Promise<boolean> {
  const endpoint = process.env.SMS_OTP_VERIFY_URL;
  if (!endpoint) return false;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: phoneNumber, code: otpCode }),
  });
  return res.ok;
}
