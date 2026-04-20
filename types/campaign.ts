// ============================================================
// types/campaign.ts — Campaign Assessment · Offline-First
// ============================================================

// ─── Status & Urgency ───────────────────────────────────────

import type { SubscriberDraft } from "@/app/assessment/[campaignId]/_steps/SubscriberSheet";

export type CampaignStatus =
  | "CREATED"
  | "VALIDATED"
  | "ONGOING"
  | "CRITICAL"
  | "COMPLETED";

export type CampaignUrgency = "high" | "medium" | "low";

// ─── Core Campaign ──────────────────────────────────────────

export type Campaign = {
  id: string;
  name: string;
  fokontany: string;
  municipalityId?: string;
  status: CampaignStatus;
  bankability?: {
    scores: {
      overall: number;
      financial: number;
      environmental: number;
      operational: number;
    };
    investmentProfile: {
      monthlyRevenue: number;
      estimatedROI: number;
      paybackMonths: number;
      riskLevel: string;
        carbonReductionTons?: number; // Optional field for carbon reduction
        carbonCreditsPotential?: number; // Optional field for carbon credits potential
    };
  };
  reward?: number;
  participation?: number;
  progress?: number; // 0–100
  operatorsJoined?: number;
  operatorSlots?: number;
  urgency?: CampaignUrgency;
  description?: string;
  startDate?: string;
  endDate?: string;
  wasteCollectedKg?: number;
  targetWasteKg?: number;
  offline?: OfflineMeta;
};

// ─── Offline Sync ───────────────────────────────────────────

export type SyncState =
  | "LOCAL_ONLY"
  | "PENDING_SYNC"
  | "SYNCED"
  | "SYNC_ERROR";

export type OfflineMeta = {
  availableOffline: boolean;
  lastSyncedAt?: string;
  syncState: SyncState;
  localUpdatedAt?: string;
  deviceDraftId?: string;
};

// ─── Assessment Tools ────────────────────────────────────────

export type CampaignBrief = {
  campaignId: string;
  municipalityId?: string;
  territoryDescription?: string;
  collectionMode?: string;
  routeType?: string;
  expectedDurationDays?: number;
  baselineAssumptions?: string;
};

export type MarketDemandInputs = {
  householdCount?: number;
  wasteGenerationKgPerHhPerWeek?: number;
  expectedRecoveryRate?: number;
  existingCollectionGapPercent?: number;
  localRecyclingOutletAccess?: boolean;
  estimatedMonthlyThroughputKg?: number;
};

export type MarketDemandOutput = {
  demandScore: number;
  opportunitySizeKg?: number;
  serviceGapNarrative?: string;
};

export type OperabilityInputs = {
  routeComplexity?: number;       // 0–100
  accessibilityScore?: number;    // 0–100
  assetReadiness?: number;        // 0–100
  workforceReadiness?: number;    // 0–100
  traceabilityReadiness?: number; // 0–100
  monitoringEase?: number;        // 0–100
  stakeholderCoordination?: number; // 0–100
  operatorSlotFillRate?: number;  // 0–100
};

export type OperabilityAssessment = {
  score: number;                  // 0–100
  band: AssessmentBand;
  keyStrengths: string[];
  keyConstraints: string[];
  interventions: string[];
};

export type BankabilityInputs = {
  expectedRevenueAr?: number;
  expectedCostAr?: number;
  rewardAdequacyScore?: number;   // 0–100
  throughputConsistency?: number; // 0–100
  cashflowStability?: number;     // 0–100
  paybackPeriodMonths?: number;
};

export type BankabilityAssessment = {
  score: number;                  // 0–100
  band: AssessmentBand;
  expectedMarginAr?: number;
  scenarioNote?: string;
  keyDrivers: string[];
  blockers: string[];
};

export type RiskInputs = {
  territoryAccessRisk?: number;   // 0–100
  communityAdoptionRisk?: number; // 0–100
  volumeUncertaintyRisk?: number; // 0–100
  traceabilityRisk?: number;      // 0–100
  partnerDependencyRisk?: number; // 0–100
  regulatoryRisk?: number;        // 0–100
};

export type RiskAssessment = {
  overallRisk: number;            // 0–100
  topRisks: string[];
  mitigations: string[];
  goDecision: "GO" | "GO_WITH_CONDITIONS" | "NO_GO";
};

// ─── Score Bands ─────────────────────────────────────────────

export type AssessmentBand =
  | "STRONG"              // 80–100
  | "VIABLE"              // 60–79
  | "WEAK"                // 40–59
  | "NOT_RECOMMENDED";    // 0–39

export function scoreToBand(score: number): AssessmentBand {
  if (score >= 80) return "STRONG";
  if (score >= 60) return "VIABLE";
  if (score >= 40) return "WEAK";
  return "NOT_RECOMMENDED";
}

// ─── Composite Readiness Score ───────────────────────────────

export type ReadinessScores = {
  demand: number;          // weight 20%
  operability: number;     // weight 30%
  bankability: number;     // weight 30%
  riskAdjusted: number;    // weight 20%
  overall: number;         // weighted composite
  band: AssessmentBand;
};

export function computeReadiness(
  demand: number,
  operability: number,
  bankability: number,
  risk: number           // riskAdjusted = (100 - overallRisk)
): ReadinessScores {
  const riskAdjusted = 100 - risk;
  const overall =
    demand * 0.2 +
    operability * 0.3 +
    bankability * 0.3 +
    riskAdjusted * 0.2;
  return {
    demand,
    operability,
    bankability,
    riskAdjusted,
    overall: Math.round(overall),
    band: scoreToBand(overall),
  };
}

// ─── Assessment Draft (offline-safe) ─────────────────────────

export type AssessmentStep =
  | "BRIEF"
  | "MARKET_DEMAND"
  | "OPERABILITY"
  | "BANKABILITY"
  | "RISK"
  | "DOCUMENT"
  | "DECISION";

export type OperatorDecision =
  | "PROCEED"
  | "PROCEED_WITH_CONDITIONS"
  | "HOLD"
  | "DECLINE";

export type AssessmentDraft = {
  id: string;
  campaignId: string;
  operatorId: string;
  currentStep: AssessmentStep;
  offline: OfflineMeta;
  subscribers?: SubscriberDraft[];

 
  operabilitySubscribers?: SubscriberDraft[];

  brief?: CampaignBrief;
  marketDemandInputs?: MarketDemandInputs;
  marketDemandOutput?: MarketDemandOutput;
  operabilityInputs?: OperabilityInputs;
  operabilityAssessment?: OperabilityAssessment;
  bankabilityInputs?: BankabilityInputs;
  bankabilityAssessment?: BankabilityAssessment;
  riskInputs?: RiskInputs;
  riskAssessment?: RiskAssessment;

  scores?: ReadinessScores;
  recommendation?: string;
  decision?: OperatorDecision;
  decisionNotes?: string;

  generatedDocumentJson?: CampaignAssessmentDocument;
  generatedAt?: string;
};

// ─── Final Document ───────────────────────────────────────────

export type CampaignAssessmentDocument = {
  id: string;
  campaignId: string;
  campaignName: string;
  fokontany: string;
  generatedAt: string;
  offline: OfflineMeta;

  executiveSummary: string;
  brief: CampaignBrief;
  marketDemand: MarketDemandOutput;
  operability: OperabilityAssessment;
  bankability: BankabilityAssessment;
  risk: RiskAssessment;
  scores: ReadinessScores;

  recommendation: string;
  decision?: OperatorDecision;
  decisionNotes?: string;
};
