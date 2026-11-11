// lib/domain/territory/recalibrationTypes.ts
//
// The recalibration layer compares what the TVE projected with what was
// actually observed once service began. Both sides of the comparison use
// raw analytical values — never rounded presentation values.
//
// The recalibration record is stored and readable; it feeds the next TVE
// run with adjusted assumptions.

import type { ConfidenceLevel } from "./evidenceTypes";
import type { RawMGA } from "../shared/moneyTypes";

// ================================================================
// Actual economics — measured from settled cycles
// ================================================================
export interface ActualEconomics {
  // Coverage
  settledCycleCount: number;
  expectedCycleCount: number;

  // Analytical raw values — used by variance computation
  rawUpstreamRevenueMGA: RawMGA;
  rawDownstreamRevenueMGA: RawMGA;
  rawOperatingCostMGA: RawMGA;
  rawOcdMGA: RawMGA;
  rawTbi: number;
  rawOperatorMarginMGA: RawMGA;
  rawOperatorMarginPercent: number;

  // Presentation values — used by the UI
  actualUpstreamRevenueMGA: number;
  actualDownstreamRevenueMGA: number;
  actualTotalRevenueMGA: number;
  actualOperatingCostMGA: number;
  actualPlatformFeeMGA: number;
  actualPaymentCostMGA: number;
  actualOcdMGA: number;
  actualTbi: number;
  actualOperatorMarginMGA: number;
  actualOperatorMarginPercent: number;

  // Operational measurements
  actualCollectionFrequency: number;
  actualMissedCollections: number;
  actualAverageWeightKg: number;
  actualFloodRelatedDisruptions: number;

  // Measurement metadata
  measurementConfidence: ConfidenceLevel;
  measurementNotes: string[];

  measuredFrom: number;
  measuredTo: number;
  computedAt: number;
}

// ================================================================
// Variance — projected vs actual
// ================================================================
export interface ProjectedVsActual {
  // OCD variance
  projectedOcdMGA: number;
  actualOcdMGA: number;
  ocdVarianceMGA: number;
  ocdVariancePercent: number;

  // TBI variance
  projectedTbi: number;
  actualTbi: number;
  tbiVariance: number;
  tbiVariancePercent: number;

  // Margin variance
  projectedOperatorMarginPercent: number;
  actualOperatorMarginPercent: number;
  marginVariancePercent: number;

  // Revenue variance
  projectedRevenueMGA: number;
  actualRevenueMGA: number;
  revenueVarianceMGA: number;
  revenueVariancePercent: number;

  // Hazard calibration
  projectedHazardFactor: number;
  actualDisruptionRate: number;
  hazardCalibrationError: number;
}

// ================================================================
// Recommendations — what to adjust in the next run
// ================================================================
export type RecalibrationRecommendationType =
  | "ADJUST_HAZARD_WEIGHT"
  | "ADJUST_ROUTE_FACTOR"
  | "ADJUST_FREQUENCY"
  | "EXCLUDE_FOKONTANY"
  | "REVIEW_PRICING"
  | "NO_ACTION";

export type RecalibrationSeverity = "INFO" | "WARNING" | "ACTION_REQUIRED";

export interface RecalibrationRecommendation {
  type: RecalibrationRecommendationType;
  severity: RecalibrationSeverity;
  description: string;
  suggestedAdjustment?: {
    field: string;
    currentValue: number | string;
    suggestedValue: number | string;
    rationale: string;
  };
}

// ================================================================
// The recalibration record
// ================================================================
export interface RecalibrationRecord {
  id: string;
  tveRunId: string;
  clusterId: string;
  subscriptionId?: string;
  operatorId?: string;

  periodStart: number;
  periodEnd: number;

  actual: ActualEconomics;
  variance: ProjectedVsActual;
  recommendations: RecalibrationRecommendation[];

  createdAt: number;
  computedAt: number;
  computedBy: string;
}