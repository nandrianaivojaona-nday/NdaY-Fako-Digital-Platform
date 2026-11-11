// lib/domain/stake/stakeInTypes.ts
//
// A Stake-In is the explicit operational and economic plan for staking a
// territory. It sits between the Business Model Scenario and the OVE
// validation, providing the operator with a complete picture of the
// investment they are committing to.
// 
// --- Explicit stake-in artifact ---
//

import type { RawMGA, CommercialMGA } from "../shared/moneyTypes";

export interface StakeInMarket {
  totalHouseholds: number;
  serviceableHouseholds: number;
  targetHouseholds: number;
  segments: Array<{
    segment: string;
    householdCount: number;
    share: number;
  }>;
}

export interface StakeInOperationalRequirement {
  collectionFrequency: string;
  requiredTeams: number;
  requiredVehicles: number;
  bins: number;
  workingCapitalMGA: number;
}

export interface StakeInEconomics {
  // Commercial / reporting values
  requiredInvestmentMGA: number;
  monthlyOpexMGA: number;
  expectedMonthlyRevenueMGA: number;
  platformCostMGA: number;
  paymentCostMGA: number;
  operatorMarginMGA: number;
  operatorMarginPercent: number;
  breakEvenHouseholds: number;

  // Raw analytical companion — used by recalibration and model learning
  rawExpectedMonthlyRevenueMGA: RawMGA;
  rawMonthlyOpexMGA: RawMGA;
  rawOperatorMarginMGA: RawMGA;
  rawOperatorMarginPercent: number;

  // The commercial price that produced the projections
  commercialPriceMGA: CommercialMGA;
}

export interface StakeInRisk {
  serviceRisk: string;
  floodExposureWeighted: number;
  missedCollectionProbability: number;
  seasonalAdjustmentRequired: boolean;
}

export interface StakeInRecommendation {
  decision: "GO" | "ADJUST" | "NO_GO";
  rationale: string;
}

export interface StakeIn {
  id: string;
  scenarioId: string;
  tveRunId: string;
  stakeId: string;
  operatorId: string;

  market: StakeInMarket;
  operational: StakeInOperationalRequirement;
  economics: StakeInEconomics;
  risk: StakeInRisk;
  recommendation: StakeInRecommendation;

  createdAt: number;
  createdBy: string;
}