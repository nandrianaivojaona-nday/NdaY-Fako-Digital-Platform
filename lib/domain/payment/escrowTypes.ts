// lib/domain/payment/escrowTypes.ts
import type { PaymentMethod } from "../subscription/types";

export type EscrowStatus =
  | "PENDING"           // awaiting provider authorization
  | "HELD"              // funds committed
  | "PARTIALLY_RELEASED"// some deliveries released
  | "SETTLED"           // all deliveries released
  | "PARTIALLY_REFUNDED"// some deliveries refunded
  | "REFUNDED"          // fully refunded
  | "VOIDED"            // remaining authorization released on cancellation
  | "EXPIRED"           // authorization expired without any delivery
  | "DISPUTED";         // at least one delivery disputed

export type HoldType =
  | "PROVIDER_NATIVE"    // card authorize without capture
  | "PLATFORM_INTERNAL"  // funds in NdaY merchant account
  | "CASH_ON_DELIVERY";  // no money held, obligation tracked

export interface EscrowRecord {
  id: string;
  subscriptionId: string;
  citizenId: string;
  operatorId: string;

  method: PaymentMethod;
  holdType: HoldType;
  providerName?: string;
  providerReference?: string;   // auth id (card) or txn id (MoMo)

  // Amounts (all in MGA)
  totalAmountMGA: number;
  heldAmountMGA: number;
  releasedAmountMGA: number;
  refundedAmountMGA: number;
  voidedAmountMGA: number;

  // Per-delivery breakdown
  expectedCollections: number;
  releasedCount: number;
  refundedCount: number;
  perDeliveryAmountMGA: number;

  status: EscrowStatus;
  cancellationPending?: boolean;
  cancellationRequestId?: string;
  cancellationPendingAmountMGA?: number;
  paymentOperationId?: string;
  paymentOperationStartedAt?: number;

  createdAt: number;
  authorizedAt?: number;
  expiresAt?: number;           // provider auth expiry (card: 7d)
  settledAt?: number;
  lastEventAt: number;
}

export type EscrowEventType =
  | "ESCROW_CREATED"
  | "ESCROW_AUTHORIZED"
  | "ESCROW_HELD"
  | "ESCROW_RELEASED"
  | "ESCROW_REFUNDED"
  | "ESCROW_VOIDED"
  | "ESCROW_SETTLED"
  | "ESCROW_EXPIRED"
  | "ESCROW_DISPUTED"
  | "ESCROW_DISPUTE_RESOLVED";

  export interface EscrowEvent {
    id: string;
    escrowId: string;
    subscriptionId: string;
    type: EscrowEventType;
  
    /** Amount moved by this event, if any. */
    amountMGA?: number;
  
    // ------- References — all distinct, never overloaded -------
    /** The service cycle that triggered this event, if applicable. */
    cycleId?: string;
    /** The service proof attached to the cycle, if applicable. */
    serviceProofId?: string;
    /** The settlement record emitted for this cycle, if applicable. */
    settlementId?: string;
    /** For reversal/adjustment events — the original settlement being reversed. */
    reversalOfSettlementId?: string;
  
    // ------- Actor -------
    actorUserId?: string;
    actorRole?: string;
  
    /** Human-readable note for audit. */
    note?: string;
  
    timestamp: number;
  }
  
export interface DisputeRecord {
  id: string;
  escrowId: string;
  subscriptionId: string;
  serviceProofId: string;
  citizenId: string;
  operatorId: string;
  reason: string;
  status: "OPEN" | "OPERATOR_RESPONDED" | "RESOLVED_REFUND" | "RESOLVED_RELEASE" | "AUTO_REFUNDED";
  amountMGA: number;
  createdAt: number;
  respondedAt?: number;
  respondedBy?: string;
  resolvedAt?: number;
  resolutionNote?: string;
  coolingWindowHours: number;   // typically 72h
}
