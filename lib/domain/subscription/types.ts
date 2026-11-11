// lib/domain/subscription/types.ts
import type { PlanBilling } from "./planTypes";
import type {
  BinRequirement, OVERequirement, ServiceLevel,
  StakeInOutput, VerificationRules, EcoPointRules,
} from "./offerTypes";
import type { EscrowStatus, HoldType } from "../payment/escrowTypes";

export type SubscriptionStatus =
  | "PENDING" | "PENDING_CASH" | "ACTIVE"
  | "PAUSED" | "EXPIRED" | "CANCELLED";

export type PaymentMethod =
  | "MVOLA" | "ORANGE_MONEY" | "AIRTEL_MONEY"
  | "VISA" | "BANK_TRANSFER" | "CASH";

export interface SubscriptionPlanSnapshot {
  planTypeId: string;
  billing: PlanBilling;
  serviceLevel: ServiceLevel;
  bins: BinRequirement[];
  ove: OVERequirement[];
  stakeInOutputs: StakeInOutput[];
  verification: VerificationRules;
  ecoPoints?: EcoPointRules;
}

export interface Subscription {
  id: string;
  citizenId: string;

  offerId: string;
  offerVersionId: string;
  planTypeId: string;
  planSnapshot: SubscriptionPlanSnapshot;
  affordabilitySnapshot?: {
    band: number;
    ceilingMGA: number;
    rawLaaMGA: number;
    commercialLaaMGA: number;
    alphaU: number;
    urbanityTier: "URBAN" | "PERI_URBAN" | "RURAL";
    rationale: string;
    computedAt: number;
  };

  status: SubscriptionStatus;
  billing: PlanBilling;
  amountMGA: number;
  paymentMethod: PaymentMethod;

  // ---- Escrow link ----
  escrowId: string;
  escrowStatus: EscrowStatus;
  holdType: HoldType;
  releasedCount: number;
  refundedCount: number;
  expectedCollections: number;

  operatorId?: string;
  fokontanyId?: string;
  communeId?: string;

  validated: boolean;
  validatedBy?: string;
  validatedAt?: number | null;
  cancellationPending?: boolean;
  cancellationRequestedAt?: number;

  collectionsUsed: number;
  collectionsRemaining: number;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  nextCollectionDate?: number | null;

  createdAt: number;
  updatedAt: number;
  cancelledAt?: number | null;
  cancelReason?: string | null;

  tveScore?: number;
  tveStatus?: string;
  tveRunId?: string;
  tveRuns?: string[];
}
