// lib/domain/settlement/settlementEngine.ts
//
// The split uses the shared helper to enforce the invariant:
//   operator + ndayFee + paymentCost === entitlement  (exact)

// ---------
// Invariant-preserving split
// --------

import type { TerritorialSubscriptionOfferVersion } from "../subscription/offerTypes";
import type { ReferencePlanType } from "../subscription/planTypes";
import type { SettlementSplit, SettlementEntitlement } from "./settlementTypes";
import type { EntitlementScheduleEntry } from "../subscription/offerTypes";
import { splitEntitlement, distributeEntitlements } from "../shared/rounding";
import { makeRaw } from "../shared/moneyTypes";

const PAYMENT_COST_PERCENT: Record<string, number> = {
  MVOLA: 1.8,
  ORANGE_MONEY: 2.0,
  AIRTEL_MONEY: 2.0,
  VISA: 2.9,
  BANK_TRANSFER: 0.5,
  CASH: 0.0,
};

export function computeSettlementEntitlement(input: {
  cycleId: string;
  serviceProofId: string;
  subscriptionId: string;
  offerId: string;
  offerVersionId: string;
  offerVersionNumber: number;
  citizenId: string;
  operatorId: string;
  entitlementValueMGA: number;
  planType: ReferencePlanType;
  offerVersion: TerritorialSubscriptionOfferVersion;
  paymentMethod: string;
  escrowId: string;
  acceptanceMethod: string;
  acceptanceStatus: string;
}): SettlementEntitlement {
  const platformFeePercent = input.planType.platformFeePercent;
  const paymentCostPercent = PAYMENT_COST_PERCENT[input.paymentMethod] ?? 2.0;

  const split = splitEntitlement(
    input.entitlementValueMGA,
    platformFeePercent,
    paymentCostPercent
  );

  // Raw analytical companion values
  const rawNdayFee = (input.entitlementValueMGA * platformFeePercent) / 100;
  const rawPaymentCost = (input.entitlementValueMGA * paymentCostPercent) / 100;
  const rawOperator = input.entitlementValueMGA - rawNdayFee - rawPaymentCost;

  return {
    id: `ent_${input.cycleId}`,
    cycleId: input.cycleId,
    serviceProofId: input.serviceProofId,
    subscriptionId: input.subscriptionId,
    offerId: input.offerId,
    offerVersionId: input.offerVersionId,
    citizenId: input.citizenId,
    operatorId: input.operatorId,
    entitlementValueMGA: input.entitlementValueMGA,
    platformFeePercent,
    paymentCostPercent,
    paymentMethod: input.paymentMethod,
    split,
    netToOperatorMGA: split.operatorMGA,

    rawNdaYFeeMGA: makeRaw(rawNdayFee),
    rawPaymentCostMGA: makeRaw(rawPaymentCost),
    rawNetToOperatorMGA: makeRaw(rawOperator),

    status: "EMITTED",
    emittedAt: Date.now(),
    assumptions: {
      offerVersionNumber: input.offerVersionNumber,
      planTypeId: input.planType.id,
      escrowId: input.escrowId,
      acceptanceMethod: input.acceptanceMethod,
      acceptanceStatus: input.acceptanceStatus,
    },
  };
}

export function computeReversal(
  original: SettlementEntitlement,
  reason: string
): SettlementEntitlement {
  return {
    ...original,
    id: `ent_rev_${original.id}_${Date.now()}`,
    split: {
      operatorMGA: -original.split.operatorMGA as any,
      ndayFeeMGA: -original.split.ndayFeeMGA as any,
      paymentCostMGA: -original.split.paymentCostMGA as any,
    },
    netToOperatorMGA: -original.netToOperatorMGA as any,
    status: "REVERSED",
    emittedAt: Date.now(),
    reversalOf: original.id,
    reason,
  };
}

export function deriveEntitlementSchedule(input: {
  offerVersion: TerritorialSubscriptionOfferVersion;
  expectedCollections: number;
}): EntitlementScheduleEntry[] {
  const commercial = input.offerVersion.commercial;

  const declared = commercial.serviceEntitlementSchedule;
  if (declared && declared.length > 0) {
    const sum = declared.reduce((s, e) => s + e.entitlementValueMGA, 0);
    const expected =
      commercial.monthlyPriceMGA ??
      commercial.contractPriceMGA ??
      commercial.perPickupPriceMGA ??
      0;
    if (sum !== expected) {
      throw new Error(
        `Declared schedule sums to ${sum} but fee is ${expected}`
      );
    }
    return declared;
  }

  const totalMGA =
    commercial.monthlyPriceMGA ??
    commercial.contractPriceMGA ??
    commercial.perPickupPriceMGA ??
    0;

  const entitlements = distributeEntitlements(totalMGA, input.expectedCollections);

  return entitlements.map((value, i) => ({
    cycleNumber: i + 1,
    entitlementValueMGA: value,
    label: `Cycle ${i + 1}`,
  }));
}