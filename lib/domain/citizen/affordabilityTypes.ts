// lib/domain/citizen/affordabilityTypes.ts
export type AffordabilityBand = 1 | 2 | 3 | 4 | 5;

export interface HouseholdProfile {
  citizenId: string;
  fokontanyId: string;
  communeId: string;
  householdSize: number;
  finishedRoofPercent?: number;
  finishedFloorPercent?: number;
  waterAccessType?: "PIPED" | "PUBLIC_TAP" | "UNPROTECTED";
  declaredMonthlyBudgetMGA?: number;
}

export interface AffordabilityResult {
  citizenId: string;
  fokontanyId: string;
  householdAffordabilityMGA: number;
  rawLaaMGA: number;
  commercialLaaMGA: number;
  alphaU: number;
  urbanityTier: "URBAN" | "PERI_URBAN" | "RURAL";
  band: AffordabilityBand;
  inputs: {
    clusterLAA_MGA: number;
    householdSizeFactor: number;
    housingQualityFactor: number;
    appliedSize: number;
    appliedHousingQuality: number;
    
  };
  rationale: string;
  computedAt: number;
  censusVersion: string;

}

export interface AffordabilitySnapshot {
  band: AffordabilityBand;
  ceilingMGA: number;
  rationale: string;
  computedAt: number;
}
