import fs from "fs";
import path from "path";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  fs.readFileSync(
    path.resolve("./scripts/serviceAccountKey.json"),
    "utf-8"
  )
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const BASE = "./seed/tana4";


// ------------------------------
// Helper
// ------------------------------

async function seedCollection(collection, file) {
  const filePath = path.join(BASE, file);

  if (!fs.existsSync(filePath)) {
    console.log("Skip:", file);
    return;
  }

  const data = JSON.parse(fs.readFileSync(filePath));

  if (!Array.isArray(data)) {
    console.log("Invalid JSON:", file);
    return;
  }

  const batch = db.batch();

  for (const item of data) {
    const { id, ...rest } = item;

    const ref = db.collection(collection).doc(id);

    batch.set(ref, rest);
  }

  await batch.commit();

  console.log(
    "Seeded",
    collection,
    "(" + data.length + ")"
  );
}


// ------------------------------
// MAIN
// ------------------------------

async function run() {

  console.log("===== SEED START =====");


  // --------------------------
  // ADMIN STRUCTURE
  // --------------------------

  await seedCollection(
    "municipalities",
    "municipalities.json"
  );

  await seedCollection(
    "arrondissements",
    "arrondissements.json"
  );

  await seedCollection(
    "fokontany",
    "fokontany.json"
  );

  await seedCollection(
    "sectors",
    "sectors.json"
  );

  await seedCollection(
    "sites",
    "sites.json"
  );


  // --------------------------
  // USERS
  // --------------------------

  await seedCollection(
    "users",
    "users.json"
  );


  // --------------------------
  // OPERATORS
  // --------------------------

  await seedCollection(
    "operators",
    "operators.json"
  );

  await seedCollection(
    "collectors",
    "collectors.json"
  );

  await seedCollection(
    "vehicles",
    "vehicles.json"
  );


  // --------------------------
  // BINS
  // --------------------------

  await seedCollection(
    "bins",
    "bins.json"
  );


  // --------------------------
  // ZONES
  // --------------------------

  await seedCollection(
    "operator_zones",
    "operator_zones.json"
  );


  // --------------------------
  // PLANS
  // --------------------------

  await seedCollection(
    "plans",
    "plans.json"
  );

  await seedCollection(
    "operator_plans",
    "operator_plans.json"
  );


  // --------------------------
  // SUBSCRIPTIONS
  // --------------------------

  await seedCollection(
    "subscriptions",
    "subscriptions.json"
  );


  // ====================================================
  // ✅ SPRINT 1 — AUDIT SYSTEM
  // ====================================================

  // --------------------------
  // CAMPAIGNS
  // --------------------------

  await seedCollection(
    "audit_campaigns",
    "audit_campaigns.json"
  );


  // --------------------------
  // AUDITS
  // --------------------------

  await seedCollection(
    "audits",
    "audits.json"
  );


  // --------------------------
  // OPERATIONS
  // --------------------------

  await seedCollection(
    "pickups",
    "pickups.json"
  );

  await seedCollection(
    "recycling_records",
    "recycling_records.json"
  );


  // --------------------------
  // DASHBOARD / UI REQUIRED
  // --------------------------

  await seedCollection(
    "impact_metrics",
    "impact_metrics.json"
  );


  console.log("===== SEED DONE =====");

}


run().catch(console.error);