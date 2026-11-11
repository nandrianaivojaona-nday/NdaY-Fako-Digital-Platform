// lib/domain/settlement/pipelineTypes.ts
export type PipelineState =
  | "INITIATED" | "ENTITLEMENT_EMITTED" | "ESCROW_RELEASE_REQUESTED"
  | "ESCROW_RELEASED" | "COMPLETED" | "FAILED";

export interface SettlementPipeline {
  id: string;
  cycleId: string;
  subscriptionId: string;
  escrowId: string;
  state: PipelineState;
  entitlementId?: string;
  entitlementAmountMGA?: number;
  escrowEventId?: string;
  escrowReleasedMGA?: number;
  settledAt?: number;
  attempts: number;
  lastAttemptAt: number;
  lastError?: string;
  errorHistory?: Array<{ at: number; message: string }>;
  createdAt: number;
  updatedAt: number;
}