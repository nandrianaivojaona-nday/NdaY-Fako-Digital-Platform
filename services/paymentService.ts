// services/paymentService.ts
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp } from "@/lib/firebase/firebaseAdmin";
import { paidMadaProvider } from "@/lib/domain/payment/providers/paidmada";
import { ariaryProvider } from "@/lib/domain/payment/providers/ariary";
import { dusupayProvider } from "@/lib/domain/payment/providers/dusupay";
import { cashProvider } from "@/lib/domain/payment/providers/cash";
import type { PaymentProvider, PaymentIntent } from "@/lib/domain/payment/types";
import type { PaymentMethod } from "@/lib/domain/subscription/types";
import type { HoldType } from "@/lib/domain/payment/escrowTypes";
import type { PaymentStatus } from "@/lib/domain/payment/types";

function resolveProvider(method: PaymentMethod): PaymentProvider {
  switch (method) {
    case "MVOLA":
    case "ORANGE_MONEY":
    case "AIRTEL_MONEY":
      return paidMadaProvider;
    case "BANK_TRANSFER":
      return ariaryProvider;
    case "VISA":
      return dusupayProvider;
    case "CASH":
      return cashProvider;
  }
}

export function resolveHoldType(method: PaymentMethod): HoldType {
  switch (method) {
    case "VISA": return "PROVIDER_NATIVE";
    case "MVOLA":
    case "ORANGE_MONEY":
    case "AIRTEL_MONEY":
    case "BANK_TRANSFER": return "PLATFORM_INTERNAL";
    case "CASH": return "CASH_ON_DELIVERY";
  }
}

/** Whether an explicit provider status proves that the initial subscription is funded. */
export function confirmsSubscriptionHold(holdType: HoldType, status: PaymentStatus): boolean {
  if (holdType === "PROVIDER_NATIVE") return status === "HELD" || status === "AUTHORIZED";
  if (holdType === "PLATFORM_INTERNAL") return status === "HELD" || status === "CAPTURED";
  return false;
}

export async function authorizePayment(input: {
  reference: string;
  escrowId: string;
  amountMGA: number;
  method: PaymentMethod;
  customerPhone?: string;
  returnUrl: string;
  idempotencyKey: string;
}): Promise<PaymentIntent> {
  const provider = resolveProvider(input.method);
  const intent = await provider.authorize(input);

  const db = getFirestore(getAdminApp());
  await db.collection("payments").doc(intent.id).set({
    ...intent,
    escrowId: input.escrowId,
    createdAt: Date.now(),
  });

  return intent;
}

export async function captureForDelivery(input: {
  method: PaymentMethod;
  escrowId: string;
  providerReference: string;
  amountMGA: number;
  idempotencyKey: string;
}) {
  const provider = resolveProvider(input.method);
  return provider.capture(input);
}

export async function refundForDispute(input: {
  method: PaymentMethod;
  escrowId: string;
  providerReference: string;
  amountMGA: number;
  reason: string;
  idempotencyKey: string;
}) {
  const provider = resolveProvider(input.method);
  return provider.refund(input);
}

export async function voidHold(input: {
  method: PaymentMethod;
  escrowId: string;
  providerReference: string;
  idempotencyKey: string;
}) {
  const provider = resolveProvider(input.method);
  return provider.void(input);
}

export function getProviderByName(name: string): PaymentProvider | null {
  switch (name) {
    case "paidmada": return paidMadaProvider;
    case "ariary": return ariaryProvider;
    case "dusupay": return dusupayProvider;
    case "cash": return cashProvider;
    default: return null;
  }
}
