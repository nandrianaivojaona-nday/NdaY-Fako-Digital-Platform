// lib/domain/territory/types.ts 
// Replace only the `LAAResult`, `OCDResult`, `TBIResult`, and `TerritorialViability` 
// interfaces. Everything else (Cluster, DownstreamMarket, MaterialStreamCode) stays the same.
// lib/domain/territory/types.ts — REPLACE these interfaces
// Keep: Cluster, DownstreamMarket, MaterialStreamCode

import type { EPMRecord, MICSRecord, RGPHRecord, PCDRecord } from "./datasets";
import type { PlanSegment } from "../subscription/planTypes";
import type { RawMGA, NormalizedMGA, CommercialMGA } from "../shared/moneyTypes";
import type { ServiceConfiguration } from "./serviceabilityTypes";

export interface Cluster {
  id: string;
  regionId: string;
  communeId: string;
  fokontanyIds: string[];
  name: string;
  epm: EPMRecord;
  mics: MICSRecord[];
  rgph: RGPHRecord[];
  pcd: PCDRecord;
  totalHouseholds: number;
  totalPopulation: number;
  presentSegments: PlanSegment[];
  builtAt: number;
  source: "MICS_PIPELINE" | "OPERATOR_SURVEY" | "HYBRID";
}

// ================================================================
// Phase 1 — LAA
// ================================================================
export interface LAAResult {
  /** Full-precision analytical affordability. Used by TVE, TBI, recalibration. */
  rawLaaMGA: RawMGA;
  /** Commercial ceiling for pricing — rounded to 500. */
  commercialLaaMGA: CommercialMGA;

  alphaU: number;
  urbanityTier: "URBAN" | "PERI_URBAN" | "RURAL";
  rationale: string;
}

// ================================================================
// Phase 2 — OCD
// ================================================================
export interface OCDResult {
  // Analytical raw values — used by recalibration and model learning
  rawBaseOcdMGA: RawMGA;
  rawHazardAdjustedOcdMGA: RawMGA;
  rawHazardImpactMGA: RawMGA;

  // Operational values — rounded to 100
  baseOcdMGA: NormalizedMGA;
  hazardAdjustedOcdMGA: NormalizedMGA;
  hazardImpactMGA: NormalizedMGA;

  // Raw component costs
  rawLaborCostMGA: RawMGA;
  rawBaseFuelOrMaintenanceMGA: RawMGA;
  rawAdjustedFuelOrMaintenanceMGA: RawMGA;

  // Non-monetary
  routingDistanceKm: number;
  routeCostFactor: number;
  teamSize: number;

  serviceability: ServiceConfiguration;
  rationale: string;
}

// ================================================================
// Phase 3 — TBI
// ================================================================
export interface TBIResult {
  tbi: number;

  rawUpstreamRevenueMGA: RawMGA;
  rawDownstreamRevenueMGA: RawMGA;
  rawTotalOperatingCostMGA: RawMGA;

  // Presentation values
  upstreamRevenueMGA: number;
  downstreamRevenueMGA: number;
  totalOperatingCostMGA: number;

  viable: boolean;
  threshold: number;
  rationale: string;
}

// ================================================================
// Full viability result
// ================================================================
export interface TerritorialViability {
  clusterId: string;
  laa: LAAResult;
  ocd: OCDResult;
  tbi: TBIResult;
  computedAt: number;
  recommendedOVEStreams: MaterialStreamCode[];
  priceWindow: {
    rawFloorMGA: RawMGA;
    rawCeilingMGA: RawMGA;
    rawRecommendedMGA: RawMGA;

    floorMGA: NormalizedMGA;
    ceilingMGA: CommercialMGA;
    recommendedMGA: CommercialMGA;
  };
}

export type MaterialStreamCode =
  | "ORGANIC" | "CARBON" | "RECYCLABLE" | "GLASS" | "METAL" | "PLASTIC";


export interface DownstreamMarket {
  compostValueMGAPerKg: number;
  carbonCreditValueMGAPerTon?: number;
  recyclableValueMGAPerKg?: number;
}