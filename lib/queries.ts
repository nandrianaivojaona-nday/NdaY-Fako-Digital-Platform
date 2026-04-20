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



export async function getCampaigns(): Promise<any[]> {
  
  // Placeholder implementation
  return [];
}



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

export async function getGlobalImpact() {
  try {
    // Calculate from actual data
    const campaignsSnapshot = await getDocs(collection(db, "campaigns"));
    const operatorsSnapshot = await getDocs(collection(db, "operators"));
    
    // Sum up households from campaigns or operators
    let totalHouseholds = 0;
    let totalKg = 0;
    
    campaignsSnapshot.forEach(doc => {
      const data = doc.data();
      totalHouseholds += data.metrics?.households || 0;
      totalKg += data.metrics?.waste || 0;
    });
    
    // Calculate SOM (Service Operating Margin) from operator data
    let somSum = 0;
    let operatorCount = 0;
    operatorsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.som) {
        somSum += data.som;
        operatorCount++;
      }
    });
    
    return {
      households: totalHouseholds,
      kg: totalKg,
      som: operatorCount > 0 ? Math.round(somSum / operatorCount) : 0
    };
  } catch (error) {
    console.error("Error calculating global impact:", error);
    return { households: 0, kg: 0, som: 0 };
  }
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