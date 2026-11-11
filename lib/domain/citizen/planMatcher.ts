// lib/domain/citizen/planMatcher.ts
import type { AffordabilityBand, AffordabilityResult } from "./affordabilityTypes";
import type { ReferencePlanType } from "../subscription/planTypes";

export type MatchStrength =
  | "STRONG_MATCH" | "COMPATIBLE" | "BELOW_ELIGIBLE"
  | "ABOVE_BUDGET" | "INELIGIBLE";

export interface PlanMatch {
  planTypeId: string;
  offerId?: string;
  matchStrength: MatchStrength;
  band: AffordabilityBand;
  planEligibleBands: AffordabilityBand[];
  shortfallMGA?: number;
  rationale: string;
}

export function matchPlan(input: {
  affordability: AffordabilityResult;
  plan: ReferencePlanType;
  offerId?: string;
  offerPriceMGA?: number;
  targetBandsOverride?: AffordabilityBand[];
}): PlanMatch {
  const { affordability, plan } = input;
  const band = affordability.band;
  const eligibleBands = input.targetBandsOverride ?? [1, 2, 3, 4, 5];
  const bandNum = band as number;
  const minBand = Math.min(...eligibleBands) as number;
  const maxBand = Math.max(...eligibleBands) as number;

  if (eligibleBands.includes(band)) {
    return {
      planTypeId: plan.id, offerId: input.offerId,
      matchStrength: "STRONG_MATCH", band,
      planEligibleBands: eligibleBands,
      rationale: `${plan.name} matches your household profile.`,
    };
  }

  if (bandNum < minBand - 1 && input.offerPriceMGA) {
    const shortfall = Math.max(0, input.offerPriceMGA - affordability.householdAffordabilityMGA);
    return {
      planTypeId: plan.id, offerId: input.offerId,
      matchStrength: "ABOVE_BUDGET", band,
      planEligibleBands: eligibleBands, shortfallMGA: shortfall,
      rationale: `${plan.name} costs ${shortfall.toLocaleString()} MGA more than your range.`,
    };
  }

  if (bandNum > maxBand + 1) {
    return {
      planTypeId: plan.id, offerId: input.offerId,
      matchStrength: "BELOW_ELIGIBLE", band,
      planEligibleBands: eligibleBands,
      rationale: `${plan.name} targets households with fewer resources.`,
    };
  }

  return {
    planTypeId: plan.id, offerId: input.offerId,
    matchStrength: "COMPATIBLE", band,
    planEligibleBands: eligibleBands,
    rationale: `${plan.name} is close to your profile.`,
  };
}

export function rankMatches(matches: PlanMatch[]): PlanMatch[] {
  const w: Record<MatchStrength, number> = {
    STRONG_MATCH: 0, COMPATIBLE: 1, ABOVE_BUDGET: 2, BELOW_ELIGIBLE: 3, INELIGIBLE: 4,
  };
  return [...matches].sort((a, b) => w[a.matchStrength] - w[b.matchStrength]);
}