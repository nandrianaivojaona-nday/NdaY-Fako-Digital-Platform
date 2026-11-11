// lib/domain/payment/providers/ariary.ts
import crypto from "crypto";
import type { PaymentProvider, PaymentIntent, PaymentWebhookEvent } from "../types";
import { normalizeProviderPaymentStatus } from "../status";

const API = process.env.ARIARY_API_URL ?? "https://api.ariary.mg/v1";
const KEY = process.env.ARIARY_API_KEY ?? "";
const SECRET = process.env.ARIARY_WEBHOOK_SECRET ?? "";

export const ariaryProvider: PaymentProvider = {
  name: "ariary",

  async authorize({ reference, escrowId, amountMGA, returnUrl, idempotencyKey }) {
    const res = await fetch(`${API}/payment-servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountMGA, currency: "MGA", reference,
        escrow_id: escrowId, return_url: returnUrl,
      }),
    });
    if (!res.ok) throw new Error(`Ariary authorize failed: ${res.status}`);
    const data = await res.json();
    return {
      id: String(data.id ?? data.ticket_code ?? `ariary_${escrowId}`), reference, escrowId, amountMGA,
      method: "BANK_TRANSFER", status: normalizeProviderPaymentStatus(data.status),
      provider: "ariary", holdType: "PLATFORM_INTERNAL",
      redirectUrl: data.payment_url, transactionId: data.ticket_code,
      createdAt: Date.now(),
    } as PaymentIntent;
  },

  async capture({ providerReference, amountMGA, idempotencyKey }) {
    const res = await fetch(`${API}/payment-servers/${providerReference}/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ amount: amountMGA }),
    });
    if (!res.ok) throw new Error(`Ariary capture failed: ${res.status}`);
    return { ok: true, releasedAt: Date.now() };
  },

  async refund({ providerReference, amountMGA, reason, idempotencyKey }) {
    const res = await fetch(`${API}/payment-servers/${providerReference}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ amount: amountMGA, reason }),
    });
    if (!res.ok) throw new Error(`Ariary refund failed: ${res.status}`);
    return { ok: true, refundedAt: Date.now() };
  },

  async void({ providerReference, idempotencyKey }) {
    const res = await fetch(`${API}/payment-servers/${providerReference}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Idempotency-Key": idempotencyKey },
    });
    if (!res.ok) throw new Error(`Ariary void failed: ${res.status}`);
    return { ok: true, voidedAt: Date.now() };
  },

  verifySignature(rawBody, signature) {
    if (!SECRET || !signature) return false;
    const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
    try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); }
    catch { return false; }
  },

  normalizeWebhook(payload: any): PaymentWebhookEvent {
    return {
      eventId: payload.event_id ?? payload.ticket_code,
      transactionId: payload.ticket_code,
      reference: payload.reference,
      status: normalizeProviderPaymentStatus(payload.status),
      amountMGA: payload.amount,
      method: "BANK_TRANSFER",
      timestamp: payload.timestamp ?? new Date().toISOString(),
      raw: payload,
    };
  },
};
