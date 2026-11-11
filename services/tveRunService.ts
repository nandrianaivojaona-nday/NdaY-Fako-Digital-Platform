// services/tveRunService.ts
//
// Persists TVE Runs and provides read helpers.
// Called from stake finalization, offer versioning, and recalibration.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type { TVERun } from "@/lib/domain/territory/tveRunTypes";
import type { Cluster, DownstreamMarket } from "@/lib/domain/territory/types";
import { runViabilityEngine } from "@/lib/domain/territory/viabilityEngine";
import {
  extractServiceabilityInputs,
  computeServiceability,
} from "@/lib/domain/territory/serviceabilityEngine";
import {
  aggregateConfidence,
  type FieldEvidence,
  type ConfidenceLevel,
} from "@/lib/domain/territory/evidenceTypes";

function db() {
  return getFirestore(getAdminApp());
}

const MODEL_VERSION = "TVE_V1.2";

// ================================================================
// CREATE
// ================================================================
export async function createTVERun(input: {
  cluster: Cluster;
  market: DownstreamMarket;
  stakeId: string;
  marketVersion?: string;
  routeModelVersion?: string;
  hazardVersion?: string;
  actorUserId: string;
}): Promise<TVERun> {
  const { cluster, market, stakeId, actorUserId } = input;

  // Run the engine — no rounding inside, full precision retained
  const viability = runViabilityEngine(cluster, market);

  // Extract the serviceability for the record
  const serviceInputs = extractServiceabilityInputs(cluster);
  const serviceConfig = computeServiceability(cluster, serviceInputs);

  // Confidence from the evidence manifest
  const perField = extractEvidenceConfidence(cluster);
  const evidences = (cluster.rgph as any[]).flatMap((r) =>
    r.evidence ? Object.values(r.evidence) : []
  ) as FieldEvidence[];
  const overall = evidences.length > 0 ? aggregateConfidence(evidences) : "LOW";

  const runRef = db().collection(collections.tveRuns).doc();

  const run: TVERun = {
    id: runRef.id,
    clusterId: cluster.id,
    stakeId,

    modelVersion: MODEL_VERSION,
    inputSnapshot: {
      stakeId,
      clusterId: cluster.id,
      censusVersion: `${stakeId}:${cluster.builtAt}`,
      hazardVersion: input.hazardVersion,
      marketVersion: input.marketVersion ?? "MARKET_V1",
      routeModelVersion: input.routeModelVersion ?? "ROUTE_V1",
      evidenceSummary: perField,
    },

    assumptions: {
      modelVersion: MODEL_VERSION,
      alphaU: viability.laa.alphaU,
      tbiThreshold: viability.tbi.threshold,
      laborCostMGA: viability.ocd.rawLaborCostMGA,
      baseFuelOrMaintenanceMGA: viability.ocd.rawBaseFuelOrMaintenanceMGA,
      hazardWeight: 0.35,
      roadWeight: 0.30,
      worstCasePremiumThresholds: { high: 80, moderate: 60 },
      compostYield: 0.35,
    },

    serviceConfiguration: serviceConfig,

    economics: {
      laa: viability.laa,
      ocd: viability.ocd,
      tbi: viability.tbi,
      priceWindow: viability.priceWindow,
    },

    risks: {
      routeCostFactor: serviceConfig.routeCostFactor,
      hazardFactor: viability.ocd.routeCostFactor,
      serviceRisk: serviceConfig.serviceRisk,
      floodExposureWeighted: serviceInputs.floodExposureScore,
      maxFloodExposure: serviceInputs.maxFloodExposureScore,
      missedCollectionProbability: serviceConfig.missedCollectionProbability,
      seasonalAdjustmentRequired: serviceConfig.seasonalAdjustmentRequired,
    },

    confidence: {
      overall,
      notes: serviceConfig.confidenceNotes,
    },

    decision: "PENDING",
    computedAt: Date.now(),
    computedBy: actorUserId,
  };

  await runRef.set(run);
  return run;
}

// ================================================================
// READ
// ================================================================
export async function getTVERun(id: string): Promise<TVERun | null> {
  const doc = await db().collection(collections.tveRuns).doc(id).get();
  return doc.exists ? (doc.data() as TVERun) : null;
}

export async function getLatestTVERunForCluster(clusterId: string): Promise<TVERun | null> {
  const snap = await db()
    .collection(collections.tveRuns)
    .where("clusterId", "==", clusterId)
    .orderBy("computedAt", "desc")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as TVERun);
}

export async function listTVERunsForStake(stakeId: string): Promise<TVERun[]> {
  const snap = await db()
    .collection(collections.tveRuns)
    .where("stakeId", "==", stakeId)
    .orderBy("computedAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as TVERun);
}

// ================================================================
// UPDATE
// ================================================================
export async function setTVERunDecision(
  runId: string,
  decision: TVERun["decision"]
): Promise<void> {
  await db().collection(collections.tveRuns).doc(runId).update({ decision });
}

export async function attachOfferVersion(
  runId: string,
  offerVersionId: string
): Promise<void> {
  await db().collection(collections.tveRuns).doc(runId).update({
    "inputSnapshot.offerVersionId": offerVersionId,
  });
}

// ================================================================
// Helpers
// ================================================================
function extractEvidenceConfidence(cluster: Cluster): {
  population?: ConfidenceLevel;
  households?: ConfidenceLevel;
  roadAccessibility?: ConfidenceLevel;
  floodExposure?: ConfidenceLevel;
  overall: ConfidenceLevel;
} {
  const records = cluster.rgph as any[];
  const first = records[0]?.evidence;

  const population = first?.population?.confidence;
  const households = first?.households?.confidence;
  const roadAccessibility = first?.roadAccessibilityScore?.confidence;
  const floodExposure = first?.floodExposure?.confidence;

  const evidences = records.flatMap((r) =>
    r.evidence ? Object.values(r.evidence) : []
  ) as FieldEvidence[];
  const overall = evidences.length > 0 ? aggregateConfidence(evidences) : "LOW";

  return { population, households, roadAccessibility, floodExposure, overall };
}