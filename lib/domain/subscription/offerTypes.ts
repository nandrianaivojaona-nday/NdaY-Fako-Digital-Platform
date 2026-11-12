// lib/domain/subscription/offerTypes.ts
import type { PlanBilling, PlanSegment } from "./planTypes";
import type { AffordabilityBand } from "../citizen/affordabilityTypes";

export type MaterialStream =
  | "ORGANIC" | "CARBON" | "RECYCLABLE" | "GLASS" | "METAL" | "PLASTIC";

export interface OVERequirement {
  stream: MaterialStream;
  minWeightKg?: number;
  requiredBin: string;
  contaminationMaxPercent: number;
}

export interface StakeInOutput {
  type: "COMPOST" | "RECYCLATE" | "CARBON_CREDIT";
  quantity: number;
  unit: "KG" | "TON" | "CREDIT";
  frequency: "MONTHLY" | "QUARTERLY" | "ANNUAL";
}

export interface BinRequirement {
  code: string;
  label: string;
  stream: MaterialStream;
  quantity: number;
}

export type CollectionFrequency =
  | "DAILY" | "TWICE_WEEKLY" | "WEEKLY"
  | "BIWEEKLY" | "MONTHLY" | "CUSTOM";

export interface ServiceLevel {
  collectionFrequency: CollectionFrequency;
  customIntervalDays?: number;
  priority: "STANDARD" | "PRIORITY" | "SAME_DAY";
  acknowledgementRequired: boolean;
}

export interface VerificationRules {
  requiresServiceProof: boolean;
  requiresSortingCompliance: boolean;
  complaintWindowHours: number;
}

export interface EcoPointRules {
  pointsPerCollection: number;
  pointsPerKgSorted: number;
  redemptionThreshold: number;
}

export interface EntitlementScheduleEntry {
  cycleNumber: number;
  entitlementValueMGA: number;
  label?: string;
}

export interface CommercialConfiguration {
  planTypeId: string;
  billing: PlanBilling;

  monthlyPriceMGA?: number;
  contractPriceMGA?: number;
  perPickupPriceMGA?: number;
  exchangeRequiredStreams?: MaterialStream[];
  exchangeCompensationKg?: number;

  serviceLevel: ServiceLevel;
  bins: BinRequirement[];
  ove: OVERequirement[];
  stakeInOutputs: StakeInOutput[];
  verification: VerificationRules;
  ecoPoints?: EcoPointRules;

  serviceEntitlementSchedule?: EntitlementScheduleEntry[];
  eligibilityBands?: AffordabilityBand[];

  acknowledgementPolicy?: {
    methods: string[];
    windowHours: number;
    allowAutoAccept: boolean;
    supervisorEscalationHours: number;
    institutionalValidationRequired?: boolean;
  };

  targetSegment?: string;
  eligibleCustomerProfile?: string;
  localBuyerAssumptions?: string;
}

export type OfferStatus = "DRAFT" | "SUBMITTED" | "ACTIVE" | "SUSPENDED" | "RETIRED";

export type OfferVersionStatus =
  | "DRAFT" | "SUBMITTED" | "APPROVED"
  | "REJECTED" | "ACTIVE" | "SUPERSEDED";

export type CalibrationMethod = "MICS_BASELINE" | "OPERATOR_CALIBRATED" | "NEGOTIATED";

export interface TerritorialSubscriptionOffer {
  id: string;
  operatorId: string;
  regionId: string;
  communeId: string;
  segment: PlanSegment;
  planTypeId: string;
  status: OfferStatus;
  activeVersionId: string | null;
  draftVersionId: string | null;
  latestVersionNumber: number;
  businessModelScenarioId: string;
  source: {
    socioeconomicProfileId?: string;
    micsReference?: string;
    calibrationMethod: CalibrationMethod;
  };
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export interface TerritorialSubscriptionOfferVersion {
  id: string;
  offerId: string;
  versionNumber: number;
  status: OfferVersionStatus;
  commercial: CommercialConfiguration;
  baseline?: {
    micsReference?: string;
    territoryId?: string;
      configVersionId?: string;
    tveProfileVersionId?: string;
    businessModelScenarioId?: string;
    stakeInScenarioId?: string;
    oveAssessmentId?: string;
    viability?: {
      tbi: number;
      laaMGA: number;
      ocdMGA: number;
      priceWindow: { floorMGA: number; ceilingMGA: number; recommendedMGA: number };
      computedAt: number;
    };
    recommendedMonthlyPriceMGA?: number;
    recommendedContractPriceMGA?: number;
    recommendedOVE?: OVERequirement[];
    recommendedStakeInOutputs?: StakeInOutput[];
  };
  submittedBy?: string;
  submittedAt?: number;
  approvedBy?: string;
  approvedAt?: number;
  rejectedBy?: string;
  rejectedAt?: number;
  rejectionReason?: string;
  createdAt: number;
  createdBy: string;
  updatedAt: number;
  updatedBy: string;
}

export type ApprovalDecision = "APPROVED" | "REJECTED";

export interface ApprovalRequest {
  id: string;
  offerId: string;
  versionId: string;
  versionNumber: number;
  submittedBy: string;
  submittedAt: number;
  decision: ApprovalDecision | null;
  decidedBy: string | null;
  decidedAt: number | null;
  decisionNote: string | null;
  status: "PENDING" | "DECIDED";
}

export type OfferEventType =
  | "OFFER_CREATED" | "OFFER_DRAFT_UPDATED"
  | "OFFER_SUBMITTED_FOR_APPROVAL" | "OFFER_APPROVED" | "OFFER_REJECTED"
  | "OFFER_VERSION_ACTIVATED" | "OFFER_VERSION_SUPERSEDED"
  | "OFFER_SUSPENDED" | "OFFER_RETIRED";

export interface OfferEvent {
  id: string;
  type: OfferEventType;
  offerId: string;
  versionId?: string;
  versionNumber?: number;
  operatorId: string;
  actorUserId: string;
  actorRole: string;
  timestamp: number;
  previousVersionId?: string;
  changes?: Record<string, unknown>;
  note?: string;
}
