// lib/domain/territory/viabilityEngine.ts
// The TVE orchestrates: LAA → OCD (via serviceability) → TBI → price window.
// No rounding happens inside the computation; rounding is applied at
// declared output boundaries only.

import type {
  Cluster,
  LAAResult,
  OCDResult,
  TBIResult,
  TerritorialViability,
  DownstreamMarket,
  MaterialStreamCode,
} from "./types";
import {
  ALPHA_U,
  URBANITY_THRESHOLDS,
  OPERATIONAL_COSTS,
  TBI_THRESHOLD,
  OVE_THRESHOLDS,
  PRICE_WINDOW,
} from "./constants";
import {
  extractServiceabilityInputs,
  computeServiceability,
} from "./serviceabilityEngine";
import { makeRaw, toNormalized, toCommercial } from "../shared/moneyTypes";

const COMPOST_YIELD = 0.35;

type UrbanityTier = "URBAN" | "PERI_URBAN" | "RURAL";

export interface BudgetConstrainedViabilityInput {
  initialCapitalMGA: number;
  collectorMonthlyCostMGA?: number;
  ppeKitCostMGA?: number;
  sortingStarterKitCostMGA?: number;
  bagStarterCostPerHouseholdMGA?: number;
  binStarterCostPerHouseholdMGA?: number;
  reserveRatio?: number;
  householdsPerCollector?: number;
  minOperationalHouseholds?: number;
}

export interface BudgetConstrainedViabilityRecommendation {
  initialCapitalMGA: number;
  affordableHouseholds: number;
  recommendedCollectors: number;
  subscriptionFeeRangeMGA: {
    minimum: number;
    recommended: number;
    maximum: number;
  };
  recommendedPPE: string[];
  recommendedSortedWasteEquipment: string[];
  startupUseMGA: {
    binsAndBags: number;
    ppe: number;
    sortingEquipment: number;
    reserve: number;
    total: number;
  };
  decision: "GO" | "ADJUST" | "NO_GO";
  rationale: string[];
}

const BUDGET_DEFAULTS = {
  ppeKitCostMGA: 120_000,
  sortingStarterKitCostMGA: 180_000,
  bagStarterCostPerHouseholdMGA: 2_500,
  binStarterCostPerHouseholdMGA: 12_000,
  reserveRatio: 0.2,
  householdsPerCollector: 75,
  minOperationalHouseholds: 25,
};

// ================================================================
// PHASE 1 — LAA
// ================================================================
export function computeLAA(cluster: Cluster): LAAResult {
  const urbanityTier = classifyUrbanity(cluster);
  const alphaU = ALPHA_U[urbanityTier];
  const micsWeight = weightedMICSQuintile(cluster);
  const epmExp = cluster.epm.expenditurePerHouseholdMGA;

  const rawLaa = epmExp * (1 + micsWeight / 5) * alphaU;

  return {
    rawLaaMGA: makeRaw(rawLaa),
    commercialLaaMGA: toCommercial(rawLaa),
    alphaU,
    urbanityTier,
    rationale:
      `EPM ${epmExp.toLocaleString()} × (1 + MICS ${micsWeight.toFixed(2)}/5) × α_u ${alphaU} ` +
      `= raw ${Math.round(rawLaa).toLocaleString()} MGA, ` +
      `commercial ${toCommercial(rawLaa).toLocaleString()} MGA.`,
  };
}

// ================================================================
// PHASE 2 — OCD (delegates to serviceability)
// ================================================================
export function computeOCD(cluster: Cluster): OCDResult {
  const inputs = extractServiceabilityInputs(cluster);
  const serviceability = computeServiceability(cluster, inputs);

  const teamSize = OPERATIONAL_COSTS.defaultTeamSize;
  const rawLaborCost =
    OPERATIONAL_COSTS.collectorMonthlyCostMGA * (teamSize - 1) +
    OPERATIONAL_COSTS.supervisorMonthlyCostMGA;

  const rawBaseFuel = fuelOrMaintenanceForTier(inputs.urbanityTier);
  const rawAdjustedFuel = rawBaseFuel * serviceability.routeCostFactor;

  return {
    rawBaseOcdMGA: serviceability.rawBaseOcdMGA,
    rawHazardAdjustedOcdMGA: serviceability.rawHazardAdjustedOcdMGA,
    rawHazardImpactMGA: serviceability.rawHazardImpactMGA,

    baseOcdMGA: serviceability.baseOcdMGA,
    hazardAdjustedOcdMGA: serviceability.hazardAdjustedOcdMGA,
    hazardImpactMGA: serviceability.hazardImpactMGA,

    rawLaborCostMGA: makeRaw(rawLaborCost),
    rawBaseFuelOrMaintenanceMGA: makeRaw(rawBaseFuel),
    rawAdjustedFuelOrMaintenanceMGA: makeRaw(rawAdjustedFuel),

    routingDistanceKm: serviceability.estimatedRouteKmPerCycle,
    routeCostFactor: serviceability.routeCostFactor,
    teamSize,
    serviceability,
    rationale: serviceability.rationale,
  };
}

// ================================================================
// PHASE 3 — TBI (uses RAW values throughout)
// ================================================================
export function computeTBI(
  cluster: Cluster,
  laa: LAAResult,
  ocd: OCDResult,
  market: DownstreamMarket
): TBIResult {
  const upstreamRevenue = Number(laa.rawLaaMGA) * cluster.totalHouseholds;

  const orgFraction = estimateOrganicFraction(cluster);
  const totalMassTon = estimateTotalWasteMass(cluster);
  const compostYieldKg = totalMassTon * 1000 * orgFraction * COMPOST_YIELD;
  const downstreamRevenue = compostYieldKg * market.compostValueMGAPerKg;

  const totalOperatingCost =
    Number(ocd.rawHazardAdjustedOcdMGA) * cluster.totalHouseholds;

  const tbi =
    totalOperatingCost > 0
      ? (upstreamRevenue + downstreamRevenue) / totalOperatingCost
      : 0;

  return {
    tbi: Math.round(tbi * 100) / 100,
    rawUpstreamRevenueMGA: makeRaw(upstreamRevenue),
    rawDownstreamRevenueMGA: makeRaw(downstreamRevenue),
    rawTotalOperatingCostMGA: makeRaw(totalOperatingCost),
    upstreamRevenueMGA: Math.round(upstreamRevenue),
    downstreamRevenueMGA: Math.round(downstreamRevenue),
    totalOperatingCostMGA: Math.round(totalOperatingCost),
    viable: tbi >= TBI_THRESHOLD,
    threshold: TBI_THRESHOLD,
    rationale:
      `Raw upstream ${Math.round(upstreamRevenue).toLocaleString()} + ` +
      `downstream ${Math.round(downstreamRevenue).toLocaleString()} ÷ ` +
      `cost ${Math.round(totalOperatingCost).toLocaleString()} = TBI ${tbi.toFixed(2)}.`,
  };
}

// ================================================================
// FULL TVE
// ================================================================
export function runViabilityEngine(
  cluster: Cluster,
  market: DownstreamMarket
): TerritorialViability {
  const laa = computeLAA(cluster);
  const ocd = computeOCD(cluster);
  const tbi = computeTBI(cluster, laa, ocd, market);

  const rawFloor = Math.max(
    Number(ocd.rawHazardAdjustedOcdMGA),
    PRICE_WINDOW.ABSOLUTE_MIN_MGA
  );

  const rawCeiling = Math.min(
    Number(laa.rawLaaMGA),
    PRICE_WINDOW.ABSOLUTE_MAX_MGA
  );

  const rawRecommended =
    rawFloor + (rawCeiling - rawFloor) * PRICE_WINDOW.RECOMMENDED_POSITION;

  const floor = toNormalized(rawFloor);
  const ceiling = toCommercial(rawCeiling);
  const recommended = toCommercial(rawRecommended);

  const streams = recommendOVEStreams(cluster, market);

  return {
    clusterId: cluster.id,
    laa,
    ocd,
    tbi,
    computedAt: Date.now(),
    recommendedOVEStreams: streams,
    priceWindow: {
      rawFloorMGA: makeRaw(rawFloor),
      rawCeilingMGA: makeRaw(rawCeiling),
      rawRecommendedMGA: makeRaw(rawRecommended),
      floorMGA: floor,
      ceilingMGA: ceiling,
      recommendedMGA: recommended,
    },
  };
}

// ================================================================
// BUDGET-CONSTRAINED RECOMMENDATION
// ================================================================
export function computeBudgetConstrainedRecommendation(
  cluster: Cluster,
  market: DownstreamMarket,
  input: BudgetConstrainedViabilityInput
): BudgetConstrainedViabilityRecommendation {
  const viability = runViabilityEngine(cluster, market);

  const reserveRatio = input.reserveRatio ?? BUDGET_DEFAULTS.reserveRatio;
  const ppeKitCostMGA =
    input.ppeKitCostMGA ?? BUDGET_DEFAULTS.ppeKitCostMGA;
  const sortingStarterKitCostMGA =
    input.sortingStarterKitCostMGA ??
    BUDGET_DEFAULTS.sortingStarterKitCostMGA;
  const bagStarterCostPerHouseholdMGA =
    input.bagStarterCostPerHouseholdMGA ??
    BUDGET_DEFAULTS.bagStarterCostPerHouseholdMGA;
  const binStarterCostPerHouseholdMGA =
    input.binStarterCostPerHouseholdMGA ??
    BUDGET_DEFAULTS.binStarterCostPerHouseholdMGA;
  const householdsPerCollector =
    input.householdsPerCollector ??
    BUDGET_DEFAULTS.householdsPerCollector;
  const minOperationalHouseholds =
    input.minOperationalHouseholds ??
    BUDGET_DEFAULTS.minOperationalHouseholds;

  const reserve = Math.round(input.initialCapitalMGA * reserveRatio);
  const capitalAvailableForStartup = Math.max(
    0,
    input.initialCapitalMGA - reserve
  );

  const perHouseholdStarterCost =
    bagStarterCostPerHouseholdMGA + binStarterCostPerHouseholdMGA;

  const baseSharedEquipmentCost = sortingStarterKitCostMGA;

  const affordableHouseholds = Math.max(
    0,
    Math.floor(
      (capitalAvailableForStartup - baseSharedEquipmentCost - ppeKitCostMGA) /
        perHouseholdStarterCost
    )
  );

  const recommendedCollectors =
    affordableHouseholds > 0
      ? Math.max(1, Math.ceil(affordableHouseholds / householdsPerCollector))
      : 0;

  const recommendedPPE = [
    "Protective gloves",
    "Rubber boots",
    "Protective mask",
    "Reflective vest",
  ];

  const streams = viability.recommendedOVEStreams ?? [];
  const recommendedSortedWasteEquipment = buildSortedWasteEquipment(streams);

  const totalBinsAndBags = affordableHouseholds * perHouseholdStarterCost;
  const totalPPE = recommendedCollectors * ppeKitCostMGA;
  const totalSortingEquipment = sortingStarterKitCostMGA;
  const totalEstimatedStartupUse =
    totalBinsAndBags + totalPPE + totalSortingEquipment + reserve;

  const floorMGA = Number(viability.priceWindow.floorMGA);
  const recommendedMGA = Number(viability.priceWindow.recommendedMGA);
  const ceilingMGA = Number(viability.priceWindow.ceilingMGA);

  const decision: "GO" | "ADJUST" | "NO_GO" =
    affordableHouseholds >= minOperationalHouseholds && viability.tbi.viable
      ? "GO"
      : affordableHouseholds >= Math.max(10, Math.floor(minOperationalHouseholds * 0.5))
      ? "ADJUST"
      : "NO_GO";

  return {
    initialCapitalMGA: input.initialCapitalMGA,
    affordableHouseholds,
    recommendedCollectors,
    subscriptionFeeRangeMGA: {
      minimum: floorMGA,
      recommended: recommendedMGA,
      maximum: ceilingMGA,
    },
    recommendedPPE,
    recommendedSortedWasteEquipment,
    startupUseMGA: {
      binsAndBags: totalBinsAndBags,
      ppe: totalPPE,
      sortingEquipment: totalSortingEquipment,
      reserve,
      total: totalEstimatedStartupUse,
    },
    decision,
    rationale: [
      `Initial capital evaluated at ${input.initialCapitalMGA.toLocaleString()} MGA.`,
      `A reserve of ${reserve.toLocaleString()} MGA was protected for working capital.`,
      `${affordableHouseholds} households can be equipped under the remaining startup budget.`,
      `${recommendedCollectors} collector(s) are recommended using a planning ratio of ${householdsPerCollector} HH per collector.`,
      `Subscription fees are anchored to the TVE price window already computed for the cluster.`,
      `Sorted-waste equipment follows the OVE streams selected by the TVE: ${streams.join(", ") || "none"}.`,
    ],
  };
}

// ================================================================
// HELPERS
// ================================================================
function recommendOVEStreams(
  cluster: Cluster,
  market: DownstreamMarket
): MaterialStreamCode[] {
  const streams: MaterialStreamCode[] = [];
  const orgFraction = estimateOrganicFraction(cluster);
  const recyclableFraction = estimateRecyclableFraction(cluster);

  if (
    orgFraction >= OVE_THRESHOLDS.ORGANIC_MIN_FRACTION &&
    market.compostValueMGAPerKg >= OVE_THRESHOLDS.COMPOST_MIN_MARKET_VALUE
  ) {
    streams.push("ORGANIC");
  }

  if (recyclableFraction >= OVE_THRESHOLDS.RECYCLABLE_MIN_FRACTION) {
    streams.push("RECYCLABLE");
  }

  if (market.recyclableValueMGAPerKg && market.recyclableValueMGAPerKg > 0) {
    streams.push("METAL", "GLASS");
  }

  if (
    market.carbonCreditValueMGAPerTon &&
    market.carbonCreditValueMGAPerTon >=
      OVE_THRESHOLDS.CARBON_MIN_VALUE_PER_TON
  ) {
    streams.push("CARBON");
  }

  return Array.from(new Set(streams));
}

function buildSortedWasteEquipment(
  streams: MaterialStreamCode[]
): string[] {
  const equipment = [
    "10L color-coded household bins",
    "Color-coded collection bags",
    "Sorting sacks / crates",
  ];

  if (streams.includes("ORGANIC")) {
    equipment.push("Organic holding container");
  }

  if (streams.includes("RECYCLABLE")) {
    equipment.push("Dry recyclables sorting table");
  }

  if (streams.includes("METAL") || streams.includes("GLASS")) {
    equipment.push("Separated recyclable storage cages / bins");
  }

  return equipment;
}

function classifyUrbanity(cluster: Cluster): UrbanityTier {
  const avgDensity =
    cluster.rgph.reduce((sum, record) => sum + record.densityFactor, 0) /
    Math.max(1, cluster.rgph.length);

  const avgRoof =
    cluster.mics.reduce(
      (sum, record) => sum + record.housingQuality.finishedRoofPercent,
      0
    ) / Math.max(1, cluster.mics.length);

  if (
    avgDensity >= URBANITY_THRESHOLDS.URBAN_MIN_DENSITY ||
    avgRoof >= URBANITY_THRESHOLDS.URBAN_MIN_FINISHED_ROOF
  ) {
    return "URBAN";
  }

  if (
    avgDensity >= URBANITY_THRESHOLDS.PERI_URBAN_MIN_DENSITY ||
    avgRoof >= URBANITY_THRESHOLDS.PERI_URBAN_MIN_FINISHED_ROOF
  ) {
    return "PERI_URBAN";
  }

  return "RURAL";
}

function weightedMICSQuintile(cluster: Cluster): number {
  const total = cluster.totalHouseholds || 1;
  let weighted = 0;

  cluster.mics.forEach((micsRecord, index) => {
    const rgphRecord = cluster.rgph[index];
    const weight = rgphRecord
      ? rgphRecord.households / total
      : 1 / Math.max(1, cluster.mics.length);

    weighted += micsRecord.assetQuintile * weight;
  });

  return weighted;
}

function fuelOrMaintenanceForTier(tier: string): number {
  if (tier === "URBAN") {
    return OPERATIONAL_COSTS.tricycleMaintenanceMGAPerMonth;
  }

  if (tier === "PERI_URBAN") {
    return OPERATIONAL_COSTS.handcartMaintenanceMGAPerMonth;
  }

  return OPERATIONAL_COSTS.handcartMaintenanceMGAPerMonth * 0.7;
}

function estimateOrganicFraction(cluster: Cluster): number {
  const tier = classifyUrbanity(cluster);

  if (tier === "URBAN") return 0.55;
  if (tier === "PERI_URBAN") return 0.6;
  return 0.65;
}

function estimateRecyclableFraction(cluster: Cluster): number {
  const tier = classifyUrbanity(cluster);

  if (tier === "URBAN") return 0.2;
  if (tier === "PERI_URBAN") return 0.15;
  return 0.1;
}

function estimateTotalWasteMass(cluster: Cluster): number {
  const tier = classifyUrbanity(cluster);
  const perCapita =
    tier === "URBAN" ? 0.5 : tier === "PERI_URBAN" ? 0.4 : 0.3;

  return (cluster.totalPopulation * perCapita * 30) / 1000;
}
