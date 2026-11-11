// services/citizenAffordabilityService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { Cluster } from "@/lib/domain/territory/types";
import type { HouseholdProfile, AffordabilityResult } from "@/lib/domain/citizen/affordabilityTypes";
import { computeAffordability } from "@/lib/domain/citizen/affordabilityEngine";
import { computeLAA } from "@/lib/domain/territory/viabilityEngine";

function db() { return getFirestore(getAdminApp()); }

export async function getOrComputeAffordability(citizenId: string): Promise<AffordabilityResult | null> {
  const dbRef = db();
  const userDoc = await dbRef.collection(collections.users).doc(citizenId).get();
  if (!userDoc.exists) return null;
  const user = userDoc.data()!;
  if (!user.fokontanyId) return null;

  const cached = user.affordability as AffordabilityResult | undefined;
  if (cached && cached.censusVersion === user.fokontanyId) return cached;

  const cluster = await loadClusterForFokontany(user.fokontanyId);
  if (!cluster) return null;

  const laa = computeLAA(cluster);

  const profile: HouseholdProfile = {
    citizenId,
    fokontanyId: user.fokontanyId,
    communeId: user.communeId ?? cluster.communeId,
    householdSize: user.householdSize ?? 4,
    declaredMonthlyBudgetMGA: user.declaredMonthlyBudgetMGA,
  };

  const result = computeAffordability({ profile, cluster, clusterLAA: laa });

  await dbRef.collection(collections.users).doc(citizenId).update({
    affordability: result,
    affordabilityUpdatedAt: Date.now(),
  });

  return result;
}

async function loadClusterForFokontany(fokontanyId: string): Promise<Cluster | null> {
  const snap = await db()
    .collection(collections.clusters)
    .where("fokontanyIds", "array-contains", fokontanyId)
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as Cluster);
}