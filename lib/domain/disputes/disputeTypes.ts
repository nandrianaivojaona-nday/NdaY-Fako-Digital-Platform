// lib/domain/disputes/disputeTypes.ts
import type { DisputeResolutionReason } from "../service/cycleTypes";

export type DisputeStatus =
  | "OPEN" | "OPERATOR_RESPONDED" | "RESOLVED_RELEASE"
  | "RESOLVED_REFUND" | "AUTO_REFUNDED";

export interface DisputeRecord {
  id: string;
  cycleId: string;
  escrowId: string;
  subscriptionId: string;
  serviceProofId: string;
  citizenId: string;
  operatorId: string;
  reason: string;
  amountMGA: number;
  status: DisputeStatus;
  respondedAt?: number;
  respondedBy?: string;
  operatorResponse?: string;
  resolutionReason?: DisputeResolutionReason;
  resolutionNote?: string;
  resolvedAt?: number;
  resolvedBy?: string;
  coolingWindowHours: number;
  createdAt: number;
}