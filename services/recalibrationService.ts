// services/recalibrationService.ts
//
// Reads settled cycles for a subscription over a period, computes the
// actual economics, compares them to the projections in the TVE Run that
// produced the offer, and emits recalibration recommendations.

import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { collections } from "@/lib/firebase/collections";
import type {
  ActualEconomics,
  ProjectedVsActual,
  RecalibrationRecord,
  RecalibrationRecommendation,
} from "@/lib/domain/territory/recalibrationTypes";
import type { TVERun } from "@/lib/domain/territory/tveRunTypes";
import type { ServiceCycle } from "@/lib/domain/service/cycleTypes";
import type { Subscription } from "@/lib/domain/subscription/types";
import type { SettlementEntitlement } from "@/lib/domain/settlement/settlementTypes";
import { makeRaw } from "@/lib/domain/shared/moneyTypes";
import { normalize, roundForReporting } from "@/lib/domain/shared/rounding";
import { getTVERun } from "./tveRunService";
import { getSubscription } from "./subscriptionService";

function db() {
  return getFirestore(getAdminApp());
}

// ================================================================
// MAIN — build a recalibration record for one subscription
// ================================================================
export async function buildRecalibration(input: {
  subscriptionId: string;
  periodStart: number;
  periodEnd: number;
  actorUserId: string;
}): Promise<RecalibrationRecord | null> {
  const { subscriptionId, periodStart, periodEnd } = input;

  const sub = await getSubscription(subscriptionId);
  if (!sub) return null;

  const tveRun = sub.tveRunId ? await getTVERun(sub.tveRunId) : null;
  if (!tveRun) return null;

  // Fetch cycles in the window
  const cyclesSnap = await db()
    .collection(collections.serviceCycles)
    .where("subscriptionId", "==", subscriptionId)
    .where("scheduledAt", ">=", periodStart)
    .where("scheduledAt", "<=", periodEnd)
    .get();

  const cycles = cyclesSnap.docs.map((d) => d.data() as ServiceCycle);
  if (cycles.length === 0) return null;

  // Fetch settlements in the window
  const settlementsSnap = await db()
    .collection(collections.settlements)
    .where("subscriptionId", "==", subscriptionId)
    .where("emittedAt", ">=", periodStart)
    .where("emittedAt", "<=", periodEnd)
    .get();

  const cycleIds = new Set(cycles.map((c) => c.id));
  const settlements = settlementsSnap.docs
    .map((d) => d.data() as SettlementEntitlement)
    .filter((s) => cycleIds.has(s.cycleId));

  const actual = computeActualEconomics({
    cycles,
    settlements,
    subscription: sub,
    periodStart,
    periodEnd,
  });

  const variance = computeVariance({ tveRun, actual });

  const recommendations = deriveRecommendations({ variance, actual, tveRun });

  const ref = db().collection(collections.recalibrations).doc();
  const record: RecalibrationRecord = {
    id: ref.id,
    tveRunId: tveRun.id,
    clusterId: tveRun.clusterId,
    subscriptionId,
    operatorId: sub.operatorId,
    periodStart,
    periodEnd,
    actual,
    variance,
    recommendations,
    createdAt: Date.now(),
    computedAt: Date.now(),
    computedBy: input.actorUserId,
  };

  await ref.set(record);

  // Write the actual economics back onto the TVE run
  await db().collection(collections.tveRuns).doc(tveRun.id).update({
    actualEconomics: actual,
    actualEconomicsMeasuredAt: Date.now(),
  });

  return record;
}

// ================================================================
// ACTUAL ECONOMICS
// ================================================================
function computeActualEconomics(input: {
  cycles: ServiceCycle[];
  settlements: SettlementEntitlement[];
  subscription: Subscription;
  periodStart: number;
  periodEnd: number;
}): ActualEconomics {
  const { cycles, settlements, subscription } = input;

  const settled = cycles.filter((c) => c.status === "SETTLED");
  const disruptions = cycles.filter((c) =>
    ["SKIPPED", "CANCELLED", "REJECTED"].includes(c.status)
  );

  // Raw analytical upstream = sum of rawNetToOperator + fee + payment
  const rawUpstreamRevenue = settlements.reduce((s, st) => {
    const rawNet = (st as any).rawNetToOperatorMGA ?? st.split.operatorMGA;
    const rawFee = (st as any).rawNdayFeeMGA ?? st.split.ndayFeeMGA;
    const rawPay = (st as any).rawPaymentCostMGA ?? st.split.paymentCostMGA;
    return s + rawNet + rawFee + rawPay;
  }, 0);

  // Downstream estimate from settled weights
  const totalWeightKg = settled.reduce((sum, c) => {
    const w = c.proof?.weights;
    return sum + (w ? w.organicKg + w.recyclableKg + w.otherKg : 0);
  }, 0);
  const compostValue = (subscription as any).planSnapshot?.compostValueMGAPerKg ?? 400;
  const rawDownstreamRevenue = totalWeightKg * 0.3 * compostValue * 0.35;

  // Raw operating cost — from the offer's raw OCD × settled cycles
  const rawOcd = (subscription as any).rawHazardAdjustedOcdMGA ?? 0;
  const rawOperatingCost = rawOcd * settled.length;

  const rawPlatformFee = settlements.reduce(
    (s, st) => s + ((st as any).rawNdayFeeMGA ?? st.split.ndayFeeMGA),
    0
  );
  const rawPaymentCost = settlements.reduce(
    (s, st) => s + ((st as any).rawPaymentCostMGA ?? st.split.paymentCostMGA),
    0
  );

  // Analytical ratios
  const rawOcdValue = settled.length > 0 ? rawOperatingCost / settled.length : 0;
  const rawTbi = rawOperatingCost > 0
    ? (rawUpstreamRevenue + rawDownstreamRevenue) / rawOperatingCost
    : 0;
  const rawMargin =
    rawUpstreamRevenue + rawDownstreamRevenue - rawOperatingCost - rawPlatformFee - rawPaymentCost;
  const rawMarginPercent =
    rawUpstreamRevenue + rawDownstreamRevenue > 0
      ? (rawMargin / (rawUpstreamRevenue + rawDownstreamRevenue)) * 100
      : 0;

  // Presentation values
  const monthsSpan = Math.max(
    1,
    (input.periodEnd - input.periodStart) / (30 * 24 * 60 * 60 * 1000)
  );
  const actualFrequency = Math.round((settled.length / monthsSpan) * 10) / 10;
  const actualAvgWeight =
    settled.length > 0 ? Math.round((totalWeightKg / settled.length) * 10) / 10 : 0;

  // Confidence
  const confidence: "HIGH" | "MEDIUM" | "LOW" =
    settled.length >= 4 && settlements.length === settled.length
      ? "HIGH"
      : settled.length >= 2
      ? "MEDIUM"
      : "LOW";

  const notes: string[] = [];
  if (settled.length < 4) notes.push(`Only ${settled.length} settled cycles.`);
  if (settlements.length !== settled.length) {
    notes.push(`${settled.length - settlements.length} settled cycles lack a settlement.`);
  }

  return {
    settledCycleCount: settled.length,
    expectedCycleCount: cycles.length,

    rawUpstreamRevenueMGA: makeRaw(rawUpstreamRevenue),
    rawDownstreamRevenueMGA: makeRaw(rawDownstreamRevenue),
    rawOperatingCostMGA: makeRaw(rawOperatingCost),
    rawOcdMGA: makeRaw(rawOcdValue),
    rawTbi: Math.round(rawTbi * 10000) / 10000,
    rawOperatorMarginMGA: makeRaw(rawMargin),
    rawOperatorMarginPercent: Math.round(rawMarginPercent * 100) / 100,

    actualUpstreamRevenueMGA: roundForReporting(rawUpstreamRevenue),
    actualDownstreamRevenueMGA: roundForReporting(rawDownstreamRevenue),
    actualTotalRevenueMGA: roundForReporting(rawUpstreamRevenue + rawDownstreamRevenue),
    actualOperatingCostMGA: normalize(rawOperatingCost),
    actualPlatformFeeMGA: normalize(rawPlatformFee),
    actualPaymentCostMGA: normalize(rawPaymentCost),
    actualOcdMGA: normalize(rawOcdValue),
    actualTbi: Math.round(rawTbi * 100) / 100,
    actualOperatorMarginMGA: roundForReporting(rawMargin),
    actualOperatorMarginPercent: Math.round(rawMarginPercent),

    actualCollectionFrequency: actualFrequency,
    actualMissedCollections: disruptions.length,
    actualAverageWeightKg: actualAvgWeight,
    actualFloodRelatedDisruptions: 0, // enriched from collectorIncidents in a later pass

    measurementConfidence: confidence,
    measurementNotes: notes,
    measuredFrom: input.periodStart,
    measuredTo: input.periodEnd,
    computedAt: Date.now(),
  };
}

// ================================================================
// VARIANCE — computed on raw values
// ================================================================
function computeVariance(input: {
  tveRun: TVERun;
  actual: ActualEconomics;
}): ProjectedVsActual {
  const { tveRun, actual } = input;

  // Both sides use raw values
  const projectedOcd = tveRun.economics.ocd.rawHazardAdjustedOcdMGA;
  const actualOcd = actual.rawOcdMGA;

  const ocdVariance = actualOcd - projectedOcd;
  const ocdVariancePercent =
    projectedOcd > 0 ? Math.round((ocdVariance / projectedOcd) * 1000) / 10 : 0;

  const projectedTbi = tveRun.economics.tbi.tbi;
  const actualTbi = actual.rawTbi;
  const tbiVariance = Math.round((actualTbi - projectedTbi) * 10000) / 10000;
  const tbiVariancePercent =
    projectedTbi > 0 ? Math.round((tbiVariance / projectedTbi) * 1000) / 10 : 0;

  // Projected margin — from raw LAA upstream and raw OCD
  const projectedMarginPercent =
    tveRun.economics.tbi.rawUpstreamRevenueMGA > 0
      ? Math.round(
          ((tveRun.economics.tbi.rawUpstreamRevenueMGA -
            tveRun.economics.ocd.rawHazardAdjustedOcdMGA) /
            tveRun.economics.tbi.rawUpstreamRevenueMGA) *
            100
        )
      : 0;

  const projectedRevenue = tveRun.economics.tbi.rawUpstreamRevenueMGA;
  const actualRevenue = actual.rawUpstreamRevenueMGA;
  const revenueVariance = actualRevenue - projectedRevenue;
  const revenueVariancePercent =
    projectedRevenue > 0
      ? Math.round((revenueVariance / projectedRevenue) * 1000) / 10
      : 0;

  const projectedHazardFactor = tveRun.risks.hazardFactor;
  const actualDisruptionRate =
    actual.expectedCycleCount > 0
      ? Math.round((actual.actualMissedCollections / actual.expectedCycleCount) * 1000) / 10
      : 0;

  const hazardDenominator = (projectedHazardFactor - 1) * 100 + 1;
  const hazardCalibrationError =
    hazardDenominator > 0
      ? Math.abs(actualDisruptionRate - (projectedHazardFactor - 1) * 100) /
        hazardDenominator
      : 0;

  return {
    projectedOcdMGA: Math.round(projectedOcd),
    actualOcdMGA: Math.round(actualOcd),
    ocdVarianceMGA: Math.round(ocdVariance),
    ocdVariancePercent,
    projectedTbi,
    actualTbi,
    tbiVariance,
    tbiVariancePercent,
    projectedOperatorMarginPercent: projectedMarginPercent,
    actualOperatorMarginPercent: actual.actualOperatorMarginPercent,
    marginVariancePercent: actual.actualOperatorMarginPercent - projectedMarginPercent,
    projectedRevenueMGA: Math.round(projectedRevenue),
    actualRevenueMGA: Math.round(actualRevenue),
    revenueVarianceMGA: Math.round(revenueVariance),
    revenueVariancePercent,
    projectedHazardFactor,
    actualDisruptionRate,
    hazardCalibrationError: Math.round(hazardCalibrationError * 1000) / 1000,
  };
}

// ================================================================
// RECOMMENDATIONS
// ================================================================
function deriveRecommendations(input: {
  variance: ProjectedVsActual;
  actual: ActualEconomics;
  tveRun: TVERun;
}): RecalibrationRecommendation[] {
  const { variance, actual, tveRun } = input;
  const recs: RecalibrationRecommendation[] = [];

  // OCD variance
  if (Math.abs(variance.ocdVariancePercent) >= 25) {
    recs.push({
      type: "ADJUST_ROUTE_FACTOR",
      severity: "ACTION_REQUIRED",
      description:
        `Actual OCD ${variance.actualOcdMGA.toLocaleString()} MGA differs from projected ` +
        `${variance.projectedOcdMGA.toLocaleString()} MGA by ${variance.ocdVariancePercent}%. ` +
        `Route cost factor requires recalibration.`,
      suggestedAdjustment: {
        field: "routeCostFactor",
        currentValue: tveRun.risks.routeCostFactor,
        suggestedValue:
          Math.round(
            tveRun.risks.routeCostFactor *
              (variance.actualOcdMGA / Math.max(1, variance.projectedOcdMGA)) *
              100
          ) / 100,
        rationale: "Scale route cost factor by the ratio of actual to projected OCD.",
      },
    });
  } else if (Math.abs(variance.ocdVariancePercent) >= 10) {
    recs.push({
      type: "ADJUST_ROUTE_FACTOR",
      severity: "WARNING",
      description:
        `OCD variance ${variance.ocdVariancePercent}% — within tolerance but monitored.`,
    });
  }

  // Hazard calibration
  if (variance.hazardCalibrationError > 0.5) {
    recs.push({
      type: "ADJUST_HAZARD_WEIGHT",
      severity: "WARNING",
      description:
        `Hazard calibration error ${(variance.hazardCalibrationError * 100).toFixed(1)}%. ` +
        `The model may be over- or under-estimating flood disruption.`,
      suggestedAdjustment: {
        field: "hazardWeight",
        currentValue: tveRun.assumptions.hazardWeight,
        suggestedValue: Math.round(tveRun.assumptions.hazardWeight * 0.9 * 100) / 100,
        rationale: "Reduce hazard weight if actual disruptions are lower than projected.",
      },
    });
  }

  // Frequency
  const projectedFrequency = cyclesPerMonthFromFrequency(
    tveRun.serviceConfiguration.collectionFrequency
  );
  if (Math.abs(actual.actualCollectionFrequency - projectedFrequency) >= projectedFrequency * 0.25) {
    recs.push({
      type: "ADJUST_FREQUENCY",
      severity: "ACTION_REQUIRED",
      description:
        `Projected ${projectedFrequency} cycles/month, actual ${actual.actualCollectionFrequency}. ` +
        `Frequency assumption is off by more than 25%.`,
      suggestedAdjustment: {
        field: "collectionFrequency",
        currentValue: tveRun.serviceConfiguration.collectionFrequency,
        suggestedValue: frequencyFromCyclesPerMonth(actual.actualCollectionFrequency),
        rationale: "Align service frequency to what is actually deliverable.",
      },
    });
  }

  // Margin
  if (variance.actualOperatorMarginPercent < 10) {
    recs.push({
      type: "REVIEW_PRICING",
      severity: "ACTION_REQUIRED",
      description:
        `Actual margin ${variance.actualOperatorMarginPercent}% is below the 10% floor. ` +
        `Consider a price adjustment within the LAA window.`,
    });
  }

  // No action
  if (recs.length === 0) {
    recs.push({
      type: "NO_ACTION",
      severity: "INFO",
      description:
        `All measured values within tolerance. OCD variance ${variance.ocdVariancePercent}%, ` +
        `TBI variance ${variance.tbiVariancePercent}%, margin ${variance.actualOperatorMarginPercent}%.`,
    });
  }

  return recs;
}

// ================================================================
// READ
// ================================================================
export async function getRecalibrationsForTVERun(
  tveRunId: string
): Promise<RecalibrationRecord[]> {
  const snap = await db()
    .collection(collections.recalibrations)
    .where("tveRunId", "==", tveRunId)
    .orderBy("computedAt", "desc")
    .get();
  return snap.docs.map((d) => d.data() as RecalibrationRecord);
}

export async function getRecalibrationsForCluster(
  clusterId: string
): Promise<RecalibrationRecord[]> {
  const snap = await db()
    .collection(collections.recalibrations)
    .where("clusterId", "==", clusterId)
    .orderBy("computedAt", "desc")
    .limit(20)
    .get();
  return snap.docs.map((d) => d.data() as RecalibrationRecord);
}

// ================================================================
// Helpers
// ================================================================
function cyclesPerMonthFromFrequency(freq: string): number {
  switch (freq) {
    case "DAILY": return 30;
    case "TWICE_WEEKLY": return 8;
    case "WEEKLY": return 4;
    case "BIWEEKLY": return 2;
    case "MONTHLY": return 1;
    default: return 4;
  }
}

function frequencyFromCyclesPerMonth(cpm: number): string {
  if (cpm >= 20) return "DAILY";
  if (cpm >= 6) return "TWICE_WEEKLY";
  if (cpm >= 3) return "WEEKLY";
  if (cpm >= 1) return "BIWEEKLY";
  return "MONTHLY";
}