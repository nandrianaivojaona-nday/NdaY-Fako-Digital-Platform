
// scripts/migrate-legacy-offers.ts
//
// Handles existing subscriptionOffers documents that predate the business
// model scenario requirement.
//
// Options:
//   --apply              perform the migration
//   --strategy=scaffold  (default) attach a scaffolded scenario to each legacy offer
//   --strategy=mark      mark legacy offers as LEGACY_UNVERIFIED and hide them
//   --strategy=delete    delete legacy offers (pre-production only)
//
// Idempotent. Safe to re-run.

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const DRY_RUN = !process.argv.includes("--apply");
const STRATEGY =
  (process.argv.find((a) => a.startsWith("--strategy="))?.split("=")[1]) ?? "scaffold";

async function main() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
      }),
    });
  }
  const db = getFirestore();

  console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLY"}, strategy: ${STRATEGY}`);

  const snap = await db.collection("subscriptionOffers").get();
  const report = {
    total: snap.size,
    alreadyMigrated: 0,
    scaffolded: 0,
    marked: 0,
    deleted: 0,
    errors: [] as string[],
  };

  for (const doc of snap.docs) {
    const offer = doc.data();

    // Idempotency — skip if already migrated
    if (offer.businessModelScenarioId || offer.legacyMigratedAt) {
      report.alreadyMigrated++;
      continue;
    }

    try {
      if (STRATEGY === "delete") {
        if (DRY_RUN) console.log(`[DRY] DELETE subscriptionOffers/${doc.id}`);
        else await doc.ref.delete();
        report.deleted++;
        continue;
      }

      if (STRATEGY === "mark") {
        const patch = {
          legacyMigratedAt: Date.now(),
          legacyMigratedBy: "migrate-legacy-offers",
          legacyReason: "predates_business_model",
          status: "RETIRED",
        };
        if (DRY_RUN) console.log(`[DRY] MARK ${doc.id}`);
        else await doc.ref.update(patch);
        report.marked++;
        continue;
      }

      // Default — scaffold strategy
      // Find or create a scaffold scenario for the commune so the offer can
      // be attached and remain visible. The scenario is marked with a warning
      // so operators know it must be regenerated when census data is available.

      const scaffoldRef = db.collection("businessModelScenarios").doc();
      const scaffold = {
        id: scaffoldRef.id,
        clusterId: offer.communeId ?? "LEGACY",
        regionId: offer.regionId ?? "LEGACY",
        communeId: offer.communeId ?? "LEGACY",
        viability: null,
        planProposals: [],
        segmentMix: [],
        totalHouseholds: 0,
        addressableHouseholds: 0,
        validationStatus: "ADJUST",
        status: "DRAFT",
        createdAt: Date.now(),
        createdBy: "migrate-legacy-offers",
        updatedAt: Date.now(),
        updatedBy: "migrate-legacy-offers",
        legacy: true,
        note: "Auto-generated scaffold for legacy offer migration. Regenerate from census.",
      };

      const patch = {
        businessModelScenarioId: scaffoldRef.id,
        legacyMigratedAt: Date.now(),
        legacyMigratedBy: "migrate-legacy-offers",
        legacyNote: "Migrated from pre-business-model era. Attached to scaffold scenario.",
      };

      if (DRY_RUN) {
        console.log(`[DRY] SCAFFOLD offer ${doc.id} → scenario ${scaffoldRef.id}`);
      } else {
        const batch = db.batch();
        batch.set(scaffoldRef, scaffold);
        batch.update(doc.ref, patch);
        await batch.commit();
      }
      report.scaffolded++;
    } catch (err: any) {
      report.errors.push(`${doc.id}: ${err.message}`);
    }
  }
  console.log("\n=== Report ===");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

 // **Recommended order for pilot:**

// ```bash
// # 1. Dry-run scaffold
// npx ts-node scripts/migrate-legacy-offers.ts --strategy=scaffold

// # 2. Inspect the report. If legacy offers are all test data:
// npx ts-node scripts/migrate-legacy-offers.ts --apply --strategy=delete

// # 3. If legacy offers matter (real pilot data):
// npx ts-node scripts/migrate-legacy-offers.ts --apply --strategy=scaffold
// # Then have operators regenerate their offers from validated scenarios.

