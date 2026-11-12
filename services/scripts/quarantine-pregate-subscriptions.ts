// Marks pre-gate subscriptions with quarantined:true, legacy:true.
// Dry-run by default. --apply to write.
// Run: node --env-file=.env.local --import tsx services/scripts/quarantine-pregate-subscriptions.ts [--apply]
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const app = getApps()[0] ?? initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore(app);

async function main() {
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  const subs = await db.collection("subscriptions").get();
  let marked = 0, skipped = 0, totalReasons: Record<string, number> = {};

  for (const doc of subs.docs) {
    const sub = doc.data();
    const reasons: string[] = [];
    if (!sub.territoryId) reasons.push("no_territoryId");
    if (!sub.configVersionId) reasons.push("no_configVersionId");

    let offerSnap = null;

    if (!sub.offerId || typeof sub.offerId !== "string") {
      reasons.push("no_offerId");
    } else {
      offerSnap = await db.collection("subscriptionOffers").doc(sub.offerId).get();
      if (!offerSnap.exists) {
        reasons.push("offer_missing");
      } else {
        const opId = offerSnap.data()?.operatorId;
        if (!opId) reasons.push("offer_no_operator");
        else if (sub.territoryId) {
          const valSnap = await db.collection("operatorTerritoryValidations")
            .doc(`${opId}_${sub.territoryId}`).get();
          if (!valSnap.exists || valSnap.data()?.validated !== true) {
            reasons.push("operator_not_validated");
          }
        }
      }
    }

    if (reasons.length === 0 || sub.quarantined === true) { skipped++; continue; }

    reasons.forEach((r) => { totalReasons[r] = (totalReasons[r] ?? 0) + 1; });
    console.log(`  ${APPLY ? "[apply]" : "[plan]"} ${doc.id}  [${reasons.join(",")}]`);
    if (APPLY) {
      await doc.ref.update({
        quarantined: true,
        quarantineReason: `PRE_GATE_SUBSCRIPTION: ${reasons.join(",")}`,
        quarantinedAt: Date.now(),
        legacy: true,
      });
    }
    marked++;
  }

  console.log();
  console.log(`Done. Marked: ${marked}  Skipped (already clean/flagged): ${skipped}  Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
  if (Object.keys(totalReasons).length > 0) {
    console.log("Reason breakdown:");
    Object.entries(totalReasons).forEach(([r, n]) => console.log(`  ${r}: ${n}`));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
