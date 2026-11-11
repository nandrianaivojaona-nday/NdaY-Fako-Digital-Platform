// lib/domain/payment/types.ts
import type { PaymentMethod } from "../subscription/types";
import type { HoldType } from "./escrowTypes";

export type PaymentStatus =
  | "PENDING" | "AUTHORIZED" | "HELD"
  | "CAPTURED" | "RELEASED" | "REFUNDED"
  | "VOIDED" | "EXPIRED" | "FAILED";

export interface PaymentIntent {
  id: string;
  reference: string;
  escrowId: string;
  amountMGA: number;
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  holdType: HoldType;
  redirectUrl?: string;
  transactionId?: string;
  authCode?: string;
  instructions?: string;
  createdAt: number;
  expiresAt?: number;
}

export interface PaymentWebhookEvent {
  eventId: string;
  transactionId: string;
  reference: string;
  escrowId?: string;
  status: PaymentStatus;
  amountMGA: number;
  method: PaymentMethod;
  timestamp: string;
  raw?: unknown;
}

export interface PaymentProvider {
  name: string;
  authorize(input: {
    reference: string; escrowId: string; amountMGA: number;
    method: PaymentMethod; customerPhone?: string;
    returnUrl: string; idempotencyKey: string;
  }): Promise<PaymentIntent>;
  capture(input: {
    escrowId: string; providerReference: string;
    amountMGA: number; idempotencyKey: string;
  }): Promise<{ ok: boolean; releasedAt: number }>;
  refund(input: {
    escrowId: string; providerReference: string;
    amountMGA: number; reason: string; idempotencyKey: string;
  }): Promise<{ ok: boolean; refundedAt: number }>;
  void(input: {
    escrowId: string; providerReference: string; idempotencyKey: string;
  }): Promise<{ ok: boolean; voidedAt: number }>;
  verifySignature(rawBody: string, signature: string): boolean;
  normalizeWebhook(payload: unknown): PaymentWebhookEvent;
}
