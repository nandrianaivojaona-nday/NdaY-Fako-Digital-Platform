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

const IDS = [
  "SUB-CUA-04-MAH-SEC01-SITE001-OP001",
  "SUB001-SITE001-SEC01-MAH-04-CUA",
  "SUB002-SITE001-SEC01-ARR04-CUA",
  "SUB003-SITE002-SEC01-ARR04-CUA",
  "SUB004-SITE001-SEC01-FKT01-CRAL",
  "plans",
];

const COLLECTIONS_REFERENCING_SUBSCRIPTION = [
  { name: "serviceCycles", field: "subscriptionId" },
  { name: "escrow", field: "subscriptionId" },
  { name: "payments", field: "subscriptionId" },
  { name: "settlements", field: "subscriptionId" },
  { name: "settlementPayouts", field: "subscriptionId" },
  { name: "subscriptionEvents", field: "subscriptionId" },
  { name: "subscriptionCreationLocks", field: "subscriptionId" },
];

async function main() {
  console.log(`Checking downstream references to ${IDS.length} subscription IDs...\n`);
  let totalRefs = 0;

  for (const c of COLLECTIONS_REFERENCING_SUBSCRIPTION) {
    for (const id of IDS) {
      const snap = await db.collection(c.name).where(c.field, "==", id).limit(5).get();
      if (!snap.empty) {
        totalRefs += snap.size;
        console.log(`  ⚠️  ${c.name} → ${snap.size} doc(s) reference ${id}`);
        snap.docs.forEach((d) => console.log(`       ${d.id}`));
      }
    }
  }

  if (totalRefs === 0) {
    console.log("✅ No downstream references. Safe to delete all 6 records.");
  } else {
    console.log(`\n❌ ${totalRefs} downstream reference(s) found. Do NOT delete yet.`);
    console.log("   Investigate: these malformed subscription IDs are being referenced.");
    console.log("   Deleting them would orphan the referencing documents.");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });