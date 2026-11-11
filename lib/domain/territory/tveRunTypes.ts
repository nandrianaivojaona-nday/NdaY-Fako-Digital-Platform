// lib/domain/territory/tveRunTypes.ts
//
// A TVERun is the immutable record of one execution of the Territorial
// Viability Engine. It captures:
//   - which cluster and stake it ran against
//   - which versions of the source data it consumed
//   - which model version and assumptions it applied
//   - the full service configuration it produced
//   - the economics (raw + normalized + commercial)
//   - the risk assessment it derived
//   - the confidence it assigned to the result
//
// Every commercial commitment downstream (offer version, subscription)
// carries a reference to the TVE Run that produced it. This makes the
// platform reproducible: given a run id, one can reconstruct exactly why
// a price was chosen.

import type { ServiceConfiguration } from "./serviceabilityTypes";
import type { ConfidenceLevel } from "./evidenceTypes";
import type { LAAResult, OCDResult, TBIResult } from "./types";
import type { RawMGA, NormalizedMGA, CommercialMGA } from "../shared/moneyTypes";
import type { ActualEconomics } from "./recalibrationTypes";

// ================================================================
// Input snapshot — what versions fed this run
// ================================================================
export interface TVERunInputSnapshot {
  stakeId: string;
  clusterId: string;

  /** Hash or generation stamp of the census data consumed. */
  censusVersion: string;

  /** HDX/BNGRC hazard dataset version, if available. */
  hazardVersion?: string;

  /** Reference to the market parameters catalogue version. */
  marketVersion: string;

  /** Route model version. */
  routeModelVersion: string;

  /** If the run was later attached to an offer, its id. */
  offerVersionId?: string;

  /** The evidence manifest at the moment of computation. */
  evidenceSummary?: {
    population?: ConfidenceLevel;
    households?: ConfidenceLevel;
    roadAccessibility?: ConfidenceLevel;
    floodExposure?: ConfidenceLevel;
    overall: ConfidenceLevel;
  };
}

// ================================================================
// Assumptions — the model parameters, frozen
// ================================================================
export interface TVERunAssumptions {
  modelVersion: string;
  alphaU: number;
  tbiThreshold: number;
  laborCostMGA: number;
  baseFuelOrMaintenanceMGA: number;
  hazardWeight: number;
  roadWeight: number;
  worstCasePremiumThresholds: {
    high: number;
    moderate: number;
  };
  compostYield: number;
}

// ================================================================
// Economics — the full three-tier view
// ================================================================
export interface TVERunEconomics {
  laa: LAAResult;
  ocd: OCDResult;
  tbi: TBIResult;

  priceWindow: {
    rawFloorMGA: RawMGA;
    rawCeilingMGA: RawMGA;
    rawRecommendedMGA: RawMGA;

    floorMGA: NormalizedMGA;
    ceilingMGA: CommercialMGA;
    recommendedMGA: CommercialMGA;
  };
}

// ================================================================
// Risk — the derived risk assessment
// ================================================================
export interface TVERunRisks {
  routeCostFactor: number;
  hazardFactor: number;
  serviceRisk: string;
  floodExposureWeighted: number;
  maxFloodExposure: number;
  missedCollectionProbability: number;
  seasonalAdjustmentRequired: boolean;
}

// ================================================================
// Confidence — the trust assessment
// ================================================================
export interface TVERunConfidence {
  overall: ConfidenceLevel;
  notes: string[];
}

// ================================================================
// Decision
// ================================================================
export type TVERunDecision = "PENDING" | "GO" | "ADJUST" | "NO_GO";

// ================================================================
// The run itself
// ================================================================
export interface TVERun {
  id: string;
  clusterId: string;
  stakeId?: string;

  modelVersion: string;
  inputSnapshot: TVERunInputSnapshot;
  assumptions: TVERunAssumptions;

  serviceConfiguration: ServiceConfiguration;
  economics: TVERunEconomics;
  risks: TVERunRisks;
  confidence: TVERunConfidence;

  decision: TVERunDecision;

  // Populated after the subscription has run for a period
  actualEconomics?: ActualEconomics;
  actualEconomicsMeasuredAt?: number;

  computedAt: number;
  computedBy: string;
}