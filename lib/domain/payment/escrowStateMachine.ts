// lib/domain/payment/escrowStateMachine.ts
import type { EscrowStatus } from "./escrowTypes";

export type EscrowTransition =
  | "AUTHORIZE" | "RELEASE" | "REFUND" | "SETTLE" | "VOID"
  | "EXPIRE" | "DISPUTE" | "RESOLVE_REFUND" | "RESOLVE_RELEASE";

const TRANSITIONS: Record<EscrowStatus, EscrowTransition[]> = {
  PENDING:            ["AUTHORIZE", "EXPIRE", "VOID"],
  HELD:               ["RELEASE", "REFUND", "SETTLE", "EXPIRE", "DISPUTE", "VOID"],
  PARTIALLY_RELEASED: ["RELEASE", "REFUND", "SETTLE", "DISPUTE", "VOID"],
  PARTIALLY_REFUNDED: ["RELEASE", "REFUND", "SETTLE", "DISPUTE", "VOID"],
  SETTLED:            [],
  REFUNDED:           [],
  VOIDED:             [],
  EXPIRED:            [],
  DISPUTED:           ["RESOLVE_REFUND", "RESOLVE_RELEASE"],
};

export function canTransition(from: EscrowStatus, t: EscrowTransition): boolean {
  return TRANSITIONS[from]?.includes(t) ?? false;
}

export function nextStatus(
  from: EscrowStatus, t: EscrowTransition,
  ctx: { releasedCount: number; refundedCount: number; expectedCollections: number }
): EscrowStatus {
  if (!canTransition(from, t)) throw new Error(`Illegal escrow transition ${from} → ${t}`);
  switch (t) {
    case "AUTHORIZE": return "HELD";
    case "EXPIRE":    return "EXPIRED";
    case "VOID":      return "VOIDED";
    case "DISPUTE":   return "DISPUTED";
    case "SETTLE":
      return ctx.refundedCount > 0 ? "PARTIALLY_REFUNDED" : "SETTLED";
    case "RESOLVE_REFUND":
    case "REFUND":
      if (ctx.refundedCount + 1 >= ctx.expectedCollections) return "REFUNDED";
      return ctx.releasedCount > 0 ? "PARTIALLY_REFUNDED" : "HELD";
    case "RESOLVE_RELEASE":
    case "RELEASE":
      if (ctx.releasedCount + 1 >= ctx.expectedCollections) return "SETTLED";
      return ctx.refundedCount > 0 ? "PARTIALLY_RELEASED" : "HELD";
  }
}
