import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { OperatorTerritoryValidation } from "@/lib/domain/stake/operatorTerritoryValidationTypes";
import { validationId } from "@/lib/domain/stake/operatorTerritoryValidationTypes";

function db() { return getFirestore(getAdminApp()); }

export async function writeOperatorTerritoryValidation(
  input: Omit<OperatorTerritoryValidation, "id" | "validated" | "validatedAt">
): Promise<OperatorTerritoryValidation> {
  const id = validationId(input.operatorId, input.territoryId);
  const record: OperatorTerritoryValidation = {
    id,
    ...input,
    validated: true,
    validatedAt: Date.now(),
  };
  await db().collection(collections.operatorTerritoryValidations).doc(id).set(record, { merge: true });
  return record;
}

export async function getOperatorTerritoryValidation(
  operatorId: string, territoryId: string
): Promise<OperatorTerritoryValidation | null> {
  const doc = await db().collection(collections.operatorTerritoryValidations)
    .doc(validationId(operatorId, territoryId)).get();
  return doc.exists ? (doc.data() as OperatorTerritoryValidation) : null;
}

export async function listValidationsForOperator(operatorId: string): Promise<OperatorTerritoryValidation[]> {
  const snap = await db().collection(collections.operatorTerritoryValidations)
    .where("operatorId", "==", operatorId).get();
  return snap.docs.map((d) => d.data() as OperatorTerritoryValidation);
}
