// lib/domain/service/cycleTypes.ts
import type { AcceptanceStatus, AcceptanceMethod } from "./acceptanceMethods";

export type CycleStatus =
  | "SCHEDULED" | "ASSIGNED" | "PERFORMED" | "PROOF_CAPTURED"
  | "VERIFIED" | "ACCEPTED" | "SETTLED"
  | "DISPUTED" | "REJECTED" | "CANCELLED" | "SKIPPED";

export type VerificationOutcome =
  | "PASSED" | "PASSED_WITH_WARNINGS" | "FLAGGED_FOR_SUPERVISOR" | "REJECTED";

export interface CycleProof {
  proofId: string;
  capturedAt: number;
  gps?: { lat: number; lng: number; accuracyM: number };
  photoUrls?: string[];
  weights: { organicKg: number; recyclableKg: number; otherKg: number };
  binId: string;
  bagId: string;
  sortingCompliant: boolean;
}

export interface CycleVerification {
  outcome: VerificationOutcome;
  verifiedAt: number;
  verifiedBy: string;
  rules: string[];
  warnings: string[];
  supervisorId?: string;
  supervisorNote?: string;
}

export type DisputeResolutionReason =
  | "SERVICE_DELIVERED_AS_CONTRACTED"
  | "SERVICE_QUALITY_INSUFFICIENT"
  | "SERVICE_NOT_DELIVERED"
  | "CONTRACTUAL_DISAGREEMENT"
  | "GOODWILL_REFUND"
  | "CITIZEN_BAD_FAITH"
  | "SYSTEM_ERROR";

export interface CycleAcceptance {
  status: AcceptanceStatus;
  method?: AcceptanceMethod;
  acceptedAt?: number;
  acceptedBy?: string;
  autoAcceptAt: number;
  disputeId?: string;
  resolution?: {
    outcome: "RELEASE" | "REFUND";
    reasonCode: DisputeResolutionReason;
    reasonNote?: string;
    resolvedAt: number;
    resolvedBy: string;
  };
}

/** Acknowledgement window metadata is recorded before the citizen responds. */
export type CycleAcknowledgement = CycleAcceptance;

export interface SettlementEntitlementRef {
  entitlementId: string;
  amountMGA: number;
  emittedAt: number;
}

export interface EscrowReleaseRef {
  escrowEventId: string;
  amountMGA: number;
  releasedAt: number;
}

export interface ServiceCycle {
  id: string;
  subscriptionId: string;
  citizenId: string;
  operatorId: string;
  offerId: string;
  offerVersionId: string;
  cycleNumber: number;
  periodStart: number;
  periodEnd: number;
  status: CycleStatus;
  scheduledAt: number;
  assignedAt?: number;
  performedAt?: number;
  collectorId?: string;
  vehicleId?: string;
  entitlementValueMGA: number;
  proof?: CycleProof;
  verification?: CycleVerification;
  acknowledgement?: CycleAcknowledgement;
  acceptance?: CycleAcceptance;
  settlementEntitlement?: SettlementEntitlementRef;
  escrowRelease?: EscrowReleaseRef;
  cancelledReason?: string;
  skippedReason?: string;
  createdAt: number;
  updatedAt: number;
}
