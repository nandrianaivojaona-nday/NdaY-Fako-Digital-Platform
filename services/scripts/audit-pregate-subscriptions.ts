// READ-ONLY. Reports subscriptions that violate Gate 4 coherence rules.
// Run: node --env-file=.env.local --import tsx services/scripts/audit-pregate-subscriptions.ts
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

async function main() {
  const subs = await db.collection("subscriptions").get();
  console.log(`Scanning ${subs.size} subscription(s)...\n`);
  const preGate: Array<{ id: string; reasons: string[]; operatorId?: string }> = [];

  for (const doc of subs.docs) {
    const sub = doc.data();
    const reasons: string[] = [];
    if (!sub.territoryId) reasons.push("no_territoryId");
    if (!sub.configVersionId) reasons.push("no_configVersionId");
    if (sub.quarantined === true) reasons.push("already_quarantined");

    let offerSnap = null;
    let offerOpId: string | undefined;

    if (!sub.offerId || typeof sub.offerId !== "string") {
      reasons.push("no_offerId");
    } else {
      offerSnap = await db.collection("subscriptionOffers").doc(sub.offerId).get();
      if (!offerSnap.exists) {
        reasons.push("offer_missing");
      } else {
        offerOpId = offerSnap.data()?.operatorId;
        if (!offerOpId) reasons.push("offer_no_operator");
        else if (sub.territoryId) {
          const valSnap = await db.collection("operatorTerritoryValidations")
            .doc(`${offerOpId}_${sub.territoryId}`).get();
          if (!valSnap.exists || valSnap.data()?.validated !== true) {
            reasons.push("operator_not_validated");
          }
        }
      }
    }

    if (reasons.length > 0) {
      preGate.push({ id: doc.id, reasons, operatorId: offerOpId });
    }
  }

  console.log(`PRE-GATE subscriptions: ${preGate.length} / ${subs.size}`);
  if (preGate.length === 0) {
    console.log("✅ No pre-gate subscriptions. Quarantine script not needed.");
    return;
  }
  console.log();
  for (const p of preGate.slice(0, 50)) {
    console.log(`  ${p.id}  [${p.reasons.join(",")}]  op=${p.operatorId ?? "?"}`);
  }
  if (preGate.length > 50) console.log(`  ... +${preGate.length - 50} more`);
  console.log();
  console.log("→ Run quarantine-pregate-subscriptions.ts --apply to mark them.");
}
main().catch((e) => { console.error(e); process.exit(1); });
