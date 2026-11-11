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
  zone: string;
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

  pricingFramework?: {
    mode: "FIXED" | "BOUNDED" | "GUIDED";
    min: number;
    recommended: number;
    max: number;
  };
  financialRules?: {
    commission: number;
    methods: string[];
  };
  operatorRequirements?: {
    collectors: number;
    frequency: "daily" | "weekly" | "on-demand";
  };
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  assignedAt?: string;
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

export type StakeTveSignal = {
  score: number;
  band: AssessmentBand;
  decision: "PRIORITIZE" | "VALIDATE" | "CAUTION" | "DEFER";
  summary: string;
  keyDrivers: string[];
  blockers: string[];
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

export function computeStakeTveSignal(args: {
  demand?: number;
  operability?: number;
  bankability?: number;
  risk?: number;
  territoryName?: string;
}): StakeTveSignal {
  const demand = Number(args.demand ?? 0);
  const operability = Number(args.operability ?? 0);
  const bankability = Number(args.bankability ?? 0);
  const risk = Number(args.risk ?? 50);
  const readiness = computeReadiness(demand, operability, bankability, risk);
  const territoryLabel = args.territoryName || "This territory";

  let decision: StakeTveSignal["decision"] = "VALIDATE";
  if (readiness.overall >= 80) decision = "PRIORITIZE";
  else if (readiness.overall >= 60) decision = "VALIDATE";
  else if (readiness.overall >= 40) decision = "CAUTION";
  else decision = "DEFER";

  const driverPool = [
    { label: "Market demand", value: demand },
    { label: "Operability", value: operability },
    { label: "Bankability", value: bankability },
    { label: "Risk-adjusted confidence", value: readiness.riskAdjusted },
  ];

  const keyDrivers = driverPool
    .filter((item) => item.value >= 60)
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((item) => `${item.label} ${Math.round(item.value)}%`);

  const blockers = driverPool
    .filter((item) => item.value < 50)
    .sort((a, b) => a.value - b.value)
    .slice(0, 3)
    .map((item) => `${item.label} ${Math.round(item.value)}%`);

  const summary =
    decision === "PRIORITIZE"
      ? `${territoryLabel} shows strong projected territorial value for immediate stake-in.`
      : decision === "VALIDATE"
      ? `${territoryLabel} shows viable projected territorial value, but assumptions should be validated during stake-in.`
      : decision === "CAUTION"
      ? `${territoryLabel} has mixed projected territorial value, so stake-in should stay conditional on unresolved assumptions.`
      : `${territoryLabel} is not yet demonstrating enough projected territorial value for an immediate stake-in commitment.`;

  return {
    score: readiness.overall,
    band: readiness.band,
    decision,
    summary,
    keyDrivers,
    blockers,
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
  userId: string;
  operatorId: string;
  currentStep: AssessmentStep;
  offline: OfflineMeta;
  pendingSync: boolean;
  updatedAt: any;
  createdAt: any;
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

  // Extra metadata for offline handling
  dataVersion?: number; // Incremented on each save to detect conflicts
  dataHash?: string;    // Hash of the data for integrity check
  data?: any;         // Raw data snapshot for debugging
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
