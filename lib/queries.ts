// lib/queries.ts

import { db } from "@/lib/firebase";
import { Operator } from "@/types/operator";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";

import {
  ImpactMetrics,
} from "@/types/metrics";



// ==============================
// Operator type
// ==============================




// ==============================
// Public operators
// ==============================

export async function getPublicOperators(): Promise<Operator[]> {

  const q = query(
    collection(db, "operators"),
    where("isPublic", "==", true),
    where("status", "==", "ACTIVE")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

}



// ==============================
// Global impact
// ==============================

export async function getGlobalImpact(): Promise<ImpactMetrics> {

  const ref = doc(
    db,
    "impact_metrics",
    "global"
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {

    return {
      households: 0,
      kg: 0,
      som: 0,
    };

  }

  return snap.data() as ImpactMetrics;

}



// ==============================
// Operator impact
// ==============================

export async function getOperatorImpact(
  operatorId: string
): Promise<ImpactMetrics> {

  const ref = doc(
    db,
    "impact_metrics",
    operatorId
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {

    return {
      households: 0,
      kg: 0,
      som: 0,
    };

  }

  return snap.data() as ImpactMetrics;

}



// ==============================
// Municipality impact (NEW)
// ==============================

export async function getMunicipalityImpact(
  municipalityId: string
): Promise<ImpactMetrics> {

  const ref = doc(
    db,
    "impact_metrics",
    municipalityId
  );

  const snap = await getDoc(ref);

  if (!snap.exists()) {

    return {
      households: 0,
      kg: 0,
      som: 0,
    };

  }

  return snap.data() as ImpactMetrics;

}