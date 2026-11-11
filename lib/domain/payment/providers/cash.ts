// lib/domain/payment/providers/cash.ts
import type { PaymentProvider, PaymentIntent, PaymentWebhookEvent } from "../types";

export const cashProvider: PaymentProvider = {
  name: "cash",

  async authorize({ reference, escrowId, amountMGA }): Promise<PaymentIntent> {
    return {
      id: `cash_${reference}`,
      reference, escrowId, amountMGA,
      method: "CASH", status: "PENDING",
      provider: "cash", holdType: "CASH_ON_DELIVERY",
      instructions: "Your service schedule is active. Pay the collector for each cycle and keep the recorded receipt.",
      createdAt: Date.now(),
    };
  },

  async capture() { return { ok: true, releasedAt: Date.now() }; },
  async refund()  { return { ok: true, refundedAt: Date.now() }; },
  async void()    { return { ok: true, voidedAt: Date.now() }; },

  verifySignature() { return false; },

  normalizeWebhook(): PaymentWebhookEvent {
    throw new Error("Cash payments do not emit webhooks.");
  },
};
