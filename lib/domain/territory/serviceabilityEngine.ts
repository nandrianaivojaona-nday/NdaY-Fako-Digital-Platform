// lib/domain/territory/serviceabilityEngine.ts
//
// Pure function. Consumes a Cluster, produces a ServiceConfiguration.
//
// The two OCD values are computed with the corrected math:
//
//   rawBaseOcd        = (laborCost + baseFuel * distance) / households
//   rawHazardOcd      = (laborCost + (baseFuel * routeFactor) * distance) / households
//
// Hazard affects ONLY the variable component (fuel / maintenance).
// Labor is fixed and does not scale with hazard exposure.

import type { Cluster } from "./types";
import type {
  ServiceabilityInputs,
  ServiceConfiguration,
  ServiceRiskLevel,
} from "./serviceabilityTypes";
import type { CollectionFrequency } from "../subscription/offerTypes";
import { OPERATIONAL_COSTS } from "./constants";
import {
  makeRaw,
  toNormalized,
} from "../shared/moneyTypes";
import { aggregateConfidence, type FieldEvidence } from "./evidenceTypes";

// ================================================================
// Input extraction from a cluster
// ================================================================
export function extractServiceabilityInputs(cluster: Cluster): ServiceabilityInputs {
  const totalHH = cluster.totalHouseholds || 1;

  let weightedFlood = 0;
  let maxFlood = 0;
  let historicalEvents = 0;

  for (const r of cluster.rgph as any[]) {
    const score = r.floodExposureScore ?? 0;
    weightedFlood += score * (r.households / totalHH);
    if (score > maxFlood) maxFlood = score;
    historicalEvents += r.historicalFloodEvents ?? 0;
  }

  const cycloneLevels = (cluster.rgph as any[])
    .map((r) => r.cycloneExposure)
    .filter(Boolean);
  const cycloneExposureLevel = cycloneLevels.length > 0
    ? pickHighestLevel(cycloneLevels)
    : "UNKNOWN";

  const urbanityTier = classifyUrbanity(cluster);
  const wasteGen =
    urbanityTier === "URBAN" ? 0.5 : urbanityTier === "PERI_URBAN" ? 0.4 : 0.3;

  return {
    totalHouseholds: totalHH,
    totalPopulation: cluster.totalPopulation,
    densityFactor: weightedAvg(
      cluster.rgph.map((r) => r.densityFactor),
      cluster.rgph.map((r) => r.households)
    ),
    householdSpacingMetres: weightedAvg(
      cluster.rgph.map((r) => r.householdSpacingMetres),
      cluster.rgph.map((r) => r.households)
    ),
    roadAccessibilityScore: weightedAvg(
      cluster.rgph.map((r) => r.roadAccessibilityScore),
      cluster.rgph.map((r) => r.households)
    ),
    distanceToLandfillKm: weightedAvg(
      cluster.rgph.map((r) => r.distanceToLandfillKm),
      cluster.rgph.map((r) => r.households)
    ),
    floodExposureScore: Math.round(weightedFlood),
    maxFloodExposureScore: maxFlood,
    historicalFloodEvents: historicalEvents,
    cycloneExposureLevel,
    wasteGenerationPerCapitaKgDay: wasteGen,
    wildDumpCount: cluster.pcd.wildDumpSites.length,
    publicBinCount: cluster.pcd.publicBinPoints.length,
    transitConcessionCount: cluster.pcd.transitConcessions.length,
    urbanityTier,
  };
}

// ================================================================
// Main computation
// ================================================================
export function computeServiceability(
  cluster: Cluster,
  inputs: ServiceabilityInputs
): ServiceConfiguration {
  const confidenceNotes: string[] = [];

  // ---- Route cost factor ----
  const roadPenalty = 1 + ((100 - inputs.roadAccessibilityScore) / 100) * 0.3;
  const floodPenalty = 1 + (inputs.floodExposureScore / 100) * 0.35;
  const worstCasePremium =
    inputs.maxFloodExposureScore >= 80 ? 0.08 :
    inputs.maxFloodExposureScore >= 60 ? 0.04 : 0;

  const routeCostFactor = round2(roadPenalty * floodPenalty * (1 + worstCasePremium));

  if (worstCasePremium > 0) {
    confidenceNotes.push(
      `Worst fokontany flood score ${inputs.maxFloodExposureScore} adds a ${(worstCasePremium * 100).toFixed(0)}% cost premium.`
    );
  }

  // ---- Frequency ----
  const collectionFrequency = pickFrequency(
    inputs.wasteGenerationPerCapitaKgDay,
    inputs.urbanityTier
  );

  // ---- Stops per km ----
  const stopsPerKm =
    inputs.urbanityTier === "URBAN" ? OPERATIONAL_COSTS.stopsPerKmUrban :
    inputs.urbanityTier === "PERI_URBAN" ? OPERATIONAL_COSTS.stopsPerKmPeriUrban :
    OPERATIONAL_COSTS.stopsPerKmRural;

  // ---- Target and route ----
  const targetHouseholds = Math.round(inputs.totalHouseholds * targetShare(inputs.urbanityTier));
  const estimatedRouteKmPerCycle =
    Math.round((targetHouseholds / stopsPerKm) * 2 * 10) / 10;

  // ---- Team and vehicle ----
  const householdsPerTeamPerCycle =
    inputs.urbanityTier === "URBAN" ? 400 :
    inputs.urbanityTier === "PERI_URBAN" ? 260 : 180;

  const cyclesPerMonth = cyclesPerMonthFromFrequency(collectionFrequency);
  const requiredTeams = Math.max(
    1,
    Math.ceil(targetHouseholds / (householdsPerTeamPerCycle * cyclesPerMonth))
  );
  const requiredVehicles = requiredTeams;

  // ---- Missed collection probability ----
  const missedCollectionProbability = Math.min(
    0.35,
    (inputs.floodExposureScore / 100) * 0.3 +
      (1 - inputs.roadAccessibilityScore / 100) * 0.1
  );

  // ---- Service risk ----
  const serviceRisk = classifyServiceRisk(inputs, missedCollectionProbability);

  // ---- Seasonal adjustment ----
  const seasonalAdjustmentRequired =
    inputs.floodExposureScore >= 40 ||
    inputs.cycloneExposureLevel === "HIGH" ||
    inputs.cycloneExposureLevel === "VERY_HIGH";

  // ---- OCD — the corrected math ----
  const teamSize = OPERATIONAL_COSTS.defaultTeamSize;
  const laborCost =
    OPERATIONAL_COSTS.collectorMonthlyCostMGA * (teamSize - 1) +
    OPERATIONAL_COSTS.supervisorMonthlyCostMGA;

  const baseFuelOrMaintenance = fuelOrMaintenanceForTier(inputs.urbanityTier);

  // Raw analytical values — no rounding
  const rawBaseOcd =
    (laborCost + baseFuelOrMaintenance * estimatedRouteKmPerCycle) / inputs.totalHouseholds;
  const rawAdjustedFuel = baseFuelOrMaintenance * routeCostFactor;
  const rawHazardOcd =
    (laborCost + rawAdjustedFuel * estimatedRouteKmPerCycle) / inputs.totalHouseholds;
  const rawHazardImpact = rawHazardOcd - rawBaseOcd;

  // Normalized operational values
  const baseOcdMGA = toNormalized(rawBaseOcd);
  const hazardAdjustedOcdMGA = toNormalized(rawHazardOcd);
  const hazardImpactMGA = toNormalized(rawHazardImpact);

  // ---- Serviceable households ----
  const serviceableHouseholds = Math.round(
    inputs.totalHouseholds * (0.7 + (inputs.roadAccessibilityScore / 100) * 0.25)
  );

  // ---- Confidence from the evidence manifest ----
  const evidences: Array<FieldEvidence | undefined> = (cluster.rgph as any[]).flatMap((r) =>
    r.evidence ? Object.values(r.evidence) : []
  );
  const confidence = aggregateConfidence(evidences as any);

  if (confidence === "LOW") {
    confidenceNotes.push(
      "One or more critical fields are estimated. Replace with field data before commercial commitment."
    );
  }

  return {
    routeCostFactor,
    estimatedRouteKmPerCycle,
    stopsPerKm,

    serviceableHouseholds,
    targetHouseholds,
    collectionFrequency,
    requiredTeams,
    requiredVehicles,

    serviceRisk,
    seasonalAdjustmentRequired,
    missedCollectionProbability: round2(missedCollectionProbability),

    rawBaseOcdMGA: makeRaw(rawBaseOcd),
    rawHazardAdjustedOcdMGA: makeRaw(rawHazardOcd),
    rawHazardImpactMGA: makeRaw(rawHazardImpact),

    baseOcdMGA,
    hazardAdjustedOcdMGA,
    hazardImpactMGA,

    confidence,
    confidenceNotes,

    rationale: buildRationale(
      inputs,
      routeCostFactor,
      baseOcdMGA,
      hazardAdjustedOcdMGA,
      hazardImpactMGA
    ),
    computedAt: Date.now(),
  };
}

// ================================================================
// Helpers
// ================================================================
function classifyUrbanity(cluster: Cluster): "URBAN" | "PERI_URBAN" | "RURAL" {
  const avgDensity = weightedAvg(
    cluster.rgph.map((r) => r.densityFactor),
    cluster.rgph.map((r) => r.households)
  );
  if (avgDensity >= 3000) return "URBAN";
  if (avgDensity >= 800) return "PERI_URBAN";
  return "RURAL";
}

function pickFrequency(
  wastePerCapita: number,
  tier: "URBAN" | "PERI_URBAN" | "RURAL"
): CollectionFrequency {
  if (wastePerCapita >= 0.6) return "DAILY";
  if (wastePerCapita >= 0.4) return "TWICE_WEEKLY";
  if (tier === "URBAN") return "TWICE_WEEKLY";
  return "WEEKLY";
}

function cyclesPerMonthFromFrequency(freq: CollectionFrequency): number {
  switch (freq) {
    case "DAILY": return 30;
    case "TWICE_WEEKLY": return 8;
    case "WEEKLY": return 4;
    case "BIWEEKLY": return 2;
    case "MONTHLY": return 1;
    default: return 4;
  }
}

function targetShare(tier: "URBAN" | "PERI_URBAN" | "RURAL"): number {
  return tier === "URBAN" ? 0.35 : tier === "PERI_URBAN" ? 0.45 : 0.55;
}

function classifyServiceRisk(
  inputs: ServiceabilityInputs,
  missedProb: number
): ServiceRiskLevel {
  const score =
    (inputs.floodExposureScore / 100) * 0.4 +
    (1 - inputs.roadAccessibilityScore / 100) * 0.3 +
    missedProb * 0.3;

  if (score >= 0.65) return "SEVERE";
  if (score >= 0.45) return "HIGH";
  if (score >= 0.25) return "MODERATE";
  return "LOW";
}

function fuelOrMaintenanceForTier(tier: "URBAN" | "PERI_URBAN" | "RURAL"): number {
  switch (tier) {
    case "URBAN": return OPERATIONAL_COSTS.tricycleMaintenanceMGAPerMonth;
    case "PERI_URBAN": return OPERATIONAL_COSTS.handcartMaintenanceMGAPerMonth;
    case "RURAL": return OPERATIONAL_COSTS.handcartMaintenanceMGAPerMonth * 0.7;
  }
}

function pickHighestLevel(levels: string[]): any {
  const order = ["NIL", "LOW", "MODERATE", "HIGH", "VERY_HIGH", "UNKNOWN"];
  return levels.reduce(
    (h, c) => (order.indexOf(c) > order.indexOf(h) ? c : h),
    "NIL"
  );
}

function weightedAvg(values: number[], weights: number[]): number {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight === 0) {
    return values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
  }
  return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalWeight;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildRationale(
  inputs: ServiceabilityInputs,
  routeFactor: number,
  base: number,
  adjusted: number,
  impact: number
): string {
  return (
    `Route cost factor ${routeFactor.toFixed(2)} ` +
    `(road ${inputs.roadAccessibilityScore}/100, flood ${inputs.floodExposureScore}/100). ` +
    `Base OCD ${base.toLocaleString()} MGA → hazard-adjusted ${adjusted.toLocaleString()} MGA ` +
    `(+${impact.toLocaleString()} MGA/HH/month). ` +
    `Service risk: ${classifyServiceRisk(inputs, 0)}.`
  );
}