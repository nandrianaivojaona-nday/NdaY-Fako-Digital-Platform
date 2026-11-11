// services/businessModelService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { BusinessModelScenario } from "@/lib/domain/businessModel/scenarioTypes";
import type { OVEValidation } from "@/lib/domain/businessModel/validationTypes";
import { generateBusinessModelScenario } from "@/lib/domain/businessModel/scenarioGenerator";
import { runOVEValidation } from "@/lib/domain/businessModel/validationRules";
import type { Cluster } from "@/lib/domain/territory/types";
import type { TVERun } from "@/lib/domain/territory/tveRunTypes";

function db() { return getFirestore(getAdminApp()); }

// ================================================================
// GENERATE + PERSIST
// ================================================================
export async function createAndValidateScenario(input: {
  cluster: Cluster;
  tveRun: TVERun;
  actorUserId: string;
}): Promise<{ scenario: BusinessModelScenario; validation: OVEValidation }> {
  const dbRef = db();

  // 1. Generate scenario (DRAFT, PENDING validation)
  const generated = generateBusinessModelScenario({
    cluster: input.cluster,
    tveRun: input.tveRun,
    createdBy: input.actorUserId,
  });

  const scenarioRef = dbRef.collection(collections.businessModelScenarios).doc();
  generated.id = scenarioRef.id;

  // 2. Run OVE validation
  const validation = runOVEValidation({
    scenario: generated,
    tveRun: input.tveRun,
    validatedBy: input.actorUserId,
  });
  const validationRef = dbRef.collection(collections.oveValidations).doc();
  validation.id = validationRef.id;

  generated.validationStatus = validation.decision;
  generated.validationId = validation.id;

  // 3. Persist scenario + validation
  const batch = dbRef.batch();
  batch.set(scenarioRef, generated);
  batch.set(validationRef, validation);
  await batch.commit();

  return { scenario: generated, validation };
}

// ================================================================
// READ
// ================================================================
export async function getScenario(scenarioId: string): Promise<BusinessModelScenario | null> {
  const doc = await db().collection(collections.businessModelScenarios).doc(scenarioId).get();
  return doc.exists ? (doc.data() as BusinessModelScenario) : null;
}

export async function getActiveScenarioForCommune(communeId: string): Promise<BusinessModelScenario | null> {
  const snap = await db()
    .collection(collections.businessModelScenarios)
    .where("communeId", "==", communeId)
    .where("status", "==", "VALIDATED")
    .where("validationStatus", "==", "GO")
    .orderBy("updatedAt", "desc")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as BusinessModelScenario);
}
