// lib/domain/payment/providers/dusupay.ts
import crypto from "crypto";
import type { PaymentProvider, PaymentIntent, PaymentWebhookEvent } from "../types";
import { normalizeProviderPaymentStatus } from "../status";

const API = process.env.DUSUPAY_API_URL ?? "https://api.dusupay.com/v1";
const KEY = process.env.DUSUPAY_API_KEY ?? "";
const SECRET = process.env.DUSUPAY_WEBHOOK_SECRET ?? "";

export const dusupayProvider: PaymentProvider = {
  name: "dusupay",

  async authorize({ reference, escrowId, amountMGA, method, returnUrl, idempotencyKey }) {
    const res = await fetch(`${API}/collections/authorize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        amount: amountMGA, currency: "MGA", reference, escrow_id: escrowId,
        payment_method: method === "VISA" ? "card" : "bank_transfer",
        return_url: returnUrl,
      }),
    });
    if (!res.ok) throw new Error(`Dusupay authorize failed: ${res.status}`);
    const data = await res.json();
    return {
      id: String(data.id ?? data.transaction_id ?? `dusupay_${escrowId}`), reference, escrowId, amountMGA, method,
      status: normalizeProviderPaymentStatus(data.status), provider: "dusupay", holdType: "PROVIDER_NATIVE",
      redirectUrl: data.checkout_url, transactionId: data.transaction_id,
      authCode: data.auth_code, createdAt: Date.now(),
    } as PaymentIntent;
  },

  async capture({ providerReference, amountMGA, idempotencyKey }) {
    const res = await fetch(`${API}/collections/${providerReference}/capture`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ amount: amountMGA }),
    });
    if (!res.ok) throw new Error(`Dusupay capture failed: ${res.status}`);
    return { ok: true, releasedAt: Date.now() };
  },

  async refund({ providerReference, amountMGA, reason, idempotencyKey }) {
    const res = await fetch(`${API}/collections/${providerReference}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}`, "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ amount: amountMGA, reason }),
    });
    if (!res.ok) throw new Error(`Dusupay refund failed: ${res.status}`);
    return { ok: true, refundedAt: Date.now() };
  },

  async void({ providerReference, idempotencyKey }) {
    const res = await fetch(`${API}/collections/${providerReference}/void`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Idempotency-Key": idempotencyKey },
    });
    if (!res.ok) throw new Error(`Dusupay void failed: ${res.status}`);
    return { ok: true, voidedAt: Date.now() };
  },

  verifySignature(rawBody, signature) {
    if (!SECRET || !signature) return false;
    const expected = crypto.createHmac("sha256", SECRET).update(rawBody).digest("hex");
    try { return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature)); }
    catch { return false; }
  },

  normalizeWebhook(payload: any): PaymentWebhookEvent {
    const paymentMethod = typeof payload.payment_method === "string" ? payload.payment_method.toLowerCase() : "";
    return {
      eventId: payload.event_id ?? payload.transaction_id,
      transactionId: payload.transaction_id,
      reference: payload.reference,
      status: normalizeProviderPaymentStatus(payload.status),
      amountMGA: payload.amount,
      method: paymentMethod === "card" ? "VISA" : paymentMethod === "bank_transfer" ? "BANK_TRANSFER" : "CASH",
      timestamp: payload.timestamp ?? new Date().toISOString(),
      raw: payload,
    };
  },
};
