import type { PaymentStatus } from "./types";

/** Map only explicit provider status values. Unknown values stay pending. */
export function normalizeProviderPaymentStatus(value: unknown): PaymentStatus {
  if (typeof value !== "string") return "PENDING";
  const status = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (status) {
    case "authorized":
    case "authorised":
      return "AUTHORIZED";
    case "held":
      return "HELD";
    case "captured":
    case "paid":
    case "success":
    case "succeeded":
      return "CAPTURED";
    case "released":
      return "RELEASED";
    case "refunded":
      return "REFUNDED";
    case "voided":
    case "cancelled":
    case "canceled":
      return "VOIDED";
    case "expired":
      return "EXPIRED";
    case "failed":
    case "rejected":
    case "declined":
      return "FAILED";
    case "pending":
    case "created":
    case "processing":
    case "initiated":
    case "awaiting_payment":
    case "requires_action":
      return "PENDING";
    default:
      return "PENDING";
  }
}
