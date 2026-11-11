// lib/domain/territory/serviceabilityTypes.ts
//
// The serviceability layer sits between raw territorial evidence and the
// economic cost model. It answers: what does it take to serve this territory?
//
// The output carries both raw analytical values and normalized operational
// values, so downstream code can choose the right precision for its purpose.

import type { CollectionFrequency } from "../subscription/offerTypes";
import type { ConfidenceLevel } from "./evidenceTypes";
import type { RawMGA, NormalizedMGA } from "../shared/moneyTypes";

export type ServiceRiskLevel = "LOW" | "MODERATE" | "HIGH" | "SEVERE";

export interface ServiceabilityInputs {
  // Population and geography
  totalHouseholds: number;
  totalPopulation: number;
  densityFactor: number;
  householdSpacingMetres: number;
  roadAccessibilityScore: number;
  distanceToLandfillKm: number;
  distanceToTransferStationKm?: number;

  // Hazard
  floodExposureScore: number;
  maxFloodExposureScore: number;
  historicalFloodEvents: number;
  cycloneExposureLevel:
    | "NIL"
    | "LOW"
    | "MODERATE"
    | "HIGH"
    | "VERY_HIGH"
    | "UNKNOWN";

  // Waste
  wasteGenerationPerCapitaKgDay: number;

  // Infrastructure
  wildDumpCount: number;
  publicBinCount: number;
  transitConcessionCount: number;

  // Urbanity
  urbanityTier: "URBAN" | "PERI_URBAN" | "RURAL";
}

export interface ServiceConfiguration {
  // Route dimension
  routeCostFactor: number;
  estimatedRouteKmPerCycle: number;
  stopsPerKm: number;

  // Capacity dimension
  serviceableHouseholds: number;
  targetHouseholds: number;
  collectionFrequency: CollectionFrequency;
  requiredTeams: number;
  requiredVehicles: number;

  // Risk dimension
  serviceRisk: ServiceRiskLevel;
  seasonalAdjustmentRequired: boolean;
  missedCollectionProbability: number;

  // Monetary — raw analytical
  rawBaseOcdMGA: RawMGA;
  rawHazardAdjustedOcdMGA: RawMGA;
  rawHazardImpactMGA: RawMGA;

  // Monetary — operational
  baseOcdMGA: NormalizedMGA;
  hazardAdjustedOcdMGA: NormalizedMGA;
  hazardImpactMGA: NormalizedMGA;

  // Confidence
  confidence: ConfidenceLevel;
  confidenceNotes: string[];

  rationale: string;
  computedAt: number;
}