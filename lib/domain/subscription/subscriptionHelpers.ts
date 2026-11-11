// lib/domain/subscription/subscriptionHelpers.ts
import type { Subscription, SubscriptionStatus } from "./types";
import type { TerritorialSubscriptionOfferVersion } from "./offerTypes";
import type { AffordabilityResult } from "../citizen/affordabilityTypes";

export function isActive(sub: Subscription | null | undefined): boolean {
  if (!sub || sub.status !== "ACTIVE") return false;
  return sub.currentPeriodEnd > Date.now();
}

export function isPending(sub: Subscription | null | undefined): boolean {
  return !!sub && (sub.status === "PENDING" || sub.status === "PENDING_CASH");
}

export function isExpired(sub: Subscription | null | undefined): boolean {
  return !!sub && (sub.status === "EXPIRED" || sub.currentPeriodEnd <= Date.now());
}

export function canTransition(
  from: SubscriptionStatus, to: SubscriptionStatus,
  actor: "CITIZEN" | "OPERATOR" | "SYSTEM"
): boolean {
  const table: Record<SubscriptionStatus, SubscriptionStatus[]> = {
    PENDING:      ["PENDING_CASH", "ACTIVE", "CANCELLED"],
    PENDING_CASH: ["ACTIVE", "CANCELLED"],
    ACTIVE:       ["PAUSED", "EXPIRED", "CANCELLED"],
    PAUSED:       ["ACTIVE", "CANCELLED"],
    EXPIRED:      ["ACTIVE", "CANCELLED"],
    CANCELLED:    [],
  };
  if (!table[from]?.includes(to)) return false;
  if (to === "ACTIVE" && actor === "CITIZEN") return false;
  return true;
}

export function computePeriod(billing: string, startMs: number) {
  const d = new Date(startMs); const e = new Date(d);
  if (billing === "monthly") e.setMonth(e.getMonth() + 1);
  else if (billing === "quarterly") e.setMonth(e.getMonth() + 3);
  else if (billing === "per_pickup") e.setDate(e.getDate() + 1);
  else e.setMonth(e.getMonth() + 1);
  return { start: d.getTime(), end: e.getTime() };
}

export function buildSubscriptionSnapshotFromOffer(input: {
  citizenId: string;
  offerId: string;
  offerVersionId: string;
  offerVersion: TerritorialSubscriptionOfferVersion;
  paymentMethod: Subscription["paymentMethod"];
  escrowId: string;
  holdType: Subscription["holdType"];
  escrowStatus: Subscription["escrowStatus"];
  operatorId?: string;
  fokontanyId?: string;
  communeId?: string;
  affordability?: AffordabilityResult;
}): Omit<Subscription, "id" | "createdAt" | "updatedAt"> {
  const { offerVersion, paymentMethod, citizenId, offerId, offerVersionId } = input;
  const now = Date.now();
  const commercial = offerVersion.commercial;
  const period = computePeriod(commercial.billing, now);
  const requiresCash = paymentMethod === "CASH";

  const amountMGA =
    commercial.monthlyPriceMGA ??
    commercial.contractPriceMGA ??
    commercial.perPickupPriceMGA ?? 0;

  const freq = commercial.serviceLevel.collectionFrequency;
  const expectedCollections =
    freq === "DAILY" ? 30 : freq === "TWICE_WEEKLY" ? 8 :
    freq === "WEEKLY" ? 4 : freq === "BIWEEKLY" ? 2 :
    freq === "MONTHLY" ? 1 : 4;

  return {
    citizenId,
    offerId,
    offerVersionId,
    planTypeId: commercial.planTypeId,
    planSnapshot: {
      planTypeId: commercial.planTypeId,
      billing: commercial.billing,
      serviceLevel: commercial.serviceLevel,
      bins: commercial.bins,
      ove: commercial.ove,
      stakeInOutputs: commercial.stakeInOutputs,
      verification: commercial.verification,
      ecoPoints: commercial.ecoPoints,
    },
    status: requiresCash ? "PENDING_CASH" : "PENDING",
    billing: commercial.billing,
    amountMGA,
    paymentMethod,
    escrowId: input.escrowId,
    escrowStatus: input.escrowStatus,
    holdType: input.holdType,
    releasedCount: 0,
    refundedCount: 0,
    expectedCollections,
    operatorId: input.operatorId,
    fokontanyId: input.fokontanyId,
    communeId: input.communeId,
    validated: false,
    collectionsUsed: 0,
    collectionsRemaining: expectedCollections,
    currentPeriodStart: period.start,
    currentPeriodEnd: period.end,
    nextCollectionDate: null,
    cancelledAt: null,
    cancelReason: null,
    affordabilitySnapshot: input.affordability
      ? {
          band: input.affordability.band,
          ceilingMGA: input.affordability.householdAffordabilityMGA,
          rationale: input.affordability.rationale,
          computedAt: input.affordability.computedAt,
          rawLaaMGA: input.affordability.rawLaaMGA,
          commercialLaaMGA: input.affordability.commercialLaaMGA,
          alphaU: input.affordability.alphaU,
          urbanityTier: input.affordability.urbanityTier,
          
        }
      : undefined,
  };
}
