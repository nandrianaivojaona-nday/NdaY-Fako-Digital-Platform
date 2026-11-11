// lib/domain/businessModel/scenarioTypes.ts
//
// A BusinessModelScenario is the direct output of the TVE, validated by the
// OVE, and the only legitimate source of offers in a commune.
//
// Offers are not invented by the operator. They are materialized from
// PlanProposals that the territorial evidence supports.
//
// Every monetary value carries its raw/normalized/commercial tiers, and
// every key input retains its confidence level for downstream auditability.

import type { PlanSegment, PlanBilling } from "../subscription/planTypes";
import type { AffordabilityBand } from "../citizen/affordabilityTypes";
import type {
  MaterialStream,
  BinRequirement,
  CollectionFrequency,
  OVERequirement,
} from "../subscription/offerTypes";
import type { TerritorialViability } from "../territory/types";
import type { ConfidenceLevel } from "../territory/evidenceTypes";
import type { RawMGA, NormalizedMGA, CommercialMGA } from "../shared/moneyTypes";

export interface BudgetConstraintInput {
  initialCapitalMGA: number;
  reserveRatio?: number;
  binStarterCostPerHouseholdMGA?: number;
  bagStarterCostPerHouseholdMGA?: number;
  ppeKitCostMGA?: number;
  sortingStarterKitCostMGA?: number;
  householdsPerCollector?: number;
  minOperationalHouseholds?: number;
}

export interface LaunchBudgetCheck {
  applied: boolean;
  initialCapitalMGA: number;
  reserveRatio: number;
  affordableHouseholds: number;
  recommendedCollectors: number;
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

// ================================================================
// PlanProposal — one per plan the territory can support
// ================================================================
export interface PlanProposal {
  planTypeId: string;
  planName: string;
  segment: PlanSegment;
  billing: PlanBilling;

  /** Affordability bands this plan targets IN THIS TERRITORY. */
  targetBands: AffordabilityBand[];

  /** Price window derived from LAA/OCD/TBI for this plan. */
  priceWindow: {
    rawFloorMGA: RawMGA;
    rawCeilingMGA: RawMGA;
    rawRecommendedMGA: RawMGA;

    floorMGA: NormalizedMGA;
    ceilingMGA: CommercialMGA;
    recommendedMGA: CommercialMGA;
  };

  /** Frequency derived from waste generation and logistics. */
  recommendedFrequency: CollectionFrequency;

  /** OVE streams for this plan. */
  oveStreams: MaterialStream[];
  ove: OVERequirement[];
  bins: BinRequirement[];

  /** Expected economics — used by OVE validation. */
  expected: {
    households: number;
    monthlyRevenueMGA: number;         // commercial for reporting
    rawMonthlyRevenueMGA: RawMGA;
    monthlyCostMGA: number;            // normalized
    rawMonthlyCostMGA: RawMGA;
    marginPercent: number;
  };

  /** Confidence in the underlying inputs. */
  confidence: ConfidenceLevel;

  /** Human-readable justification. */
  rationale: string;
}

// ================================================================
// Segment mix — from the cluster
// ================================================================
export interface SegmentMixEntry {
  segment: PlanSegment;
  householdCount: number;
  share: number;
}

// ================================================================
// Scenario lifecycle
// ================================================================
export type ScenarioStatus = "DRAFT" | "VALIDATED" | "SUPERSEDED";

export interface BusinessModelScenario {
  id: string;

  // Territory
  clusterId: string;
  regionId: string;
  communeId: string;
  tveRunId: string;

  // Frozen viability snapshot — the numbers that drove this scenario
  viability: TerritorialViability;

  // The prescribed plan set
  planProposals: PlanProposal[];

  // Segment mix
  segmentMix: SegmentMixEntry[];

  // Total addressable market
  totalHouseholds: number;
  addressableHouseholds: number;

  // Budget-constrained launch check
  launchBudgetCheck?: LaunchBudgetCheck;

  // OVE decision
  validationStatus: "PENDING" | "GO" | "ADJUST" | "NO_GO";
  validationId?: string;

  // Confidence from the underlying TVE run
  confidence: ConfidenceLevel;

  // Lifecycle
  status: ScenarioStatus;

  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
  supersededBy?: string;
}