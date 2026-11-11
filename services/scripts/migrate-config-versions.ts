import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { computeContentHash } from "../../lib/domain/config/hashConfig";

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
  const camps = await db.collection("campaigns").get();
  let migrated = 0, skipped = 0;
  for (const camp of camps.docs) {
    const c = camp.data();
    if (c.currentConfigVersionId) { skipped++; continue; }
    const pricing = c.pricingFramework ?? {};
    const fin = c.financialRules ?? {};
    const op = c.operatorRequirements ?? {};
    if (!Object.keys(pricing).length && !Object.keys(fin).length && !Object.keys(op).length) {
      console.log(`  [skip] ${camp.id}: no config fields`);
      skipped++; continue;
    }
    const contentHash = computeContentHash({ pricingFramework: pricing, financialRules: fin, operatorRequirements: op });
    const vRef = db.collection("campaignConfigVersions").doc();
    console.log(`  ${APPLY ? "[apply]" : "[plan] "} ${camp.id} -> ${vRef.id}`);
    if (APPLY) {
      await db.runTransaction(async (tx) => {
        tx.set(vRef, {
          versionId: vRef.id, campaignId: camp.id, versionNumber: 1, contentHash,
          pricingFramework: pricing, financialRules: fin, operatorRequirements: op,
          status: "LOCKED", createdBy: "migration", createdAt: Date.now(), lockedAt: Date.now(),
        });
        tx.update(camp.ref, { currentConfigVersionId: vRef.id, configLockedAt: Date.now() });
      });
    }
    migrated++;
  }
  console.log(`\nDone. Migrated: ${migrated}  Skipped: ${skipped}  Mode: ${APPLY ? "APPLY" : "DRY RUN"}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
