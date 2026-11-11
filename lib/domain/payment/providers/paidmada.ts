// lib/domain/payment/providers/paidmada.ts
import crypto from "crypto";
import type { PaymentProvider, PaymentIntent, PaymentWebhookEvent } from "../types";
import type { PaymentMethod } from "../../subscription/types";
import { normalizeProviderPaymentStatus } from "../status";

const API = process.env.PAIDMADA_API_URL ?? "https://api.paidmada.mg/v1";
const KEY = process.env.PAIDMADA_API_KEY ?? "";
const SECRET = process.env.PAIDMADA_WEBHOOK_SECRET ?? "";

function mapOp(m: PaymentMethod): string {
  switch (m) {
    case "MVOLA": return "mvola";
    case "ORANGE_MONEY": return "orange";
    case "AIRTEL_MONEY": return "airtel";
    default: throw new Error(`PaidMada does not support ${m}`);
  }
}

export const paidMadaProvider: PaymentProvider = {
  name: "paidmada",

  async authorize({ reference, escrowId, amountMGA, method, customerPhone, returnUrl, idempotencyKey }) {
    const res = await fetch(`${API}/payments/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        operator: mapOp(method),
        amount: amountMGA,
        currency: "MGA",
        reference,
        escrow_id: escrowId,
        phone: customerPhone,
        return_url: returnUrl,
      }),
    });
    if (!res.ok) throw new Error(`PaidMada authorize failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return {
      id: String(data.id ?? data.transaction_id ?? `paidmada_${escrowId}`),
      reference,
      escrowId,
      amountMGA,
      method,
      status: normalizeProviderPaymentStatus(data.status),
      provider: "paidmada",
      holdType: "PLATFORM_INTERNAL",
      transactionId: data.transaction_id,
      redirectUrl: data.redirect_url,
      createdAt: Date.now(),
      expiresAt: data.expires_at,
    } as PaymentIntent;
  },

  async capture({ providerReference, amountMGA, idempotencyKey }) {
    const res = await fetch(`${API}/payments/${providerReference}/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ amount: amountMGA }),
    });
    if (!res.ok) throw new Error(`PaidMada capture failed: ${res.status}`);
    return { ok: true, releasedAt: Date.now() };
  },

  async refund({ providerReference, amountMGA, reason, idempotencyKey }) {
    const res = await fetch(`${API}/payments/${providerReference}/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({ amount: amountMGA, reason }),
    });
    if (!res.ok) throw new Error(`PaidMada refund failed: ${res.status}`);
    return { ok: true, refundedAt: Date.now() };
  },

  async void({ providerReference, idempotencyKey }) {
    const res = await fetch(`${API}/payments/${providerReference}/void`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
    });
    if (!res.ok) throw new Error(`PaidMada void failed: ${res.status}`);
    return { ok: true, voidedAt: Date.now() };
  },

  verifySignature(rawBody, signature) {
    if (!SECRET || !signature) return false;
    const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch { return false; }
  },

  normalizeWebhook(payload: any): PaymentWebhookEvent {
    const operator = typeof payload.operator === "string" ? payload.operator.toLowerCase() : "";
    const method = operator === "mvola" ? "MVOLA" :
      operator === "orange" ? "ORANGE_MONEY" :
      operator === "airtel" ? "AIRTEL_MONEY" : "CASH";
    return {
      eventId: payload.event_id ?? payload.transaction_id,
      transactionId: payload.transaction_id,
      reference: payload.reference,
      escrowId: payload.escrow_id,
      status: normalizeProviderPaymentStatus(payload.status),
      amountMGA: payload.amount,
      method,
      timestamp: payload.timestamp ?? new Date().toISOString(),
      raw: payload,
    };
  },
};
